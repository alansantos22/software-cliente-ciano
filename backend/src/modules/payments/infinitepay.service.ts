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

    const items = [
      {
        quantity: params.quantity,
        price: this.toCents(params.unitAmount),
        description: params.description,
      },
    ];

    const phone = this.toE164Phone(params.customer.phone);

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
      let data: InfinitePayCreateCheckoutResponse;
      try {
        data = await this.postCheckout(body);
      } catch (err: any) {
        // O telefone é só pré-preenchimento: se a InfinitePay recusar o número,
        // a compra segue sem ele (o cliente digita na página de pagamento).
        if (!phone || !this.isPhoneRejection(err?.response?.data)) throw err;
        this.logger.warn(
          `InfinitePay recusou o telefone ${this.maskPhone(phone)} (order_nsu ${params.referenceId}); ` +
            'refazendo o checkout sem phone_number.',
        );
        const customer = { ...body.customer };
        delete customer.phone_number;
        data = await this.postCheckout({ ...body, customer });
      }

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

  private async postCheckout(body: InfinitePayCreateCheckoutRequest): Promise<InfinitePayCreateCheckoutResponse> {
    const response = await firstValueFrom(
      // ⚠️ CONFIRMAR path do endpoint de criação.
      this.http.post<InfinitePayCreateCheckoutResponse>(`${this.baseUrl}/links`, body, {
        headers: this.buildHeaders(),
      }),
    );
    return response.data;
  }

  /** O erro de validação da InfinitePay aponta o campo: `errors.customer.phone_number`. */
  private isPhoneRejection(detail: any): boolean {
    return Boolean(detail?.errors?.customer?.phone_number);
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

  /**
   * Converte o telefone cadastrado para o formato E.164 exigido pela
   * InfinitePay (`+5511999887766`). Aceita entrada mascarada, com ou sem o
   * DDI 55 e com zero à esquerda no DDD. Celular antigo de 8 dígitos (começa
   * com 6-9) ganha o 9 da frente. Retorna `undefined` quando o número não é um
   * telefone brasileiro válido (DDD inexistente, celular de 9 dígitos sem o 9,
   * tamanho errado) — nesse caso o campo é omitido, pois é apenas
   * pré-preenchimento e um valor inválido faz a InfinitePay rejeitar o checkout.
   */
  private toE164Phone(value?: string | null): string | undefined {
    let digits = this.onlyDigits(value ?? '');
    if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1);
    if (digits.length !== 10 && digits.length !== 11) return undefined;

    const ddd = digits.slice(0, 2);
    let local = digits.slice(2);
    if (!VALID_DDDS.has(ddd)) return undefined;
    if (local.length === 8 && /^[6-9]/.test(local)) local = `9${local}`;
    // 9 dígitos: celular, sempre começa com 9. 8 dígitos: fixo, começa com 2-5.
    const valid = local.length === 9 ? local.startsWith('9') : /^[2-5]/.test(local);
    if (!valid) return undefined;
    return `+55${ddd}${local}`;
  }

  /** Para log: DDD e os dois últimos dígitos (`+55 11 *******88`). */
  private maskPhone(e164: string): string {
    const local = e164.slice(5);
    return `+55 ${e164.slice(3, 5)} ${'*'.repeat(Math.max(local.length - 2, 0))}${local.slice(-2)}`;
  }
}

/** DDDs em uso no Brasil (Anatel). */
const VALID_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);
