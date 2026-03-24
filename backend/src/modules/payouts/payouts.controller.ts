import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { RequestPayoutDto, ProcessPayoutDto } from './dto/payout.dto';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  // ─── User Endpoints ────────────────────────────────────

  @Get('calculate')
  calculateDistribution(@CurrentUser() user: User) {
    return this.payoutsService.calculateDistribution(user.id);
  }

  @Post('request')
  requestPayout(@CurrentUser() user: User, @Body() dto: RequestPayoutDto) {
    return this.payoutsService.requestPayout(
      user.id,
      dto.quotaAmount,
      dto.networkAmount,
      dto.pixKeyType,
      dto.pixKey,
    );
  }

  @Get('my')
  getMyPayouts(@CurrentUser() user: User) {
    return this.payoutsService.getMyPayouts(user.id);
  }

  @Get('my/:payoutId')
  getMyPayoutDetails(@CurrentUser() user: User, @Param('payoutId') payoutId: string) {
    return this.payoutsService.getMyPayoutDetails(payoutId, user.id);
  }

  // ─── Admin Endpoints ────────────────────────────────────

  @Roles(Role.ADMIN)
  @Get('admin/pending')
  getPendingPayouts() {
    return this.payoutsService.getPendingPayouts();
  }

  @Roles(Role.ADMIN)
  @Post('admin/process')
  processPayout(@CurrentUser() user: User, @Body() dto: ProcessPayoutDto) {
    return this.payoutsService.processPayout(dto.payoutRequestId, dto.action, user.id, dto.rejectionReason);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:payoutId/paid')
  markAsPaid(@CurrentUser() user: User, @Param('payoutId') payoutId: string) {
    return this.payoutsService.markAsPaid(payoutId, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/summary')
  getMonthSummary(@Query('month') month: string) {
    return this.payoutsService.getMonthSummary(month || new Date().toISOString().slice(0, 7));
  }
}
