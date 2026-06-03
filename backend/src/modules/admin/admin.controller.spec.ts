import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';

describe('AdminController', () => {
  let controller: AdminController;
  let admin: any;
  let titleCalc: any;
  const user = { id: 'admin-1' } as User;

  beforeEach(() => {
    admin = {
      getDashboardKpis: jest.fn().mockResolvedValue('kpis'),
      getSalesChart: jest.fn().mockResolvedValue('sales'),
      getTitleDistribution: jest.fn().mockResolvedValue('titles'),
      getCrmUsers: jest.fn().mockResolvedValue('crm'),
      getPriceEngine: jest.fn().mockResolvedValue('price'),
      updatePriceEngine: jest.fn().mockResolvedValue('price-updated'),
      calculateDistribution: jest.fn().mockResolvedValue('dist'),
      generateBatch: jest.fn().mockResolvedValue('batch'),
      getPayouts: jest.fn().mockResolvedValue('payouts'),
      getPayoutStats: jest.fn().mockResolvedValue('stats'),
      processPayoutAction: jest.fn().mockResolvedValue('action'),
      bulkPayoutAction: jest.fn().mockResolvedValue('bulk'),
      voidBatch: jest.fn().mockResolvedValue('void'),
      getFinancialConfig: jest.fn().mockResolvedValue('fin'),
      updateFinancialConfig: jest.fn().mockResolvedValue('fin-updated'),
      getMonthlyConfig: jest.fn().mockResolvedValue('monthly'),
      updateMonthlyConfig: jest.fn().mockResolvedValue('monthly-updated'),
      closeMonth: jest.fn().mockResolvedValue('closed'),
      getPresentationMetrics: jest.fn().mockResolvedValue('metrics'),
      updatePresentationMetrics: jest.fn().mockResolvedValue('metrics-updated'),
      getCareerPlan: jest.fn().mockResolvedValue('career'),
      updateCareerPlan: jest.fn().mockResolvedValue('career-updated'),
      getTransactionLog: jest.fn().mockResolvedValue('log'),
      getUserExtract: jest.fn().mockResolvedValue('extract'),
    };
    titleCalc = { recalculateAllTitles: jest.fn().mockResolvedValue(undefined) };
    controller = new AdminController(admin, titleCalc);
  });

  it('dashboard getters delegate', async () => {
    expect(await controller.getDashboardKpis()).toBe('kpis');
    expect(await controller.getSalesChart()).toBe('sales');
    expect(await controller.getTitleDistribution()).toBe('titles');
    expect(await controller.getCrmUsers()).toBe('crm');
  });

  it('getPriceEngine / updatePriceEngine delegate', async () => {
    expect(await controller.getPriceEngine()).toBe('price');
    await controller.updatePriceEngine({ forceNextEvent: true } as any);
    expect(admin.updatePriceEngine).toHaveBeenCalledWith(true);
  });

  it('calculateDistribution maps allowFutureMonth to testMode', async () => {
    await controller.calculateDistribution({ profitMonth: '2025-03', netProfit: 1000, allowFutureMonth: true } as any);
    expect(admin.calculateDistribution).toHaveBeenCalledWith('2025-03', 1000, { testMode: true });
  });

  it('calculateDistribution defaults testMode to false', async () => {
    await controller.calculateDistribution({ profitMonth: '2025-03', netProfit: 1000 } as any);
    expect(admin.calculateDistribution).toHaveBeenCalledWith('2025-03', 1000, { testMode: false });
  });

  it('generateBatch forwards the admin id and options', async () => {
    await controller.generateBatch(user, { profitMonth: '2025-03', netProfit: 1000, allowFutureMonth: true } as any);
    expect(admin.generateBatch).toHaveBeenCalledWith('2025-03', 1000, 'admin-1', { allowFutureMonth: true });
  });

  it('getPayouts forwards status and month query params', async () => {
    await controller.getPayouts('pending', '2025-03');
    expect(admin.getPayouts).toHaveBeenCalledWith('pending', '2025-03');
  });

  it('getPayoutStats delegates', async () => {
    expect(await controller.getPayoutStats()).toBe('stats');
  });

  it('processPayoutProcess uses the "processing" action', async () => {
    await controller.processPayoutProcess('p1');
    expect(admin.processPayoutAction).toHaveBeenCalledWith('p1', 'processing');
  });

  it('processPayoutConfirm forwards DTO fields', async () => {
    await controller.processPayoutConfirm('p1', { action: 'completed', transactionId: 't', failureReason: 'r', allowEarly: true } as any);
    expect(admin.processPayoutAction).toHaveBeenCalledWith('p1', 'completed', 't', 'r', true);
  });

  it('payBonus / payDividend use the right actions', async () => {
    await controller.payBonus('p1', { allowEarly: true } as any);
    expect(admin.processPayoutAction).toHaveBeenCalledWith('p1', 'pay-bonus', undefined, undefined, true);

    await controller.payDividend('p1', { allowEarly: false } as any);
    expect(admin.processPayoutAction).toHaveBeenCalledWith('p1', 'pay-dividend', undefined, undefined, false);
  });

  it('bulkPayoutAction forwards ids/action/transactionId', async () => {
    await controller.bulkPayoutAction({ payoutIds: ['a', 'b'], action: 'completed', transactionId: 't' } as any);
    expect(admin.bulkPayoutAction).toHaveBeenCalledWith(['a', 'b'], 'completed', 't');
  });

  it('voidBatch delegates the month', async () => {
    await controller.voidBatch('2025-03');
    expect(admin.voidBatch).toHaveBeenCalledWith('2025-03');
  });

  it('financial config endpoints delegate', async () => {
    expect(await controller.getFinancialConfig()).toBe('fin');
    await controller.updateFinancialConfig({ profitPayoutPercentage: 25 } as any);
    expect(admin.updateFinancialConfig).toHaveBeenCalled();

    await controller.getMonthlyConfig('2025-03');
    expect(admin.getMonthlyConfig).toHaveBeenCalledWith('2025-03');

    await controller.updateMonthlyConfig('2025-03', { teamBonusPercent: 2 } as any);
    expect(admin.updateMonthlyConfig).toHaveBeenCalledWith('2025-03', expect.anything());

    await controller.closeMonth('2025-03');
    expect(admin.closeMonth).toHaveBeenCalledWith('2025-03');
  });

  it('presentation metrics endpoints delegate', async () => {
    expect(await controller.getPresentationMetrics()).toBe('metrics');
    await controller.updatePresentationMetrics({ metrics: { a: 1 } } as any);
    expect(admin.updatePresentationMetrics).toHaveBeenCalledWith({ a: 1 });
  });

  it('updatePresentationMetrics defaults to an empty object', async () => {
    await controller.updatePresentationMetrics({} as any);
    expect(admin.updatePresentationMetrics).toHaveBeenCalledWith({});
  });

  it('career plan endpoints delegate', async () => {
    expect(await controller.getCareerPlan()).toBe('career');
    await controller.updateCareerPlan(2, { reqQuantity: 3 } as any);
    expect(admin.updateCareerPlan).toHaveBeenCalledWith(2, expect.anything());
  });

  it('recalculateTitles triggers a full recalculation', async () => {
    const result = await controller.recalculateTitles();
    expect(titleCalc.recalculateAllTitles).toHaveBeenCalled();
    expect(result.message).toContain('recalculados');
  });

  it('getTransactionLog parses numeric pagination params', async () => {
    await controller.getTransactionLog('purchase', 'u1', '2025-03', '2', '50');
    expect(admin.getTransactionLog).toHaveBeenCalledWith({
      type: 'purchase',
      userId: 'u1',
      month: '2025-03',
      page: 2,
      limit: 50,
    });
  });

  it('getTransactionLog leaves pagination undefined when absent', async () => {
    await controller.getTransactionLog();
    expect(admin.getTransactionLog).toHaveBeenCalledWith({
      type: undefined,
      userId: undefined,
      month: undefined,
      page: undefined,
      limit: undefined,
    });
  });

  it('getUserExtract delegates the user id', async () => {
    await controller.getUserExtract('u1');
    expect(admin.getUserExtract).toHaveBeenCalledWith('u1');
  });
});
