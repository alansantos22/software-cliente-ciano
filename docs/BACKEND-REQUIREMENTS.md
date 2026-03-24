# 📋 BACKEND & MIGRATIONS — Documento Mestre de Requisitos

> Compilação completa de todas as regras, tipos, contratos de API e regras de negócio extraídos do frontend, mocks, épicos e documentação do projeto.
>
> **Este documento é a fonte de verdade para implementar as migrations e o backend.**

**Gerado em:** 2026-03-13
**Baseado em:** Frontend (Etapa 2 completa), Épicos do Cliente, Documentação do Projeto

---

## 📑 Índice

1. [Stack Backend Atual](#1-stack-backend-atual)
2. [Entidades e Tabelas (Migrations)](#2-entidades-e-tabelas-migrations)
3. [Regras de Negócio Completas](#3-regras-de-negócio-completas)
4. [API Endpoints Necessários](#4-api-endpoints-necessários)
5. [Sistema de Autenticação](#5-sistema-de-autenticação)
6. [Sistema de Cotas](#6-sistema-de-cotas)
7. [Sistema de Bonificações](#7-sistema-de-bonificações)
8. [Sistema de Títulos](#8-sistema-de-títulos)
9. [Sistema de Níveis de Sócio](#9-sistema-de-níveis-de-sócio)
10. [Sistema de Split e Valorização](#10-sistema-de-split-e-valorização)
11. [Sistema de Pagamentos (Payouts)](#11-sistema-de-pagamentos-payouts)
12. [Painel Administrativo](#12-painel-administrativo)
13. [Jobs Agendados (Cron)](#13-jobs-agendados-cron)
14. [Contratos de Dados (TypeScript)](#14-contratos-de-dados-typescript)
15. [Guards e Permissões](#15-guards-e-permissões)
16. [Configurações Financeiras](#16-configurações-financeiras)

---

## 1. Stack Backend Atual

O backend já possui scaffolding NestJS 11 com:

| Componente | Tecnologia | Status |
|-----------|-----------|--------|
| Framework | NestJS 11 + Fastify | ✅ Configurado |
| Banco de Dados | MySQL via TypeORM | ✅ Configurado (sem entidades) |
| Config | @nestjs/config (app, db, jwt, throttle) | ✅ Configurado |
| Rate Limiting | @nestjs/throttler | ✅ Configurado |
| Scheduler | @nestjs/schedule | ✅ Importado |
| Validação | class-validator (ValidationPipe) | ✅ Configurado |
| CORS | Habilitado (localhost:5173) | ✅ Configurado |
| Decorators | @Public, @Roles, @CurrentUser | ✅ Criados |
| Guards | RolesGuard | ✅ Criado |
| Filters | AllExceptionsFilter | ✅ Criado |
| Auth Module | — | ❌ NÃO implementado |
| Entidades/Migrations | — | ❌ ZERO entidades |
| Módulos de negócio | — | ❌ ZERO implementação |

**Database configurada:** `ciano_cotas` (MySQL)

---

## 2. Entidades e Tabelas (Migrations)

### 2.1 — `users`

Tabela principal de usuários. Extraída de `MockUser` + `User` (auth.store).

```sql
CREATE TABLE users (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  cpf           VARCHAR(14) NOT NULL UNIQUE,
  phone         VARCHAR(20) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(2) NOT NULL,
  pix_key       VARCHAR(255) NOT NULL,
  pix_key_type  ENUM('cpf', 'email', 'phone', 'random') NULL,
  role          ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  title         ENUM('none', 'bronze', 'silver', 'gold', 'diamond') NOT NULL DEFAULT 'none',
  partner_level ENUM('socio', 'platinum', 'vip', 'imperial') NOT NULL DEFAULT 'socio',
  sponsor_id    VARCHAR(36) NULL,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  avatar_url    VARCHAR(500) NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  -- Cotas (campos desnormalizados para performance)
  purchased_quotas   INT NOT NULL DEFAULT 0 COMMENT 'Cotas compradas diretamente. DEFINEM o nível de sócio.',
  split_quotas       INT NOT NULL DEFAULT 0 COMMENT 'Cotas recebidas via split. NÃO contam para nível, apenas dividendos.',
  quota_balance      INT NOT NULL DEFAULT 0 COMMENT 'purchased_quotas + split_quotas. NÃO usar para nível.',
  total_earnings     DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Datas
  last_purchase_date DATETIME NULL COMMENT 'Se null ou > 6 meses → conta inativa para bônus',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL COMMENT 'Soft delete — lixeira de 30 dias',

  -- Rede desnormalizada
  direct_count INT NOT NULL DEFAULT 0,
  team_count   INT NOT NULL DEFAULT 0,

  CONSTRAINT fk_users_sponsor FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_users_sponsor (sponsor_id),
  INDEX idx_users_referral (referral_code),
  INDEX idx_users_role (role),
  INDEX idx_users_title (title),
  INDEX idx_users_partner_level (partner_level),
  INDEX idx_users_active (is_active),
  INDEX idx_users_deleted (deleted_at)
);
```

**Campos críticos — regras de negócio:**
- `purchased_quotas` → ÚNICO campo que define `partner_level` (sócio/platinum/vip/imperial)
- `split_quotas` → Cotas recebidas por split. NÃO sobem de nível
- `quota_balance` → `purchased_quotas + split_quotas` (base de cálculo de dividendos)
- `pix_key_type` → Tipo da chave PIX do usuário (cpf/email/phone/random)
- `last_purchase_date` → null ou > 6 meses = inativo (não recebe bônus de equipe/liderança/recompra, MAS recebe bônus de indicação e dividendos)

> ⚠️ **NOTA:** Não existe campo `available_withdraw` na tabela de usuários. O valor a receber de cada usuário é calculado dinamicamente pelo admin no momento do fechamento mensal (lucro líquido × pool de dividendos + bônus de rede acumulados).

---

### 2.2 — `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id    VARCHAR(36) NOT NULL,
  token      VARCHAR(500) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,

  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_tokens_user (user_id),
  INDEX idx_refresh_tokens_token (token)
);
```

---

### 2.3 — `quota_transactions`

Registra toda movimentação de cotas: compras, bônus em valor, saques, ajustes.

```sql
CREATE TABLE quota_transactions (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  type             ENUM('purchase', 'bonus', 'withdrawal', 'refund', 'adjustment') NOT NULL,
  amount           DECIMAL(15,2) NOT NULL COMMENT 'Valor em R$. Negativo para saques.',
  quotas_affected  INT NOT NULL DEFAULT 0 COMMENT 'Quantidade de cotas envolvidas.',
  description      VARCHAR(500) NOT NULL,
  status           ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  reference_month  VARCHAR(7) NOT NULL COMMENT 'YYYY-MM — mês de competência',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at     DATETIME NULL,

  CONSTRAINT fk_quota_txn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quota_txn_user (user_id),
  INDEX idx_quota_txn_type (type),
  INDEX idx_quota_txn_status (status),
  INDEX idx_quota_txn_month (reference_month)
);
```

---

### 2.4 — `earnings`

Ledger de ganhos — cada linha é um earning individual.

```sql
CREATE TABLE earnings (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  bonus_type       ENUM('firstPurchase', 'repurchase', 'team', 'leadership', 'dividend') NOT NULL,
  amount           DECIMAL(15,2) NOT NULL,
  source_user_id   VARCHAR(36) NULL COMMENT 'Quem gerou este bônus (null para team/leadership/dividend)',
  source_user_name VARCHAR(255) NULL,
  description      VARCHAR(500) NOT NULL,
  level            INT NOT NULL DEFAULT 0 COMMENT 'Nível na rede (1=direto, 2-6=indireto, 0=geral)',
  reference_month  VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
  status           ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  cutoff_eligible  BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Compra dentro do período de corte?',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at          DATETIME NULL,

  CONSTRAINT fk_earnings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_earnings_source FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_earnings_user (user_id),
  INDEX idx_earnings_type (bonus_type),
  INDEX idx_earnings_month (reference_month),
  INDEX idx_earnings_status (status),
  INDEX idx_earnings_source (source_user_id)
);
```

**Regra de Cutoff:**
- Para o mês de referência X, a data de corte é o **último dia do mês X-1**
- Compras feitas **após** essa data geram bônus que só são pagos no ciclo **seguinte**
- `cutoff_eligible = true` → entra no pagamento deste ciclo
- `cutoff_eligible = false` → adiado para o próximo ciclo

---

### 2.5 — `monthly_earning_summaries`

Resumo pré-calculado de ganhos por mês (otimização de leitura).

```sql
CREATE TABLE monthly_earning_summaries (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  month            VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
  first_purchase   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  repurchase       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  team             DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  leadership       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  dividend         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  network_earnings DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'firstPurchase + repurchase + team + leadership',
  quota_earnings   DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Apenas dividendos',
  loss_projection  DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor que perderia se não estiver qualificado',
  cutoff_date      DATE NOT NULL COMMENT 'Último dia do mês anterior',

  CONSTRAINT fk_earning_summary_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_earning_summary (user_id, month),
  INDEX idx_earning_summary_month (month)
);
```

---

### 2.6 — `payout_requests`

Registros de pagamento gerados pelo admin (NÃO por solicitação do usuário). O admin entra com o lucro líquido do mês e o sistema calcula a distribuição automaticamente.

```sql
CREATE TABLE payout_requests (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  user_name        VARCHAR(255) NOT NULL COMMENT 'Snapshot do nome no momento da geração',
  quota_amount     DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor de dividendos (proporcional às cotas)',
  network_amount   DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor de bônus de rede acumulados',
  amount           DECIMAL(15,2) NOT NULL COMMENT 'quota_amount + network_amount = total a pagar',
  pix_key          VARCHAR(255) NOT NULL,
  pix_key_type     ENUM('cpf', 'email', 'phone', 'random') NOT NULL,
  status           ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  reference_month  VARCHAR(7) NOT NULL COMMENT 'YYYY-MM — mês de competência do lucro (profitMonth)',
  payment_month    VARCHAR(7) NOT NULL COMMENT 'YYYY-MM — mês em que o pagamento será feito (profitMonth + 2)',
  net_profit_ref   DECIMAL(15,2) NOT NULL COMMENT 'Lucro líquido informado pelo admin para este ciclo',
  dividend_pool_ref DECIMAL(15,2) NOT NULL COMMENT 'Pool de dividendos calculado (netProfit × dividendPoolPercent)',
  percentage_share DECIMAL(8,4) NOT NULL DEFAULT 0.00 COMMENT 'Percentual da participação deste user no pool',
  generated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Quando o batch foi gerado',
  processed_at     DATETIME NULL COMMENT 'Quando admin marcou como processing',
  completed_at     DATETIME NULL COMMENT 'Quando admin confirmou pagamento',
  failure_reason   VARCHAR(500) NULL,
  transaction_id   VARCHAR(100) NULL COMMENT 'ID da transação PIX (externo, preenchido pelo admin)',
  generated_by     VARCHAR(36) NOT NULL COMMENT 'Admin que gerou o batch',

  CONSTRAINT fk_payout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_admin FOREIGN KEY (generated_by) REFERENCES users(id),
  INDEX idx_payout_user (user_id),
  INDEX idx_payout_status (status),
  INDEX idx_payout_ref_month (reference_month),
  INDEX idx_payout_pay_month (payment_month)
);
```

---

### 2.7 — `monthly_payout_summaries`

Resumo mensal de pagamentos (admin dashboard).

```sql
CREATE TABLE monthly_payout_summaries (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  month           VARCHAR(7) NOT NULL UNIQUE,
  total_requested DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_paid      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_pending   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  request_count   INT NOT NULL DEFAULT 0,
  paid_count      INT NOT NULL DEFAULT 0,
  pending_count   INT NOT NULL DEFAULT 0,
  average_amount  DECIMAL(15,2) NOT NULL DEFAULT 0.00
);
```

---

### 2.8 — `monthly_financial_configs`

Configurações financeiras por mês — define preço da cota, taxas, porcentagens de bônus.

```sql
CREATE TABLE monthly_financial_configs (
  id                              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  month                           VARCHAR(7) NOT NULL UNIQUE,
  quota_price                     DECIMAL(15,2) NOT NULL DEFAULT 2500.00,

  -- Porcentagens de bônus
  first_purchase_bonus_percent    DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  repurchase_bonus_l1_percent     DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  repurchase_bonus_l2to6_percent  DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  team_bonus_percent              DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  leadership_bonus_ouro_percent   DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  leadership_bonus_diamante_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  dividend_pool_percent           DECIMAL(5,2) NOT NULL DEFAULT 20.00,

  -- Status do mês
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'True = mês fechado',
  closed_at   DATETIME NULL,
  total_payout  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_bonuses DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 2.9 — `global_financial_settings`

Configurações globais da empresa (singleton — 1 registro).

```sql
CREATE TABLE global_financial_settings (
  id                     INT PRIMARY KEY DEFAULT 1,
  company_name           VARCHAR(255) NOT NULL DEFAULT 'Grupo de Pousadas Ciano',
  cnpj                   VARCHAR(20) NOT NULL DEFAULT '12.345.678/0001-90',
  default_currency       VARCHAR(3) NOT NULL DEFAULT 'BRL',

  -- Fechamento e pagamento
  closing_day_mode       ENUM('fixed', 'last_day', 'first_next_month') NOT NULL DEFAULT 'fixed' COMMENT 'Modo de cálculo do dia de fechamento',
  closing_day            INT NULL DEFAULT 25 COMMENT 'Dia fixo de fechamento (usado quando closing_day_mode=fixed)',
  payment_day            INT NOT NULL DEFAULT 5 COMMENT 'Dia do mês para pagamentos',
  pix_enabled            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Limites de cotas
  min_quotas             INT NOT NULL DEFAULT 1 COMMENT 'Mínimo de cotas por compra',
  max_quotas_per_user    INT NOT NULL DEFAULT 200 COMMENT 'Máximo de cotas por usuário',
  total_quotas_available INT NOT NULL DEFAULT 10000 COMMENT 'Total de cotas disponíveis no sistema',

  -- Lucro da empresa e pool de dividendos
  total_company_profit      DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor total do lucro da empresa no período',
  profit_payout_percentage  DECIMAL(5,2) NOT NULL DEFAULT 20.00 COMMENT 'Porcentagem do lucro destinada ao pool de dividendos',

  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_single_row CHECK (id = 1)
);
```

> ⚠️ **NOTA:** Não existem campos de saque (`min_withdrawal`, `max_withdrawal`, `withdrawal_fee`, etc.) porque não há sistema de saque no Ciano. Os pagamentos são feitos diretamente pelo admin via PIX.

---

### 2.10 — `title_requirements`

Regras para obter cada título (dados de referência).

```sql
CREATE TABLE title_requirements (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  title                 ENUM('none', 'bronze', 'silver', 'gold', 'diamond') NOT NULL UNIQUE,
  requirement_desc      VARCHAR(500) NOT NULL,

  -- Requisitos editáveis pelo admin (Career Plan Builder)
  req_type              ENUM('pessoas_ativas', 'indicado', 'linhas') NULL COMMENT 'Tipo de requisito principal',
  req_quantity          INT NULL COMMENT 'Quantidade exigida do req_type',
  req_level             ENUM('qualquer', 'bronze', 'prata', 'ouro') NULL COMMENT 'Nível mínimo exigido (null = qualquer)',

  -- Benefícios desbloqueados
  repurchase_levels     INT NOT NULL DEFAULT 0 COMMENT 'Quantos níveis de bônus recompra desbloqueia',
  team_levels           INT NOT NULL DEFAULT 0 COMMENT 'Quantos níveis de bônus equipe desbloqueia',
  leadership_percent    DECIMAL(5,2) NOT NULL DEFAULT 0.00,

  -- Regras de movimentação de rede
  min_network_movement  DECIMAL(15,2) NULL COMMENT 'Movimentação mín. da rede no mês (null = sem exigência)',
  network_levels_depth  INT NULL COMMENT 'Até qual nível a movimentação é contabilizada (null = sem exigência)'
);

-- Seed data
INSERT INTO title_requirements (title, requirement_desc, req_type, req_quantity, req_level, repurchase_levels, team_levels, leadership_percent, min_network_movement, network_levels_depth) VALUES
  ('none',    'Sem título',                        NULL,              NULL, NULL,      0, 0, 0.00, NULL, NULL),
  ('bronze',  '2 pessoas ativas na rede',          'pessoas_ativas',  2,    'qualquer', 1, 2, 0.00, NULL, NULL),
  ('silver',  'Ajudar 1 indicado a virar Bronze',  'indicado',        1,    'bronze',   2, 3, 0.00, 5000.00, 3),
  ('gold',    '2 Bronzes em linhas diferentes',     'linhas',          2,    'bronze',   4, 4, 1.00, NULL, NULL),
  ('diamond', '3 Bronzes em linhas diferentes',     'linhas',          3,    'bronze',   6, 5, 2.00, NULL, NULL);
```

---

### 2.11 — `partner_level_requirements`

Requisitos para cada nível de sócio (dados de referência).

```sql
CREATE TABLE partner_level_requirements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  level      ENUM('socio', 'platinum', 'vip', 'imperial') NOT NULL UNIQUE,
  min_quotas INT NOT NULL COMMENT 'Mínimo de cotas COMPRADAS (não split)',
  benefits   JSON NOT NULL COMMENT 'Array de benefícios em texto'
);

-- Seed data
INSERT INTO partner_level_requirements (level, min_quotas, benefits) VALUES
  ('socio',    1,  '["Participação nos lucros do Grupo Ciano","Participação na valorização do grupo","Pode indicar e ganhar comissões","Acesso ao grupo geral de investidores"]'),
  ('platinum', 10, '["Todos os benefícios do Sócio","30% de desconto em pousadas Ciano","Comissão maior nas indicações","Acesso antecipado a lotes com desconto","Reunião mensal com Marcos Maziero"]'),
  ('vip',      20, '["Todos os benefícios do Platinum","50% de desconto em pousadas Ciano","1 final de semana gratuito por ano","Convites para eventos e inaugurações","Nome listado como Sócio VIP em todas as pousadas","Comissão ainda maior nas indicações"]'),
  ('imperial', 60, '["Todos os benefícios do VIP","Hospedagem gratuita ilimitada (até 3 acompanhantes)","Máx. 1 quarto simultâneo","Pode morar em pousada","40% de desconto para familiares","Viagem anual com Marcos Maziero","Quadro com foto no hall de entrada","Canal VIP direto com Marcos Maziero","Acesso ao grupo Imperial exclusivo"]');
```

---

### 2.12 — `split_events`

Registro de eventos de split e aumento de preço das cotas.

```sql
CREATE TABLE split_events (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  event_type          ENUM('price_increase', 'split') NOT NULL,
  triggered_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_quota_price     DECIMAL(15,2) NOT NULL,
  new_quota_price     DECIMAL(15,2) NOT NULL,
  split_number        INT NOT NULL DEFAULT 0 COMMENT 'Qs — quantidade de splits realizados até aqui',
  phase               INT NOT NULL DEFAULT 0 COMMENT 'Fcv — fase de cota vendida',
  quotas_sold_total   INT NOT NULL DEFAULT 0 COMMENT 'Total de cotas vendidas que trigou o evento',
  description         VARCHAR(500) NULL
);
```

---

### 2.13 — `quota_system_state`

Estado global do sistema de cotas (singleton — 1 registro).

```sql
CREATE TABLE quota_system_state (
  id                  INT PRIMARY KEY DEFAULT 1,
  current_quota_price DECIMAL(15,2) NOT NULL DEFAULT 2500.00,
  total_quotas_sold   INT NOT NULL DEFAULT 0 COMMENT 'Total de cotas compradas (todas as pessoas)',
  total_split_quotas  INT NOT NULL DEFAULT 0 COMMENT 'Total de cotas geradas por split',
  split_count         INT NOT NULL DEFAULT 0 COMMENT 'Qs — quantidade de splits realizados',
  current_phase       INT NOT NULL DEFAULT 0 COMMENT 'Fcv — fase atual de cota vendida',
  next_event_target   INT NOT NULL DEFAULT 50 COMMENT 'Meta de cotas vendidas para próximo evento (50 × 2^Qs)',
  next_event_label    VARCHAR(100) NOT NULL DEFAULT 'Aumento de Preço',
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_single_row_quota CHECK (id = 1)
);
```

---

### 2.14 — `password_reset_tokens`

Tokens para fluxo "Esqueci a Senha".

```sql
CREATE TABLE password_reset_tokens (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id    VARCHAR(36) NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reset_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token)
);
```

---

### 2.15 — `admin_payment_checks`

Registro de checkboxes de pagamento do admin (Épico 2).

```sql
CREATE TABLE admin_payment_checks (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payout_id        VARCHAR(36) NOT NULL,
  reference_month  VARCHAR(7) NOT NULL,
  checked_by       VARCHAR(36) NOT NULL COMMENT 'Admin que marcou como pago',
  checked_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payment_check_payout FOREIGN KEY (payout_id) REFERENCES payout_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_check_admin FOREIGN KEY (checked_by) REFERENCES users(id),
  UNIQUE KEY uq_payment_check (payout_id)
);
```

---

## 3. Regras de Negócio Completas

### 3.1 — Regra de Inatividade (6 meses)

```
SE user.last_purchase_date == NULL OU
   user.last_purchase_date < (NOW - 6 meses)
ENTÃO
   user é INATIVO
```

**Efeitos da inatividade:**
| Tipo de Bônus | Inativo recebe? |
|-----|-----|
| Bônus de Primeira Compra (indicação) | ✅ SIM — sempre recebe |
| Bônus de Recompra | ❌ NÃO |
| Bônus de Equipe | ❌ NÃO |
| Bônus de Liderança | ❌ NÃO |
| Dividendos (bônus de cotas) | ✅ SIM — sempre recebe |

**No dashboard:** mostrar "quanto deixou de ganhar" (`inactivityLoss` / `lossProjection`).

---

### 3.2 — Regra de Cutoff (data de corte mensal)

```
cutoffDate = último dia do mês ANTERIOR ao referenceMonth

SE purchaseDate > cutoffDate ENTÃO
   earning.cutoff_eligible = false → pago no PRÓXIMO ciclo
SENÃO
   earning.cutoff_eligible = true → pago NESTE ciclo
```

**Função:**
```typescript
function getCutoffDate(referenceMonth: string): string {
  const [y, m] = referenceMonth.split('-').map(Number);
  const lastDay = new Date(y, m - 1, 0);
  return lastDay.toISOString().slice(0, 10);
}
```

---

### 3.3 — Janela de Pagamento (Payment Window)

- `paymentDay` = dia definido pelo admin (padrão: dia 5 ou 15)
- Valor a receber **só é exibido** nos 5 dias que antecedem (e incluem) o `paymentDay`
- **Motivo:** só nesse período o lucro das pousadas é conhecido, necessário para calcular dividendos

```
windowOpen = daysUntilPayment >= 0 AND daysUntilPayment <= 5
```

---

### 3.4 — Fechamento Mensal (Épico 12)

- A lista do admin **fecha dia 01 do mês seguinte às 00h**
- Ao fechar o mês:
  1. Calcular todos os bônus pendentes
  2. Gerar lista de pagamentos (PIX + contato + valor)
  3. Zerar contadores do mês atual
  4. Travar mês (`is_locked = true`)

---

## 4. API Endpoints Necessários

### 4.1 — Auth (`/api/auth`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| POST | `/auth/login` | Login com email + senha | Público |
| POST | `/auth/register` | Criar conta (com ou sem referralCode) | Público |
| POST | `/auth/refresh` | Renovar access token | Público (com refreshToken) |
| POST | `/auth/forgot-password` | Solicitar reset de senha | Público |
| POST | `/auth/reset-password` | Redefinir senha com token | Público |
| GET | `/auth/me` | Dados do usuário logado | Autenticado |
| POST | `/auth/logout` | Invalidar refresh token | Autenticado |

**Login — request:**
```json
{
  "email": "user@email.com",
  "password": "senha123"
}
```

**Login — response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "fullName": "Nome Completo",
      "email": "user@email.com",
      "cpf": "12345678901",
      "phone": "11999999999",
      "city": "São Paulo",
      "state": "SP",
      "pixKey": "user@email.com",
      "role": "user",
      "referralCode": "CODIGO123",
      "isActive": true,
      "lastPurchaseDate": "2025-12-01T00:00:00Z",
      "title": "gold",
      "partnerLevel": "vip",
      "purchasedQuotas": 50,
      "splitQuotas": 7
    }
  }
}
```

**Register — request:**
```json
{
  "name": "Nome Completo",
  "cpf": "12345678901",
  "email": "user@email.com",
  "phone": "11999999999",
  "city": "São Paulo",
  "state": "SP",
  "pixKey": "user@email.com",
  "password": "senha123",
  "referralCode": "SPONSOR_CODE"
}
```
> **Regra (Épico 7):** Mesmo SEM confirmação de compra, o login é criado. O usuário está vinculado ao sponsor via `referralCode`.

---

### 4.2 — Dashboard (`/api/dashboard`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/dashboard/kpis` | KPIs principais do dashboard | Autenticado |
| GET | `/dashboard/earnings-sources` | Fontes de ganhos (donut chart) | Autenticado |
| GET | `/dashboard/recent-activity` | Atividades recentes | Autenticado |
| GET | `/dashboard/split-ticker` | Dados do ticker de split/preço | Autenticado |
| GET | `/dashboard/career-progress` | Progresso de carreira (títulos) | Autenticado |
| GET | `/dashboard/account-health` | Saúde da conta (atividade) | Autenticado |

**KPIs — response:** (contrato completo conforme `DashboardKpiData`)
```json
{
  "estimatedPatrimony": 17500,
  "availableWithdraw": 3265,
  "activeDirects": 10,
  "totalDirects": 12,
  "inactiveDirects": 2,
  "networkTotal": 45,
  "paymentDay": 15,
  "paymentWindowOpen": true,
  "daysUntilPayment": 3,
  "nextPaymentDate": "2026-03-15",
  "networkEarnings": 2945,
  "quotaEarnings": 320,
  "lifetimeEarnings": 85000,
  "inactivityLoss": 1250,
  "ownSalesCount": 2,
  "ownSalesValue": 5000,
  "networkSalesCount": 8,
  "networkSalesValue": 20000
}
```

> **Regra:** `availableWithdraw` = `networkEarnings` + `quotaEarnings`. Só exibido quando `paymentWindowOpen = true`.

> **Regra:** `networkEarnings` = firstPurchase + repurchase + team + leadership. `quotaEarnings` = dividendos.

---

### 4.3 — Rede / Network (`/api/network`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/network/tree` | Árvore completa da rede | Autenticado |
| GET | `/network/stats` | Estatísticas da rede | Autenticado |
| GET | `/network/member/:userId` | Detalhes de membro específico | Autenticado |

**Tree response — `NetworkNode`:**
```json
{
  "id": "user-001",
  "name": "Nome",
  "email": "email@email.com",
  "phone": "(11) 99999-0000",
  "title": "gold",
  "partnerLevel": "vip",
  "quotaCount": 50,
  "directCount": 8,
  "teamCount": 45,
  "totalVolume": 150000,
  "isActive": true,
  "expiresAt": "2026-05-01",
  "level": 1,
  "children": []
}
```

**Stats response — `NetworkStats`:**
```json
{
  "totalDirect": 4,
  "totalTeam": 12,
  "totalVolume": 500000,
  "activeMembers": 11,
  "inactiveMembers": 1,
  "qualifiedBronzes": 3,
  "qualifiedLines": 3,
  "titleDistribution": { "none": 3, "bronze": 3, "silver": 3, "gold": 2, "diamond": 1 },
  "levelDistribution": { "1": 4, "2": 5, "3": 2, "4": 0, "5": 0 }
}
```

> **Regra `qualifiedLines`:** conta quantas "linhas diretas" contêm ao menos 1 pessoa com título ≥ bronze. Usado para calcular qualificação para Ouro (2 linhas) e Diamante (3 linhas).

> **Regra `expiresAt`:** `lastPurchaseDate + 6 meses`. Se no passado → conta expirada.

---

### 4.4 — Cotas / Quotas (`/api/quotas`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/quotas/config` | Configuração atual (preço, limites) | Autenticado |
| GET | `/quotas/balance` | Saldo do usuário (purchased vs split) | Autenticado |
| GET | `/quotas/transactions` | Histórico de transações | Autenticado |
| GET | `/quotas/presentation` | Dados da landing/info de cotas | Público |
| GET | `/quotas/partner-levels` | Níveis de sócio com benefícios | Público |

---

### 4.5 — Checkout (`/api/checkout`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| POST | `/checkout/purchase` | Comprar cotas | Autenticado |
| GET | `/checkout/confirmation/:transactionId` | Dados da confirmação | Autenticado |

**Purchase — request:**
```json
{
  "quantity": 5,
  "paymentMethod": "pix"
}
```

**Purchase — response:**
```json
{
  "transactionId": "txn-uuid",
  "quantity": 5,
  "totalAmount": 12500,
  "unitPrice": 2500,
  "status": "pending"
}
```

**Efeitos colaterais de uma compra:**
1. Criar `quota_transaction` (type=purchase)
2. Atualizar `users.purchased_quotas += quantity`
3. Atualizar `users.quota_balance += quantity`
4. Atualizar `users.last_purchase_date = NOW()`
5. Recalcular `users.partner_level` baseado em `purchased_quotas`
6. Calcular bônus de primeira compra ou recompra para o sponsor (e upline)
7. Atualizar `quota_system_state.total_quotas_sold`
8. Verificar se meta de split/aumento de preço foi atingida

---

### 4.6 — Ganhos / Earnings (`/api/earnings`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/earnings` | Histórico de ganhos | Autenticado |
| GET | `/earnings/overview` | Visão geral (totais) | Autenticado |
| GET | `/earnings/monthly/:month` | Resumo do mês | Autenticado |
| GET | `/earnings/by-type/:bonusType` | Filtrar por tipo de bônus | Autenticado |

**Overview — response:**
```json
{
  "userId": "user-002",
  "totalEarned": 85000,
  "pendingEarnings": 300,
  "thisMonthEarnings": 5250,
  "lastMonthEarnings": 3500,
  "averageMonthly": 7083,
  "lossProjection": 1200
}
```

---

### 4.7 — Payouts (Sistema Admin-Driven)

> ⚠️ **CRÍTICO:** Não existem endpoints de saque para usuários. Não há solicitação de saque. O pagamento é 100% controlado pelo admin.
> O fluxo completo de pagamento está descrito na seção 4.8 (Admin) e na seção 11 (Sistema de Pagamentos).

---

### 4.8 — Admin (`/api/admin`)

#### 4.8.1 — Dashboard Admin

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/admin/dashboard/kpis` | KPIs do dashboard (receita, usuários ativos, cotas vendidas, receita total, dividendPool) | Admin |
| GET | `/admin/dashboard/sales-chart` | Gráfico de vendas (novas vs recompra, últimos 6 meses) | Admin |
| GET | `/admin/dashboard/title-distribution` | Distribuição de títulos (bar chart) | Admin |
| GET | `/admin/dashboard/crm-users` | Top 10 usuários por LTV (CRM table) | Admin |

#### 4.8.2 — Price Engine

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/admin/price-engine` | Estado atual do motor de preços (quotaPrice, lotProgress, lotSize, lotNumber, currentConstant) | Admin |
| PUT | `/admin/price-engine` | Atualizar parâmetros (forceSplit, adjustConstant) | Admin |

#### 4.8.3 — Payouts (Fluxo de Pagamento em 3 Estágios)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| POST | `/admin/payouts/calculate-distribution` | Estágio 1: Admin envia profitMonth + netProfit. Retorna preview da distribuição | Admin |
| POST | `/admin/payouts/generate-batch` | Estágio 2: Aprovar preview e gerar faturas (payout_requests) | Admin |
| GET | `/admin/payouts` | Listar todos os payouts (filtros: status, month) | Admin |
| GET | `/admin/payouts/stats` | Estatísticas de payouts (total pendente, processando, concluído) | Admin |
| PATCH | `/admin/payouts/:payoutId/process` | Estágio 3a: Marcar como "processing" (admin iniciou transferência) | Admin |
| PATCH | `/admin/payouts/:payoutId/confirm` | Estágio 3b: Confirmar pagamento como "completed" (adicionar transactionId) | Admin |
| POST | `/admin/payouts/bulk-action` | Ação em massa (processar/confirmar vários) | Admin |
| GET | `/admin/payouts/export` | Exportar payouts do mês (CSV/PDF) | Admin |

**Calculate Distribution — request body:**
```json
{
  "profitMonth": "2025-06",
  "netProfit": 150000.00
}
```

**Calculate Distribution — response:**
```json
{
  "profitMonth": "2025-06",
  "paymentMonth": "2025-08",
  "netProfit": 150000.00,
  "dividendPoolPercent": 20,
  "dividendPool": 30000.00,
  "totalQuotasInSystem": 500,
  "distributions": [
    {
      "userId": "uuid",
      "userName": "João Silva",
      "quotaBalance": 10,
      "percentageShare": 2.00,
      "quotaAmount": 600.00,
      "networkAmount": 250.00,
      "totalAmount": 850.00,
      "pixKey": "joao@email.com",
      "pixKeyType": "email"
    }
  ]
}
```

> **Regra:** `paymentMonth = profitMonth + 2 meses`. Exemplo: lucro de junho → pagamento em agosto.
> **Regra:** `dividendPool = netProfit × dividendPoolPercent / 100`
> **Regra:** `quotaAmount` por user = `dividendPool × (userQuotaBalance / totalQuotasInSystem)`
> **Regra:** `networkAmount` = bônus de rede acumulados do user no período (comissões + bônus)

#### 4.8.4 — Configurações Financeiras

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/admin/financial/config` | Configurações financeiras globais | Admin |
| PUT | `/admin/financial/config` | Atualizar configurações globais | Admin |
| GET | `/admin/financial/monthly/:month` | Config do mês específico | Admin |
| PUT | `/admin/financial/monthly/:month` | Atualizar config do mês | Admin |
| POST | `/admin/financial/close-month/:month` | Fechar mês | Admin |

#### 4.8.5 — Apresentação (Métricas da Landing/Quota Info)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/admin/presentation-metrics` | Métricas heroicas da página de cotas (editáveis pelo admin) | Admin |
| PUT | `/admin/presentation-metrics` | Atualizar métricas de apresentação | Admin |

#### 4.8.6 — Plano de Carreira (Career Plan Builder)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/admin/career-plan` | Listar requisitos e benefícios de todos os títulos | Admin |
| PUT | `/admin/career-plan/:titleId` | Atualizar requisitos e benefícios de um título | Admin |

---

### 4.9 — Admin Manager (Gestão Protegida) (`/api/admin/manager`)

Operações protegidas por senha de gerente separada.

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| POST | `/admin/manager/set-password` | Definir senha gerente | Admin |
| POST | `/admin/manager/verify-password` | Verificar senha gerente | Admin |
| GET | `/admin/manager/users` | Listar usuários (exceto admin) | Admin |
| POST | `/admin/manager/users/:userId/add-quotas` | Adicionar cotas | Admin + senha |
| POST | `/admin/manager/users/:userId/remove-quotas` | Remover cotas | Admin + senha |
| PATCH | `/admin/manager/users/:userId/sponsor` | Alterar patrocinador | Admin + senha |
| DELETE | `/admin/manager/users/:userId` | Excluir (soft delete) | Admin + senha |
| POST | `/admin/manager/users/:userId/restore` | Restaurar da lixeira | Admin + senha |
| GET | `/admin/manager/trash` | Listar lixeira | Admin |

> **Regra:** Todas as operações de mutação exigem `managerPassword` no body, validada com bcrypt no server.
> **Regra:** Lixeira tem 30 dias para purge permanente.

---

### 4.10 — Perfil / Profile (`/api/profile`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/profile` | Dados do perfil | Autenticado |
| PUT | `/profile` | Atualizar perfil | Autenticado |
| PUT | `/profile/password` | Alterar senha | Autenticado |
| PUT | `/profile/pix` | Atualizar chave PIX | Autenticado |

---

### 4.11 — Onboarding / Cadastro Interno (`/api/onboarding`)

Cadastro feito por um membro logado (Épico 7).

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| POST | `/onboarding/register-user` | Cadastrar novo membro | Autenticado |

**Request:**
```json
{
  "fullName": "Nome Completo",
  "cpf": "12345678901",
  "email": "novo@email.com",
  "ddd": "11",
  "phone": "999999999",
  "city": "São Paulo",
  "state": "SP",
  "pixType": "email",
  "pixKey": "novo@email.com",
  "quotaCount": 5,
  "quotaType": "purchased"
}
```

> **Regra:** O `sponsorId` é automaticamente o `currentUser.id`. Gerar `referralCode` automaticamente (formato `CIANO-XXXXXX`). Mesmo sem compra, criar o login.
> **Regra:** `quotaType` pode ser `purchased` (compradas) ou `split` (recebidas por split). Cotas split NÃO contam para nível.

---

### 4.12 — Settings / Configurações do Usuário (`/api/settings`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|----------|--------|
| GET | `/settings` | Obter preferências do usuário | Autenticado |
| PUT | `/settings` | Atualizar preferências | Autenticado |

**Settings Body:**
```json
{
  "theme": "auto",
  "language": "pt-BR",
  "notifications": {
    "payments": true,
    "network": true,
    "promotions": false,
    "system": true
  }
}
```

> **Idiomas suportados:** Apenas `pt-BR` e `en`. Não há suporte para `zh` ou `es`.
> **Tema:** `auto` (segue sistema), `light`, `dark`
> **Notificações:** 4 toggles independentes (pagamentos, rede, promoções, sistema)
> **Segurança:** Alteração de senha está no endpoint `/profile/password`

---

## 5. Sistema de Autenticação

### 5.1 — Fluxo de Login

1. Receber email + senha
2. Buscar user por email
3. Verificar se `is_active = true` e `deleted_at IS NULL`
4. Comparar senha com bcrypt
5. Gerar JWT (accessToken + refreshToken)
6. Salvar refreshToken na tabela `refresh_tokens`
7. Retornar tokens + dados do user

### 5.2 — Tokens

| Token | Duração | Uso |
|-------|---------|-----|
| accessToken | 15min (ou conforme config) | Bearer header em todas as requests |
| refreshToken | 7 dias (ou conforme config) | POST /auth/refresh para renovar |

### 5.3 — Refresh Flow

1. Frontend detecta 401
2. Envia refreshToken para `/auth/refresh`
3. Backend valida token na tabela `refresh_tokens` (não expirado, não revogado)
4. Gera novos tokens
5. Revoga token antigo
6. Retorna novos tokens

### 5.4 — Forgot Password

1. Receber email
2. Gerar token aleatório (256 bits hex)
3. Salvar na tabela `password_reset_tokens` (expira em 1h)
4. Enviar email com link `/reset-password/:token`

### 5.5 — Guards

O frontend usa `meta.requiresAuth`, `meta.requiresAdmin`, `meta.guestOnly` nas rotas. O backend deve implementar:

- **JwtAuthGuard** — Global, exceto rotas com `@Public()`
- **RolesGuard** — Já existe, usar `@Roles(Role.ADMIN)` para rotas admin

---

## 6. Sistema de Cotas

### 6.1 — Preço da Cota

- Base: R$ 2.500,00
- Muda via fórmula de split/valorização (ver seção 10)
- Preço atual armazenado em `quota_system_state.current_quota_price`

### 6.2 — Tipos de Cota no Saldo do Usuário

| Campo | Definição | Usado para... |
|-------|----------|--------------|
| `purchased_quotas` | Cotas compradas diretamente com dinheiro | Definir `partner_level`, Metas de split |
| `split_quotas` | Cotas recebidas via evento de split | Apenas cálculo de dividendos |
| `quota_balance` | `purchased_quotas + split_quotas` | Base para dividendos, exibição total |

⚠️ **REGRA CRÍTICA**: Apenas `purchased_quotas` definem o nível de sócio (partner_level). Split quotas NÃO contam.

### 6.3 — Transações

Cada movimentação é registrada na tabela `quota_transactions`:

| type | Quando | quotas_affected | amount |
|------|--------|----------------|--------|
| `purchase` | Compra de cotas | +N | +valor |
| `bonus` | Recebimento de bônus em valor | 0 | +valor |
| `withdrawal` | Saque | 0 | -valor |
| `refund` | Estorno | -N | -valor |
| `adjustment` | Ajuste admin | ±N | ±valor |

---

## 7. Sistema de Bonificações

### 7.1 — Bônus de Primeira Compra

- **Quando:** Indicado faz a PRIMEIRA compra de cotas
- **Quem recebe:** Patrocinador direto (sponsorId)
- **Percentual:** 10% do valor total da compra
- **Regra especial:** O patrocinador recebe MESMO se estiver inativo

```
bonusAmount = purchaseValue * 0.10
```

### 7.2 — Bônus de Recompra (Unilevel)

- **Quando:** Alguém na rede faz uma compra (não primeira)
- **Quem recebe:** Upline até N níveis (conforme título)
- **Percentuais:**
  - Nível 1 (direto): 5%
  - Níveis 2 a 6: 2%
- **Profundidade por título:**
  - Bronze: 1 nível
  - Prata: 2 níveis
  - Ouro: 4 níveis
  - Diamante: 6 níveis
- **Regra:** Só recebe se estiver **ativo**

```
Nível 1: purchaseValue * 0.05
Nível 2-6: purchaseValue * 0.02
```

### 7.3 — Bônus de Equipe

- **Quando:** Cálculo mensal
- **Quem recebe:** Usuário ativo
- **Base:** Soma dos ganhos de todos os patrocinados abaixo dele nos N níveis
- **Percentual:** 2% desse total
- **Profundidade por título:**
  - Bronze: 2 níveis
  - Prata: 3 níveis
  - Ouro: 4 níveis
  - Diamante: 5 níveis
- **Regra:** Só recebe se estiver **ativo**

```
teamBonusBase = soma de ganhos dos N níveis abaixo
bonusAmount = teamBonusBase * 0.02
```

### 7.4 — Bônus de Liderança

- **Quem:** Apenas títulos Ouro e Diamante (chamados "qualificados")
- **Base:** Soma dos ganhos dos 5 níveis de **qualificados** abaixo
- **Percentuais:**
  - Ouro: 1%
  - Diamante: 2%
- **Regra:** Só recebe se estiver **ativo**

```
leadershipBase = soma dos ganhos dos 5 níveis de qualificados abaixo
Ouro: leadershipBase * 0.01
Diamante: leadershipBase * 0.02
```

### 7.5 — Dividendos (Bônus de Cotas)

- **Quando:** Mensal (no fechamento)
- **Quem recebe:** TODOS os detentores de cotas (ativos E inativos)
- **Fórmula:**

```
dividendPool = totalCompanyProfit * profitPayoutPercentage / 100
totalQuotasInSystem = soma de quota_balance de TODOS os users
userDividend = (dividendPool / totalQuotasInSystem) * user.quota_balance
```

- **Regra:** Usa `quota_balance` (purchased + split) — ambas contam para dividendos
- **Regra:** Inativo recebe dividendos normalmente

### 7.6 — Observação: Composição de Bônus

> "O bônus de compra e recompra também entra nos ganhos dos bônus de liderança e bônus de equipe"

Ou seja, quando se calcula a base para equipe/liderança, inclui-se os bônus de primeira compra e recompra gerados por aquele nível.

---

## 8. Sistema de Títulos

### 8.1 — Regras de Qualificação

| Título | Requisito | repurchase_levels | team_levels | leadership_percent |
|--------|-----------|----------|--------|----------|
| None | — | 0 | 0 | 0% |
| Bronze | 2 pessoas ativas na rede | 1 | 2 | 0% |
| Prata | Ajudar 1 indicado direto a virar Bronze | 2 | 3 | 0% |
| Ouro | 2 Bronzes em linhas diretas **diferentes** | 4 | 4 | 1% |
| Diamante | 3 Bronzes em linhas diretas **diferentes** | 6 | 5 | 2% |

### 8.2 — Definição de "Linha Diferente"

Cada pessoa que EU cadastro diretamente é uma "linha" (direct child na árvore). Para Ouro, preciso que em 2 linhas diferentes haja pelo menos 1 Bronze (title ≥ bronze). Para Diamante, 3 linhas.

### 8.3 — Definição de "Pessoa Ativa na Rede"

Alguém com `is_active = true` E `last_purchase_date` dentro dos últimos 6 meses (não expirada).

### 8.4 — Recalculação

O título deve ser recalculado quando:
- Um membro da rede compra cota (muda status de atividade)
- Um membro da rede expira (passa 6 meses)
- Alguém na rede conquista título Bronze

### 8.5 — Prata: Requisito Adicional

Além de ajudar 1 indicado a virar Bronze, pode haver exigência de movimentação mínima:
- `minNetworkMovement = R$ 5.000` em até 3 níveis

---

## 9. Sistema de Níveis de Sócio (Partner Level)

### 9.1 — Regras

| Nível | Cotas Compradas Necessárias | Benefícios Chave |
|-------|----------------------------|-----------------|
| Sócio | ≥ 1 | Participação nos lucros, pode indicar |
| Platinum | ≥ 10 (R$ 25.000) | 30% desconto, reunião com fundador |
| VIP | ≥ 20 (R$ 50.000) | 50% desconto, 1 fim de semana grátis/ano |
| Imperial | ≥ 60 (R$ 150.000) | Hospedagem grátis ilimitada, pode morar na pousada |

### 9.2 — Cálculo

```
SE purchased_quotas >= 60 → 'imperial'
SE purchased_quotas >= 20 → 'vip'
SE purchased_quotas >= 10 → 'platinum'
SE purchased_quotas >= 1  → 'socio'
SENÃO → sem nível (erro — todo user deveria ter ≥ 1 cota eventualmente)
```

⚠️ **Apenas `purchased_quotas`** — cotas por split NÃO contam.

### 9.3 — Subida Automática

A evolução é **contínua e cumulativa**. Não precisa comprar tudo de uma vez. A cada compra de cota, recalcular.

---

## 10. Sistema de Split e Valorização

### 10.1 — Fórmula de Aumento de Preço

```
novoPreçoCota = preçoBase + 500 * Fcv
```
- `Fcv` = fase de cota vendida (incrementa a cada lote de cotas vendidas)
- O preço base de reset pós-split é R$ 2.000

### 10.2 — Condição de Split

```
SE Fcv >= 3 ENTÃO
   executar SPLIT
   Qs++ (incrementa contagem de splits)
```

### 10.3 — Meta de Vendas para Avançar Fase

```
meta = 50 × 2^Qs
```
- Qs = número de splits já realizados
- A cada `meta` cotas vendidas, avança 1 fase (`Fcv++`)

### 10.4 — O que Acontece no Split

1. **Todas** as `split_quotas` de **todos** os usuários são **dobradas**
   - `user.split_quotas *= 2`
   - `user.quota_balance = user.purchased_quotas + user.split_quotas`
2. O preço da cota volta para R$ 2.000
3. `Fcv` reseta para 0
4. `Qs` incrementa em 1
5. Nova meta = `50 × 2^(Qs)`

### 10.5 — Timing

> "Virar o preço, caso caia nas regras de aumento ou split, sempre ao final do dia UTC:00"

**Job diário:** ao final do dia (00:00 UTC+0), verificar se `total_quotas_sold` atingiu a meta:
- Se sim e `Fcv < 3` → `Fcv++`, atualizar preço
- Se sim e `Fcv >= 3` → executar split

### 10.6 — Observação Importante

> "Apenas cotas compradas servem para bater as metas de compras de cotas"

Ou seja, `split_quotas` NÃO contam para meta. Apenas `purchased_quotas` (efetivamente vendidas).

---

## 11. Sistema de Pagamentos (Payouts) — Admin-Driven

> ⚠️ **CRÍTICO:** Não existem saques solicitados por usuários neste sistema. O pagamento é 100% controlado pelo admin.
> Literal da tela: _"Não existem saques solicitados por usuários neste sistema"_

### 11.1 — Fluxo de Pagamento em 3 Estágios

**Estágio 1 — Entrada de Lucro:**
1. Admin acessa painel de payouts
2. Informa `profitMonth` (mês de competência do lucro, ex: "2025-06")
3. Informa `netProfit` (lucro líquido da empresa no período)
4. Sistema calcula automaticamente: `paymentMonth = profitMonth + 2 meses` (ex: jun → ago)
5. Sistema calcula: `dividendPool = netProfit × dividendPoolPercent / 100`

**Estágio 2 — Preview de Distribuição:**
1. Sistema gera lista de todos os usuários elegíveis
2. Para cada usuário calcula:
   - `quotaAmount` = `dividendPool × (userQuotaBalance / totalQuotasInSystem)` (proporcional às cotas)
   - `networkAmount` = soma de bônus de rede acumulados no período (comissões + bônus equipe + liderança)
   - `totalAmount` = `quotaAmount + networkAmount`
   - `percentageShare` = % de participação no pool de dividendos
3. Preview mostra: nome, PIX key, PIX type, quotaAmount, networkAmount, total, % share
4. Admin revisa a lista e clica "Aprovar Lote e Gerar Faturas"
5. Sistema gera registros `payout_requests` com status `pending`

**Estágio 3 — Execução Manual:**
1. Admin visualiza tabela de pagamentos pendentes
2. Para cada pagamento, admin realiza transferência PIX manualmente
3. Admin marca como `processing` (em andamento)
4. Após confirmar recebimento, admin marca como `completed` (informando `transactionId`)
5. Se falhar, admin pode marcar como `failed` com `failureReason`
6. Ações em massa disponíveis para processar/confirmar vários de uma vez
7. Exportação da lista (CSV/PDF)

### 11.2 — Dados de Cada Payout

```typescript
interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;              // Snapshot do nome no momento da geração
  quotaAmount: number;           // Valor de dividendos (proporcional às cotas)
  networkAmount: number;         // Valor de bônus de rede acumulados
  amount: number;                // quotaAmount + networkAmount = total a pagar
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  referenceMonth: string;        // YYYY-MM — mês de competência do lucro (profitMonth)
  paymentMonth: string;          // YYYY-MM — mês de pagamento (profitMonth + 2)
  netProfitRef: number;          // Lucro líquido informado pelo admin para este ciclo
  dividendPoolRef: number;       // Pool de dividendos calculado
  percentageShare: number;       // % de participação no pool
  generatedAt: string;           // Quando o batch foi gerado
  processedAt: string | null;    // Quando admin marcou como processing
  completedAt: string | null;    // Quando admin confirmou pagamento
  failureReason: string | null;
  transactionId: string | null;  // ID da transação PIX (externo, preenchido pelo admin)
  generatedBy: string;           // Admin que gerou o batch
}
```

### 11.3 — Regras de Negócio do Pagamento

| Regra | Descrição |
|-------|----------|
| Payment Window | `paymentMonth = profitMonth + 2 meses` |
| Dividend Pool | `netProfit × dividendPoolPercent / 100` |
| Distribuição | Proporcional a `quotaBalance` de cada user |
| Bônus de Rede | Somados do período (comissões, equipe, liderança, recompra) |
| Status Flow | `pending` → `processing` → `completed` (ou `failed`) |
| Sem Cancelamento | Usuário não pode cancelar — não há solicitação |
| Geração Única | Um batch por `referenceMonth` (prevenir duplicatas) |

> **NOTA:** Não existe tabela de "limites de saque", "taxa de saque", "grace period" ou qualquer conceito de solicitação pelo usuário.

---

## 12. Painel Administrativo

### 12.1 — Dashboard Admin (Épico 2)

O dashboard admin é dividido em **3 blocos principais** + barra de alertas:

#### Bloco 1 — KPIs

| KPI | Descrição | Campos |
|-----|----------|--------|
| Receita do Mês | Receita total de vendas no mês atual | `monthRevenue`, `monthRevenueTrend` (%) |
| Usuários Ativos | Total de usuários com compra < 6 meses | `activeUsers`, `retentionRate` (%) |
| Cotas Vendidas no Mês | Total de cotas vendidas no mês | `monthQuotas`, `monthQuotasTrend` (%) |
| Receita Total Acumulada | Receita desde o início | `totalRevenue` |
| **Pool de Dividendos** | Card especial (destaque amber) com barra de % sobre receita | `dividendPool`, `dividendPoolPercent`, barra visual `pool/totalRevenue` |

#### Bloco 2 — Operações

**Price Engine (Motor de Preços):**
- `quotaPrice` — Preço atual da cota
- `lotProgress` — Progresso do lote atual (cotas vendidas / tamanho do lote)
- `lotSize` — Tamanho do lote atual
- `lotNumber` — Número do lote
- `currentConstant` — Constante atual de valorização
- `forceSplit` — Botão para forçar split manual
- `adjustConstant` — Botão para ajustar constante

**Gráfico de Vendas (Sales Chart):**
- Stacked bar chart, últimos 6 meses
- 2 séries: "Novas vendas" e "Recompra"
- Dados: `monthLabel`, `newSales`, `repurchase`

#### Bloco 3 — Saúde

**Distribuição de Títulos (Title Distribution):**
- Bar chart horizontal
- Dados: `title`, `count`, `percentage` para cada título (none, bronze, silver, gold, diamond)

**Tabela CRM (Top 10 por LTV):**
- Colunas: Nome, LTV, Título, Status
- Ações: Ver Extrato, Bloquear, Enviar Mensagem
- Ordenado por LTV descendente, limitado a 10

#### AlertBar

- Barra fixa no topo quando há pagamentos pendentes
- Mostra: `pendingPayoutsCount` e `pendingPayoutsTotal`
- Link para tela de payouts

### 12.2 — Configurações Financeiras (3 Abas)

O painel de configurações financeiras é dividido em **3 abas independentes**:

#### Aba 1 — Parâmetros Globais

| Campo | Tipo | Descrição |
|-------|------|----------|
| `quotaValue` | DECIMAL | Preço base da cota |
| `minQuotas` | INT | Mínimo de cotas por compra |
| `maxQuotasPerUser` | INT | Máximo de cotas por usuário |
| `totalQuotasAvailable` | INT | Total de cotas disponíveis no sistema |
| `closingDayMode` | ENUM | Modo de fechamento: `fixed`, `last_day`, `first_next_month` |
| `closingDay` | INT | Dia fixo de fechamento (quando mode = fixed) |
| `paymentDay` | INT | Dia do mês para pagamentos |

**Hero Metrics (Métricas de Apresentação):**
Números editáveis exibidos na página de cotas (QuotaInfoView). Puramente estéticos, não afetam cálculos.

#### Aba 2 — Motor de Comissões

| Campo | Tipo | Descrição |
|-------|------|----------|
| `firstPurchaseBonus` | DECIMAL(5,2) | % de comissão na primeira compra do indicado |
| `repurchaseBonusL1` | DECIMAL(5,2) | % de bônus recompra (nível 1) |
| `repurchaseBonusL2to6` | DECIMAL(5,2) | % de bônus recompra (níveis 2-6) |
| `teamBonus` | DECIMAL(5,2) | % de bônus de equipe |
| `dividendPoolPercent` | DECIMAL(5,2) | % do lucro destinado ao pool de dividendos |

#### Aba 3 — Plano de Carreira (Career Plan Builder)

Editor visual dos requisitos de cada título:
- Para cada título (bronze, silver, gold, diamond):
  - `req_quantity` — Quantidade exigida
  - `req_type` — Tipo: `pessoas_ativas`, `indicado`, `linhas`
  - `req_level` — Nível mínimo: `qualquer`, `bronze`, `prata`, `ouro`
- Benefícios desbloqueáveis:
  - `repurchase_levels` — Quantos níveis de bônus recompra
  - `team_levels` — Quantos níveis de bônus equipe
  - `leadership_percent` — % de bônus de liderança
- Regras de movimentação:
  - `min_network_movement` — Movimentação mínima da rede
  - `network_levels_depth` — Até qual nível contabilizar

**Funcionalidades adicionais:**
- Modal de diff/review antes de salvar alterações
- Footer de auditoria com última modificação (quem, quando)

### 12.3 — Gestão Protegida (Admin Manager)

Operações que exigem senha de gerente adicionalmente:
- Adicionar cotas a um usuário
- Remover cotas de um usuário
- Alterar patrocinador de um usuário
- Excluir usuário (soft delete → lixeira 30 dias)
- Restaurar usuário da lixeira

**Implementação:** Senha separada armazenada com bcrypt. Cada operação requer `managerPassword` no request body, verificada antes de executar.

---

## 13. Jobs Agendados (Cron)

### 13.1 — Fechamento Mensal (Dia 01 às 00:00 UTC)

```
@Cron('0 0 1 * *')
async monthlyClose()
```

**Tarefas:**
1. Calcular bônus de equipe de todos os usuários ativos
2. Calcular bônus de liderança (Ouro/Diamante ativos)
3. Calcular dividendos (todos os detentores de cotas)
4. Gerar registros de `earnings` para cada bônus
5. Criar `monthly_earning_summaries` para cada user
6. Preparar dados para o admin gerar o batch de pagamentos (não gera `payout_requests` automaticamente — quem gera é o admin via endpoint `POST /admin/payouts/generate-batch`)
7. Criar `monthly_payout_summaries`
8. Travar mês anterior (`is_locked = true`)

### 13.2 — Verificação de Split/Preço (Diário às 00:00 UTC)

```
@Cron('0 0 * * *')
async checkSplitAndPrice()
```

**Tarefas:**
1. Ler `quota_system_state`
2. Calcular meta atual: `50 * 2^Qs`
3. Verificar se `total_quotas_sold >= meta`
4. Se sim:
   - Se `Fcv < 3`: incrementar `Fcv`, atualizar preço = `preçoBase + 500 * Fcv`
   - Se `Fcv >= 3`: executar split (dobrar split_quotas de todos, resetar Fcv, Qs++)
5. Registrar evento em `split_events`

### 13.3 — Verificação de Inatividade (Diário)

```
@Cron('0 1 * * *')
async checkInactivity()
```

**Tarefas:**
1. Buscar todos os users com `last_purchase_date < NOW() - 6 meses` E `is_active = true`
2. Marcar como inativo (`is_active = false`) — OU manter is_active e apenas checar dinamicamente

> **Nota:** O frontend calcula inatividade dinamicamente com `isAccountExpired()`. O backend pode fazer o mesmo, sem necessariamente setar `is_active = false` automaticamente. Considerar ambas abordagens.

### 13.4 — Purge de Lixeira (Diário)

```
@Cron('0 2 * * *')
async purgeTrash()
```

**Tarefas:**
1. Buscar users com `deleted_at < NOW() - 30 dias`
2. Hard delete (ou manter como historical record)

### 13.5 — Recalcular Títulos (Pós-Compra e Diário)

**Trigger:** Após cada compra de cota
**Job diário de backup:** Recalcular todos os títulos uma vez ao dia

```
Para cada user:
  1. Contar pessoas ativas na rede direta
  2. Verificar condições do título
  3. Atualizar se mudou
```

---

## 14. Contratos de Dados (TypeScript)

### 14.1 — Enums e Types

```typescript
// Roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Títulos (network-based)
export enum UserTitle {
  NONE = 'none',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

// Níveis de Sócio (purchase-based)
export enum PartnerLevel {
  SOCIO = 'socio',
  PLATINUM = 'platinum',
  VIP = 'vip',
  IMPERIAL = 'imperial',
}

// Tipos de Transação (ledger interno — 'withdrawal' é gerado pelo admin ao processar payout, NÃO pelo usuário)
export enum TransactionType {
  PURCHASE = 'purchase',
  BONUS = 'bonus',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

// Status de Transação
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Tipos de Bônus
export enum BonusType {
  FIRST_PURCHASE = 'firstPurchase',
  REPURCHASE = 'repurchase',
  TEAM = 'team',
  LEADERSHIP = 'leadership',
  DIVIDEND = 'dividend',
}

// Status de Earning
export enum EarningStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// Status de Payout
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Tipo de chave PIX
export enum PixKeyType {
  CPF = 'cpf',
  EMAIL = 'email',
  PHONE = 'phone',
  RANDOM = 'random',
}
```

### 14.2 — DTOs Esperados pelo Frontend

**API Response Wrapper:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}
```

**Paginação:**
```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## 15. Guards e Permissões

### 15.1 — Rotas Públicas

| Rota | Guard |
|------|-------|
| POST `/auth/login` | `@Public()` |
| POST `/auth/register` | `@Public()` |
| POST `/auth/refresh` | `@Public()` |
| POST `/auth/forgot-password` | `@Public()` |
| POST `/auth/reset-password` | `@Public()` |
| GET `/quotas/presentation` | `@Public()` |
| GET `/quotas/partner-levels` | `@Public()` |

### 15.2 — Rotas Autenticadas (User + Admin)

Todas as demais rotas exigem JWT válido.

### 15.3 — Rotas Admin

| Rota | Guard Adicional |
|------|-------|
| `/admin/*` | `@Roles(Role.ADMIN)` |

### 15.4 — Rotas Admin Manager (Senha Extra)

| Rota | Guards |
|------|-------|
| `/admin/manager/*` (mutações) | `@Roles(Role.ADMIN)` + verificação de `managerPassword` no body |

---

## 16. Configurações Financeiras

### 16.1 — Valores Padrão

| Config | Valor |
|--------|-------|
| Preço da cota | R$ 2.500,00 |
| Dia de pagamento | 5 |
| Modo de fechamento | `fixed` |
| Dia de fechamento | 25 |
| PIX habilitado | Sim |
| Mínimo de cotas por compra | 1 |
| Máximo de cotas por usuário | 200 |
| Total de cotas disponíveis | 10.000 |

> ⚠️ **NOTA:** Não existem configurações de saque (min/max saque, taxa de saque, grace period, batch time, limite diário). Os pagamentos são feitos manualmente pelo admin.

### 16.2 — Porcentagens de Bônus Padrão

| Bônus | Percentual |
|-------|-----------|
| Primeira compra | 10% |
| Recompra nível 1 | 5% |
| Recompra níveis 2-6 | 2% |
| Equipe | 2% |
| Liderança Ouro | 1% |
| Liderança Diamante | 2% |
| Pool de dividendos | 20% do lucro |

---

## 📊 Resumo de Módulos NestJS Necessários

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-auth.guard.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   ├── forgot-password.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   └── entities/
│   │       ├── refresh-token.entity.ts
│   │       └── password-reset-token.entity.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── quotas/
│   │   ├── quotas.module.ts
│   │   ├── quotas.controller.ts
│   │   ├── quotas.service.ts
│   │   ├── dto/
│   │   │   └── purchase-quota.dto.ts
│   │   └── entities/
│   │       ├── quota-transaction.entity.ts
│   │       ├── quota-system-state.entity.ts
│   │       └── split-event.entity.ts
│   │
│   ├── earnings/
│   │   ├── earnings.module.ts
│   │   ├── earnings.controller.ts
│   │   ├── earnings.service.ts
│   │   └── entities/
│   │       ├── earning.entity.ts
│   │       └── monthly-earning-summary.entity.ts
│   │
│   ├── network/
│   │   ├── network.module.ts
│   │   ├── network.controller.ts
│   │   └── network.service.ts
│   │
│   ├── payouts/
│   │   ├── payouts.module.ts
│   │   ├── payouts.controller.ts
│   │   ├── payouts.service.ts
│   │   └── entities/
│   │       ├── payout-request.entity.ts
│   │       └── monthly-payout-summary.entity.ts
│   │
│   ├── dashboard/
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   └── dashboard.service.ts
│   │
│   ├── admin/
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin-manager.controller.ts
│   │   ├── admin-manager.service.ts
│   │   ├── dto/
│   │   │   ├── close-month.dto.ts
│   │   │   ├── update-financial.dto.ts
│   │   │   ├── manager-password.dto.ts
│   │   │   ├── add-quotas.dto.ts
│   │   │   ├── remove-quotas.dto.ts
│   │   │   ├── change-sponsor.dto.ts
│   │   │   ├── calculate-distribution.dto.ts
│   │   │   ├── generate-batch.dto.ts
│   │   │   ├── update-career-plan.dto.ts
│   │   │   └── update-presentation-metrics.dto.ts
│   │   └── entities/
│   │       ├── monthly-financial-config.entity.ts
│   │       ├── global-financial-settings.entity.ts
│   │       ├── admin-payment-check.entity.ts
│   │       ├── title-requirement.entity.ts
│   │       └── partner-level-requirement.entity.ts
│   │
│   ├── profile/
│   │   ├── profile.module.ts
│   │   ├── profile.controller.ts
│   │   ├── profile.service.ts
│   │   └── dto/
│   │       ├── update-profile.dto.ts
│   │       └── change-password.dto.ts
│   │
│   └── onboarding/
│       ├── onboarding.module.ts
│       ├── onboarding.controller.ts
│       ├── onboarding.service.ts
│       └── dto/
│           └── register-user.dto.ts
│
│   └── settings/
│       ├── settings.module.ts
│       ├── settings.controller.ts
│       ├── settings.service.ts
│       └── entities/
│           └── user-settings.entity.ts
│
├── jobs/
│   ├── monthly-close.job.ts       # Fechamento mensal (dia 01 00h)
│   ├── split-check.job.ts         # Verificação diária de split/preço
│   ├── inactivity-check.job.ts    # Verificação de inatividade
│   ├── trash-purge.job.ts         # Purge de lixeira (30 dias)
│   └── title-recalculation.job.ts # Recalcular títulos diariamente
│
├── core/
│   ├── bonus/
│   │   ├── bonus-calculator.service.ts    # Cálculo central de todos os bônus
│   │   ├── first-purchase-bonus.ts
│   │   ├── repurchase-bonus.ts
│   │   ├── team-bonus.ts
│   │   ├── leadership-bonus.ts
│   │   └── dividend-bonus.ts
│   │
│   ├── title/
│   │   └── title-calculator.service.ts    # Cálculo de títulos
│   │
│   └── split/
│       └── split-engine.service.ts        # Engine de split/valorização
```

---

## ✅ Checklist de Implementação

### Migrations (Ordem)
1. [ ] `users` table
2. [ ] `refresh_tokens` table
3. [ ] `password_reset_tokens` table
4. [ ] `quota_transactions` table
5. [ ] `earnings` table
6. [ ] `monthly_earning_summaries` table
7. [ ] `payout_requests` table
8. [ ] `monthly_payout_summaries` table
9. [ ] `monthly_financial_configs` table
10. [ ] `global_financial_settings` table (singleton + seed)
11. [ ] `title_requirements` table (seed)
12. [ ] `partner_level_requirements` table (seed)
13. [ ] `split_events` table
14. [ ] `quota_system_state` table (singleton + seed)
15. [ ] `admin_payment_checks` table

### Módulos Backend (Ordem de Prioridade)
1. [ ] Auth Module (login, register, refresh, forgot/reset password)
2. [ ] Users Module (entity, CRUD base)
3. [ ] Quotas Module (purchase, transactions, balance)
4. [ ] Bonus Calculator Core (todos os 5 tipos de bônus)
5. [ ] Earnings Module (ledger, summaries, overview)
6. [ ] Network Module (tree, stats)
7. [ ] Title Calculator Core (regras de título)
8. [ ] Split Engine Core (valorização, split)
9. [ ] Dashboard Module (KPIs, composição de dados)
10. [ ] Payouts Module (fluxo admin-driven: calculate-distribution, generate-batch, process, confirm)
11. [ ] Admin Module (dashboard KPIs, financial config 3 abas, career plan builder, price engine, presentation metrics)
12. [ ] Admin Manager (operações protegidas)
13. [ ] Profile Module (editar perfil, senha, PIX)
14. [ ] Settings Module (preferências: tema, idioma pt-BR/en, notificações)
15. [ ] Onboarding Module (cadastro com ddd, quotaType)
14. [ ] Onboarding Module (cadastro interno)
15. [ ] Jobs (monthly close, split check, inactivity, purge, title recalc)
