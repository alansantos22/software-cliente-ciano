---
name: pagbank-checkout-integration
description: Gateway de pagamento da COMPRA de cotas é PagBank/PagSeguro Checkout API (redirect); decisões e lacuna arquitetural
metadata:
  type: project
---

O gateway de pagamento para a **compra de cotas** (entrada) é o **PagBank/PagSeguro**, usando a **Checkout API** (`POST /checkouts`) no modo **redirect** (página hospedada do PagBank). Métodos da 1ª versão: **PIX + cartão de crédito**. Cliente já tem conta PagBank e tokens.

**Não confundir** com o sistema de [[price-engine-lote-model]] e com payouts (saída — dividendos/bônus pagos por PIX manual do admin). PagBank é só a ENTRADA.

**Lacuna crítica (decisão de 2026-06):** hoje `QuotasService.purchase` (backend/src/modules/quotas/quotas.service.ts) marca a transação como COMPLETED na hora e credita cotas/bônus/split SEM pagamento real; o PIX da CheckoutView.vue é fake (`crypto.randomUUID()`). A integração inverte isso: transação nasce PENDING, e o crédito de cotas/bônus/split só ocorre quando o **webhook PagBank** confirma `PAID` (validar assinatura SHA256; idempotente).

Endpoints: `POST https://api.pagseguro.com/checkouts` (prod) / `https://sandbox.api.pagseguro.com/checkouts` (sandbox). Auth `Bearer <token>`. Valores em **centavos**. Resposta traz `links[].rel="PAY"` (URL de redirect). Webhook via `notification_urls`; status: AUTHORIZED/PAID/IN_ANALYSIS/DECLINED/CANCELED.

**How to apply:** ao mexer no checkout, nunca creditar cota antes do PAID confirmado pelo webhook. Backend não tinha axios/@nestjs/axios (precisa instalar); @nestjs/config já existe.
