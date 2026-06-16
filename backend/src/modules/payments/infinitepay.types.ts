/**
 * Tipos da Checkout API da InfinitePay (CloudWalk).
 * Cobrem apenas os campos que usamos (criação de checkout + webhook).
 *
 * ⚠️ Campos marcados com CONFIRMAR foram derivados da pesquisa pública e devem
 * ser validados contra a doc autenticada (docs.infinitepay.io) antes do go-live.
 */

export interface InfinitePayItem {
  /** Quantidade do item. */
  quantity: number;
  /** Preço unitário EM CENTAVOS. CONFIRMAR nome do campo (assumido `price`). */
  price: number;
  /** Descrição/nome do item exibido no checkout. */
  description: string;
}

/**
 * Corpo da criação de checkout (POST /links). CONFIRMAR contra a doc.
 */
export interface InfinitePayCreateCheckoutRequest {
  /** InfiniteTag (handle) do lojista. */
  handle: string;
  /** ID interno da transação — vira o order_nsu na InfinitePay. */
  order_nsu: string;
  /** Para onde o cliente volta após pagar (página de retorno do nosso site). */
  redirect_url: string;
  /** Endpoint público do backend que recebe a confirmação. */
  webhook_url?: string;
  items: InfinitePayItem[];
  /**
   * Dados pré-preenchidos do comprador (opcionais).
   * Campos confirmados pela central de ajuda da InfinitePay (checkout/links).
   */
  customer?: {
    name?: string;
    email?: string;
    /** Telefone somente dígitos — a InfinitePay nomeia este campo `phone_number`. */
    phone_number?: string;
  };
}

/**
 * Resposta da criação de checkout. CONFIRMAR nome do campo do link
 * (assumido `url`); pode vir como `checkout_url` / `payment_url`.
 */
export interface InfinitePayCreateCheckoutResponse {
  /** Identificador do checkout na InfinitePay (ex.: invoice_slug). */
  slug?: string;
  invoice_slug?: string;
  /** URL para onde o cliente é redirecionado. */
  url?: string;
  checkout_url?: string;
  payment_url?: string;
}

/**
 * Payload do webhook. Campos conhecidos pela pesquisa pública.
 * Decidimos o status comparando `paid_amount` com `amount`.
 */
export interface InfinitePayWebhookPayload {
  invoice_slug?: string;
  /** Valor total esperado, em centavos. */
  amount?: number;
  /** Valor efetivamente pago, em centavos. */
  paid_amount?: number;
  installments?: number;
  /** 'credit_card' | 'pix'. */
  capture_method?: string;
  /** NSU da transação na InfinitePay. */
  transaction_nsu?: string;
  /** ID interno da nossa transação (eco do order_nsu enviado). */
  order_nsu?: string;
  receipt_url?: string;
  items?: InfinitePayItem[];
}

/**
 * Resposta exigida pela InfinitePay ao receber um webhook com sucesso.
 * Deve ser retornada com HTTP 200 em < 1s; HTTP 400 dispara reenvio.
 */
export interface InfinitePayWebhookAck {
  success: boolean;
  message: string | null;
}

/**
 * Corpo da consulta de status de pagamento (POST /payment_check).
 * Usado na confirmação ATIVA — como o webhook não é assinado, consultamos a
 * própria InfinitePay antes de creditar cotas.
 */
export interface InfinitePayPaymentCheckRequest {
  handle: string;
  order_nsu?: string;
  transaction_nsu?: string;
  slug?: string;
}

/**
 * Resposta da consulta de status (POST /payment_check).
 * É esta resposta (não o payload do webhook) que serve de fonte de verdade.
 */
export interface InfinitePayPaymentCheckResponse {
  success?: boolean;
  /** Indica se a transação está paga. */
  paid?: boolean;
  /** Valor esperado, em centavos. */
  amount?: number;
  /** Valor efetivamente pago, em centavos. */
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
}
