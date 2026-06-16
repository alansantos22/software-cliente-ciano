import { registerAs } from '@nestjs/config';

/**
 * Configuração do gateway de pagamento InfinitePay (CloudWalk).
 * Usado para a COMPRA de cotas via Checkout Integrado.
 *
 * Substitui a antiga integração PagBank/PagSeguro.
 *
 * O Checkout/links da InfinitePay NÃO usa token/JWT/API key: a conta é
 * identificada apenas pelo `handle` (InfiniteTag) enviado no corpo da requisição.
 *
 * baseUrl deve apontar para a API de checkout da InfinitePay:
 *  - Produção: https://api.checkout.infinitepay.io
 *  - Sandbox:  mesma base + header `Env: mock` (liberado pela equipe deles).
 */
export default registerAs('infinitepay', () => ({
  // InfiniteTag (handle) do lojista, SEM o "$" — identifica a conta que recebe.
  // É a única credencial do Checkout/links (não há token/JWT).
  handle: process.env.INFINITEPAY_HANDLE || '',
  baseUrl: process.env.INFINITEPAY_BASE_URL || 'https://api.checkout.infinitepay.io',
  // 'true' adiciona o header `Env: mock` para o ambiente de testes.
  sandbox: (process.env.INFINITEPAY_SANDBOX || 'false') === 'true',
  // URL pública do frontend para onde o usuário retorna após pagar.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // URL pública do NOSSO backend que a InfinitePay chamará via POST ao aprovar
  // o pagamento. É uma URL nossa, informada à InfinitePay no campo webhook_url.
  webhookUrl: process.env.INFINITEPAY_WEBHOOK_URL || '',
}));
