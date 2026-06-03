import { registerAs } from '@nestjs/config';

/**
 * Configuração do gateway de pagamento PagBank (PagSeguro).
 * Usado para a COMPRA de cotas via Checkout API (modo redirect).
 *
 * baseUrl deve apontar para:
 *  - Sandbox:  https://sandbox.api.pagseguro.com
 *  - Produção: https://api.pagseguro.com
 */
export default registerAs('pagbank', () => ({
  token: process.env.PAGBANK_TOKEN || '',
  baseUrl: process.env.PAGBANK_BASE_URL || 'https://sandbox.api.pagseguro.com',
  // Token compartilhado usado para validar a autenticidade dos webhooks.
  webhookToken: process.env.PAGBANK_WEBHOOK_TOKEN || '',
  // Texto exibido na fatura do cartão (máx. 17 caracteres).
  softDescriptor: process.env.PAGBANK_SOFT_DESCRIPTOR || 'CIANO COTAS',
  // URL pública do frontend para onde o usuário retorna após pagar.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // URL pública do backend que recebe as notificações (webhook).
  notificationUrl: process.env.PAGBANK_NOTIFICATION_URL || '',
  // Nº máximo de parcelas no cartão. Os juros são pagos pelo CLIENTE (não há
  // parcelas sem juros bancadas pela loja), conforme o plano de parcelamento
  // configurado na conta PagBank (Vendas → Taxas e Planos).
  maxInstallments: Number(process.env.PAGBANK_MAX_INSTALLMENTS) || 12,
}));
