---
name: infinitepay-checkout-integration
description: Gateway de pagamento da COMPRA de cotas migrou de PagBank para InfinitePay Checkout (redirect); decisões e placeholders a confirmar
metadata:
  type: project
---

O gateway de pagamento para a **compra de cotas** (entrada) foi migrado de **PagBank/PagSeguro** para a **InfinitePay** (CloudWalk) em 2026-06-12, porque o PagBank não liberava a conta para vendas online. A InfinitePay abre conta sem aprovação manual; o cliente confirmou que **não há a trava de limite mensal** (R$10 mil) para a conta dele.

**Não confundir** com o [[price-engine-lote-model]] nem com payouts (saída — PIX manual do admin). InfinitePay é só a ENTRADA. A arquitetura de negócio NÃO mudou: transação nasce `WAITING_PAYMENT` e cotas/bônus/split só são creditados quando o webhook confirma (idempotente via `QuotasService.confirmPayment`).

**O que foi feito (Fase A — modo redirect):** substituídos os arquivos do PagBank por `infinitepay.config.ts`, `infinitepay.types.ts`, `infinitepay.service.ts` (espelha a interface antiga: `createCheckout`/`mapStatus`). Webhook agora é `POST /payments/webhook/infinitepay`, responde `{ success: true, message: null }`. `gateway` da txn agora é `'infinitepay'`. Specs atualizados e passando. Doc do plano em `docs/MIGRACAO-PAGBANK-PARA-INFINITEPAY.md`.

**Placeholders a CONFIRMAR com a doc autenticada (docs.infinitepay.io / ecommerce@infinitepay.io):** path exato do endpoint (`POST /links` assumido), formato do JWT/escopos, nomes dos campos do payload (`price`, `order_nsu`, `document`) e do link na resposta (`url`/`checkout_url`). Endpoint: base `https://api.checkout.infinitepay.io`; sandbox via header `Env: mock`. Valores em **centavos**.

**Segurança (importante):** InfinitePay NÃO documenta assinatura de webhook (regressão vs SHA256 do PagBank). Mitigação: `InfinitePayService.confirmActiveStatus` — hoje valida só por valor (`paid_amount >= amount`); TODO trocar por GET real de status na API antes de creditar.

**Fase B (não iniciada):** checkout transparente com `ipay.js` (cliente paga sem sair do site).
