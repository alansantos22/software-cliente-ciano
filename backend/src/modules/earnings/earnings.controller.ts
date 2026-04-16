import { Controller, Get, Param, Query } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { BonusType } from '../../shared/interfaces/enums';

@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  getEarnings(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('month') month?: string,
  ) {
    return this.earningsService.getEarnings(user.id, page, pageSize, month);
  }

  @Get('overview')
  getOverview(@CurrentUser() user: User) {
    return this.earningsService.getOverview(user.id);
  }

  @Get('monthly/:month')
  getMonthlySummary(@CurrentUser() user: User, @Param('month') month: string) {
    return this.earningsService.getMonthlySummary(user.id, month);
  }

  @Get('by-type/:bonusType')
  getByType(@CurrentUser() user: User, @Param('bonusType') bonusType: BonusType) {
    return this.earningsService.getByType(user.id, bonusType);
  }
}
