# Análise Geral do Sistema + Épicos de Desenvolvimento
**Data:** 2026-03-04
**Projeto:** Maziero – Empresa Ciano (redeciano.com.br)
**Domínio:** Sistema de Cotas e Bonificação para rede de pousadas

---

## 📊 ESTADO ATUAL DO SISTEMA

### Backend — NestJS 11 + Fastify + TypeORM/MySQL
| Aspecto | Status |
|---------|--------|
| Framework/Scaffold | ✅ Configurado (NestJS 11, Fastify, TypeORM, MySQL) |
| Config (env, DB, JWT, throttle) | ✅ Implementado |
| Decorators (@Public, @Roles, @CurrentUser) | ✅ Criados |
| AllExceptionsFilter | ⚠️ Criado mas NÃO registrado globalmente |
| ThrottlerGuard | ⚠️ Configurado mas NÃO registrado globalmente |
| AuthModule (login, register, JWT) | ❌ Não existe |
| Entities/Models | ❌ Zero entidades |
| Migrations | ❌ Zero migrations |
| Feature Modules | ❌ Zero módulos |
| Services/Business Logic | ❌ Zero lógica |
| API Endpoints | ❌ Apenas GET /api → "Hello World" |
| Jobs/Cron | ❌ Nenhum |
| Testes | ❌ Apenas boilerplate |

**Resumo Backend:** Skeleton bem configurado, mas com ZERO implementação de negócio.

---

### Frontend — Vue 3 + Vite + Pinia + i18n
| Tela/Feature | Status | Detalhes |
|---|---|---|
| Login | ✅ Completo | Email, senha, lembrar-me, validação, mock auth |
| Register (auto) | ⚠️ Parcial | Faltam: cidade, estado, PIX, compra de cotas |
| Esqueci Senha | ⚠️ Skeleton | Form básico, raw inputs, TODO no handler |
| Redefinir Senha | ⚠️ Skeleton | Form básico, raw inputs, alert() |
| Dashboard | ✅ Completo (com gaps) | Split ticker, KPIs, donut chart, saúde da rede |
| Rede (Network) | ✅ Completo (com gaps) | Tree list, filtros, KPIs, WhatsApp link |
| Cotas (Info) | ✅ Completo (com gaps) | Pricing tiers, FAQ, career timeline |
| Comprar Cotas (Checkout) | ✅ Completo | Wizard 4 passos, PIX/cartão |
| Confirmação Checkout | ✅ Completo | Celebração, badges, referral CTA |
| Histórico (Earnings) | ✅ Completo | Filtros, tabela, cutoff logic |
| Admin Dashboard | ✅ Completo | KPIs, price engine, CRM |
| Admin Pagamentos | ✅ Completo | 3 etapas, PIX, check marks |
| Admin Config Financeira | ✅ Completo | Painéis de governança |
| Landing Page | ❌ Placeholder | "Em construção" |
| Cadastrar Membro (Onboarding) | ❌ Placeholder | "Em construção" |
| Design System | ✅ 15 componentes | Buttons, inputs, cards, table, tree, etc. |
| i18n | ⚠️ Parcial | pt-BR + en, mas muitas telas hardcoded |
| Integração Backend | ❌ Tudo em mocks | Axios configurado mas não usado |

---

## 🔍 ANÁLISE REQUISITO A REQUISITO

### ✅ = Implementado | ⚠️ = Parcial | ❌ = Não implementado | 🗑️ = Removido (conforme pedido)

---

### TELA LOGIN
| Requisito | Frontend | Backend |
|---|---|---|
| E-mail | ✅ | ❌ |
| Senha | ✅ | ❌ |
| Esqueci a senha | ⚠️ Skeleton | ❌ |
| Lembrar-me | ✅ | ❌ |

### DASHBOARD ADMIN
| Requisito | Frontend | Backend |
|---|---|---|
| Data da lista | ✅ MonthPicker | ❌ |
| Listas separadas por mês | ✅ | ❌ |
| Lista fecha dia 01 do próximo mês às 00h | ⚠️ Lógica visual existe | ❌ |
| Ver lista do mês anterior para consultar pagamentos | ✅ | ❌ |
| Check mark quando pagar usuário | ✅ Badges + botões "Marcar como Pago" | ❌ |
| Lista de recebedores com PIX e contato | ✅ PIX + CopyButton | ❌ |
| Valores que cada recebedor tem a receber | ✅ | ❌ |
| Valor total a pagar | ✅ StatCards totais | ❌ |
| Título atual do usuário no admin | ✅ Distribuição de títulos | ❌ |
| Parte do que tem para pagar em pagamentos | ✅ Caixa de Dividendos | ❌ |
| Opção dia de fechamento (último dia mês / dia 1 próximo) | ⚠️ PaymentDay existe mas sem toggle último/primeiro | ❌ |

### DASHBOARD (GANHOS E TÍTULOS)
| Requisito | Frontend | Backend |
|---|---|---|
| Botão copiar link para afiliados | ✅ | ❌ |
| Código de patrocínio/indicação no dashboard | ✅ Referral card | ❌ |
| Vendas próprias realizadas | ⚠️ Não separado explicitamente | ❌ |
| Vendas realizadas pela rede | ⚠️ Não separado explicitamente | ❌ |
| Ganhos dele | ✅ KPI cards | ❌ |
| Ganhos em dividendos | ✅ Donut chart separa tipos | ❌ |
| Ganhos totais (Dividendos + bonificações) | ✅ | ❌ |
| Ganhos da vida (lifetime earnings) | ❌ NÃO IMPLEMENTADO | ❌ |
| Título atual | ✅ Title badge | ❌ |
| Mostrar quanto perdeu por estar inativo | ⚠️ Texto genérico, sem valor monetário | ❌ |
| Histórico | ✅ Tela Earnings separada | ❌ |

### TELA REDE DO USUÁRIO
| Requisito | Frontend | Backend |
|---|---|---|
| Filtros por título | ❌ Só tem: todos/ativos/inativos/expirando | ❌ |
| Tree list (toda a rede, expandível) | ✅ Recursivo com expand/collapse | ❌ |
| Clicar no nome → página detalhes (contato, nome, título, comissão, vendidos) | ❌ Não tem modal/página de detalhes | ❌ |
| Valor do nível ao lado do nome | ✅ Title badge + partner badge | ❌ |
| WhatsApp link | ✅ | — |

### TELA CHECKOUT E CONFIRMAÇÃO
| Requisito | Frontend | Backend |
|---|---|---|
| Confirmação da compra | ✅ Wizard etapa 3 | ❌ |
| Mensagem bonita (parabéns) | ✅ Celebration page com animação | ❌ |
| Só PIX e cartão (sem boleto) | ✅ Correto | — |

### TELA PROMOCIONAL DE COTAS
| Requisito | Frontend | Backend |
|---|---|---|
| Cotas e valores mostrados | ✅ 4 tiers de preços | ❌ |
| 10+ cotas = atendimento personalizado | ✅ Mencionado nos benefícios Platinum | ❌ |
| 60+ cotas = morar em pousada | ✅ Benefício Imperial | ❌ |
| FAQ | ✅ 8 perguntas | — |
| Sócio (1-9 cotas, R$2.500) | ✅ | ❌ |
| Sócio Platinum (10+ cotas) | ✅ | ❌ |
| Sócio VIP (20+ cotas) | ✅ | ❌ |
| Sócio Imperial (60+ cotas) | ✅ | ❌ |
| Cotas compradas vs cotas em split separadas | ✅ purchasedQuotas vs splitQuotas nos mocks | ❌ |
| "Simule seus Ganhos" (REMOVER) | 🔴 AINDA PRESENTE — deve ser removido | — |
| "Estimativa" (REMOVER) | ✅ Não encontrado no dashboard | — |

### TELA DE CADASTRO (por quem já está cadastrado)
| Requisito | Frontend | Backend |
|---|---|---|
| Nome completo | ❌ Tela placeholder | ❌ |
| CPF | ❌ | ❌ |
| E-mail | ❌ | ❌ |
| DDD + Telefone (WhatsApp) | ❌ | ❌ |
| Cidade | ❌ | ❌ |
| Estado | ❌ | ❌ |
| PIX | ❌ | ❌ |
| Compra de cotas | ❌ | ❌ |
| Gerar ID no final | ❌ | ❌ |
| Login criado mesmo sem confirmar compra | ❌ | ❌ |

### TELA DE CADASTRO (via link do afiliado)
| Requisito | Frontend | Backend |
|---|---|---|
| RegisterView com ref code from URL | ✅ | ❌ |
| Input desabilitado com código da URL | ✅ | — |
| Faltam campos: cidade, estado, PIX | ⚠️ | ❌ |

### LANDING PAGE
| Requisito | Frontend | Backend |
|---|---|---|
| Quem somos | ❌ Placeholder | — |
| Imagens das pousadas | ❌ Placeholder | — |

### SISTEMA DE TÍTULOS (Bronze/Prata/Ouro/Diamante)
| Requisito | Frontend | Backend |
|---|---|---|
| Bronze: 2 pessoas ativas | ✅ Nos mocks | ❌ |
| Prata: ajudar 1 a virar bronze | ✅ Nos mocks | ❌ |
| Ouro: 2 bronzes em linhas diferentes | ✅ Nos mocks | ❌ |
| Diamante: 3 bronzes em linhas diferentes | ✅ Nos mocks | ❌ |
| Regra de movimentação mínima para título | ⚠️ Não explícito no frontend | ❌ |

### SISTEMA DE NÍVEIS E BONIFICAÇÕES
| Requisito | Frontend | Backend |
|---|---|---|
| Bônus de equipe (2% sobre níveis) | ✅ Nos mocks/config | ❌ |
| Bônus de cotas (20% lucro / total cotas) | ✅ Nos mocks/config | ❌ |
| Bônus de liderança (Ouro 1%, Diamante 2%) | ✅ Nos mocks/config | ❌ |
| Bônus primeira compra (10%) | ✅ Nos mocks/config | ❌ |
| Bônus recompra (5% L1, 2% L2-L6) | ✅ Nos mocks/config | ❌ |
| Split de cotas (fórmula) | ✅ SplitTicker visual | ❌ |
| Ativo = comprou cota nos últimos 6 meses | ✅ Lógica nos mocks | ❌ |
| Inativo recebe apenas indicação | ⚠️ Parcialmente representado | ❌ |
| Bônus de cotas: todos recebem, independente do status | ⚠️ Não explícito | ❌ |
| Ganhos de rede = ganhos totais - ganhos cotas | ✅ Nos mocks earnings | ❌ |

### REGRAS DO SISTEMA
| Requisito | Frontend | Backend |
|---|---|---|
| Split/aumento ao final do dia UTC:00 | ⚠️ Visual existe | ❌ |
| Inativo após 6 meses sem compra | ✅ Nos mocks | ❌ |
| Zerar valores ao final do mês | — | ❌ |
| Tabela separada: lucro total, % a pagar | ✅ Admin Financial Config | ❌ |
| Valor a receber: só mostra 5 dias antes do pagamento | ✅ paymentWindowOpen logic | ❌ |
| Corte de recebimento: último dia do mês anterior | ✅ cutoffDate nos mocks | ❌ |
| "Faturamento anual" (600k) no lugar de "Sócios ativos" | ✅ Já alterado | — |
| "Crescimento sobre o ano anterior" (500%) | ✅ Já alterado | — |
| Tirar área de pagamentos do financeiro | ✅ Separado em Admin Payouts | — |

---

## 🎯 ÉPICOS DE DESENVOLVIMENTO

---

# ÉPICOS BACKEND

## EPIC-B01: Fundação do Backend (Auth + User)
**Prioridade:** CRÍTICA — Bloqueante para tudo
**Estimativa:** Grande

### Escopo:
1. **User Entity** — id, fullName, email, cpf, phone (DDD+tel), city, state, pixKey, password (argon2), role (user/admin), referralCode (auto-generated), sponsorId, isActive, lastPurchaseDate, title (none/bronze/silver/gold/diamond), partnerLevel (socio/platinum/vip/imperial), purchasedQuotas, splitQuotas, createdAt, updatedAt
2. **AuthModule** completo:
   - POST `/auth/register` — Cadastro com todos os campos (nome, CPF, email, DDD+tel, cidade, estado, PIX, referralCode do sponsor). Gerar login mesmo sem confirmar compra. Retornar ID gerado.
   - POST `/auth/login` — Email + senha, retornar JWT access + refresh tokens
   - POST `/auth/refresh` — Refresh token rotation
   - POST `/auth/logout` — Invalidar tokens
   - POST `/auth/forgot-password` — Enviar email de recuperação
   - POST `/auth/reset-password` — Redefinir com token
3. **JwtStrategy + JwtAuthGuard** — Passport JWT strategy, registrar globalmente
4. **Registrar globais** — AllExceptionsFilter, ThrottlerGuard
5. **Migration inicial** — Tabela users + seed admin
6. **DataSource CLI** — Arquivo para rodar migrations via TypeORM CLI

### Entregáveis:
- AuthModule com todos os endpoints
- User entity + migration
- Guards globais (JWT + Throttler)
- Filter global (AllExceptionsFilter)
- Seed com usuário admin

---

## EPIC-B02: Módulo de Cotas (Quotas)
**Prioridade:** CRÍTICA
**Dependência:** EPIC-B01

### Escopo:
1. **Quota Entity** — id, userId, type (purchase/split), quantity, unitPrice, totalAmount, phase, status, createdAt
2. **QuotaConfig Entity** — currentPrice, currentPhase, totalSold, splitCount, minPurchase, maxPurchase
3. **QuotasModule**:
   - GET `/quotas/config` — Configurações atuais (preço, fase, etc.)
   - GET `/quotas/my-balance` — Balance do usuário (compradas vs split)
   - GET `/quotas/transactions` — Histórico de transações do usuário
   - POST `/quotas/purchase` — Comprar cotas (atualizar lastPurchaseDate, calcular nível parceiro)
4. **Lógica de preço e split**:
   - Fórmula aumento: `Vc + 500 * Fcv`
   - Fórmula split: `Fcv >= 3 → split → Qs++`
   - Meta: `50 * 2^Qs`
   - Cotas pós-split voltam a R$2.000
   - Virar preço ao final do dia UTC:00
5. **Partner Level** — Auto-calcular: Sócio (1-9), Platinum (10+), VIP (20+), Imperial (60+). Apenas cotas compradas contam.
6. **Atividade** — Expirar após 6 meses sem compra. Marcar isActive=false.

### Entregáveis:
- Entities + migrations
- CRUD de cotas
- Lógica de split/preço
- Cálculo automático de partner level

---

## EPIC-B03: Módulo de Rede (Network)
**Prioridade:** ALTA
**Dependência:** EPIC-B01, EPIC-B02

### Escopo:
1. **Network tree** — Construir árvore recursiva de sponsors
2. **NetworkModule**:
   - GET `/network/tree` — Árvore completa do usuário com filtros (título, status)
   - GET `/network/stats` — Estatísticas (diretos, total, taxa atividade, distribuição títulos)
   - GET `/network/user/:id` — Detalhes completos de um membro (contato, nome, título, comissão, valores vendidos)
3. **Cálculo de títulos**:
   - Bronze: 2 pessoas ativas diretas
   - Prata: ajudar 1 direto a virar Bronze
   - Ouro: 2 Bronzes em linhas diferentes
   - Diamante: 3 Bronzes em linhas diferentes
   - Regra de movimentação mínima necessária para bater título
4. **Referral system** — Gerar código, validar sponsor, construir upline/downline
5. **Cálculo de profundidade/níveis** — Para bonificações de equipe

### Entregáveis:
- Endpoints de rede
- Cálculo automático de títulos
- Árvore recursiva eficiente
- Endpoint de detalhes do usuário com comissões

---

## EPIC-B04: Módulo de Bonificações (Earnings/Commissions)
**Prioridade:** ALTA
**Dependência:** EPIC-B01, EPIC-B02, EPIC-B03

### Escopo:
1. **Earning Entity** — id, userId, type (firstPurchase/repurchase/team/leadership/dividend), amount, sourceUserId, level, period, status, cutoffEligible, createdAt
2. **EarningsModule**:
   - GET `/earnings/my-summary` — Resumo mensal por tipo de bônus
   - GET `/earnings/my-history` — Histórico completo com filtros (mês, tipo)
   - GET `/earnings/lifetime` — Ganhos da vida (total desde cadastro)
3. **Cálculos de bônus**:
   - **Primeira compra**: Patrocinador ganha 10% do valor total
   - **Recompra**: 5% no 1º nível, 2% do 2º ao 6º nível. Profundidade por título: Bronze=1, Prata=2, Ouro=4, Diamante=6
   - **Equipe**: 2% da soma dos ganhos dos patrocinados abaixo. Profundidade: Bronze=2, Prata=3, Ouro=4, Diamante=5
   - **Liderança**: Ouro=1%, Diamante=2% sobre 5 níveis de qualificados (Ouro+)
   - **Dividendos**: 20% do lucro do grupo / total de cotas × cotas do usuário
4. **Regras de elegibilidade**:
   - Precisa estar ativo para bônus de equipe/liderança/recompra
   - Indicação: recebe mesmo inativo
   - Dividendos: todos recebem, independente do status
   - Corte de recebimento: último dia do mês anterior
   - Bônus de compra e recompra entram nos ganhos de equipe/liderança
5. **Ganhos de rede** = ganhos totais - ganhos de cotas (dividendos)
6. **Valor a receber** — Só mostra 5 dias antes do dia de pagamento
7. **Mostrar quanto perdeu por inatividade** — Calcular valor monetário perdido

### Entregáveis:
- Engine de cálculo de comissões
- Todos os tipos de bônus implementados
- Regras de elegibilidade
- Lifetime earnings
- Cálculo de perda por inatividade

---

## EPIC-B05: Módulo Admin (Dashboard + Payouts + Financial)
**Prioridade:** ALTA
**Dependência:** EPIC-B01 a B04

### Escopo:
1. **AdminModule**:
   - GET `/admin/dashboard` — KPIs (receita mensal, usuários ativos, cotas vendidas, receita histórica, pool de dividendos)
   - GET `/admin/users` — Lista CRM de todos os usuários com PIX, contato, título, valores
   - PUT `/admin/users/:id` — Editar usuário
2. **PayoutModule**:
   - GET `/admin/payouts/monthly` — Lista de pagamentos por mês
   - POST `/admin/payouts/calculate` — Calcular distribuição do mês (input: lucro mensal)
   - POST `/admin/payouts/approve` — Aprovar distribuição
   - PUT `/admin/payouts/:id/pay` — Marcar como pago (check)
   - PUT `/admin/payouts/:id/cancel` — Cancelar pagamento
   - GET `/admin/payouts/summary` — Total pendente, processando, pago, histórico
3. **FinancialConfigModule**:
   - GET `/admin/financial/config` — Todas as configurações
   - PUT `/admin/financial/config` — Atualizar configurações globais
   - Tabela separada: valor total lucro empresa, % a ser paga do lucro
   - Opção dia de fechamento: último dia do mês OU dia 1 do próximo
4. **Payout Entity** — id, userId, amount, pixKey, pixKeyType, period, status (pending/processing/completed/failed), paidAt
5. **FinancialConfig Entity** — companyProfit, profitPercentage, paymentDay, paymentDayMode (lastDay/firstDay), bonusPercentages, etc.
6. **Lista fecha dia 01 00h** — Lógica de corte automático

### Entregáveis:
- Dashboard admin com dados reais
- Sistema de pagamentos com workflow completo
- Configurações financeiras persistidas
- Lógica de fechamento de lista

---

## EPIC-B06: Jobs e Automações
**Prioridade:** MÉDIA
**Dependência:** EPIC-B01 a B05

### Escopo:
1. **Cron: Verificar split/preço** — Rodar ao final do dia UTC:00, verificar se atingiu meta, aplicar split/aumento
2. **Cron: Zerar valores mensais** — Ao final do mês, zerar valores do período
3. **Cron: Fechar lista de pagamento** — Dia 01 às 00h, fechar lista do mês
4. **Cron: Verificar inatividade** — Verificar usuários com >6 meses sem compra, marcar como inativos
5. **Cron: Calcular títulos** — Recalcular títulos (Bronze-Diamante) periodicamente
6. **Email service** — Para recuperação de senha, notificações

### Entregáveis:
- Todos os scheduled jobs
- Serviço de email
- Lógica de inativação automática

---

## EPIC-B07: Cadastro por Membro Existente
**Prioridade:** MÉDIA
**Dependência:** EPIC-B01, EPIC-B02

### Escopo:
1. **POST `/users/register-member`** — Membro logado cadastra novo usuário:
   - Campos: nome completo, CPF, email, DDD+telefone, cidade, estado, PIX, compra de cotas (opcional)
   - Gerar ID e código referral automaticamente
   - Criar login mesmo sem confirmar compra
   - Sponsor = usuário logado
   - Retornar ID gerado para confirmação
2. **Validações** — CPF único, email único, PIX válido

### Entregáveis:
- Endpoint de cadastro por membro
- Validações de dados
- Auto-atribuição de sponsor

---

# ÉPICOS FRONTEND

## EPIC-F01: Integração com Backend (Auth)
**Prioridade:** CRÍTICA — Conectar mocks ao backend real
**Dependência:** EPIC-B01

### Escopo:
1. **Auth service** — Criar `src/shared/services/auth.service.ts` com chamadas reais
2. **Login** — Integrar LoginView com POST `/auth/login`
3. **Register** — Integrar RegisterView com POST `/auth/register`
   - **ADICIONAR campos faltantes**: cidade, estado, PIX
4. **Forgot/Reset Password** — Completar as telas skeleton:
   - ForgotPasswordView: trocar raw inputs por DsInput, implementar handler real
   - ResetPasswordView: trocar raw inputs por DsInput, implementar handler real
5. **Auth store** — Conectar com API real em vez de mocks
6. **Token refresh** — Ativar interceptor de refresh que já existe

### Entregáveis:
- Serviços de API para auth
- Formulários completos (sem mais TODOs)
- Store conectada ao backend

---

## EPIC-F02: Integração com Backend (Features)
**Prioridade:** ALTA
**Dependência:** EPIC-B02 a B05, EPIC-F01

### Escopo:
1. **Criar services** para cada domínio:
   - `quotas.service.ts` — Config, balance, transactions, purchase
   - `network.service.ts` — Tree, stats, user details
   - `earnings.service.ts` — Summary, history, lifetime
   - `admin.service.ts` — Dashboard, payouts, financial config
2. **Conectar cada view** — Substituir mocks por chamadas reais
3. **Loading states** — Usar DsEmptyState e loading indicators
4. **Error handling** — Tratar erros de API consistentemente

### Entregáveis:
- 4 serviços de domínio
- Todas as views conectadas ao backend
- Remoção completa dos mocks

---

## EPIC-F03: Landing Page Completa
**Prioridade:** MÉDIA
**Dependência:** Nenhuma

### Escopo:
1. **Quem somos** — Seção sobre a empresa Ciano
2. **Imagens das pousadas** — Galeria/carousel
3. **Como funciona** — Explicação do sistema de cotas
4. **Explicação de títulos** — Bronze/Prata/Ouro/Diamante com benefícios
5. **CTA** — Botão para cadastro via referral code
6. **Responsivo** — Mobile-first
7. **SEO** — Meta tags, Open Graph

### Entregáveis:
- Landing page completa e funcional
- Seções: hero, quem somos, pousadas, como funciona, títulos, CTA

---

## EPIC-F04: Cadastrar Membro (Onboarding)
**Prioridade:** MÉDIA
**Dependência:** EPIC-B07, EPIC-F01

### Escopo:
1. **RegisterNewUserView** — Formulário completo:
   - Nome completo
   - CPF (com máscara e validação)
   - E-mail (validação)
   - DDD + Telefone WhatsApp (com máscara)
   - Cidade + Estado (dropdown UFs)
   - PIX (tipo + chave)
   - Compra de cotas (quantidade, opcional)
2. **Feedback de sucesso** — Mostrar ID gerado, opção de copiar
3. **Validação** — Todos os campos obrigatórios exceto compra de cotas
4. **UX** — Usar componentes do design system, animações de sucesso

### Entregáveis:
- Formulário completo de cadastro por membro
- Integração com API
- Feedback visual de sucesso com ID

---

## EPIC-F05: Correções e Ajustes (Gaps do Cliente)
**Prioridade:** ALTA
**Dependência:** Nenhuma (pode ser feito em paralelo)

### Escopo:
1. **REMOVER "Simule seus Ganhos"** — QuotaInfoView: remover botão "Simular meus Ganhos" e seção `#simulator`/ProfitSimulator
2. **Dashboard — "Ganhos da vida"** — Adicionar card de lifetime earnings (total desde cadastro)
3. **Dashboard — Perda por inatividade** — Mostrar valor monetário do que o usuário perdeu por estar inativo (não apenas texto genérico)
4. **Dashboard — Vendas próprias vs rede** — Separar claramente vendas próprias das vendas da rede
5. **Network — Filtro por título** — Adicionar filtro: Bronze, Prata, Ouro, Diamante no NetworkFilters
6. **Network — Detalhes do usuário** — Ao clicar no nome: abrir modal/página com: contato completo, nome, título, valores de comissão, cotas vendidas
7. **Admin — Fechamento último dia/primeiro dia** — Adicionar toggle no admin para escolher dia de fechamento: último dia do mês OU dia 1 do próximo mês
8. **Register (auto-cadastro)** — Adicionar campos: cidade, estado, PIX

### Entregáveis:
- Todos os gaps corrigidos
- Features faltantes adicionadas

---

## EPIC-F06: Polish e Qualidade
**Prioridade:** BAIXA
**Dependência:** EPIC-F01 a F05

### Escopo:
1. **i18n completo** — Converter todas as strings hardcoded PT-BR para usar `t()`
2. **Formulários esqueci/redefinir senha** — Usar DsInput em vez de raw inputs
3. **Dark mode** — Implementar CSS (store já suporta)
4. **Testes** — Vitest + Vue Test Utils para componentes críticos
5. **Responsividade** — Verificar todas as telas em mobile
6. **Acessibilidade** — ARIA labels, keyboard navigation
7. **Remover dependência Express** do backend (só Fastify é usado)
8. **Performance** — Code splitting, lazy loading routes

### Entregáveis:
- i18n 100%
- Testes unitários
- Responsividade verificada
- Acessibilidade melhorada

---

## 📋 ORDEM DE EXECUÇÃO RECOMENDADA

```
FASE 1 — FUNDAÇÃO BACKEND (Bloqueante)
├── EPIC-B01: Auth + User (CRÍTICO)
└── EPIC-F05: Correções/Ajustes frontend (paralelo — não depende do backend)

FASE 2 — CORE BUSINESS
├── EPIC-B02: Módulo de Cotas
├── EPIC-B03: Módulo de Rede  
├── EPIC-F01: Integração Auth
└── EPIC-F03: Landing Page (paralelo)

FASE 3 — BONIFICAÇÕES E ADMIN
├── EPIC-B04: Módulo de Bonificações
├── EPIC-B05: Módulo Admin
├── EPIC-B07: Cadastro por Membro
└── EPIC-F04: Onboarding (paralelo)

FASE 4 — INTEGRAÇÃO FINAL
├── EPIC-B06: Jobs e Automações
├── EPIC-F02: Integração completa Frontend ↔ Backend
└── EPIC-F06: Polish e Qualidade
```

---

## 📊 RESUMO QUANTITATIVO

| Métrica | Valor |
|---------|-------|
| Total de Épicos | 13 (7 Backend + 6 Frontend) |
| Endpoints a criar | ~25-30 |
| Entities a criar | ~6-8 |
| Migrations a criar | ~6-8 |
| Telas a implementar/completar | 3 (Landing, Onboarding, Forgot/Reset) |
| Telas a corrigir/ajustar | 4 (Dashboard, Network, Quotas, Register) |
| Services frontend a criar | 4-5 |
| Jobs/Crons a criar | 5-6 |

---

## ⚠️ RISCOS E OBSERVAÇÕES

1. **Backend é o maior gargalo** — Zero lógica implementada. O frontend está ~80% pronto com mocks, mas sem backend real nada funciona em produção.
2. **Lógica de bonificações é complexa** — 5 tipos de bônus com regras de elegibilidade, profundidade por título, e interações entre eles. Requer testes extensivos.
3. **Split de cotas** — Lógica matemática que afeta todos os usuários. Precisa de cuidado especial.
4. **Corte de recebimento** — Lógica temporal que afeta cálculos financeiros. Precisa estar alinhada com UTC:00.
5. **AllExceptionsFilter não registrado** — Bug existente no backend, precisa ser corrigido.
6. **ThrottlerGuard não registrado** — Bug existente no backend, precisa ser corrigido.
7. **@nestjs/platform-express** — Dependência desnecessária instalada (usa Fastify), deve ser removida.
