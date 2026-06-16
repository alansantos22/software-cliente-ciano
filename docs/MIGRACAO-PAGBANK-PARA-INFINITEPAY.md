# Planejamento de Migração: PagBank/PagSeguro → InfinitePay

> **Status:** Em execução — Fase A (substituição direta, com placeholders a confirmar)
> **Data:** 2026-06-12
> **Motivo:** O PagBank não está liberando a conta para pagamentos online (cartão não
> presente) e o suporte demora a responder, bloqueando a operação. A InfinitePay
> abre conta sem aprovação manual ("do cadastro ao 1º pagamento em < 10 min"),
> o que destrava o gargalo atual.

---

## 1. Contexto e objetivo

A **compra de cotas** (entrada de dinheiro) usa hoje o **PagBank/PagSeguro Checkout API**
no modo **redirect**. A arquitetura já é a correta: a transação nasce `PENDING` e as
cotas/bônus/split só são creditados quando o **webhook** confirma o pagamento (`PAID`).

> ⚠️ **Não confundir** com os *payouts* (saída — dividendos/bônus pagos por PIX manual
> do admin) nem com o motor de preço de lote/fase. A migração afeta **apenas a ENTRADA**.

**Objetivo:** substituir o gateway de entrada pelo **Checkout Integrado da InfinitePay**,
preservando 100% da lógica de negócio (PENDING → crédito só no pagamento confirmado).

### Por que migrar (resumo do parecer)

| Tema | PagBank (hoje) | InfinitePay |
|---|---|---|
| Liberação p/ vendas online | Análise manual, travou a operação | **Sem aprovação manual** no cadastro |
| Cadastro → 1º pagamento | Indeterminado (bloqueado) | **< 10 minutos** |
| Modelo de checkout | Redirect (hospedado) | Redirect **ou** transparente (`ipay.js`) |
| Métodos | PIX + cartão | PIX + cartão até 12x + carteiras |
| Valores | Centavos | Centavos |

---

## 2. Riscos e pontos de atenção (decidir ANTES de codar)

### 2.1. ✅ Limite de vendas online — CONFIRMADO SEM TRAVA (2026-06-12)
Fontes terceiras citavam um teto inicial de ~R$10 mil/mês para contas novas. **A própria
InfinitePay confirmou que não há essa trava** para a nossa conta — o ticket de R$2.500+
não é bloqueado. **Risco descartado.**

### 2.2. ⚠️ Webhook sem assinatura documentada (REGRESSÃO DE SEGURANÇA)
Hoje validamos a assinatura SHA256 do webhook do PagBank
(`PagBankService.verifyWebhookSignature`). A InfinitePay **não documenta** validação de
assinatura (HMAC/SHA256). Como creditamos cota no webhook, um webhook forjado = crédito
indevido.
- **Mitigação obrigatória (IMPLEMENTADA):** ao receber o webhook, **confirmar ativamente**
  o status via `POST https://api.checkout.infinitepay.io/payment_check`
  (body: `handle`, `order_nsu`, `transaction_nsu`, `slug`) **antes** de creditar, e validar
  `paid_amount >= amount` **da resposta da API** (não do payload cru). Em falha de
  consulta, recusamos (não creditamos) e a InfinitePay reenvia o webhook.
  Ver `InfinitePayService.confirmActiveStatus`.
- Reforço: restringir o endpoint por IP de origem (se a InfinitePay publicar a faixa).

### 2.3. Onboarding/credenciais manuais
Conta abre self-service, mas **credenciais de API e sandbox** são liberadas pela equipe
(e-mail `ecommerce@infinitepay.io`, header `Env: mock` no sandbox). Some lead time.

### 2.4. Documentação pública incompleta (parcialmente resolvido)
`docs.infinitepay.io` recusou acesso automatizado, mas a **central de ajuda oficial** e o
**repo `ecomplus/app-infinitepay`** confirmaram a maior parte dos campos (ver §3.1).
Resta só o **header de auth exato do produto Checkout/links** — depende da credencial do
painel. Abrir a conta cedo para destravar isso.

### 2.5. ⚠️ Existem DOIS produtos de API diferentes — não confundir
A pesquisa revelou que "integração InfinitePay" pode significar dois produtos distintos:

| | **Checkout / links** (Fase A — o que usamos) | **API transparente** (Fase B) |
|---|---|---|
| Base URL | `https://api.checkout.infinitepay.io` | `https://api.infinitepay.io` (stg: `api-staging.infinitepay.io`) |
| Criar | `POST /links` | `POST /v2/transactions` |
| Auth | credencial do painel (assumido `Bearer`) | **OAuth2 client_credentials** (`POST /v2/oauth/token`) → `Bearer <access_token>` |
| Retorno | campo **`url`** (link hospedado) | tokenização `ipay.js` / `br_code` (PIX) |

Nosso fluxo de redirect usa o **Checkout/links**. A `api.infinitepay.io` só entra na Fase B.

---

## 3. Diferenças técnicas (mapeamento PagBank → InfinitePay)

| Conceito | PagBank (hoje) | InfinitePay | Esforço |
|---|---|---|---|
| Criar checkout | `POST /checkouts` | `POST https://api.checkout.infinitepay.io/links` | Reescrever payload |
| ID interno da transação | `reference_id` | `order_nsu` | Renomear |
| Link de redirect | `links[].rel="PAY"` | campo de link na resposta | Trivial |
| Autenticação | `Bearer <token>` | **JWT com escopos** (ex. `card_tokenization`) | **Investigar** |
| Valores | centavos | centavos (`price`) | Igual ✅ |
| Identificação do lojista | (token) | `handle` (InfiniteTag) | Novo campo |
| Webhook (confirmação) | `charges[].status` (`PAID`…) | `paid_amount` vs `amount` | Remapear |
| Validação de assinatura | SHA256 sobre raw body | **❌ não documentada** | Confirmação ativa via API |
| Resposta do webhook | `{ received: true }` (200) | **`{ "success": true, "message": null }` em < 1s**; 400 → retry | Ajustar |
| Sandbox | URL self-service | header `Env: mock` (sob solicitação) | Solicitar acesso |

### 3.1. Payload de criação — CONFIRMADO (central de ajuda + repo ecomplus)
```json
{
  "handle": "<infinitetag-do-lojista>",
  "redirect_url": "https://<frontend>/checkout/retorno?txn=<order_nsu>",
  "webhook_url": "https://<backend>/payments/webhook/infinitepay",
  "order_nsu": "<id-interno-da-transacao>",
  "items": [
    { "quantity": 1, "price": 250000, "description": "Compra de cota..." }
  ],
  "customer": { "name": "...", "email": "...", "phone_number": "11999998888" },
  "address": { "cep": "...", "number": "...", "complement": "..." }
}
```
- ✅ `price` em **centavos**. ✅ Resposta traz o link no campo **`url`**
  (`https://checkout.infinitepay.com.br/<tag>?lenc=...`).
- ✅ `customer` do checkout/links aceita `name`/`email`/`phone_number` (CPF é coletado na
  página da InfinitePay; **não** enviamos `document` aqui).
- ⚠️ Único item ainda não confirmado: o **header de autenticação** do produto checkout.

### Webhook (InfinitePay — campos conhecidos)
```
invoice_slug, amount, paid_amount, installments,
capture_method, transaction_nsu, order_nsu, receipt_url, items
```
Redirect pós-pagamento traz: `order_nsu`, `transaction_nsu`, `capture_method`
(`credit_card`/`pix`), `slug`, `receipt_url`.

---

## 4. Estratégia de implementação

**Princípio:** criar um `InfinitePayService` **espelhando a interface** do `PagBankService`
(`createCheckout`, `mapStatus`, e a validação de webhook), de modo que o `QuotasService` e
o `CheckoutController` quase não percebam a troca. A lógica de negócio NÃO muda.

**Fase A — modo redirect primeiro** (troca quase 1:1 com o fluxo atual → volta a operar
rápido). **Fase B — transparente com `ipay.js`** (opcional, depois) para o cliente não sair
do site.

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `backend/src/config/pagbank.config.ts` | Novo `infinitepay.config.ts` (handle, JWT, baseUrl, webhook/redirect URLs) |
| `backend/src/config/index.ts` | Registrar o novo config |
| `backend/.env.example` / `.env.development` | Novas variáveis `INFINITEPAY_*` |
| `backend/src/modules/payments/pagbank.types.ts` | Novo `infinitepay.types.ts` (request/response/webhook) |
| `backend/src/modules/payments/pagbank.service.ts` | Novo `infinitepay.service.ts` (espelha interface) + **confirmação ativa** |
| `backend/src/modules/payments/payments.module.ts` | Prover/exportar `InfinitePayService` |
| `backend/src/modules/quotas/quotas.controller.ts` | Novo endpoint `POST /payments/webhook/infinitepay`; resposta `{ success, message }` |
| `backend/src/modules/quotas/quotas.service.ts` | Trocar dependência do service; mapeamento de status (lógica intacta) |
| `backend/database/migrations/` | (Se preciso) nova migration p/ guardar `order_nsu`/`transaction_nsu`/`invoice_slug` na `quota_transaction` |
| `frontend/src/features/checkout/views/CheckoutView.vue` | Redirecionar para o link da InfinitePay |
| `frontend/src/features/checkout/views/CheckoutReturnView.vue` | Ler params de retorno da InfinitePay |
| Testes `*.spec.ts` | Atualizar mocks/asserts do gateway |

### O que NÃO muda
- Transação nasce `PENDING`; crédito de cota/bônus/split só no pagamento confirmado.
- `QuotasService.confirmPayment` / `markFailed` (orquestração e idempotência).
- Motor de preço (lote/fase/split) e payouts.

---

## 5. Roteiro (passo a passo)

### Etapa 0 — Pré-requisitos de negócio (BLOQUEANTE)
- [ ] Abrir conta InfinitePay (CNPJ da empresa).
- [ ] **Confirmar limite de vendas online** e caminho para elevá-lo ao ticket de R$2.500+.
- [ ] Solicitar credenciais de API + acesso sandbox (`ecommerce@infinitepay.io`).
- [ ] Obter a documentação autenticada (JWT, endpoints, schema de webhook/erro).

### Etapa 1 — Config e tipos ✅ (placeholders a confirmar)
- [x] `infinitepay.config.ts` + variáveis `.env`/`.env.example`/`.env.development`.
- [x] `infinitepay.types.ts` (request de criação, resposta, payload de webhook, ack).
- [x] Registrar no `config/index.ts` e `app.module.ts`.

### Etapa 2 — Service (substituiu o PagBankService) ✅
- [x] `createCheckout()` → `POST /links`, devolve `{ checkoutId, paymentUrl }`.
- [x] `mapStatus()` → COMPLETED quando `paid_amount >= amount`.
- [x] `confirmActiveStatus()` → mitigação de segurança via `POST /payment_check`
      (consulta a API e valida `paid_amount >= amount` da RESPOSTA; recusa em falha).
- [x] Tratamento de erro e logs sem vazar credenciais. Header `Env: mock` em sandbox.
- [x] PaymentsModule provê/exporta `InfinitePayService`.

### Etapa 3 — Webhook ✅
- [x] Endpoint `POST /payments/webhook/infinitepay` (público, sem JWT).
- [x] Responde `{ "success": true, "message": null }` (HTTP 200).
- [x] Confirmação ativa antes de `confirmPayment`.
- [x] **Idempotência** garantida pelo `QuotasService.confirmPayment` (inalterado).

### Etapa 4 — Frontend ✅ (modo redirect)
- [x] `CheckoutView.vue` já redireciona via `data.paymentUrl` (sem mudança de fluxo).
- [x] Textos de UI atualizados (PagBank → InfinitePay) em CheckoutView/Return/Calculator.
- [ ] (Fase B) Checkout transparente com `ipay.js` — não iniciado.

### Etapa 5 — Testes e validação
- [x] Specs do gateway (`infinitepay.service.spec.ts`) e do webhook atualizados — passam.
- [x] Specs do `QuotasService`/`CheckoutController` atualizados — passam.
- [ ] Teste ponta-a-ponta no sandbox (PIX e cartão) — **pendente credenciais**.
- [ ] Teste de valor real baixo (`TEST_PAYMENT_5_REAIS`).

### Etapa 6 — Cutover
- [ ] Variáveis de produção (JWT, handle, URLs públicas de webhook/redirect).
- [ ] Configurar `webhook_url` no painel/integração da InfinitePay.
- [ ] Migrar e **manter o PagBank desligado mas reversível** por um período.
- [ ] Monitorar primeiras transações reais.

---

## 6. Decisões em aberto

1. **Redirect (Fase A) vs. transparente `ipay.js` (Fase B)** — começar pelo redirect.
2. **Manter o código do PagBank** como fallback por X semanas, ou remover de vez?
3. **Limite mensal** — depende da resposta da InfinitePay (Etapa 0); pode exigir contato
   comercial antes do go-live.
4. **Persistência** — guardar `order_nsu`/`transaction_nsu`/`invoice_slug` na
   `quota_transaction` para conciliação e confirmação ativa (provável migration nova).

---

## 7. Referências

- Checkout Integrado — https://www.infinitepay.io/checkout
- Desenvolvedores — https://www.infinitepay.io/desenvolvedores
- Referência da API — https://docs.infinitepay.io
- Central de Ajuda (Checkout) — https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-da-infinitepay
- Central de Ajuda (Link de Pagamento) — https://ajuda.infinitepay.io/pt-BR/articles/4616150-como-usar-o-link-de-pagamento
- Contato integração: ecommerce@infinitepay.io · parcerias@cloudwalk.io · 0800 591 7207
