import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { InfinitePayService } from '../payments/infinitepay.service';
import { PurchaseQuotaDto } from './dto/purchase-quota.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import type {
  InfinitePayWebhookPayload,
  InfinitePayWebhookAck,
} from '../payments/infinitepay.types';

@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Get('config')
  getConfig() {
    return this.quotasService.getConfig();
  }

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.quotasService.getBalance(user.id);
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: User) {
    return this.quotasService.getTransactions(user.id);
  }

  @Public()
  @Get('presentation')
  getPresentation() {
    return this.quotasService.getPresentation();
  }

  @Public()
  @Get('partner-levels')
  getPartnerLevels() {
    return this.quotasService.getPartnerLevels();
  }
}

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly quotasService: QuotasService) {}

  @Post('purchase')
  purchase(@CurrentUser() user: User, @Body() dto: PurchaseQuotaDto) {
    return this.quotasService.purchase(user.id, dto.quantity);
  }

  @Get('confirmation/:transactionId')
  getConfirmation(
    @CurrentUser() user: User,
    @Param('transactionId') transactionId: string,
  ) {
    return this.quotasService.getConfirmation(transactionId, user.id);
  }

  /** Status do pagamento — consultado pelo frontend (polling) após o redirect. */
  @Get('status/:transactionId')
  getStatus(
    @CurrentUser() user: User,
    @Param('transactionId') transactionId: string,
  ) {
    return this.quotasService.getStatus(transactionId, user.id);
  }
}

/**
 * Endpoint público de notificações (webhook) da InfinitePay. Não passa por JWT.
 *
 * A InfinitePay NÃO documenta assinatura de webhook, então não confiamos no
 * payload cru: usamos `confirmActiveStatus` (confirmação ativa + validação de
 * valor) antes de creditar cotas. A InfinitePay exige resposta em < 1s com
 * `{ success, message }`; HTTP 400 dispara reenvio automático do webhook.
 */
@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly quotasService: QuotasService,
    private readonly infinitePay: InfinitePayService,
  ) {}

  @Public()
  @Post('webhook/infinitepay')
  @HttpCode(200)
  async handleInfinitePayWebhook(
    @Body() payload: InfinitePayWebhookPayload,
  ): Promise<InfinitePayWebhookAck> {
    // order_nsu é o eco do ID interno da transação que enviamos na criação.
    const referenceId = payload.order_nsu;
    if (!referenceId) {
      this.logger.warn('Webhook InfinitePay sem order_nsu — ignorado.');
      return { success: true, message: null };
    }

    // Confirmação ATIVA (mitigação de segurança: webhook não é assinado).
    const confirmed = await this.infinitePay.confirmActiveStatus(payload);

    if (confirmed) {
      await this.quotasService.confirmPayment(referenceId, payload.transaction_nsu);
    } else {
      this.logger.log(`Webhook InfinitePay: pagamento não confirmado para ${referenceId} — sem ação.`);
    }

    return { success: true, message: null };
  }
}
