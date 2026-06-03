/**
 * Tipos da Checkout API do PagBank/PagSeguro.
 * Cobrem apenas os campos que usamos (criação de checkout + webhook).
 * Referência: https://developer.pagbank.com.br/reference/criar-checkout
 */

export interface PagBankPhone {
  country: string; // '55'
  area: string; // DDD, ex '11'
  number: string; // somente dígitos
}

export interface PagBankCustomer {
  name: string;
  email: string;
  tax_id: string; // CPF/CNPJ somente dígitos
  phones?: PagBankPhone[];
}

export interface PagBankItem {
  reference_id: string;
  name: string;
  quantity: number;
  unit_amount: number; // EM CENTAVOS
}

export type PagBankPaymentMethodType = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'BOLETO';

export interface PagBankPaymentMethod {
  type: PagBankPaymentMethodType;
}

export interface PagBankCreateCheckoutRequest {
  reference_id: string;
  expiration_date?: string; // ISO-8601
  customer?: PagBankCustomer;
  customer_modifiable?: boolean;
  items: PagBankItem[];
  payment_methods: PagBankPaymentMethod[];
  payment_methods_configs?: Array<{ type?: PagBankPaymentMethodType; config_options?: unknown[] }>;
  soft_descriptor?: string;
  redirect_url?: string;
  return_url?: string;
  notification_urls?: string[];
}

export interface PagBankLink {
  rel: string; // 'SELF' | 'PAY'
  href: string;
  media?: string;
  type?: string;
}

export interface PagBankCreateCheckoutResponse {
  id: string;
  reference_id: string;
  status: string; // 'ACTIVE'
  links: PagBankLink[];
}

/**
 * Payload do webhook. O PagBank reenvia o mesmo formato da resposta de
 * pedido/charge. Modelamos só o necessário para decidir o status.
 */
export interface PagBankWebhookCharge {
  id?: string;
  status?: string; // PAID | DECLINED | CANCELED | IN_ANALYSIS | AUTHORIZED
}

export interface PagBankWebhookPayload {
  id?: string;
  reference_id?: string;
  status?: string;
  charges?: PagBankWebhookCharge[];
}
