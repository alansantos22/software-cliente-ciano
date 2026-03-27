#!/usr/bin/env bash
# ============================================================
# Script de execução dos testes E2E — Sistema Ciano
# Uso: ./run-e2e-tests.sh [api|ui|all|security|report]
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

E2E_DIR="$(cd "$(dirname "$0")/e2e" && pwd)"
MODE="${1:-all}"

log() { echo -e "${CYAN}[E2E]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERRO]${NC} $1"; }

# ─── Verificar serviços ─────────────────────────────────────
check_service() {
  local name=$1
  local url=$2
  if curl -s --max-time 3 "$url" > /dev/null 2>&1; then
    ok "$name está rodando em $url"
    return 0
  else
    err "$name NÃO encontrado em $url"
    return 1
  fi
}

log "Verificando serviços..."
BACKEND_OK=true
FRONTEND_OK=true

check_service "Backend"  "http://localhost:3000/api/auth/me" || BACKEND_OK=false
check_service "Frontend" "http://localhost:5173"             || FRONTEND_OK=false

if [ "$MODE" = "api" ] && [ "$BACKEND_OK" = "false" ]; then
  err "Backend não está rodando. Inicie com: cd backend && npm run start:dev"
  exit 1
fi

if [ "$MODE" = "ui" ] && { [ "$BACKEND_OK" = "false" ] || [ "$FRONTEND_OK" = "false" ]; }; then
  err "Backend e Frontend devem estar rodando para testes de UI."
  exit 1
fi

if [ "$MODE" = "all" ] && { [ "$BACKEND_OK" = "false" ] || [ "$FRONTEND_OK" = "false" ]; }; then
  warn "Nem todos os serviços estão rodando. Executando apenas os disponíveis."
fi

# ─── Instalar dependências ───────────────────────────────────
cd "$E2E_DIR"

if [ ! -d "node_modules" ]; then
  log "Instalando dependências..."
  npm install
  npx playwright install chromium --with-deps
  ok "Dependências instaladas."
fi

# ─── Executar testes ─────────────────────────────────────────
log "Modo: ${MODE}"
echo ""

case "$MODE" in
  api)
    log "Executando testes de API..."
    npm run test:api
    ;;
  ui)
    log "Executando testes de UI..."
    npm run test:ui
    ;;
  security)
    log "Executando testes de segurança..."
    npm run test:security
    ;;
  auth)
    log "Executando testes de autenticação..."
    npm run test:auth
    ;;
  report)
    log "Abrindo relatório..."
    npm run test:report
    ;;
  all|*)
    if [ "$BACKEND_OK" = "true" ]; then
      log "Executando testes de API..."
      npm run test:api || warn "Alguns testes de API falharam."
    fi
    if [ "$FRONTEND_OK" = "true" ] && [ "$BACKEND_OK" = "true" ]; then
      log "Executando testes de UI..."
      npm run test:ui || warn "Alguns testes de UI falharam."
    fi
    ;;
esac

echo ""
ok "Testes concluídos! Relatório disponível em: e2e/playwright-report/index.html"
echo -e "  Execute ${CYAN}./run-e2e-tests.sh report${NC} para visualizar."
