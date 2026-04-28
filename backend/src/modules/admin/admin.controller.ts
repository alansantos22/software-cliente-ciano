import { Controller, Get, Put, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import {
  UpdateGlobalConfigDto,
  UpdateMonthlyConfigDto,
  UpdatePresentationMetricsDto,
  UpdateCareerPlanDto,
  CalculateDistributionDto,
  GenerateBatchDto,
  ProcessPayoutActionDto,
  BulkPayoutActionDto,
  UpdatePriceEngineDto,
} from './dto/admin.dto';

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly titleCalc: TitleCalculatorService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────

  @Get('dashboard/kpis')
  getDashboardKpis() {
    return this.adminService.getDashboardKpis();
  }

  @Get('dashboard/sales-chart')
  getSalesChart() {
    return this.adminService.getSalesChart();
  }

  @Get('dashboard/title-distribution')
  getTitleDistribution() {
    return this.adminService.getTitleDistribution();
  }

  @Get('dashboard/crm-users')
  getCrmUsers() {
    return this.adminService.getCrmUsers();
  }

  // ─── Price Engine ──────────────────────────────────────

  @Get('price-engine')
  getPriceEngine() {
    return this.adminService.getPriceEngine();
  }

  @Put('price-engine')
  updatePriceEngine(@Body() dto: UpdatePriceEngineDto) {
    return this.adminService.updatePriceEngine(dto.forceSplit);
  }

  // ─── Payouts (3-Stage) ─────────────────────────────────

  @Post('payouts/calculate-distribution')
  calculateDistribution(@Body() dto: CalculateDistributionDto) {
    return this.adminService.calculateDistribution(dto.profitMonth, dto.netProfit);
  }

  @Post('payouts/generate-batch')
  generateBatch(@CurrentUser() user: User, @Body() dto: GenerateBatchDto) {
    return this.adminService.generateBatch(dto.profitMonth, dto.netProfit, user.id);
  }

  @Get('payouts')
  getPayouts(@Query('status') status?: string, @Query('month') month?: string) {
    return this.adminService.getPayouts(status, month);
  }

  @Get('payouts/stats')
  getPayoutStats() {
    return this.adminService.getPayoutStats();
  }

  @Patch('payouts/:payoutId/process')
  processPayoutProcess(@Param('payoutId') payoutId: string) {
    return this.adminService.processPayoutAction(payoutId, 'processing');
  }

  @Patch('payouts/:payoutId/confirm')
  processPayoutConfirm(@Param('payoutId') payoutId: string, @Body() dto: ProcessPayoutActionDto) {
    return this.adminService.processPayoutAction(payoutId, dto.action, dto.transactionId, dto.failureReason);
  }

  @Post('payouts/bulk-action')
  bulkPayoutAction(@Body() dto: BulkPayoutActionDto) {
    return this.adminService.bulkPayoutAction(dto.payoutIds, dto.action, dto.transactionId);
  }

  // ─── Financial Config ──────────────────────────────────

  @Get('financial/config')
  getFinancialConfig() {
    return this.adminService.getFinancialConfig();
  }

  @Put('financial/config')
  updateFinancialConfig(@Body() dto: UpdateGlobalConfigDto) {
    return this.adminService.updateFinancialConfig(dto as any);
  }

  @Get('financial/monthly/:month')
  getMonthlyConfig(@Param('month') month: string) {
    return this.adminService.getMonthlyConfig(month);
  }

  @Put('financial/monthly/:month')
  updateMonthlyConfig(@Param('month') month: string, @Body() dto: UpdateMonthlyConfigDto) {
    return this.adminService.updateMonthlyConfig(month, dto as any);
  }

  @Post('financial/close-month/:month')
  closeMonth(@Param('month') month: string) {
    return this.adminService.closeMonth(month);
  }

  // ─── Presentation Metrics ──────────────────────────────

  @Get('presentation-metrics')
  getPresentationMetrics() {
    return this.adminService.getPresentationMetrics();
  }

  @Put('presentation-metrics')
  updatePresentationMetrics(@Body() dto: UpdatePresentationMetricsDto) {
    return this.adminService.updatePresentationMetrics(dto.metrics || {});
  }

  // ─── Career Plan ───────────────────────────────────────

  @Get('career-plan')
  getCareerPlan() {
    return this.adminService.getCareerPlan();
  }

  @Put('career-plan/:titleId')
  updateCareerPlan(@Param('titleId') titleId: number, @Body() dto: UpdateCareerPlanDto) {
    return this.adminService.updateCareerPlan(titleId, dto as any);
  }

  // ─── Titles ────────────────────────────────────────────

  @Post('recalculate-titles')
  async recalculateTitles() {
    await this.titleCalc.recalculateAllTitles();
    return { message: 'Títulos recalculados com sucesso.' };
  }

  // ─── Audit Log ─────────────────────────────────────────

  @Get('audit/transactions')
  getTransactionLog(
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTransactionLog({
      type,
      userId,
      month,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── User Extract (auditoria por usuário) ─────────────

  @Get('users/:userId/extract')
  getUserExtract(@Param('userId') userId: string) {
    return this.adminService.getUserExtract(userId);
  }
}
