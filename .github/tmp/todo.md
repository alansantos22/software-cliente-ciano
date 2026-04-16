# TODO — 21 CORREÇÕES SISTEMA CIANO

**Data/Hora:** 2026-04-16
**Sessão:** finalizacao-sistema-blocos
**Status Geral:** ⏳ EM PROGRESSO

---

## 🔴 BLOCO 1 — MOTOR DE PREÇO (Críticos) ✅ COMPLETO

- [x] **1.1** Corrigir fases: max=2 (R$3.000), depois split — `split-engine.service.ts` ✅
- [x] **1.2** Segurar preço até meia-noite (pendingEvent) — `split-engine.service.ts` + `quota-system-state.entity.ts` ✅
- [x] **1.3** Notificação in-app ao bater meta — `notifications.service.ts` ✅
- [x] **1.4** Só cotas compradas contam no lote — Verificado OK ✅
- [x] **1.5** Corrigir contagem lotSold no admin — `admin.service.ts` ✅
- [x] **1.6** Remover "Ajustar Constante" (front+back) — `AdminPriceEngine.vue` + `admin.service.ts` + DTO ✅
- [x] **1.7** Migration: pending_event + pix nullable — `002-add-pending-event-and-fix-pix-nullable.sql` ✅
- [x] **1.8** Testes reescritos — `split-engine.service.spec.ts` ✅
- [x] **1.9** Compilação backend + frontend OK ✅

---

## 🔴 BLOCO 2 — BÔNUS E PAGAMENTOS (Críticos) ✅ COMPLETO

- [x] **2.1** Primeira compra: 10% se sponsor tem cotas, 5% se não — `bonus-calculator.service.ts` ✅
- [x] **2.2** Erro 500 generate-batch (pix_key_type null) — `admin.service.ts` + `payout-request.entity.ts` ✅
- [x] **2.3** Detalhamento das faturas (breakdown por tipo de bônus) ✅
  - Backend: networkAmount agora = ganhos do mês (query earnings por bonusType)
  - Backend: 5 novas colunas na entity (firstPurchase, repurchase, team, leadership, lifetime)
  - Frontend: Modal de detalhes com composição completa do valor
  - Migration: `003-add-payout-breakdown-columns.sql`

---

## 🟠 BLOCO 3 — HISTÓRICO E DASHBOARD ✅ COMPLETO

- [x] **3.1** Histórico vazio — earnings não filtra por mês selecionado ✅
  - Backend: `getEarnings()` agora aceita param `month` e filtra por `referenceMonth`
  - Frontend: `earningsService.list()` passa `month`, `loadEarnings()` envia `selectedMonth.value`

- [x] **3.2** NaN no histórico ✅
  - `amount: Number(e.amount) || 0` no mapeamento
  - `formatCurrency()` protegida com `Number(value) || 0`

- [x] **3.3** Remover "Saldo Líquido" do histórico ✅
  - Card removido do template, grid ajustado para `repeat(3, 1fr)`

- [x] **3.4** Caixa de Dividendos — nota de estimativa ✅
  - Backend: retorna `dividendPoolNote` indicando que é estimativa
  - Frontend: exibe nota em itálico abaixo do subtítulo

---

## 🟠 BLOCO 4 — TÍTULOS E NÍVEIS ✅ COMPLETO

- [x] **4.1** Separar nível societário do título de rede ✅
  - Agora usa `kpiRes.data.title` (none/bronze/silver/gold/diamond)
  - Mapeamento EN→PT: silver→prata, gold→ouro, diamond→diamante
  - Interface `DashboardKpiData` atualizada com `title`, `directCount`, `daysUntilExpiry`

- [x] **4.2** Progressão mostrando meta errada ✅
  - `levelProgression` agora é bronze→prata→ouro→diamante (sem partner levels)
  - `levelTargets` corrigido: prata=1, ouro=2, diamante=3 (bronzes qualificados)
  - `currentValue` usa `directCount` ao invés de `qualifiedCount || quotaBalance`

---

## 🟡 BLOCO 5 — UX/UI ✅ COMPLETO

- [x] **5.1** Tooltips não somem no /quotas ✅
  - Adicionado `@mouseleave="activeTierIndex = -1"` no `.tier-node__bubble`

- [x] **5.2** Scroll para erros no cadastro ✅
  - `handleRegister()` faz `scrollIntoView({ behavior: 'smooth', block: 'center' })` no primeiro campo com erro

- [x] **5.3** Cards do Admin agrupados em telas menores ✅
  - Grid alterado para `repeat(auto-fit, minmax(220px, 1fr))` — responsivo fluido

- [x] **5.4** Menu suspenso travado no Admin ✅
  - `toggleMenu()` agora detecta espaço abaixo e abre para cima quando necessário

- [x] **5.5** Editar perfil — tipo da chave PIX ✅
  - Adicionado `<select>` para pixKeyType (CPF/Email/Telefone/Aleatória)
  - Form state, loadFormData, saveFinancialData atualizados
  - Traduções i18n adicionadas (pt-BR, en)

- [x] **5.6** Admin retirar cotas de split e admin-granted ✅
  - `removeQuotas()` agora aceita `source: 'admin' | 'split'`
  - DTO atualizado com campo `source` opcional
  - Decrementa campo correto (`adminGrantedQuotas` ou `splitQuotas`)

---

## 🟡 BLOCO 6 — ERROS DE INFRAESTRUTURA

- [x] **6.1** Constante de estimativa — REMOVIDA ✅ (feito no Bloco 1)

- [ ] **6.2** Erros 401 Unauthorized
  - **Problema**: Token JWT expirando, refresh token possivelmente não funciona
  - **Investigação**: Verificar interceptor axios e refresh token

- [ ] **6.3** Erros 400 na compra (checkout bloqueando)
  - **Problema**: Pode ser maxQuotasPerUser atingido ou rate limit
  - **Correção**: Mensagem de erro mais descritiva no backend + exibir no frontend

- [ ] **6.4** Saúde da rede não aparecendo
  - **Problema**: `kpi.activeDirects` e `kpi.totalDirects` possivelmente vindo 0 do backend
  - **Investigação**: Verificar endpoint `dashboard/kpis`

---

## 📊 PROGRESSO GERAL

| Bloco | Status | Concluído |
|-------|--------|-----------|
| 1 — Motor de Preço | ✅ COMPLETO | 9/9 |
| 2 — Bônus/Pagamentos | ✅ COMPLETO | 3/3 |
| 3 — Histórico/Dashboard | ✅ COMPLETO | 4/4 |
| 4 — Títulos/Níveis | ✅ COMPLETO | 2/2 |
| 5 — UX/UI | ✅ COMPLETO | 6/6 |
| 6 — Infraestrutura | ⏳ PARCIAL | 1/4 |
| **TOTAL** | | **13/28** |

---

**Última Atualização:** 2026-04-16
# TODO - BLOCO 1: Motor de Preço + Bônus + Erro Generate-Batch

**Data/Hora:** 2026-04-16
**Sessão:** bloco-1-motor-preco
**Status Geral:** ⏳ EM PROGRESSO

---

## ✅ [2026-02-26] — Regras de Negócio: Pagamento / Corte / Ganhos de Rede

### Arquivos modificados:
- `frontend/src/mocks/dashboard.mock.ts`
- `frontend/src/features/dashboard/views/DashboardView.vue`
- `frontend/src/mocks/earnings.mock.ts`
- `frontend/src/features/earnings/views/EarningsView.vue`

### Regra 1 — Valor a receber (exibido só 5 dias antes do pagamento)
- Dia de pagamento corrigido: **dia 5 → dia 15**
- `getPaymentWindowStatus(paymentDay)` exportada de `dashboard.mock.ts` — retorna `{ windowOpen, daysUntilPayment, nextPaymentDate }`
- `DashboardKpiData` recebe: `paymentDay`, `paymentWindowOpen`, `daysUntilPayment`, `nextPaymentDate`
- Card "Saldo a Receber" no dashboard: fora da janela → estado bloqueado (ícone 🔒, valor `•••••`, mensagem "aguardando lucro das pousadas"); dentro da janela → valor exibido normalmente

### Regra 2 — Corte de recebimento (último dia do mês anterior)
- `getCutoffDate(referenceMonth)` e `isAfterCutoff(purchaseDate, referenceMonth)` exportadas de `earnings.mock.ts`
- `EarningEntry` recebe `cutoffEligible: boolean`
- `MonthlyEarningSummary` recebe `cutoffDate: string` (YYYY-MM-DD)
- `EarningsView`: badge **"Próx. Mês"** na coluna Data quando `cutoffEligible === false`
- 5 novos entries de Fev 2026 adicionados para demonstrar a regra em produção

### Regra 3 — Ganhos de Rede = ganhos totais − ganhos de cotas
- `networkEarnings` = Comissão + Bônus (primeira compra, recompra, equipe, liderança)
- `quotaEarnings` = Dividendos apenas
- `MonthlyEarningSummary` e `DashboardKpiData` recebem ambos os campos
- `EarningsView` summary cards atualizados: "Ganhos de Rede" (teal) + "Ganhos de Cotas" (purple)
- Filtros de grupo: chips "Ganhos de Rede" e "Ganhos de Cotas" com separador visual

---

---

## 🎯 OBJETIVO PRINCIPAL

Sistema completo de gestão de cotas para o Grupo de Pousadas Ciano.

## 📋 DECISÕES TÉCNICAS

| Decisão | Escolha |
|---------|---------|
| Backend | NestJS + Fastify + TypeORM |
| Frontend | Vue 3 + TypeScript + Pinia + SCSS |
| Banco de Dados | MySQL 8.0+ (InnoDB) |
| Auth | JWT (access + refresh) + Argon2 |
| Gateway Pgto | Interface genérica (decidir depois) |
| i18n | PT-BR + EN |
| Deploy | Local por agora |

---

## 🧠 ESTRATÉGIA DE DESENVOLVIMENTO

```
ETAPA 1 → Scaffolding (base + deps)
ETAPA 2 → Frontend completo com MOCKS (cliente valida visualmente)
ETAPA 3 → Migrations (schema completo do banco)
ETAPA 4 → Backend (interfaces já definidas + migrations = services fáceis)
ETAPA 5 → Plug incremental (terminou login back? pluga login back<>front)
```

**Por quê:**
- Cliente vê resultado visual RÁPIDO e valida se é isso que quer
- Backend demora mais → ter visual pronto mitiga risco de retrabalho
- Migrations primeiro → backend já sabe o que receber/enviar
- Plug incremental → testa cada feature isoladamente

---

# ═══════════════════════════════════════════════
# ETAPA 1 — SCAFFOLDING (Base + Dependências) ✅ COMPLETO
# ═══════════════════════════════════════════════

> ✅ CONCLUÍDO - Instalar tudo, configurar projetos, deixar pronto para codar.

## 1.1 — Backend: Scaffold NestJS ✅

- [x] **1.1.1** — Inicializar NestJS + Fastify adapter ✅
- [x] **1.1.2** — Instalar deps: TypeORM, mysql2, argon2, passport, jwt, throttler, schedule, config, class-validator, class-transformer ✅
- [x] **1.1.3** — Estrutura de pastas (config/, common/, core/, modules/, jobs/, shared/) ✅
- [x] **1.1.4** — Configs base: `.env.development`, `.env.example`, `database.config.ts`, `jwt.config.ts`, `app.config.ts` ✅
- [x] **1.1.5** — ValidationPipe global, CORS, logger (Winston) ✅
- [x] **1.1.6** — Rate limiting base (@nestjs/throttler) ✅

## 1.2 — Frontend: Scaffold Vue 3 ✅

- [x] **1.2.1** — Inicializar Vue 3 + Vite + TypeScript ✅
- [x] **1.2.2** — Instalar deps: pinia, vue-router, axios, sass, vee-validate, yup, @vueuse/core, vue-i18n ✅
- [x] **1.2.3** — Estrutura de pastas ✅
- [x] **1.2.4** — SCSS base: paleta de cores Ciano (azul/verde/natureza), tipografia, espaçamento ✅
- [x] **1.2.5** — i18n setup (PT-BR + EN) com lazy loading ✅
- [x] **1.2.6** — Axios instance com interceptors (preparado para token) ✅
- [x] **1.2.7** — Vue Router com guards placeholder (auth, admin, guest) ✅
- [x] **1.2.8** — Pinia stores base (auth.store, app.store) ✅

## 1.3 — Frontend: Design System Base ✅

- [x] **1.3.1** — `DsButton` ✅
- [x] **1.3.2** — `DsInput` ✅
- [x] **1.3.3** — `DsCard` ✅
- [x] **1.3.4** — `DsModal` ✅
- [x] **1.3.5** — `DsTable` ✅
- [x] **1.3.6** — `DsBadge` ✅
- [x] **1.3.7** — `DsTooltip` ✅
- [x] **1.3.8** — `DsDropdown` ✅
- [x] **1.3.9** — `DsAlert` ✅
- [x] **1.3.10** — `DsAccordion` ✅
- [x] **1.3.11** — `DsTreeList` ✅
- [x] **1.3.12** — `DsStatCard` ✅
- [x] **1.3.13** — `DsCopyButton` ✅
- [x] **1.3.14** — `DsMonthPicker` ✅
- [x] **1.3.15** — `DsEmptyState` ✅

## 1.4 — Mocks: Dados Fake ✅

- [x] **1.4.1** — `mocks/users.mock.ts` ✅
- [x] **1.4.2** — `mocks/quotas.mock.ts` ✅
- [x] **1.4.3** — `mocks/earnings.mock.ts` ✅
- [x] **1.4.4** — `mocks/network.mock.ts` ✅
- [x] **1.4.5** — `mocks/payouts.mock.ts` ✅
- [x] **1.4.6** — `mocks/financial.mock.ts` ✅
- [x] **1.4.7** — `mocks/index.ts` ✅

---

# ═══════════════════════════════════════════════
# ETAPA 2 — FRONTEND COMPLETO COM MOCKS ✅ COMPLETO
# ═══════════════════════════════════════════════

> ✅ CONCLUÍDO - Todas as telas funcionais com dados mock. Cliente valida visual e fluxos.
> Build passando, dev server rodando em http://localhost:5173/

## 2.1 — Auth: Login + Recuperação (FE-01) ✅

- [x] **2.1.1** — `LoginView.vue` — Layout da tela de login ✅
- [x] **2.1.2** — `LoginForm/` — Email, senha, checkbox "Lembrar-me", link "Esqueci a senha" ✅
- [x] **2.1.3** — Validação: email formato, senha min 8 chars, mensagens de erro inline ✅
- [x] **2.1.4** — `ForgotPasswordView.vue` — Form com campo de email + feedback "enviado" ✅
- [x] **2.1.5** — `ResetPasswordView.vue` — Form com nova senha + confirmação ✅
- [x] **2.1.6** — `auth.service.ts` — aponta para mock: login retorna token fake ✅
- [x] **2.1.7** — `auth.store.ts` — user, token, isAuthenticated, rememberMe ✅
- [x] **2.1.8** — Router guards: redireciona `/login` se não autenticado ✅
- [x] **2.1.9** — Responsivo: mobile-first ✅
- [x] **2.1.10** — Rotas: `/login`, `/forgot-password`, `/reset-password/:token` ✅

## 2.2 — Landing Page do Afiliado (FE-08) ✅

- [x] **2.2.1** — `LandingView.vue` — Página pública completa ✅
- [x] **2.2.2** — Seção Hero ✅
- [x] **2.2.3** — Seção Títulos/Níveis ✅
- [x] **2.2.4** — Seção Bonificações ✅
- [x] **2.2.5** — Seção FAQ ✅
- [x] **2.2.6** — CTA ✅
- [x] **2.2.7** — Tracking ✅
- [x] **2.2.8** — Responsivo ✅
- [x] **2.2.9** — SEO ✅

## 2.3 — Cadastro por Patrocinador (FE-07) ✅

- [x] **2.3.1** — `RegisterNewUserView.vue` — Tela de cadastro ✅
- [x] **2.3.2** — `RegisterForm/` ✅
- [x] **2.3.3** — `QuotaPurchaseSelector/` ✅
- [x] **2.3.4** — `RegistrationSuccess/` ✅
- [x] **2.3.5** — Validações ✅
- [x] **2.3.6** — `onboarding.service.ts` ✅
- [x] **2.3.7** — Fluxo completo ✅
- [x] **2.3.8** — Rota: `/register-user` ✅

## 2.4 — Dashboard do Usuário (FE-03) ✅

- [x] **2.4.1** — `DashboardView.vue` — Layout principal pós-login ✅
- [x] **2.4.2** — `CopyReferralLink/` ✅
- [x] **2.4.3** — `SalesCards/` ✅
- [x] **2.4.4** — `EarningsCards/` ✅
- [x] **2.4.5** — `TitleBadge/` ✅
- [x] **2.4.6** — `ActivityStatus/` ✅
- [x] **2.4.7** — `LostEarningsAlert/` ✅
- [x] **2.4.8** — `EarningsHistory/` ✅
- [x] **2.4.9** — `dashboard.service.ts` ✅
- [x] **2.4.10** — `dashboard.store.ts` ✅
- [x] **2.4.11** — Cenários de exibição condicional ✅
- [x] **2.4.12** — Rota: `/dashboard` ✅

## 2.5 — Rede do Usuário (FE-04) ✅

- [x] **2.5.1** — `NetworkView.vue` — Página da rede ✅
- [x] **2.5.2** — `NetworkTree/` — Tree list usando DsTreeList ✅
- [x] **2.5.3** — `NetworkNode/` ✅
- [x] **2.5.4** — `NetworkFilter/` ✅
- [x] **2.5.5** — `UserDetailPanel/` ✅
- [x] **2.5.6** — Expandir nó ✅
- [x] **2.5.7** — Filtro ✅
- [x] **2.5.8** — `network.service.ts` ✅
- [x] **2.5.9** — `network.store.ts` ✅
- [x] **2.5.10** — Placeholder ✅
- [x] **2.5.11** — Rota: `/network` ✅

## 2.6 — Checkout de Cotas (FE-05) ✅

- [x] **2.6.1** — `CheckoutView.vue` — Tela de compra ✅
- [x] **2.6.2** — `QuotaSelector/` ✅
- [x] **2.6.3** — `OrderSummary/` ✅
- [x] **2.6.4** — `PaymentInstructions/` ✅
- [x] **2.6.5** — `CheckoutConfirmationView.vue` ✅
- [x] **2.6.6** — `PurchaseConfirmation/` ✅
- [x] **2.6.7** — `checkout.service.ts` ✅
- [x] **2.6.8** — Fluxo completo ✅
- [x] **2.6.9** — Rotas: `/checkout`, `/checkout/confirmation/:transactionId` ✅

## 2.7 — Página Promo de Cotas + FAQ (FE-06) ✅

- [x] **2.7.1** — `QuotaInfoView.vue` — Página informativa ✅
- [x] **2.7.2** — Seção Pacotes ✅
- [x] **2.7.3** — Seção Avisos ✅
- [x] **2.7.4** — Seção Níveis Sócio ✅
- [x] **2.7.5** — Seção FAQ ✅
- [x] **2.7.6** — Nota visual ✅
- [x] **2.7.7** — Contadores ✅
- [x] **2.7.8** — CTA ✅
- [x] **2.7.9** — Rota: `/quotas` ✅

## 2.8 — Dashboard Admin (FE-02) ✅

- [x] **2.8.1** — `AdminDashboardView.vue` — Visão geral admin ✅
- [x] **2.8.2** — `AdminOverviewCards/` ✅
- [x] **2.8.3** — `AdminPayoutsView.vue` — Listas de pagamento mensal ✅
- [x] **2.8.4** — `MonthSelector/` ✅
- [x] **2.8.5** — `PayoutStatus/` ✅
- [x] **2.8.6** — `PayoutTable/` ✅
- [x] **2.8.7** — `PayoutTotals/` ✅
- [x] **2.8.8** — `ExportButton/` ✅
- [x] **2.8.9** — Filtro ✅
- [x] **2.8.10** — Consultar mês anterior ✅
- [x] **2.8.11** — `AdminFinancialConfigView.vue` ✅
- [x] **2.8.12** — `FinancialConfigForm/` ✅
- [x] **2.8.13** — `admin.service.ts` ✅
- [x] **2.8.14** — `admin.store.ts` ✅
- [x] **2.8.15** — Rotas: `/admin`, `/admin/payouts`, `/admin/financial` ✅

## 2.9 — Layout e Navegação Global ✅

- [x] **2.9.1** — `AppLayout.vue` — Layout com sidebar/navbar ✅
- [x] **2.9.2** — `Sidebar/` + Admin extra ✅
- [x] **2.9.3** — `Navbar/` — Logo, nome do user, notificações, logout ✅
- [x] **2.9.4** — `PublicLayout.vue` — Layout limpo para login, landing, reset ✅
- [x] **2.9.5** — Responsivo: sidebar vira hamburger no mobile ✅
- [x] **2.9.6** — Breadcrumbs (meta nas rotas) ✅

---

# ═══════════════════════════════════════════════
# ETAPA 3 — MIGRATIONS (Schema MySQL Completo)
# ═══════════════════════════════════════════════

> Após validação visual do cliente. Cria todas as tabelas definitivas.
> Backend já terá esse schema como referência para montar services.

## 3.1 — Tabelas Core

- [ ] **3.1.1** — Migration `001-users.sql`
  ```
  users: id(UUID), full_name, cpf(UNIQUE), email(UNIQUE), phone, city, state,
  pix_key, sponsor_id(FK self NULL), is_active(BOOL), last_quota_purchase_at,
  role(ENUM user/admin), password_hash, referral_code(UNIQUE),
  email_verified(BOOL), created_at, updated_at
  ```
- [ ] **3.1.2** — Migration `002-auth-tokens.sql`
  ```
  refresh_tokens: id, user_id(FK), token_hash(UNIQUE), expires_at, revoked_at, created_at
  password_reset_tokens: id, user_id(FK), token_hash, expires_at, used_at, created_at
  ```

## 3.2 — Tabelas de Cotas

- [ ] **3.2.1** — Migration `003-quota-config.sql`
  ```
  quota_config: id(INT PK), current_value(DECIMAL), phase_sold(INT),
  total_splits(INT), current_goal(INT), base_value(DECIMAL), updated_at
  + SEED: current_value=2000, phase_sold=0, total_splits=0, current_goal=50
  ```
- [ ] **3.2.2** — Migration `004-quota-transactions.sql`
  ```
  quota_transactions: id(UUID), user_id(FK), quantity, unit_price, total_amount,
  status(ENUM pending/paid/canceled), payment_method, payment_reference,
  phase_at_purchase, created_at, paid_at, canceled_at
  ```
- [ ] **3.2.3** — Migration `005-user-quota-balances.sql`
  ```
  user_quota_balances: id(UUID), user_id(FK UNIQUE), quotas_purchased(INT),
  quotas_from_split(INT), total_quotas(GENERATED), updated_at
  ```
- [ ] **3.2.4** — Migration `006-split-history.sql`
  ```
  split_history: id(UUID), split_number, executed_at, previous_value,
  new_goal, total_quotas_before, total_quotas_after
  ```

## 3.3 — Tabelas de Títulos e Níveis

- [ ] **3.3.1** — Migration `007-title-history.sql`
  ```
  title_history: id(UUID), user_id(FK), title(ENUM none/bronze/silver/gold/diamond),
  achieved_at, revoked_at, is_current(BOOL)
  ```
- [ ] **3.3.2** — Migration `008-partner-levels.sql`
  ```
  partner_levels: id(UUID), user_id(FK UNIQUE),
  level(ENUM socio/platinum/vip/imperial), achieved_at, updated_at
  ```

## 3.4 — Tabelas Financeiras

- [ ] **3.4.1** — Migration `009-earnings-ledger.sql`
  ```
  earnings_ledger: id(UUID), user_id(FK), type(ENUM 8 tipos), amount(DECIMAL 12,2),
  reference_id(UUID NULL), source_user_id(UUID NULL), period_month(CHAR 7),
  description, created_at
  UNIQUE(user_id, type, reference_id) — idempotência
  ```
- [ ] **3.4.2** — Migration `010-monthly-closings.sql`
  ```
  monthly_closings: id(UUID), period_month(CHAR 7 UNIQUE),
  status(ENUM open/closed), closed_at_utc, total_due, total_paid, created_at
  ```
- [ ] **3.4.3** — Migration `011-monthly-payout-items.sql`
  ```
  monthly_payout_items: id(UUID), period_month, receiver_user_id(FK),
  pix_key, contact, amount_due, is_paid(BOOL), paid_at,
  paid_by_admin_id(FK NULL), notes, created_at
  ```
- [ ] **3.4.4** — Migration `012-financial-config.sql`
  ```
  financial_config: id(UUID), period_month(CHAR 7 UNIQUE),
  total_company_profit(DECIMAL 14,2), profit_distribution_pct(DECIMAL 5,2),
  notes, updated_by_admin_id(FK NULL), updated_at
  ```

## 3.5 — Indexes e Constraints

- [ ] **3.5.1** — Migration `013-indexes.sql`
  - Todos os indexes estratégicos
  - Todos os foreign keys com ON DELETE adequado

---

# ═══════════════════════════════════════════════
# ETAPA 4 — BACKEND (Services + Controllers)
# ═══════════════════════════════════════════════

> Com interfaces do frontend definidas e migrations prontas,
> backend sabe exatamente o que receber e enviar.

## 4.1 — Entities TypeORM (espelhar migrations)

- [ ] **4.1.1** — `user.entity.ts`
- [ ] **4.1.2** — `refresh-token.entity.ts` + `password-reset-token.entity.ts`
- [ ] **4.1.3** — `quota-config.entity.ts`
- [ ] **4.1.4** — `quota-transaction.entity.ts`
- [ ] **4.1.5** — `user-quota-balance.entity.ts`
- [ ] **4.1.6** — `split-history.entity.ts`
- [ ] **4.1.7** — `title-history.entity.ts`
- [ ] **4.1.8** — `partner-level.entity.ts`
- [ ] **4.1.9** — `earnings-ledger.entity.ts`
- [ ] **4.1.10** — `monthly-closing.entity.ts`
- [ ] **4.1.11** — `monthly-payout-item.entity.ts`
- [ ] **4.1.12** — `financial-config.entity.ts`

## 4.2 — Módulo Auth (BE-01)

- [ ] **4.2.1** — `auth.module.ts` / `auth.controller.ts` / `auth.service.ts`
- [ ] **4.2.2** — `POST /auth/login` — email+senha → access + refresh token
- [ ] **4.2.3** — `POST /auth/logout` — revoga refresh token
- [ ] **4.2.4** — `POST /auth/refresh` — renova tokens
- [ ] **4.2.5** — `POST /auth/forgot-password` — envia email com token
- [ ] **4.2.6** — `POST /auth/reset-password` — token + nova senha
- [ ] **4.2.7** — DTOs: LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto
- [ ] **4.2.8** — JWT Strategy + AuthGuard + RolesGuard
- [ ] **4.2.9** — Argon2 hash/verify (password + tokens)
- [ ] **4.2.10** — Rate limiting: max 5 tentativas login/min

## 4.3 — Módulo Users (cadastro + perfil)

- [ ] **4.3.1** — `users.module.ts` / `users.controller.ts` / `users.service.ts`
- [ ] **4.3.2** — `POST /users/register` — cadastro por patrocinador
- [ ] **4.3.3** — `GET /users/me` — dados completos do logado
- [ ] **4.3.4** — `GET /users/me/referral-link` — link de indicação
- [ ] **4.3.5** — `GET /users/referral/:code` — valida código, retorna patrocinador
- [ ] **4.3.6** — Geração de referralCode único (8 chars alfanumérico)

## 4.4 — Módulo Network (rede/tree — BE-10)

- [ ] **4.4.1** — `network.module.ts` / `network.controller.ts` / `network.service.ts`
- [ ] **4.4.2** — `GET /network/tree` — downline direta (nível 1), paginada
- [ ] **4.4.3** — `GET /network/tree/:userId/children` — lazy expand
- [ ] **4.4.4** — `GET /network/user/:userId/details` — detalhes do membro
- [ ] **4.4.5** — `GET /network/tree?filter=title:bronze` — filtro
- [ ] **4.4.6** — Segurança: user só vê sua downline, admin vê tudo
- [ ] **4.4.7** — Busca recursiva com profundidade máxima configurável

## 4.5 — Módulo Quotas (compra de cotas)

- [ ] **4.5.1** — `quotas.module.ts` / `quotas.controller.ts` / `quotas.service.ts`
- [ ] **4.5.2** — `POST /quotas/purchase` — cria pedido pending
- [ ] **4.5.3** — `POST /quotas/confirm-payment/:id` — (admin) marca pago → triggers
- [ ] **4.5.4** — `GET /quotas/config` — valor atual, Fcv, Qs, meta
- [ ] **4.5.5** — `GET /quotas/my-balance` — cotas compradas, split, total
- [ ] **4.5.6** — Interface `PaymentGateway` + `ManualPaymentGateway`
- [ ] **4.5.7** — Ao confirmar pagamento: atualiza balance, Fcv, dispara comissões

## 4.6 — Service: Regras de Atividade (BE-03)

- [ ] **4.6.1** — `ActivityService.checkUserActivity(userId)` → boolean
- [ ] **4.6.2** — `ActivityService.getUserActivityStatus(userId)` → detalhes
- [ ] **4.6.3** — CronJob diário (00:05 UTC): `UpdateActivityStatusJob`
- [ ] **4.6.4** — Guard de elegibilidade por tipo de bônus

## 4.7 — Service: Motor de Comissões (BE-06) ⚠️ CORE

- [ ] **4.7.1** — `CommissionEngine.processQuotaPurchase(transactionId)` — orquestrador
- [ ] **4.7.2** — Bônus Primeira Compra: 10% ao sponsor (sempre)
- [ ] **4.7.3** — Bônus Indicação: 10% ao sponsor em recompras (sempre recebe)
- [ ] **4.7.4** — Bônus Recompra: 5% nível 1, 2% níveis 2-6, limitado por título, SÓ ATIVOS
- [ ] **4.7.5** — Bônus Equipe: 2% sobre ganhos da rede (profundidade por título), SÓ ATIVOS
- [ ] **4.7.6** — Bônus Liderança: Ouro 1%/Diamante 2% sobre 5 níveis qualificados, SÓ ATIVOS
- [ ] **4.7.7** — Bônus Dividendos: (20% lucro / total cotas) x cotas em posse, SEMPRE
- [ ] **4.7.8** — Pipeline: diretos → alimentam base → equipe → liderança
- [ ] **4.7.9** — Idempotência: UNIQUE(user_id, type, reference_id)
- [ ] **4.7.10** — Projeção de perdas: registra loss_projection quando inativo

## 4.8 — Service: Títulos (BE-04)

- [ ] **4.8.1** — `TitleService.recalculateTitle(userId)`
  - Bronze: 2 ativos diretos | Prata: 1 bronze direto | Ouro: 2 bronzes em linhas diferentes | Diamante: 3 bronzes em linhas diferentes
- [ ] **4.8.2** — TitleHistory management (is_current)
- [ ] **4.8.3** — Trigger: recalcular quando status/rede muda

## 4.9 — Service: Níveis de Sócio (BE-05)

- [ ] **4.9.1** — `PartnerLevelService.recalculateLevel(userId)`
  - Sócio 1-9 | Platinum ≥10 | VIP ≥20 | Imperial ≥60 (apenas compradas)
- [ ] **4.9.2** — `GET /users/me/partner-level` — nível + progresso
- [ ] **4.9.3** — Trigger: recalcular ao confirmar compra

## 4.10 — Service: Split e Precificação (BE-07)

- [ ] **4.10.1** — `QuotaSplitService` — NovoValor = Vc + 500 x Fcv
- [ ] **4.10.2** — Split: Fcv ≥ 3 → Qs++, meta = 50 x 2^Qs, valor reinicia R$2000
- [ ] **4.10.3** — Split duplica cotas de TODOS os holders (quotas_from_split)
- [ ] **4.10.4** — CronJob diário (00:00 UTC): `QuotaPriceUpdateJob`
- [ ] **4.10.5** — `split_history` — registro de cada split

## 4.11 — Módulo Admin: Fechamento + Pagamentos (BE-08/BE-09)

- [ ] **4.11.1** — `admin.module.ts` / `admin.controller.ts` / `admin.service.ts`
- [ ] **4.11.2** — `GET /admin/payouts/:periodMonth` — lista paginada + totals
- [ ] **4.11.3** — `PATCH /admin/payouts/:itemId/mark-paid` — marca pago
- [ ] **4.11.4** — `GET /admin/payouts/:periodMonth/export` — CSV
- [ ] **4.11.5** — CronJob mensal (01, 00:00 UTC): `MonthlyClosingJob`
- [ ] **4.11.6** — `GET /admin/financial-config/:periodMonth`
- [ ] **4.11.7** — `PUT /admin/financial-config/:periodMonth` — atualiza + recalcula dividendos
- [ ] **4.11.8** — `GET /admin/dashboard/overview` — totais gerais

## 4.12 — Dashboard Endpoints

- [ ] **4.12.1** — `GET /dashboard/summary` — vendas, ganhos, título, status, perdas
- [ ] **4.12.2** — `GET /dashboard/earnings-history` — paginado, filtrável
- [ ] **4.12.3** — `GET /dashboard/referral-link`

---

# ═══════════════════════════════════════════════
# ETAPA 5 — PLUG (Conectar Backend ↔ Frontend)
# ═══════════════════════════════════════════════

> Conforme cada módulo backend fica pronto, trocar mock por API real.
> Ordem: Auth primeiro (desbloqueia tudo), depois feature por feature.

## 5.1 — Plug Auth (primeiro)

- [ ] **5.1.1** — `auth.service.ts`: trocar mock → API real
- [ ] **5.1.2** — Axios interceptor: inject token real, auto-refresh, redirect 401
- [ ] **5.1.3** — Testar: login, logout, forgot, reset, remember me

## 5.2 — Plug Cadastro + Indicação

- [ ] **5.2.1** — `onboarding.service.ts`: mock → API real
- [ ] **5.2.2** — Landing: tracking real de referralCode
- [ ] **5.2.3** — Testar: cadastrar → user no banco → consegue logar

## 5.3 — Plug Rede

- [ ] **5.3.1** — `network.service.ts`: mock → API real
- [ ] **5.3.2** — Testar: tree carrega, expande, filtra, detalhes

## 5.4 — Plug Cotas + Checkout

- [ ] **5.4.1** — `checkout.service.ts` + `quotas.service.ts`: mock → API real
- [ ] **5.4.2** — Testar: comprar → pending → admin confirma → balance atualiza

## 5.5 — Plug Dashboard Usuário

- [ ] **5.5.1** — `dashboard.service.ts`: mock → API real
- [ ] **5.5.2** — Testar: dados reais, filtros, status

## 5.6 — Plug Dashboard Admin

- [ ] **5.6.1** — `admin.service.ts`: mock → API real
- [ ] **5.6.2** — Testar: listas, marcar pago, export, config

## 5.7 — Validação End-to-End

- [ ] **5.7.1** — Fluxo: landing → cadastro → login → compra → comissão
- [ ] **5.7.2** — Fluxo: admin → pagamentos → marcar pago → config
- [ ] **5.7.3** — Fluxo: inatividade → status muda → perdas
- [ ] **5.7.4** — Fluxo: meta atingida → split → cotas duplicam

---

# ═══════════════════════════════════════════════
# ETAPA 6 — TESTES + POLISH + DOCUMENTAÇÃO
# ═══════════════════════════════════════════════

## 6.1 — Testes Backend

- [ ] **6.1.1** — Unit: CommissionEngine (6 tipos + idempotência)
- [ ] **6.1.2** — Unit: TitleService (todas combinações)
- [ ] **6.1.3** — Unit: QuotaSplitService
- [ ] **6.1.4** — Unit: ActivityService
- [ ] **6.1.5** — Integration: compra → comissões → ledger
- [ ] **6.1.6** — Integration: fechamento mensal
- [ ] **6.1.7** — E2E: auth endpoints
- [ ] **6.1.8** — E2E: admin endpoints

## 6.2 — Testes Frontend

- [ ] **6.2.1** — Unit: stores
- [ ] **6.2.2** — Component: forms
- [ ] **6.2.3** — Component: tree list
- [ ] **6.2.4** — Responsividade

## 6.3 — QA Manual

- [ ] **6.3.1** — Validar regras de comissão
- [ ] **6.3.2** — Testar elegibilidade ativo/inativo por tipo
- [ ] **6.3.3** — Testar split
- [ ] **6.3.4** — Testar fechamento mensal
- [ ] **6.3.5** — Testar títulos
- [ ] **6.3.6** — Performance tree list (100+ nós)
- [ ] **6.3.7** — Security audit
- [ ] **6.3.8** — i18n completo

## 6.4 — Documentação

- [ ] **6.4.1** — README.md
- [ ] **6.4.2** — Swagger/OpenAPI
- [ ] **6.4.3** — Knowledge Base
- [ ] **6.4.4** — DESIGN-PATTERNS.md

---

# ═══════════════════════════════════════════════
# BACKLOG FUTURO
# ═══════════════════════════════════════════════

- [ ] Gateway de pagamento real (Stripe/Mercado Pago/Pix automático)
- [ ] Exportação PDF
- [ ] Notificações (email, push)
- [ ] Sistema de pontuação
- [ ] Dashboard analytics (gráficos)
- [ ] Docker + CI/CD
- [ ] WebSocket real-time
- [ ] PWA / App mobile
- [ ] Chat para compras ≥10 cotas
- [ ] Backup automatizado

---

# ═══════════════════════════════════════════════
# FLUXO VISUAL
# ═══════════════════════════════════════════════

```
ETAPA 1: Scaffolding
  ├── Backend scaffold (deps + config)
  └── Frontend scaffold (deps + design system + mocks)

ETAPA 2: Frontend com Mocks ← CLIENTE VALIDA AQUI
  ├── Auth (login, forgot, reset)
  ├── Landing page
  ├── Cadastro por patrocinador
  ├── Dashboard usuário
  ├── Rede (tree list)
  ├── Checkout
  ├── Página promo + FAQ
  ├── Dashboard admin
  └── Layout (sidebar, navbar)

ETAPA 3: Migrations
  └── 13 migrations (tabelas + indexes)

ETAPA 4: Backend
  ├── Entities TypeORM
  ├── Auth module
  ├── Users module
  ├── Network module
  ├── Quotas module
  ├── Activity service
  ├── Commission engine ⚠️ CORE
  ├── Title service
  ├── Partner level service
  ├── Split service
  ├── Admin module
  └── Dashboard endpoints

ETAPA 5: Plug (Back ↔ Front) ← CONECTA INCREMENTALMENTE
  ├── Auth (primeiro)
  ├── Cadastro + indicação
  ├── Rede
  ├── Cotas + checkout
  ├── Dashboard user
  ├── Dashboard admin
  └── Validação E2E

ETAPA 6: Testes + Polish + Docs
```

---

# ═══════════════════════════════════════════════
# MAPEAMENTO ÉPICOS → ETAPAS
# ═══════════════════════════════════════════════

| Épico | Etapa 2 (Mock) | Etapa 3 (Migration) | Etapa 4 (Backend) | Etapa 5 (Plug) |
|-------|---------------|--------------------|--------------------|----------------|
| FE-01 Login | 2.1 | — | 4.2 | 5.1 |
| FE-02 Admin | 2.8 | — | 4.11 | 5.6 |
| FE-03 Dashboard | 2.4 | — | 4.12 | 5.5 |
| FE-04 Rede | 2.5 | — | 4.4 | 5.3 |
| FE-05 Checkout | 2.6 | — | 4.5 | 5.4 |
| FE-06 Promo | 2.7 | — | — | 5.4 |
| FE-07 Cadastro | 2.3 | — | 4.3 | 5.2 |
| FE-08 Landing | 2.2 | — | — | 5.2 |
| BE-01 Auth | — | 3.1.2 | 4.2 | 5.1 |
| BE-02 Dados | — | 3.1-3.5 | 4.1 | — |
| BE-03 Atividade | — | — | 4.6 | — |
| BE-04 Títulos | — | 3.3.1 | 4.8 | — |
| BE-05 Níveis | — | 3.3.2 | 4.9 | — |
| BE-06 Comissões | — | 3.4.1 | 4.7 | — |
| BE-07 Split | — | 3.2 | 4.10 | — |
| BE-08 Fechamento | — | 3.4.2-3 | 4.11 | 5.6 |
| BE-09 Financeiro | — | 3.4.4 | 4.11.6-7 | 5.6 |
| BE-10 Rede API | — | — | 4.4 | 5.3 |
| BE-11 Indicação | — | — | 4.3 | 5.2 |

---

# ESTIMATIVA

| Etapa | Tarefas | Natureza |
|-------|---------|----------|
| 1 - Scaffolding | ~36 | Setup + Design System + Mocks |
| 2 - Frontend Mocks | ~65 | UI completa com dados fake |
| 3 - Migrations | ~13 | SQL schema |
| 4 - Backend | ~55 | Services + Controllers |
| 5 - Plug | ~15 | Mock → API real |
| 6 - Testes + Docs | ~20 | QA + documentação |
| **TOTAL** | **~204** | |

---

**Status de Progresso:** 0/204 tarefas (0%)
**Última Atualização:** 2026-02-18
**Próxima Ação:** AGUARDANDO APROVAÇÃO DO PLANO

---

## ✅ SESSÃO 2026-02-23 — Refatoração Premium do Checkout

**Status:** ✅ CONCLUÍDO

### Componentes criados:
- [x] `checkout/components/QuotaCalculator.vue` — Calculadora gamificada com unlock animation
- [x] `checkout/components/PaymentSelector.vue` — Radio cards + sidebar sticky de resumo
- [x] `checkout/components/OrderConfirmation.vue` — Confirmação emocional "Revise seu Upgrade"
- [x] `checkout/components/PixPayment.vue` — QR Code + timer 15min + polling + referral CTA
- [x] `checkout/components/BoletoPayment.vue` — Barcode visual + download + referral CTA
- [x] `checkout/components/CardRedirect.vue` — Loading spinner → redirect Pagar.me
- [x] `checkout/views/CheckoutView.vue` — Reescrito: progress bar + slide transitions + state central
- [x] `checkout/views/CheckoutConfirmationView.vue` — Reescrito: canvas-confetti + celebração + referral

### Packages instalados:
- canvas-confetti + @types/canvas-confetti

**Última Atualização:** 2026-02-23
