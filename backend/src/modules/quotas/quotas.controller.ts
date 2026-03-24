import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { PurchaseQuotaDto } from './dto/purchase-quota.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

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
}
