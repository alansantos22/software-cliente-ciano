import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TransactionStatus } from '../../shared/interfaces/enums';
import type {
  InfinitePayCreateCheckoutRequest,
  InfinitePayCreateCheckoutResponse,
  InfinitePayWebhookPayload,
  InfinitePayPaymentCheckRequest,
  InfinitePayPaymentCheckResponse,
} from './infinitepay.types';

export interface CreateCheckoutParams {
  /** ID interno da transação — vira o order_nsu na InfinitePay. */
  referenceId: string;
  /** Valor TOTAL em reais (será convertido para centavos). */
  amount: number;
  quantity: number;
  unitAmount: number; // preço unitário em reais
  description: string;
  customer: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
  };
  // TEST_PAYMENT_5_REAIS — REMOVER ANTES DE PRODUÇÃO: força a cobrança em R$5,00.
  testMode?: boolean;
}

export interface CreateCheckoutResult {
  checkoutId: string;
  paymentUrl: string;
}

@Injectable()
export class InfinitePayService {
  private readonly logger = new Logger(InfinitePayService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.config.get<string>('infinitepay.baseUrl')!;
  }

  private get handle(): string {
    return this.config.get<string>('infinitepay.handle')!;
  }

  /**
   * Headers da requisição. O Checkout/links da InfinitePay NÃO usa token/JWT:
   * a conta é identificada pelo `handle` (InfiniteTag) no CORPO da requisição.
   * Em sandbox, adiciona `Env: mock`.
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.get<boolean>('infinitepay.sandbox')) {
      headers['Env'] = 'mock';
    }
    return headers;
  }

  /**
   * Cria um checkout na InfinitePay e devolve o link de pagamento para onde o
   * usuário deve ser enviado.
   *
   * ⚠️ CONFIRMAR contra a doc autenticada: path (`/links`), nomes dos campos do
   * payload e do link de retorno na resposta.
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.handle) {
      throw new InternalServerErrorException('InfinitePay não configurado (INFINITEPAY_HANDLE ausente).');
    }

    const frontendUrl = this.config.get<string>('infinitepay.frontendUrl')!;
    const webhookUrl = this.config.get<string>('infinitepay.webhookUrl');

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║ TEST_PAYMENT_5_REAIS — REMOVER ANTES DE PRODUÇÃO                       ║
    // ║ Em modo de teste enviamos 1 item de R$5,00, em vez do valor/quantidade ║
    // ║ reais. O resto do fluxo (redirect, webhook, crédito de cotas) é igual. ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    const items = params.testMode
      ? [
          {
            quantity: 1,
            price: 500, // R$5,00 em centavos
            description: `[TESTE R$5] ${params.description}`,
          },
        ]
      : [
          {
            quantity: params.quantity,
            price: this.toCents(params.unitAmount),
            description: params.description,
          },
        ];

    const phone = this.onlyDigits(params.customer.phone ?? '');

    const body: InfinitePayCreateCheckoutRequest = {
      handle: this.handle,
      order_nsu: params.referenceId,
      // Após pagar, o usuário volta para a página de retorno do nosso site.
      redirect_url: `${frontendUrl}/checkout/retorno?txn=${params.referenceId}`,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      items,
      // A InfinitePay coleta CPF e demais dados na própria página de pagamento;
      // o checkout/links só pré-preenche nome/e-mail/telefone.
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        ...(phone ? { phone_number: phone } : {}),
      },
    };

    try {
      const response = await firstValueFrom(
        // ⚠️ CONFIRMAR path do endpoint de criação.
        this.http.post<InfinitePayCreateCheckoutResponse>(`${this.baseUrl}/links`, body, {
          headers: this.buildHeaders(),
        }),
      );

      const data = response.data;
      const paymentUrl = data.url ?? data.checkout_url ?? data.payment_url;
      const checkoutId = data.invoice_slug ?? data.slug;

      if (!paymentUrl) {
        this.logger.error(`InfinitePay não retornou URL de pagamento para ${params.referenceId}`);
        throw new InternalServerErrorException('Resposta inválida do gateway de pagamento.');
      }

      this.logger.log(`✅ Checkout InfinitePay criado: ${checkoutId} (order_nsu ${params.referenceId})`);
      return { checkoutId: checkoutId ?? params.referenceId, paymentUrl };
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) throw err;
      // Loga o corpo de erro da InfinitePay quando disponível.
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`Falha ao criar checkout InfinitePay: ${JSON.stringify(detail)}`);
      throw new InternalServerErrorException('Não foi possível iniciar o pagamento. Tente novamente.');
    }
  }

  /**
   * Mapeia o webhook da InfinitePay para o nosso TransactionStatus.
   *
   * A InfinitePay não envia um campo de status explícito como o PagBank; um
   * webhook de venda paga traz `paid_amount`. Consideramos PAID quando o valor
   * pago cobre o valor esperado. Retorna null quando não é possível concluir.
   *
   * ⚠️ CONFIRMAR semântica com a doc: existe webhook de falha/cancelamento? Se
   * sim, mapear DECLINED/CANCELLED aqui.
   */
  mapStatus(payload: InfinitePayWebhookPayload): TransactionStatus | null {
    const paid = Number(payload.paid_amount ?? 0);
    const amount = Number(payload.amount ?? 0);
    if (paid > 0 && amount > 0 && paid >= amount) {
      return TransactionStatus.COMPLETED;
    }
    return null;
  }

  /**
   * Confirmação ATIVA de pagamento — mitigação de segurança obrigatória.
   *
   * Como a InfinitePay não documenta assinatura de webhook, NÃO confiamos no
   * payload recebido: consultamos `POST /payment_check` pelo identificador da
   * transação e validamos, na RESPOSTA DA API (não no payload do webhook), que
   * o pagamento está confirmado e que o valor pago cobre o esperado antes de
   * creditar cotas.
   *
   * Em caso de falha de rede/credencial, recusa (retorna false) em vez de
   * creditar: o webhook é reenviado pela InfinitePay (respondemos != 200), e
   * preferimos não creditar do que creditar sobre um webhook forjado.
   *
   * @returns true se o pagamento está confirmado e pode creditar.
   */
  async confirmActiveStatus(payload: InfinitePayWebhookPayload): Promise<boolean> {
    const handle = this.handle;
    // Sem identificadores não há o que consultar — recusa.
    if (!payload.transaction_nsu && !payload.invoice_slug && !payload.order_nsu) {
      this.logger.warn('confirmActiveStatus: webhook sem identificadores — recusado.');
      return false;
    }

    const body: InfinitePayPaymentCheckRequest = {
      handle,
      ...(payload.order_nsu ? { order_nsu: payload.order_nsu } : {}),
      ...(payload.transaction_nsu ? { transaction_nsu: payload.transaction_nsu } : {}),
      ...(payload.invoice_slug ? { slug: payload.invoice_slug } : {}),
    };

    try {
      const response = await firstValueFrom(
        this.http.post<InfinitePayPaymentCheckResponse>(
          `${this.baseUrl}/payment_check`,
          body,
          { headers: this.buildHeaders() },
        ),
      );

      const data = response.data ?? {};
      const paid = Number(data.paid_amount ?? 0);
      const amount = Number(data.amount ?? 0);
      // Fonte de verdade: a própria API. Exige flag `paid` (quando presente) E
      // valor pago cobrindo o esperado.
      const isPaid = data.paid !== false && paid > 0 && amount > 0 && paid >= amount;

      if (!isPaid) {
        this.logger.warn(
          `confirmActiveStatus: pagamento NÃO confirmado pela API para order_nsu ${payload.order_nsu ?? '?'} ` +
            `(paid=${data.paid}, paid_amount=${paid}, amount=${amount}).`,
        );
      }
      return isPaid;
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(
        `confirmActiveStatus: falha ao consultar /payment_check para order_nsu ` +
          `${payload.order_nsu ?? '?'}: ${JSON.stringify(detail)}`,
      );
      // Em falha de consulta, NÃO credita. O webhook será reenviado.
      return false;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private onlyDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }
}
