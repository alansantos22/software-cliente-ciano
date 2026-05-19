#!/usr/bin/env bash
# =============================================================================
# Ciano Cotas - Instalação e deploy completo em VPS (Ubuntu 22.04 / 24.04)
# =============================================================================
# Script autossuficiente: clona o projeto, instala TODAS as dependências e
# deixa o sistema no ar. Pensado para rodar numa VPS limpa com um comando.
#
# USO (na VPS, como root):
#   wget https://raw.githubusercontent.com/alansantos22/software-cliente-ciano/main/setup.sh
#   bash setup.sh
#
# O que ele faz:
#   - Instala Node.js 22, MySQL 8, Nginx, Certbot, PM2 e ferramentas de build
#   - Clona o repositório do projeto em /var/www/ciano
#   - Cria o banco de dados e o usuário do MySQL
#   - Gera os arquivos .env do backend e frontend
#   - Instala dependências e builda backend + frontend
#   - Sobe a API com PM2 e configura o Nginx (frontend + proxy /api + SSL)
#
# É idempotente: pode ser executado novamente para atualizar o sistema.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# CONFIGURAÇÃO  ->  EDITE OS VALORES ABAIXO ANTES DE RODAR
# -----------------------------------------------------------------------------

# Domínio público do sistema (sem http/https). Ex.: cotas.suaempresa.com.br
DOMAIN="seudominio.com.br"

# E-mail usado pelo Certbot para emitir/renovar o certificado SSL.
SSL_EMAIL="seu-email@exemplo.com"

# --- Repositório -------------------------------------------------------------
REPO_URL="https://github.com/alansantos22/software-cliente-ciano.git"
BRANCH="main"
# Token do GitHub. OBRIGATÓRIO se o repositório for PRIVADO; deixe vazio se público.
# Crie em: GitHub > Settings > Developer settings > Personal access tokens.
GIT_TOKEN=""

# Pasta onde o projeto será clonado na VPS.
PROJECT_DIR="/var/www/ciano"

# --- Banco de dados ----------------------------------------------------------
DB_NAME="ciano_cotas"
DB_USER="ciano"
DB_PASSWORD="TROQUE_ESTA_SENHA_DO_BANCO"          # senha do usuário da aplicação
DB_ROOT_PASSWORD="TROQUE_A_SENHA_ROOT_DO_MYSQL"   # senha do root do MySQL

# --- JWT / segurança ---------------------------------------------------------
# Deixe vazio para o script gerar um segredo aleatório automaticamente.
JWT_SECRET=""

# --- E-mail (SMTP) -----------------------------------------------------------
MAIL_HOST="smtp.hostinger.com"
MAIL_PORT="465"
MAIL_SECURE="true"
MAIL_USER="adm@gshark.com.br"
MAIL_PASSWORD="TROQUE_A_SENHA_DO_EMAIL"
MAIL_FROM="Ciano Cotas <adm@gshark.com.br>"

# --- App ---------------------------------------------------------------------
APP_PORT="3000"          # porta interna da API (proxy reverso do Nginx aponta aqui)
NODE_MAJOR="22"          # versão major do Node.js

# Emitir certificado SSL com Certbot? (true/false)
# Use false se o DNS do domínio ainda não estiver apontando para esta VPS.
ENABLE_SSL="true"

# =============================================================================
# A PARTIR DAQUI NÃO É NECESSÁRIO EDITAR
# =============================================================================

log()  { echo -e "\n\033[1;36m==> $*\033[0m"; }
warn() { echo -e "\033[1;33m[aviso] $*\033[0m"; }
die()  { echo -e "\033[1;31m[erro] $*\033[0m"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Rode este script como root (ex.: sudo bash setup.sh)."

export DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
log "1/10 Atualizando o sistema e instalando pacotes base"
# -----------------------------------------------------------------------------
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git build-essential python3 ufw openssl

# -----------------------------------------------------------------------------
log "2/10 Clonando / atualizando o repositório do projeto"
# -----------------------------------------------------------------------------
if [ -n "$GIT_TOKEN" ]; then
  CLONE_URL="https://${GIT_TOKEN}@github.com/alansantos22/software-cliente-ciano.git"
else
  CLONE_URL="$REPO_URL"
fi

if [ -d "$PROJECT_DIR/.git" ]; then
  log "Repositório já existe, atualizando (git pull)..."
  git -C "$PROJECT_DIR" fetch origin "$BRANCH"
  git -C "$PROJECT_DIR" checkout "$BRANCH"
  git -C "$PROJECT_DIR" pull origin "$BRANCH"
else
  mkdir -p "$(dirname "$PROJECT_DIR")"
  git clone -b "$BRANCH" "$CLONE_URL" "$PROJECT_DIR"
fi

[ -d "$PROJECT_DIR/backend" ]  || die "Pasta backend não encontrada após o clone."
[ -d "$PROJECT_DIR/frontend" ] || die "Pasta frontend não encontrada após o clone."

if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="$(openssl rand -hex 48)"
  log "JWT_SECRET gerado automaticamente."
fi

# -----------------------------------------------------------------------------
log "3/10 Instalando Node.js ${NODE_MAJOR}.x e PM2"
# -----------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v
npm install -g pm2

# -----------------------------------------------------------------------------
log "4/10 Instalando e configurando MySQL Server"
# -----------------------------------------------------------------------------
apt-get install -y mysql-server
systemctl enable --now mysql

mysql --protocol=socket -uroot <<SQL || mysql -uroot -p"${DB_ROOT_PASSWORD}" <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASSWORD}';
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

log "Banco '${DB_NAME}' e usuário '${DB_USER}' prontos."

# -----------------------------------------------------------------------------
log "5/10 Instalando Nginx e Certbot"
# -----------------------------------------------------------------------------
apt-get install -y nginx
systemctl enable --now nginx
if [ "$ENABLE_SSL" = "true" ]; then
  apt-get install -y certbot python3-certbot-nginx
fi

# -----------------------------------------------------------------------------
log "6/10 Gerando arquivos .env"
# -----------------------------------------------------------------------------
BACKEND_ENV="$PROJECT_DIR/backend/.env.production"
cat > "$BACKEND_ENV" <<ENV
# Gerado por setup.sh
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
CORS_ORIGINS=https://${DOMAIN}

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
chmod 600 "$BACKEND_ENV"
log "Backend  -> $BACKEND_ENV"

FRONTEND_ENV="$PROJECT_DIR/frontend/.env.production"
cat > "$FRONTEND_ENV" <<ENV
VITE_API_URL=https://${DOMAIN}/api
ENV
log "Frontend -> $FRONTEND_ENV"

# -----------------------------------------------------------------------------
log "7/10 Instalando dependências e buildando o BACKEND"
# -----------------------------------------------------------------------------
cd "$PROJECT_DIR/backend"
npm ci || npm install
npm run build

# -----------------------------------------------------------------------------
log "8/10 Instalando dependências e buildando o FRONTEND"
# -----------------------------------------------------------------------------
cd "$PROJECT_DIR/frontend"
npm ci || npm install
npm run build   # gera frontend/dist

# -----------------------------------------------------------------------------
log "9/10 Subindo a API com PM2"
# -----------------------------------------------------------------------------
cd "$PROJECT_DIR/backend"
# A API cria o schema automaticamente (TypeORM synchronize) e roda o seed inicial.
pm2 delete ciano-api 2>/dev/null || true
NODE_ENV=production pm2 start dist/main.js --name ciano-api --time
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true

# -----------------------------------------------------------------------------
log "10/10 Configurando Nginx (frontend + proxy /api)"
# -----------------------------------------------------------------------------
NGINX_SITE="/etc/nginx/sites-available/ciano"
cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend (SPA Vue/Vite)
    root ${PROJECT_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API (proxy reverso para o NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    client_max_body_size 10M;
}
NGINX

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/ciano
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Firewall
ufw allow OpenSSH      >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable        >/dev/null 2>&1 || true

# SSL
if [ "$ENABLE_SSL" = "true" ]; then
  log "Emitindo certificado SSL para ${DOMAIN}"
  if certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${SSL_EMAIL}" --redirect; then
    log "SSL configurado com sucesso."
  else
    warn "Falha ao emitir SSL. Verifique se o DNS de ${DOMAIN} aponta para esta VPS"
    warn "e rode manualmente:  certbot --nginx -d ${DOMAIN}"
  fi
fi

# -----------------------------------------------------------------------------
echo
echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m  Instalação concluída!\033[0m"
echo -e "\033[1;32m============================================================\033[0m"
echo "  Site:      https://${DOMAIN}"
echo "  API:       https://${DOMAIN}/api"
echo "  Projeto:   ${PROJECT_DIR}"
echo "  Logs API:  pm2 logs ciano-api"
echo "  Status:    pm2 status"
echo "  Reiniciar: pm2 restart ciano-api"
echo
echo "  Para atualizar o sistema depois (novo deploy), basta rodar de novo:"
echo "    bash setup.sh"
echo
