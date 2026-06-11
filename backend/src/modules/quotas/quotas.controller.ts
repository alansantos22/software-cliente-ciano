import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { PagBankService } from '../payments/pagbank.service';
import { PurchaseQuotaDto } from './dto/purchase-quota.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { TransactionStatus } from '../../shared/interfaces/enums';
import type { PagBankWebhookPayload } from '../payments/pagbank.types';

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
    // TEST_PAYMENT_5_REAIS — REMOVER ANTES DE PRODUÇÃO: repassa dto.testMode.
    return this.quotasService.purchase(user.id, dto.quantity, dto.testMode);
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
 * Endpoint público de notificações (webhook) do PagBank. Não passa por JWT.
 * Valida a assinatura sobre o corpo cru e confirma/falha a transação.
 */
@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly quotasService: QuotasService,
    private readonly pagBank: PagBankService,
  ) {}

  @Public()
  @Post('webhook/pagbank')
  @HttpCode(200)
  async handlePagBankWebhook(
    @Req() req: { rawBody?: Buffer },
    @Body() payload: PagBankWebhookPayload,
    @Headers('x-authenticity-token') signature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(payload);

    if (!this.pagBank.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Webhook PagBank com assinatura inválida — ignorado.');
      // Responde 200 para o PagBank não reenviar indefinidamente um payload forjado.
      return { received: true };
    }

    const referenceId = payload.reference_id;
    if (!referenceId) {
      this.logger.warn('Webhook PagBank sem reference_id — ignorado.');
      return { received: true };
    }

    const mapped = this.pagBank.mapStatus(payload);
    const orderId = payload.id;

    if (mapped === TransactionStatus.COMPLETED) {
      await this.quotasService.confirmPayment(referenceId, orderId);
    } else if (
      mapped === TransactionStatus.DECLINED ||
      mapped === TransactionStatus.CANCELLED ||
      mapped === TransactionStatus.EXPIRED
    ) {
      await this.quotasService.markFailed(referenceId, mapped);
    } else {
      this.logger.log(`Webhook PagBank: status não-terminal para ${referenceId} — sem ação.`);
    }

    return { received: true };
  }
}
