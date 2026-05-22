#!/usr/bin/env bash
#
# setup.sh — Instalação inicial (bootstrap) do sistema Ciano Cotas
#            numa VPS Ubuntu limpa (22.04 / 24.04).
#
# Faz, de uma vez só, toda a configuração:
#   - atualiza o sistema e configura o firewall
#   - cria o usuário do sistema (o app NUNCA roda como root)
#   - instala Node 22, PM2, MySQL, Nginx, Git e Certbot
#   - cria o banco e o usuário do MySQL
#   - clona o repositório e gera os arquivos .env
#   - sobe o backend (NestJS) via PM2 e configura o boot automático
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

# helper: extrai um valor do .env (sem 'source' — evita erro com '<' '>' em valores)
get_env_var() {
  # $1 = arquivo, $2 = nome da variável
  grep -E "^$2=" "$1" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//'
}

# ======================================================================
#  FUNÇÕES DE TAREFAS INDIVIDUAIS (rodadas pelo menu)
# ======================================================================

# Cria/atualiza o /var/www/ciano/deploy.sh
create_deploy_script() {
  [ -d "$APP_DIR" ] || die "Diretório $APP_DIR não existe — rode a instalação completa primeiro."
  local OWNER
  OWNER="$(stat -c '%U' "$APP_DIR")"
  log "Criando script de deploy em ${APP_DIR}/deploy.sh"
  cat > "${APP_DIR}/deploy.sh" <<'DEPLOY'
#!/bin/bash
# deploy.sh — Atualiza o sistema Ciano Cotas na VPS (puxa código, builda, reinicia).
# Gerado automaticamente pelo setup.sh.
set -e

APP_DIR="/var/www/ciano"
SERVICE="ciano"
ENV_FILE="$APP_DIR/backend/.env.production"
MIGRATIONS_DIR="$APP_DIR/backend/database/migrations"

# Extrai só as variáveis do MySQL (sem 'source' — evita erro com '<' '>' em valores)
get_env() {
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//'
}
DB_USERNAME="$(get_env DB_USERNAME)"
DB_PASSWORD="$(get_env DB_PASSWORD)"
DB_DATABASE="$(get_env DB_DATABASE)"

echo "==> [1/6] Puxando atualizacoes do Git..."
cd "$APP_DIR"
git pull origin main

echo "==> [2/6] Aplicando migrations SQL pendentes..."
# Senha via env var (evita warning de senha na linha de comando)
export MYSQL_PWD="$DB_PASSWORD"
# Garante que a tabela de controle existe
mysql -u"$DB_USERNAME" "$DB_DATABASE" <<'SQL'
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL

if [ -d "$MIGRATIONS_DIR" ]; then
  for SQL_FILE in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    FILENAME=$(basename "$SQL_FILE")
    ALREADY=$(mysql -u"$DB_USERNAME" "$DB_DATABASE" -Nse \
      "SELECT COUNT(*) FROM migrations WHERE filename='$FILENAME';")
    if [ "$ALREADY" = "0" ]; then
      echo "   -> Aplicando $FILENAME..."
      mysql -u"$DB_USERNAME" "$DB_DATABASE" < "$SQL_FILE"
      mysql -u"$DB_USERNAME" "$DB_DATABASE" -e \
        "INSERT IGNORE INTO migrations (filename, status) VALUES ('$FILENAME', 'applied');"
      echo "   OK $FILENAME aplicado"
    else
      echo "   -- $FILENAME ja aplicado, pulando"
    fi
  done
fi
unset MYSQL_PWD

echo "==> [3/6] Build do Backend..."
cd "$APP_DIR/backend"
npm ci
npm run build

echo "==> [4/6] Build do Frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> [5/6] Reiniciando Backend (pm2 startOrReload — zero-downtime)..."
# startOrReload: cria o processo se ainda não existir, ou recarrega se já estiver rodando.
# (pm2 reload puro falha com "Process or Namespace ... not found" se o app nunca foi iniciado.)
cd "$APP_DIR/backend"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> [6/6] Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Deploy concluido com sucesso!"
pm2 status "$SERVICE"
DEPLOY
  chown "$OWNER:$OWNER" "${APP_DIR}/deploy.sh"
  chmod +x "${APP_DIR}/deploy.sh"
  ok "Script pronto: ${APP_DIR}/deploy.sh"
}

# Aplica migrations SQL pendentes (cria tabela de controle se não existir)
run_migrations_only() {
  local ENV_FILE="$APP_DIR/backend/.env.production"
  local MIGRATIONS_DIR="$APP_DIR/backend/database/migrations"
  [ -f "$ENV_FILE" ]        || die "Arquivo $ENV_FILE não encontrado — a VPS já foi configurada?"
  [ -d "$MIGRATIONS_DIR" ]  || die "Pasta $MIGRATIONS_DIR não encontrada — o repositório está clonado?"

  local DB_USERNAME DB_PASSWORD DB_DATABASE
  DB_USERNAME="$(get_env_var "$ENV_FILE" DB_USERNAME)"
  DB_PASSWORD="$(get_env_var "$ENV_FILE" DB_PASSWORD)"
  DB_DATABASE="$(get_env_var "$ENV_FILE" DB_DATABASE)"
  [ -n "$DB_USERNAME" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_DATABASE" ] \
    || die "Não consegui ler DB_USERNAME/DB_PASSWORD/DB_DATABASE de $ENV_FILE"

  export MYSQL_PWD="$DB_PASSWORD"
  log "Garantindo tabela de controle 'migrations'"
  mysql -u"$DB_USERNAME" "$DB_DATABASE" <<'SQL'
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
  ok "Tabela 'migrations' pronta."

  log "Aplicando migrations pendentes"
  local SQL_FILE FILENAME ALREADY
  for SQL_FILE in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    FILENAME=$(basename "$SQL_FILE")
    ALREADY=$(mysql -u"$DB_USERNAME" "$DB_DATABASE" -Nse \
      "SELECT COUNT(*) FROM migrations WHERE filename='$FILENAME';")
    if [ "$ALREADY" = "0" ]; then
      echo "   -> Aplicando $FILENAME..."
      mysql -u"$DB_USERNAME" "$DB_DATABASE" < "$SQL_FILE"
      mysql -u"$DB_USERNAME" "$DB_DATABASE" -e \
        "INSERT IGNORE INTO migrations (filename, status) VALUES ('$FILENAME', 'applied');"
      ok "$FILENAME aplicado"
    else
      echo "   -- $FILENAME já aplicado, pulando"
    fi
  done
  unset MYSQL_PWD

  log "Reiniciando o backend (${SERVICE}) via pm2"
  # startOrReload: cria o processo se ainda não existir, ou recarrega se já estiver rodando.
  sudo -u "$(stat -c '%U' "$APP_DIR")" bash -lc \
    "cd '$APP_DIR/backend' && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save" \
    || warn "pm2 não está rodando para esse usuário — verifique 'pm2 status' manualmente."
  ok "Backend reiniciado. Veja status: pm2 status"
}

# Migração automática de uma VPS antiga (systemd → PM2). Idempotente: pode
# rodar de novo numa VPS que já está em PM2 sem quebrar nada.
migrate_to_pm2() {
  [ -d "$APP_DIR" ] || die "Diretório $APP_DIR não existe — esta VPS ainda não tem o sistema instalado."

  local OWNER
  OWNER="$(stat -c '%U' "$APP_DIR")"
  [ -n "$OWNER" ] && id "$OWNER" &>/dev/null \
    || die "Não consegui detectar o usuário dono de $APP_DIR (ou ele não existe mais)."

  log "Migrando o backend de systemd → PM2 (usuário do app: $OWNER)"

  # helper local: executa um comando como o dono do app, com PATH de login
  run_as_owner() { sudo -u "$OWNER" bash -lc "$*"; }

  # 1. Para e remove o serviço systemd legado, se existir.
  if systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE}.service"; then
    log "[1/9] Desativando serviço systemd legado '${SERVICE}.service'"
    systemctl stop "${SERVICE}" 2>/dev/null || true
    systemctl disable "${SERVICE}" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE}.service"
    systemctl daemon-reload
    ok "Serviço systemd legado removido."
  else
    ok "[1/9] Nenhum serviço systemd legado encontrado — nada a remover."
  fi

  # 2. Instala PM2 globalmente, se necessário.
  if command -v pm2 &>/dev/null; then
    ok "[2/9] PM2 $(pm2 -v) já instalado."
  else
    log "[2/9] Instalando PM2 globalmente"
    command -v npm &>/dev/null \
      || die "npm não está instalado — rode primeiro a instalação completa (opção 1)."
    npm install -g pm2
    ok "PM2 $(pm2 -v) instalado."
  fi

  # 3. Atualiza o repo para garantir que tem o ecosystem.config.cjs versionado.
  log "[3/9] Atualizando o repositório (git pull)"
  run_as_owner "cd '$APP_DIR' && git pull --ff-only origin main" \
    || warn "git pull falhou — talvez haja conflitos locais. Continuando, mas verifique manualmente."

  # 4. Garante que o ecosystem.config.cjs existe (fallback se o pull não trouxe).
  if [ ! -f "$APP_DIR/backend/ecosystem.config.cjs" ]; then
    warn "ecosystem.config.cjs não encontrado — gerando um padrão."
    cat > "$APP_DIR/backend/ecosystem.config.cjs" <<'ECO'
module.exports = {
  apps: [{
    name: 'ciano',
    script: 'dist/main.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    max_restarts: 10,
    min_uptime: '10s',
    env: { NODE_ENV: 'production' },
  }],
};
ECO
    chown "$OWNER:$OWNER" "$APP_DIR/backend/ecosystem.config.cjs"
    ok "ecosystem.config.cjs gerado."
  else
    ok "[4/9] ecosystem.config.cjs presente."
  fi

  # 5. Garante que existe um build do backend (sem dist/main.js o pm2 não tem
  # o que rodar). Se faltar, compila.
  if [ ! -f "$APP_DIR/backend/dist/main.js" ]; then
    log "[5/9] Build do backend não encontrado — compilando (npm ci + npm run build)"
    run_as_owner "cd '$APP_DIR/backend' && npm ci && npm run build"
    ok "Backend compilado."
  else
    ok "[5/9] Build do backend já existe."
  fi

  # 6. Sobe o backend pelo PM2 a partir do ecosystem versionado.
  log "[6/9] Subindo o backend via PM2"
  run_as_owner "cd '$APP_DIR/backend' && pm2 startOrReload ecosystem.config.cjs --update-env"
  run_as_owner "pm2 save"
  ok "Backend rodando via PM2."

  # 7. Instala e configura a rotação de logs (evita o disco encher).
  log "[7/9] Configurando rotação automática de logs"
  run_as_owner "pm2 install pm2-logrotate" >/dev/null
  run_as_owner "pm2 set pm2-logrotate:max_size 10M" >/dev/null
  run_as_owner "pm2 set pm2-logrotate:retain 14" >/dev/null
  run_as_owner "pm2 set pm2-logrotate:compress true" >/dev/null
  ok "pm2-logrotate ativo (10 MB por arquivo / 14 arquivos / gzip)."

  # 8. Habilita auto-start no boot via o unit pm2-<user>.service.
  log "[8/9] Habilitando auto-start no boot da VPS"
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$OWNER" --hp "/home/$OWNER" >/dev/null
  systemctl enable "pm2-${OWNER}" >/dev/null 2>&1 || true
  ok "pm2-${OWNER}.service ativo — backend sobe sozinho após reboot."

  # 9. Atualiza sudoers: pm2 não precisa de sudo; só o reload do Nginx.
  log "[9/9] Atualizando sudoers"
  cat > /etc/sudoers.d/deploy-ciano <<SUDO
${OWNER} ALL=(root) NOPASSWD: /usr/sbin/nginx, /usr/bin/systemctl reload nginx
SUDO
  chmod 440 /etc/sudoers.d/deploy-ciano
  ok "Sudoers ajustado (pm2 dispensa privilégios)."

  # Recria o deploy.sh para usar comandos pm2.
  create_deploy_script

  echo
  echo "${C_OK}============================================================${C_OFF}"
  echo "${C_OK}           MIGRAÇÃO PARA PM2 CONCLUÍDA                      ${C_OFF}"
  echo "${C_OK}============================================================${C_OFF}"
  echo
  echo "Status do backend:"
  run_as_owner "pm2 status" || true
  echo
  echo "Comandos úteis (logado como '$OWNER'):"
  echo "  pm2 logs ciano                  Logs em tempo real"
  echo "  pm2 status                      Lista apps (CPU, RAM, restarts)"
  echo "  pm2 monit                       Monitor interativo"
  echo "  pm2 reload ciano                Reiniciar sem downtime"
  echo "  sudo systemctl status pm2-${OWNER}    Verificar auto-start de boot"
  echo
  echo "${C_WARN}IMPORTANTE — monitorar quedas:${C_OFF}"
  echo "  PM2 reinicia o app em caso de crash, mas não te avisa. Cadastre"
  echo "  um monitor de uptime grátis (UptimeRobot, Better Stack, etc.)"
  echo "  apontando para https://SEU-DOMINIO/api — ele te avisa por e-mail"
  echo "  em segundos se a API ficar fora do ar."
  echo
}

# ======================================================================
#  MENU INICIAL — escolha o que rodar
# ======================================================================
echo
echo "${C_INFO}========================================================${C_OFF}"
echo "${C_INFO}     Ciano Cotas — Setup / Manutenção da VPS           ${C_OFF}"
echo "${C_INFO}========================================================${C_OFF}"
echo
echo "  O que você quer fazer?"
echo "    ${C_OK}1${C_OFF}) Instalação completa (VPS nova / primeira vez)"
echo "    ${C_OK}2${C_OFF}) Apenas aplicar migrations SQL pendentes (corrige tabela 'migrations')"
echo "    ${C_OK}3${C_OFF}) Apenas (re)criar o script /var/www/ciano/deploy.sh"
echo "    ${C_OK}4${C_OFF}) Migrar backend de systemd → PM2 (em VPS já instalada)"
echo "    ${C_OK}5${C_OFF}) Sair"
echo
read -rp "Opção [1]: " MENU_OPT
MENU_OPT="${MENU_OPT:-1}"

case "$MENU_OPT" in
  2) run_migrations_only; exit 0 ;;
  3) create_deploy_script; exit 0 ;;
  4) migrate_to_pm2; exit 0 ;;
  5) echo "Saindo."; exit 0 ;;
  1) : ;;   # segue o fluxo de instalação completa abaixo
  *) die "Opção inválida: $MENU_OPT" ;;
esac

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

# PM2 — gerenciador de processo do backend (substitui systemd para o app Node).
if command -v pm2 &>/dev/null; then
  ok "PM2 $(pm2 -v) já instalado."
else
  npm install -g pm2
  ok "PM2 $(pm2 -v) instalado."
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
# Aspas obrigatórias — o valor contém '<' e '>' que quebram 'source' em shell
MAIL_FROM="${MAIL_FROM}"

# Frontend URL (usado nos links de e-mail)
FRONTEND_URL=https://${DOMAIN}
ENV
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/backend/.env.production"
chmod 600 "$APP_DIR/backend/.env.production"

as_deploy "cd '$APP_DIR/backend' && npm ci && npm run build"
ok "Backend instalado e compilado."

# ======================================================================
#  8. PM2 — gerenciador de processo do backend
# ======================================================================
log "9/12 — Subindo o backend via PM2"

# Se existir um serviço systemd legado de uma instalação anterior, desativa pra
# não brigar pela porta 3000 com o pm2.
if systemctl list-unit-files | grep -q "^${SERVICE}.service"; then
  warn "Detectado serviço systemd legado '${SERVICE}.service' — desativando."
  systemctl stop "${SERVICE}" 2>/dev/null || true
  systemctl disable "${SERVICE}" 2>/dev/null || true
  rm -f "/etc/systemd/system/${SERVICE}.service"
  systemctl daemon-reload
fi

# Sobe o app pelo ecosystem.config.cjs (versionado no repo). Rodar como o
# usuário do deploy — o pm2 escreve metadados em ~/.pm2.
as_deploy "cd '$APP_DIR/backend' && pm2 startOrReload ecosystem.config.cjs --update-env"
as_deploy "pm2 save"

# Instala o módulo de rotação de logs (evita ~/.pm2/logs crescer indefinidamente).
as_deploy "pm2 install pm2-logrotate"
as_deploy "pm2 set pm2-logrotate:max_size 10M"
as_deploy "pm2 set pm2-logrotate:retain 14"
as_deploy "pm2 set pm2-logrotate:compress true"

# Cria/habilita o unit do systemd que sobe o pm2 do usuário no boot da VPS.
# Rodando como root com -u/--hp, o próprio pm2 instala o unit "pm2-<user>.service".
log "Habilitando pm2 para iniciar no boot da VPS"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${DEPLOY_USER}" --hp "/home/${DEPLOY_USER}" >/dev/null
systemctl enable "pm2-${DEPLOY_USER}" >/dev/null 2>&1 || true
ok "Backend rodando via PM2 (start automático no boot)."

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

# regra de sudo: o usuário pode recarregar/testar o Nginx sem senha (pros deploys).
# O backend é gerenciado pelo pm2, que NÃO precisa de sudo.
cat > /etc/sudoers.d/deploy-ciano <<SUDO
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/sbin/nginx, /usr/bin/systemctl reload nginx
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
#  13. SCRIPT DE DEPLOY — para atualizações futuras
# ======================================================================
create_deploy_script

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
echo "  Comandos úteis (logado como '${DEPLOY_USER}'):"
echo "    Logs da API ..........: pm2 logs ${SERVICE}"
echo "    Logs (últimas 200) ...: pm2 logs ${SERVICE} --lines 200 --nostream"
echo "    Status / CPU / RAM ...: pm2 status     (ou: pm2 monit)"
echo "    Reiniciar ............: pm2 reload ${SERVICE}   (zero-downtime)"
echo "    Parar ................: pm2 stop ${SERVICE}"
echo
echo "  Monitorar QUEDAS (recomendado):"
echo "    Cadastre um monitor de uptime grátis (UptimeRobot, Better Stack, etc.)"
echo "    apontando para https://${DOMAIN}/api — ele te avisa por e-mail/SMS"
echo "    em segundos se a API ficar fora do ar."
echo
echo "  Próximos deploys (atualizações):"
echo "    ${APP_DIR}/deploy.sh"
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
