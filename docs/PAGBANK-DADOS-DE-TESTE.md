# PagBank — Dados de Teste (Sandbox)

Referência rápida para testar o checkout de compra de cotas no **ambiente
sandbox** do PagBank. Todos os dados abaixo são **fictícios** e válidos apenas
no sandbox — nunca use em produção.

> Fontes oficiais:
> - Cartões de teste: https://developer.pagbank.com.br/docs/cartoes-de-teste
> - Simulador (status por valor): https://developer.pagbank.com.br/docs/simulador

---

## 💳 Cartões de teste

| Bandeira | Resultado | Número | CVV | Validade |
|---|---|---|---|---|
| Visa | ✅ Aprovado | `4539620659922097` | 123 | 12/2026 |
| Visa | ❌ Recusado | `4929291898380766` | 123 | 12/2026 |
| Mastercard | ✅ Aprovado | `5240082975622454` | 123 | 12/2026 |
| Mastercard | ❌ Recusado | `5530062640663264` | 123 | 12/2026 |
| Amex | ✅ Aprovado | `345817690311361` | 1234 | 12/2026 |
| Amex | ❌ Recusado | `372938001199778` | 1234 | 12/2026 |

- Se algum cartão for recusado por validade vencida, use qualquer data futura (ex.: `12/2030`).
- **Nome do titular**: para aprovar, qualquer nome serve (ex.: `Jose da Silva`).

## 🧑 CPF de teste (`tax_id`)

Use um CPF estruturalmente **válido** (com dígito verificador correto), senão o
PagBank rejeita o checkout (erro `customer.tax_id`). Exemplos válidos:

- `111.444.777-35`
- `529.982.247-25`

> Observação: o sistema só envia o CPF ao PagBank se ele for válido; se for
> inválido, o campo é omitido e o cliente preenche na própria tela do PagBank.

---

## 💰 Simulador de status por VALOR (PIX / Boleto)

No sandbox, o status final do pagamento é determinado pelo **valor da transação**:

| Valor | PIX | Boleto |
|---|---|---|
| ≤ R$ 100,00 | ✅ PAID (na hora) | ✅ PAID (na hora) |
| R$ 100,01 – 200,00 | ✅ PAID (delay 5 min) | PAID (delay 5 min) |
| R$ 200,01 – 300,00 | ⏳ WAITING (não paga) | CANCELED (delay 5 min) |
| > R$ 300,00 | ⏳ WAITING (não paga) | CANCELED (na hora) |

### ⚠️ Atenção — preço da cota (R$ 2.500) cai na faixa "> R$ 300"
Uma compra real **não confirma via PIX no sandbox** (fica em WAITING para sempre).
Para testar o fluxo de pagamento **aprovado** (webhook `PAID` → crédito de cotas):

1. **Use cartão de crédito** (o status vem do cartão de teste, não do valor) — recomendado.
2. Ou baixe temporariamente o preço da cota para ≤ R$ 100 e teste via PIX.

---

## 🧾 Roteiro de teste (cartão aprovado)

1. Acessar o checkout e comprar 1 cota.
2. Backend cria a transação `WAITING_PAYMENT` e redireciona para o PagBank.
3. Escolher **Cartão de Crédito**.
4. Preencher: Visa aprovado `4539620659922097`, CVV `123`, validade `12/2026`,
   titular `Jose da Silva`, CPF `111.444.777-35`.
5. Concluir → o PagBank dispara o webhook para `…/api/payments/webhook/pagbank`
   → o backend confirma e credita cotas/bônus.
6. Para testar recusa, repetir com o Visa recusado `4929291898380766`.

> O webhook só chega se a `PAGBANK_NOTIFICATION_URL` estiver acessível
> publicamente (produção: redeciano.com.br; local: usar túnel ngrok).

---

## ⚠️ Limitações conhecidas do sandbox

- **Parcelamento não funciona no sandbox** — os planos retornados são fictícios
  e o serviço chega a responder HTTP 500 ao calcular parcelas. Só dá para validar
  parcelamento em produção. (No sistema, o parcelamento foi **removido**: cartão
  apenas à vista / 1x.)
- O header `x-authenticity-token` (validação de assinatura do webhook) muitas
  vezes **não é enviado no sandbox**; por isso o backend pula a validação quando
  `PAGBANK_WEBHOOK_TOKEN` está vazio.

---

## 🔐 Credenciais da conta de teste

> **Não versionar tokens reais aqui.** O `PAGBANK_TOKEN` (Bearer) fica no
> `backend/.env` (dev) ou `backend/.env.production` (VPS) — ambos no `.gitignore`.

- Portal do Desenvolvedor (sandbox): conta `adm@gshark.com.br` ("MISTER WIZ FORTALEZA").
- `PAGBANK_BASE_URL` (sandbox): `https://sandbox.api.pagseguro.com`
- O token de API é obtido no Portal do Desenvolvedor → **Tokens** (ou Minhas Aplicações).
- Para configurar as variáveis do PagBank via terminal: `sudo bash setup.sh` → opção 5.
