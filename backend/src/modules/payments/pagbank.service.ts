import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { TransactionStatus } from '../../shared/interfaces/enums';
import { isValidCpf } from '../../shared/utils/helpers';
import type {
  PagBankCreateCheckoutRequest,
  PagBankCreateCheckoutResponse,
  PagBankWebhookPayload,
} from './pagbank.types';

export interface CreateCheckoutParams {
  /** ID interno da transação — vira o reference_id no PagBank. */
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
export class PagBankService {
  private readonly logger = new Logger(PagBankService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.config.get<string>('pagbank.baseUrl')!;
  }

  private get token(): string {
    return this.config.get<string>('pagbank.token')!;
  }

  /**
   * Cria um checkout no PagBank (modo redirect) e devolve o link de
   * pagamento (rel=PAY) para onde o usuário deve ser enviado.
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const token = this.token;
    if (!token) {
      throw new InternalServerErrorException('PagBank não configurado (PAGBANK_TOKEN ausente).');
    }

    const frontendUrl = this.config.get<string>('pagbank.frontendUrl')!;
    const notificationUrl = this.config.get<string>('pagbank.notificationUrl');
    const softDescriptor = this.config.get<string>('pagbank.softDescriptor');

    // Só enviamos o CPF se ele for válido. Um tax_id inválido faz o PagBank
    // rejeitar o checkout; quando omitido, o cliente preenche na tela de pagamento.
    const taxId = this.onlyDigits(params.customer.cpf);
    const hasValidCpf = isValidCpf(taxId);

    const body: PagBankCreateCheckoutRequest = {
      reference_id: params.referenceId,
      // Permite o cliente preencher/ajustar os próprios dados na página do PagBank
      // (necessário quando omitimos o CPF por ser inválido).
      customer_modifiable: true,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        ...(hasValidCpf ? { tax_id: taxId } : {}),
        phones: this.buildPhones(params.customer.phone),
      },
      items: [
        {
          reference_id: params.referenceId,
          name: params.description,
          quantity: params.quantity,
          unit_amount: this.toCents(params.unitAmount),
        },
      ],
      payment_methods: [{ type: 'PIX' }, { type: 'CREDIT_CARD' }],
      soft_descriptor: softDescriptor?.slice(0, 17),
      // Após pagar, o usuário volta para a página de retorno do nosso site.
      redirect_url: `${frontendUrl}/checkout/retorno?txn=${params.referenceId}`,
      ...(notificationUrl ? { notification_urls: [notificationUrl] } : {}),
    };

    try {
      const response = await firstValueFrom(
        this.http.post<PagBankCreateCheckoutResponse>(`${this.baseUrl}/checkouts`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;
      const payLink = data.links?.find((l) => l.rel?.toUpperCase() === 'PAY');
      if (!payLink?.href) {
        this.logger.error(`PagBank não retornou link PAY para ${params.referenceId}`);
        throw new InternalServerErrorException('Resposta inválida do gateway de pagamento.');
      }

      this.logger.log(`✅ Checkout PagBank criado: ${data.id} (ref ${params.referenceId})`);
      return { checkoutId: data.id, paymentUrl: payLink.href };
    } catch (err: any) {
      // Não remapeia/reloga um erro que já tratamos acima.
      if (err instanceof InternalServerErrorException) throw err;
      // Loga o corpo de erro do PagBank quando disponível (sem vazar o token).
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`Falha ao criar checkout PagBank: ${JSON.stringify(detail)}`);
      throw new InternalServerErrorException('Não foi possível iniciar o pagamento. Tente novamente.');
    }
  }

  /**
   * Mapeia o status reportado pelo PagBank (no pedido ou no charge) para o
   * nosso TransactionStatus. Retorna null quando o status ainda não é
   * terminal (ex: IN_ANALYSIS, AUTHORIZED) e não deve mudar a transação.
   */
  mapStatus(payload: PagBankWebhookPayload): TransactionStatus | null {
    const raw = (payload.charges?.[0]?.status ?? payload.status ?? '').toUpperCase();
    switch (raw) {
      case 'PAID':
        return TransactionStatus.COMPLETED;
      case 'DECLINED':
        return TransactionStatus.DECLINED;
      case 'CANCELED':
      case 'CANCELLED':
        return TransactionStatus.CANCELLED;
      case 'EXPIRED':
        return TransactionStatus.EXPIRED;
      // AUTHORIZED / IN_ANALYSIS / WAITING: ainda não é terminal.
      default:
        return null;
    }
  }

  /**
   * Valida a autenticidade do webhook via assinatura SHA256.
   * O PagBank assina o corpo concatenado com o token configurado no painel.
   * Se nenhum token de webhook estiver configurado, a validação é pulada
   * (apenas para desenvolvimento) e registramos um aviso.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const webhookToken = this.config.get<string>('pagbank.webhookToken');
    if (!webhookToken) {
      this.logger.warn('PAGBANK_WEBHOOK_TOKEN ausente — validação de assinatura DESABILITADA.');
      return true;
    }
    if (!signature) return false;
    const expected = createHash('sha256').update(`${webhookToken}-${rawBody}`).digest('hex');
    return this.timingSafeEqual(expected, signature);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private onlyDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }

  private buildPhones(phone?: string) {
    const digits = this.onlyDigits(phone ?? '');
    if (digits.length < 10) return undefined;
    // Considera os 2 primeiros dígitos como DDD.
    const area = digits.slice(0, 2);
    const number = digits.slice(2);
    return [{ country: '55', area, number }];
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
