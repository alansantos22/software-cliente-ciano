#!/usr/bin/env bash
#
# setup.sh — Instalação inicial (bootstrap) do sistema Ciano Cotas
#            numa VPS Ubuntu limpa (22.04 / 24.04).
#
# Faz, de uma vez só, toda a configuração:
#   - atualiza o sistema e configura o firewall
#   - cria o usuário do sistema (o app NUNCA roda como root)
#   - instala Node 22, MySQL, Nginx, Git e Certbot
#   - cria o banco e o usuário do MySQL
#   - clona o repositório e gera os arquivos .env
#   - sobe o backend (NestJS) como serviço systemd
#   - compila o frontend (Vue/Vite) e configura o Nginx
#   - emite o certificado HTTPS (Let's Encrypt)
#
# COMO USAR (numa VPS recém-criada, logado como root):
#
#   wget https://raw.githubusercontent.com/alansantos22/software-cliente-ciano/main/setup.sh
#   bash setup.sh
#
# O script faz algumas perguntas no início e depois roda sozinho.
# É idempotente: pode ser rodado de novo sem quebrar nada.
#
set -euo pipefail

# ============================ CONFIGURAÇÃO ============================
APP_DIR="/var/www/ciano"
DEFAULT_REPO="https://github.com/alansantos22/software-cliente-ciano.git"
DEFAULT_BRANCH="main"
DEFAULT_DEPLOY_USER="ciano"
DB_NAME="ciano_cotas"
DB_USER="ciano"
SERVICE="ciano"
APP_PORT="3000"
NODE_MAJOR="22"
# ======================================================================

# --- cores -------------------------------------------------------------
C_OK=$'\e[32m'; C_INFO=$'\e[36m'; C_WARN=$'\e[33m'; C_ERR=$'\e[31m'; C_OFF=$'\e[0m'
log()  { echo; echo "${C_INFO}=== $* ===${C_OFF}"; }
ok()   { echo "${C_OK}✓${C_OFF} $*"; }
warn() { echo "${C_WARN}!${C_OFF} $*"; }
die()  { echo "${C_ERR}✗ $*${C_OFF}" >&2; exit 1; }

# --- precisa ser root --------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "Rode este script como root: sudo bash setup.sh"

# helper: roda um comando como o usuário do deploy
as_deploy() { sudo -u "$DEPLOY_USER" bash -lc "$*"; }

# ======================================================================
#  PERGUNTAS
# ======================================================================
log "Configuração inicial — responda as perguntas abaixo"

read -rp "Domínio do site (ex.: cotas.suaempresa.com.br): " DOMAIN
[ -n "$DOMAIN" ] || die "O domínio é obrigatório."

read -rp "Servir também o www.${DOMAIN}? (responda N se for um subdomínio) [s/N] " ADD_WWW
if [[ "$ADD_WWW" =~ ^[sSyY]$ ]]; then
  WWW_DOMAIN="www.${DOMAIN}"
else
  WWW_DOMAIN=""
fi

read -rp "E-mail para o certificado HTTPS (avisos de expiração): " EMAIL
[ -n "$EMAIL" ] || die "O e-mail é obrigatório."

read -rp "URL do repositório Git [$DEFAULT_REPO]: " REPO_URL
REPO_URL="${REPO_URL:-$DEFAULT_REPO}"

read -rp "Branch do repositório [$DEFAULT_BRANCH]: " BRANCH
BRANCH="${BRANCH:-$DEFAULT_BRANCH}"

read -rsp "Token do GitHub (só se o repositório for PRIVADO; Enter pra pular): " GIT_TOKEN
echo

read -rp "Nome do usuário do sistema (logar/rodar o app) [$DEFAULT_DEPLOY_USER]: " DEPLOY_USER
DEPLOY_USER="${DEPLOY_USER:-$DEFAULT_DEPLOY_USER}"

read -rsp "Senha para o usuário '$DEPLOY_USER' (pra você logar depois): " DEPLOY_PASS
echo
[ -n "$DEPLOY_PASS" ] || die "A senha do usuário '$DEPLOY_USER' é obrigatória."

echo
echo "--- Envio de e-mails (recuperação de senha, notificações) ---"
echo "  1) Servidor local da VPS (Postfix) — sem custo e sem credenciais."
echo "     Aviso: parte dos e-mails pode cair na caixa de spam do destinatário."
echo "  2) SMTP externo (Resend, Brevo, Gmail, etc.) — você informa as credenciais."
read -rp "Como o sistema deve enviar e-mails? [1/2] (padrão: 1): " MAIL_MODE
MAIL_MODE="${MAIL_MODE:-1}"

if [ "$MAIL_MODE" = "2" ]; then
  read -rp "Servidor SMTP (ex.: smtp.resend.com): " MAIL_HOST
  [ -n "$MAIL_HOST" ] || die "O servidor SMTP é obrigatório na opção 2."
  read -rp "Porta SMTP [587]: " MAIL_PORT
  MAIL_PORT="${MAIL_PORT:-587}"
  read -rp "Usuário SMTP: " MAIL_USER
  read -rsp "Senha / API key SMTP: " MAIL_PASSWORD
  echo
  read -rp "E-mail remetente (From) [nao-responda@${DOMAIN}]: " MAIL_FROM_ADDR
  MAIL_FROM_ADDR="${MAIL_FROM_ADDR:-nao-responda@${DOMAIN}}"
  MAIL_FROM="Ciano Cotas <${MAIL_FROM_ADDR}>"
  MAIL_DESC="SMTP externo ($MAIL_USER @ $MAIL_HOST:$MAIL_PORT)"
else
  # Servidor local: o Postfix da própria VPS entrega os e-mails, sem login.
  MAIL_HOST="localhost"
  MAIL_PORT="25"
  MAIL_USER=""
  MAIL_PASSWORD=""
  MAIL_FROM="Ciano Cotas <nao-responda@${DOMAIN}>"
  MAIL_DESC="Servidor local da VPS (Postfix)"
fi

echo
echo "Resumo:"
echo "  Domínio ........: $DOMAIN${WWW_DOMAIN:+ (+ $WWW_DOMAIN)}"
echo "  E-mail HTTPS ...: $EMAIL"
echo "  Repositório ....: $REPO_URL  (branch: $BRANCH)"
echo "  Repo privado ...: $([ -n "$GIT_TOKEN" ] && echo 'sim (token informado)' || echo 'não / público')"
echo "  Usuário sistema : $DEPLOY_USER"
echo "  E-mails ........: $MAIL_DESC"
read -rp "Confirma e inicia a instalação? [s/N] " CONFIRM
[[ "$CONFIRM" =~ ^[sSyY]$ ]] || die "Cancelado pelo usuário."

# segredos gerados automaticamente
# o sufixo "Aa1_" garante maiúscula + minúscula + dígito + caractere especial,
# pra senha passar na política validate_password do MySQL, se estiver ativa.
DB_PASSWORD="$(openssl rand -hex 16)Aa1_"
JWT_SECRET="$(openssl rand -hex 48)"

# porta 465 = conexão SSL direta (secure=true); demais (ex.: 587) = STARTTLS.
if [ "$MAIL_PORT" = "465" ]; then MAIL_SECURE="true"; else MAIL_SECURE="false"; fi

# monta a URL de clone (com token embutido, se for repo privado)
if [ -n "$GIT_TOKEN" ]; then
  CLONE_URL="$(echo "$REPO_URL" | sed "s#https://#https://${GIT_TOKEN}@#")"
else
  CLONE_URL="$REPO_URL"
fi

export DEBIAN_FRONTEND=noninteractive

# ======================================================================
#  1. SISTEMA + FIREWALL
# ======================================================================
log "1/12 — Atualizando o sistema"
apt-get update -y
apt-get upgrade -y
ok "Sistema atualizado."

log "2/12 — Instalando pacotes (git, nginx, mysql, certbot, curl, fail2ban)"
apt-get install -y git nginx mysql-server certbot python3-certbot-nginx \
  curl ufw fail2ban build-essential python3 ca-certificates gnupg openssl
ok "Pacotes instalados."

if [ "$MAIL_MODE" = "1" ]; then
  log "2b/12 — Instalando o servidor de e-mail local (Postfix)"
  # Pré-configura o Postfix em modo não-interativo (evita a tela azul de setup).
  debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
  debconf-set-selections <<< "postfix postfix/mailname string ${DOMAIN}"
  apt-get install -y postfix
  systemctl enable --now postfix
  ok "Postfix ativo — e-mails sairão de nao-responda@${DOMAIN}."
fi

log "3/12 — Configurando o firewall (UFW)"
ufw allow OpenSSH      >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable     >/dev/null
ok "Firewall ativo (SSH + HTTP/HTTPS liberados)."

# ======================================================================
#  2. USUÁRIO DO SISTEMA
# ======================================================================
log "4/12 — Criando o usuário '$DEPLOY_USER'"
if id "$DEPLOY_USER" &>/dev/null; then
  ok "Usuário '$DEPLOY_USER' já existe — mantendo."
else
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  ok "Usuário '$DEPLOY_USER' criado e adicionado ao grupo sudo."
fi
echo "$DEPLOY_USER:$DEPLOY_PASS" | chpasswd
# copia as chaves SSH do root pro usuário (pra você logar com a mesma chave)
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
ok "Acesso do usuário '$DEPLOY_USER' configurado."

# ======================================================================
#  3. NODE.JS
# ======================================================================
log "5/12 — Instalando o Node.js ${NODE_MAJOR}"
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d v)" -ge "$NODE_MAJOR" ]; then
  ok "Node $(node -v) já instalado."
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  ok "Node $(node -v) instalado."
fi

# ======================================================================
#  4. MYSQL — BANCO E USUÁRIO
# ======================================================================
log "6/12 — Configurando o MySQL (banco + usuário)"
systemctl enable --now mysql
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
ok "Banco '${DB_NAME}' e usuário '${DB_USER}' prontos."

# ======================================================================
#  5. (opcional) SWAP — pra VPS com pouca RAM não falhar no build
# ======================================================================
MEM_KB="$(awk '/MemTotal/{print $2}' /proc/meminfo)"
if [ "$MEM_KB" -lt 1500000 ] && [ ! -f /swapfile ]; then
  log "RAM baixa detectada — criando 2 GB de swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap de 2 GB ativo."
fi

# ======================================================================
#  6. CLONAR O CÓDIGO
# ======================================================================
log "7/12 — Baixando o código do projeto"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
  as_deploy "cd '$APP_DIR' && git fetch origin '$BRANCH' && git checkout '$BRANCH' && git reset --hard 'origin/$BRANCH'"
  ok "Repositório já existia — atualizado."
else
  # cria o diretório vazio e dá a posse ao usuário ANTES do clone — assim o
  # 'git clone' (que roda como esse usuário) consegue escrever.
  rm -rf "$APP_DIR"
  mkdir -p "$APP_DIR"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
  as_deploy "git clone -b '$BRANCH' '$CLONE_URL' '$APP_DIR'"
  ok "Repositório clonado em $APP_DIR."
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

# ======================================================================
#  7. BACKEND — .env, dependências, build
# ======================================================================
log "8/12 — Configurando o backend (NestJS)"
# O backend carrega .env.<NODE_ENV>; em produção isso é .env.production.
cat > "$APP_DIR/backend/.env.production" <<ENV
# Gerado automaticamente pelo setup.sh
NODE_ENV=production
PORT=${APP_PORT}
API_PREFIX=api

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=${DB_NAME}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Throttle (Rate Limiting)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# CORS
CORS_ORIGINS=https://${DOMAIN}${WWW_DOMAIN:+,https://${WWW_DOMAIN}}

# Logging
LOG_LEVEL=info

# Email (SMTP)
MAIL_HOST=${MAIL_HOST}
MAIL_PORT=${MAIL_PORT}
MAIL_SECURE=${MAIL_SECURE}
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_FROM=${MAIL_FROM}

# Frontend URL (usado nos links de e-mail)
FRONTEND_URL=https://${DOMAIN}
ENV
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/backend/.env.production"
chmod 600 "$APP_DIR/backend/.env.production"

as_deploy "cd '$APP_DIR/backend' && npm ci && npm run build"
ok "Backend instalado e compilado."

# ======================================================================
#  8. SERVIÇO SYSTEMD
# ======================================================================
log "9/12 — Criando o serviço systemd"
cat > /etc/systemd/system/${SERVICE}.service <<UNIT
[Unit]
Description=Ciano Cotas API
After=network.target mysql.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}/backend
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ${SERVICE}
systemctl restart ${SERVICE}
ok "Serviço '${SERVICE}' ativo (a API cria o schema e roda o seed na 1ª subida)."

# ======================================================================
#  9. FRONTEND — build
# ======================================================================
log "10/12 — Compilando o frontend (Vue/Vite)"
echo "VITE_API_URL=https://${DOMAIN}/api" > "$APP_DIR/frontend/.env.production"
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/frontend/.env.production"
as_deploy "cd '$APP_DIR/frontend' && npm ci && npm run build"
ok "Frontend compilado em frontend/dist."

# ======================================================================
#  10. NGINX
# ======================================================================
log "11/12 — Configurando o Nginx"
cat > /etc/nginx/sites-available/${SERVICE} <<NGINX
server {
    listen 80;
    server_name ${DOMAIN}${WWW_DOMAIN:+ ${WWW_DOMAIN}};

    root ${APP_DIR}/frontend/dist;
    index index.html;

    # API (proxy reverso para o NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    # Frontend (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    client_max_body_size 10M;
}
NGINX
ln -sf /etc/nginx/sites-available/${SERVICE} /etc/nginx/sites-enabled/${SERVICE}
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx configurado e recarregado."

# regra de sudo: o usuário pode reiniciar os serviços sem senha (pros deploys)
cat > /etc/sudoers.d/deploy-ciano <<SUDO
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart ${SERVICE}, /usr/bin/systemctl reload nginx
SUDO
chmod 440 /etc/sudoers.d/deploy-ciano

# ======================================================================
#  11. HTTPS (Let's Encrypt)
# ======================================================================
log "12/12 — Emitindo o certificado HTTPS"
CERT_FLAGS=(-d "$DOMAIN")
[ -n "$WWW_DOMAIN" ] && CERT_FLAGS+=(-d "$WWW_DOMAIN")
if certbot --nginx "${CERT_FLAGS[@]}" \
     --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  ok "HTTPS ativo."
  HTTPS_OK=1
else
  warn "Certbot falhou (DNS ainda não aponta pra esta VPS?)."
  warn "O site funciona em HTTP por enquanto. Quando o DNS propagar, rode:"
  warn "  sudo certbot --nginx ${CERT_FLAGS[*]}"
  HTTPS_OK=0
fi

# fail2ban — bane temporariamente IPs que erram a senha no SSH.
systemctl enable --now fail2ban
ok "fail2ban ativo — protege o SSH contra força bruta."

# ======================================================================
#  FIM
# ======================================================================
echo
echo "${C_OK}============================================================${C_OFF}"
echo "${C_OK}            INSTALAÇÃO CONCLUÍDA                            ${C_OFF}"
echo "${C_OK}============================================================${C_OFF}"
echo
echo "  Site .................: https://${DOMAIN}"
echo "  API ..................: https://${DOMAIN}/api"
echo "  Backend (interno) ....: http://127.0.0.1:${APP_PORT}"
echo
echo "${C_WARN}  GUARDE estes segredos (também estão em backend/.env.production):${C_OFF}"
echo "  Usuário do sistema .....: ${DEPLOY_USER}"
echo "  Senha do usuário .......: (a que você digitou)"
echo "  Senha do MySQL .........: ${DB_PASSWORD}"
echo "  JWT_SECRET .............: ${JWT_SECRET}"
echo
echo "  Comandos úteis:"
echo "    Logs da API ..........: journalctl -u ${SERVICE} -f"
echo "    Status ...............: systemctl status ${SERVICE}"
echo "    Reiniciar ............: sudo systemctl restart ${SERVICE}"
echo
echo "  Próximos deploys (atualizações):"
echo "    cd ${APP_DIR} && git pull \\"
echo "      && (cd backend  && npm ci && npm run build) \\"
echo "      && (cd frontend && npm ci && npm run build) \\"
echo "      && sudo systemctl restart ${SERVICE}"
echo
[ "${HTTPS_OK}" -eq 0 ] && echo "${C_WARN}  ! Configure o HTTPS quando o DNS propagar (veja acima).${C_OFF}"
if [ "$MAIL_MODE" = "1" ]; then
  echo "${C_WARN}  ! E-mails: usando o Postfix local. Eles podem cair no spam do destinatário.${C_OFF}"
  echo "${C_WARN}    - Para reduzir isso (de graça), adicione no DNS de ${DOMAIN} um registro SPF:${C_OFF}"
  echo "${C_WARN}        TXT  @  \"v=spf1 a mx ip4:<IP-DA-VPS> ~all\"${C_OFF}"
  echo "${C_WARN}    - Se nenhum e-mail chegar (nem no spam), o provedor da VPS pode estar${C_OFF}"
  echo "${C_WARN}      bloqueando a porta 25 de saída — peça a liberação ao suporte dele.${C_OFF}"
fi
echo
