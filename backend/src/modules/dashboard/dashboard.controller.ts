import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(@CurrentUser() user: User) {
    return this.dashboardService.getKpis(user.id);
  }

  @Get('payment-window')
  getPaymentWindow() {
    return this.dashboardService.getPaymentWindow();
  }

  @Get('quota-chart')
  getQuotaChart(@CurrentUser() user: User) {
    return this.dashboardService.getQuotaChart(user.id);
  }

  @Get('recent-activity')
  getRecentActivity(@CurrentUser() user: User) {
    return this.dashboardService.getRecentActivity(user.id);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: User) {
    return this.dashboardService.getNotifications(user.id);
  }

  @Get('top-earners')
  getTopEarners() {
    return this.dashboardService.getTopEarners();
  }
}
