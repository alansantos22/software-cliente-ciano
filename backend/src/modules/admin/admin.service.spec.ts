import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { MonthlyFinancialConfig } from './entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TitleRequirement } from './entities/title-requirement.entity';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SnapshotService } from '../../core/snapshot/snapshot.service';
import { PayoutStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

const updateQb = () => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
});

describe('AdminService', () => {
  let service: AdminService;
  let userRepo: any;
  let txnRepo: any;
  let payoutRepo: any;
  let earningRepo: any;
  let monthlyConfigRepo: any;
  let settingsRepo: any;
  let titleReqRepo: any;
  let splitEngine: any;
  let bonusCalc: any;
  let snapshotService: any;

  /** Aggregation query builder returning a fixed scalar. */
  const aggQb = (rawOne: any = { total: '0' }) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
    getRawMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  });

  beforeEach(async () => {
    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      decrement: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => aggQb()),
    };
    txnRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => aggQb()),
    };
    payoutRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(async (p) => p),
      create: jest.fn((x) => ({ ...x })),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn(() => aggQb()),
    };
    earningRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      // earningRepo is used both for UPDATE chains and for SELECT aggregations
      createQueryBuilder: jest.fn(() => ({ ...aggQb(), ...updateQb() })),
    };
    monthlyConfigRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
    };
    settingsRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, profitPayoutPercentage: 20 }),
      save: jest.fn(async (x) => x),
      update: jest.fn().mockResolvedValue(undefined),
    };
    titleReqRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    splitEngine = {
      getState: jest.fn(),
      forceNextEvent: jest.fn().mockResolvedValue(undefined),
    };
    bonusCalc = {
      previewBatchAmounts: jest.fn().mockResolvedValue({
        dividends: new Map(),
        team: new Map(),
        leadership: new Map(),
      }),
      calculateDividends: jest.fn().mockResolvedValue(undefined),
      calculateTeamAndLeadershipBonuses: jest.fn().mockResolvedValue(undefined),
    };
    snapshotService = {
      captureMonth: jest.fn().mockResolvedValue(undefined),
      getSnapshot: jest.fn().mockResolvedValue([]),
      getHistoricalQuotaBalances: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(QuotaTransaction), useValue: txnRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: {} },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(MonthlyFinancialConfig), useValue: monthlyConfigRepo },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: titleReqRepo },
        { provide: SplitEngineService, useValue: splitEngine },
        { provide: BonusCalculatorService, useValue: bonusCalc },
        { provide: SnapshotService, useValue: snapshotService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── validateBatch (pure logic) ──────────────────────────────────────────────

  describe('validateBatch', () => {
    const call = (netProfit: number, distributions: any[]) =>
      (service as any).validateBatch(netProfit, distributions);

    it('should error on a negative net profit', () => {
      const { errors } = call(-100, []);
      expect(errors).toContain('Lucro líquido não pode ser negativo.');
    });

    it('should error on negative payout amounts', () => {
      const { errors } = call(1000, [
        { userName: 'Bad', quotaAmount: -10, networkAmount: 0, totalAmount: -10, pixKey: 'k' },
      ]);
      expect(errors[0]).toContain('valor negativo');
    });

    it('should warn when total payout exceeds net profit', () => {
      const { warnings } = call(100, [
        { userName: 'A', quotaAmount: 200, networkAmount: 0, totalAmount: 200, pixKey: 'k' },
      ]);
      expect(warnings.some((w: string) => w.includes('excede o lucro'))).toBe(true);
    });

    it('should warn about outliers above 5x the average', () => {
      // 9 tiny entries + 1 whale. total = 9 + 5000 = 5009; avg = 500.9;
      // 5x avg = 2504.5 → whale (5000) is an outlier.
      const distributions = [
        ...Array.from({ length: 9 }, (_, i) => ({
          userName: `S${i}`, quotaAmount: 0, networkAmount: 1, totalAmount: 1, pixKey: 'k',
        })),
        { userName: 'Whale', quotaAmount: 0, networkAmount: 5000, totalAmount: 5000, pixKey: 'k' },
      ];
      const { warnings } = call(100000, distributions);
      expect(warnings.some((w: string) => w.includes('acima da média'))).toBe(true);
    });

    it('should warn about users without a PIX key', () => {
      const { warnings } = call(1000, [
        { userName: 'NoPix', quotaAmount: 10, networkAmount: 0, totalAmount: 10, pixKey: null },
      ]);
      expect(warnings.some((w: string) => w.includes('sem chave PIX'))).toBe(true);
    });

    it('should produce no errors/warnings for a clean batch', () => {
      const { errors, warnings } = call(1000, [
        { userName: 'A', quotaAmount: 100, networkAmount: 0, totalAmount: 100, pixKey: 'k' },
      ]);
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
    });
  });

  // ─── finalizePayoutIfBothPaid (pure logic) ───────────────────────────────────

  describe('finalizePayoutIfBothPaid', () => {
    const call = (payout: any) => (service as any).finalizePayoutIfBothPaid(payout);

    it('should complete when both bonus and dividend are paid', () => {
      const payout: any = {
        networkAmount: 100, quotaAmount: 200,
        bonusPaidAt: new Date(), dividendPaidAt: new Date(),
        status: PayoutStatus.PROCESSING,
      };
      call(payout);
      expect(payout.status).toBe(PayoutStatus.COMPLETED);
      expect(payout.completedAt).toBeInstanceOf(Date);
    });

    it('should auto-complete when a side has no amount due', () => {
      const payout: any = {
        networkAmount: 0, quotaAmount: 200,
        bonusPaidAt: null, dividendPaidAt: new Date(),
        status: PayoutStatus.PROCESSING,
      };
      call(payout);
      expect(payout.status).toBe(PayoutStatus.COMPLETED);
    });

    it('should move a PENDING payout to PROCESSING when only one side is paid', () => {
      const payout: any = {
        networkAmount: 100, quotaAmount: 200,
        bonusPaidAt: new Date(), dividendPaidAt: null,
        status: PayoutStatus.PENDING,
      };
      call(payout);
      expect(payout.status).toBe(PayoutStatus.PROCESSING);
      expect(payout.processedAt).toBeInstanceOf(Date);
    });
  });

  // ─── getPayoutStats ──────────────────────────────────────────────────────────

  describe('getPayoutStats', () => {
    it('should aggregate counts by status and the pending total', async () => {
      payoutRepo.count
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(1) // processing
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(0); // failed
      payoutRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '500.50' }),
      });

      const result = await service.getPayoutStats();

      expect(result.pending).toBe(2);
      expect(result.total).toBe(6);
      expect(result.pendingTotal).toBe(500.5);
    });
  });

  // ─── processPayoutAction ─────────────────────────────────────────────────────

  describe('processPayoutAction', () => {
    it('should return null when the payout is missing', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      expect(await service.processPayoutAction('p1', 'processing')).toBeNull();
    });

    it('should set PROCESSING on the "processing" action', async () => {
      const payout: any = { id: 'p1', status: PayoutStatus.PENDING };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayoutAction('p1', 'processing');

      expect(result!.status).toBe(PayoutStatus.PROCESSING);
      expect(result!.processedAt).toBeInstanceOf(Date);
    });

    it('should set FAILED with the reason on the "failed" action', async () => {
      const payout: any = { id: 'p1', status: PayoutStatus.PROCESSING };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayoutAction('p1', 'failed', undefined, 'pix bounced');

      expect(result!.status).toBe(PayoutStatus.FAILED);
      expect(result!.failureReason).toBe('pix bounced');
    });

    it('should block paying dividends before their due month', async () => {
      const future = '2999-12';
      payoutRepo.findOne.mockResolvedValue({
        id: 'p1',
        referenceMonth: '2999-10',
        quotaAmount: 100,
        dividendPaymentMonth: future,
      });

      await expect(service.processPayoutAction('p1', 'pay-dividend')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow early dividend payment when allowEarly is set', async () => {
      const payout: any = {
        id: 'p1',
        referenceMonth: '2999-10',
        networkAmount: 0,
        quotaAmount: 100,
        dividendPaymentMonth: '2999-12',
        status: PayoutStatus.PENDING,
      };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayoutAction('p1', 'pay-dividend', undefined, undefined, true);

      expect(result!.dividendPaidAt).toBeInstanceOf(Date);
      // no bonus due → finalize completes the payout
      expect(result!.status).toBe(PayoutStatus.COMPLETED);
    });

    it('should pay bonus for a past-due month and persist the payout', async () => {
      const payout: any = {
        id: 'p1',
        referenceMonth: '2020-01',
        networkAmount: 50,
        quotaAmount: 0,
        bonusPaymentMonth: '2020-02',
        status: PayoutStatus.PENDING,
      };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayoutAction('p1', 'pay-bonus');

      expect(result!.bonusPaidAt).toBeInstanceOf(Date);
      expect(payoutRepo.save).toHaveBeenCalledWith(payout);
    });
  });

  // ─── voidBatch ───────────────────────────────────────────────────────────────

  describe('voidBatch', () => {
    it('should return an error when no batch exists for the month', async () => {
      payoutRepo.find.mockResolvedValue([]);
      const result = await service.voidBatch('2025-03');
      expect(result).toHaveProperty('error');
    });

    it('should revert batch earnings and remove payouts', async () => {
      payoutRepo.find.mockResolvedValue([
        { id: 'p1', status: PayoutStatus.PENDING },
        { id: 'p2', status: PayoutStatus.PENDING },
      ]);
      earningRepo.find.mockResolvedValue([
        { userId: 'u1', amount: 100 },
        { userId: 'u1', amount: 50 },
      ]);

      const result = await service.voidBatch('2025-03');

      expect(userRepo.decrement).toHaveBeenCalledWith({ id: 'u1' }, 'totalEarnings', 150);
      expect(payoutRepo.delete).toHaveBeenCalledWith({ referenceMonth: '2025-03' });
      expect(result).toMatchObject({ voided: true, removedPayouts: 2, revertedEarnings: 2 });
    });
  });

  // ─── Financial / Monthly config ──────────────────────────────────────────────

  describe('config', () => {
    it('getFinancialConfig returns the singleton settings row', async () => {
      const cfg = { id: 1, profitPayoutPercentage: 25 };
      settingsRepo.findOne.mockResolvedValue(cfg);
      expect(await service.getFinancialConfig()).toBe(cfg);
    });

    it('updateFinancialConfig persists with a forced id of 1', async () => {
      await service.updateFinancialConfig({ profitPayoutPercentage: 30 } as any);
      expect(settingsRepo.save).toHaveBeenCalledWith({ id: 1, profitPayoutPercentage: 30 });
    });

    it('getMonthlyConfig creates defaults when none exist', async () => {
      monthlyConfigRepo.findOne.mockResolvedValue(null);
      settingsRepo.findOne.mockResolvedValue({ profitPayoutPercentage: 22 });

      const config = await service.getMonthlyConfig('2025-03');

      expect(monthlyConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ month: '2025-03', dividendPoolPercent: 22 }),
      );
      expect(monthlyConfigRepo.save).toHaveBeenCalled();
      expect(config.month).toBe('2025-03');
    });

    it('updateMonthlyConfig refuses to edit a locked month', async () => {
      monthlyConfigRepo.findOne.mockResolvedValue({ month: '2025-03', isLocked: true });
      const result = await service.updateMonthlyConfig('2025-03', { teamBonusPercent: 5 } as any);
      expect(result).toHaveProperty('error');
    });

    it('updateMonthlyConfig merges fields when unlocked', async () => {
      const config: any = { month: '2025-03', isLocked: false, teamBonusPercent: 2 };
      monthlyConfigRepo.findOne.mockResolvedValue(config);

      const result = await service.updateMonthlyConfig('2025-03', { teamBonusPercent: 5 } as any);

      expect((result as any).teamBonusPercent).toBe(5);
    });

    it('closeMonth locks the monthly config', async () => {
      const config: any = { month: '2025-03', isLocked: false };
      monthlyConfigRepo.findOne.mockResolvedValue(config);

      const result = await service.closeMonth('2025-03');

      expect(config.isLocked).toBe(true);
      expect(result.message).toContain('fechado');
    });
  });

  // ─── Price engine ────────────────────────────────────────────────────────────

  describe('price engine', () => {
    it('getPriceEngine should map split-engine state into the admin view', async () => {
      splitEngine.getState.mockResolvedValue({
        currentQuotaPrice: 2500,
        totalQuotasSold: 30,
        splitCount: 0,
        currentPhase: 1,
        nextEventTarget: 50,
        nextEventLabel: 'Valorização',
        lotNumber: 1,
        pendingEventType: null,
        pendingEventDate: null,
      });

      const result = await service.getPriceEngine();

      expect(result.quotaPrice).toBe(2500);
      expect(result.lotSize).toBe(50);
      expect(result.lotSold).toBe(30); // 50 - (50 - 30)
    });

    it('updatePriceEngine forces the next event when requested', async () => {
      const result = await service.updatePriceEngine(true);
      expect(splitEngine.forceNextEvent).toHaveBeenCalled();
      expect(result.message).toContain('sucesso');
    });

    it('updatePriceEngine is a no-op without the force flag', async () => {
      const result = await service.updatePriceEngine(false);
      expect(splitEngine.forceNextEvent).not.toHaveBeenCalled();
      expect(result.message).toContain('Nenhuma ação');
    });
  });

  // ─── Title distribution ──────────────────────────────────────────────────────

  describe('getTitleDistribution', () => {
    it('should map raw title counts into the fixed distribution shape', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { title: 'bronze', count: '4' },
          { title: 'ouro', count: '1' },
          { title: 'unknown', count: '9' }, // ignored
        ]),
      });

      const result = await service.getTitleDistribution();

      expect(result).toEqual({ bronze: 4, prata: 0, ouro: 1, diamante: 0 });
    });
  });

  // ─── generateBatch guard ─────────────────────────────────────────────────────

  describe('generateBatch', () => {
    it('should refuse to process the current or a future month', async () => {
      const currentMonth = getCurrentPeriod();
      await expect(service.generateBatch(currentMonth, 1000, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should report an existing batch for a past month', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'existing' });
      const result = await service.generateBatch('2020-01', 1000, 'admin');
      expect(result).toHaveProperty('error');
    });

    it('should compute bonuses, build payouts and persist them on the happy path', async () => {
      payoutRepo.findOne.mockResolvedValue(null); // no existing batch
      // One live user with a historical quota balance and a PIX key.
      userRepo.find.mockResolvedValue([
        { id: 'u1', name: 'Alice', totalEarnings: 0, pixKey: 'k', pixKeyType: 'cpf' },
      ]);
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(new Map([['u1', 10]]));

      const result = await service.generateBatch('2020-01', 1000, 'admin-1');

      expect(snapshotService.captureMonth).toHaveBeenCalledWith('2020-01', { force: false });
      expect(bonusCalc.calculateDividends).toHaveBeenCalledWith('2020-01', 200); // 1000 * 20%
      expect(bonusCalc.calculateTeamAndLeadershipBonuses).toHaveBeenCalledWith('2020-01');
      expect(payoutRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ profitMonth: '2020-01', totalPayouts: 1 });
    });
  });

  // ─── calculateDistribution ───────────────────────────────────────────────────

  describe('calculateDistribution', () => {
    it('should split the dividend pool proportionally to historical quotas', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'u1', name: 'Alice', totalEarnings: 0, pixKey: 'k', pixKeyType: 'cpf' },
        { id: 'u2', name: 'Bob', totalEarnings: 0, pixKey: 'k2', pixKeyType: 'cpf' },
      ]);
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(
        new Map([['u1', 30], ['u2', 10]]),
      );

      const result = await service.calculateDistribution('2025-03', 1000);

      // pool = 200; u1 owns 30/40 = 75% → 150, u2 owns 25% → 50
      expect(result.dividendPool).toBe(200);
      expect(result.totalQuotasInSystem).toBe(40);
      const u1 = result.distributions.find((d) => d.userId === 'u1')!;
      const u2 = result.distributions.find((d) => d.userId === 'u2')!;
      expect(u1.quotaAmount).toBe(150);
      expect(u2.quotaAmount).toBe(50);
    });

    it('should recapture the snapshot in test mode', async () => {
      await service.calculateDistribution('2025-03', 1000, { testMode: true });
      expect(snapshotService.captureMonth).toHaveBeenCalledWith('2025-03', { force: true });
    });

    it('should drop payees with zero total amount', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'u1', name: 'Alice', totalEarnings: 0, pixKey: 'k' },
      ]);
      // user exists but has no quotas and no earnings → totalAmount 0 → filtered out
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(new Map());

      const result = await service.calculateDistribution('2025-03', 0);

      expect(result.distributions).toHaveLength(0);
    });
  });

  // ─── getDashboardKpis ────────────────────────────────────────────────────────

  describe('getDashboardKpis', () => {
    it('should aggregate revenue, retention and pending payout metrics', async () => {
      userRepo.count
        .mockResolvedValueOnce(8) // activeUsers
        .mockResolvedValueOnce(10); // totalUsersCount
      // Revenue / quota aggregation query builders, in call order.
      txnRepo.createQueryBuilder
        .mockReturnValueOnce(aggQb({ total: '5000' })) // month revenue
        .mockReturnValueOnce(aggQb({ total: '4000' })) // prev month revenue
        .mockReturnValueOnce(aggQb({ total: '20000' })) // total revenue
        .mockReturnValueOnce(aggQb({ total: '10' })) // month quotas
        .mockReturnValueOnce(aggQb({ total: '8' })); // prev month quotas
      payoutRepo.count.mockResolvedValue(2);

      const result = await service.getDashboardKpis();

      expect(result.monthRevenue).toBe(5000);
      expect(result.monthRevenueTrend).toBe(25); // (5000-4000)/4000
      expect(result.activeUsers).toBe(8);
      expect(result.retentionRate).toBe(80); // 8/10
      expect(result.totalRevenue).toBe(20000);
      expect(result.pendingPayoutsCount).toBe(2);
    });

    it('should report a 100% trend when the previous month was zero', async () => {
      userRepo.count.mockResolvedValue(0);
      txnRepo.createQueryBuilder
        .mockReturnValueOnce(aggQb({ total: '100' })) // month revenue
        .mockReturnValueOnce(aggQb({ total: '0' })) // prev month revenue
        .mockReturnValue(aggQb({ total: '0' }));

      const result = await service.getDashboardKpis();

      expect(result.monthRevenueTrend).toBe(100);
      expect(result.retentionRate).toBe(0); // no users
    });
  });

  // ─── getSalesChart ───────────────────────────────────────────────────────────

  describe('getSalesChart', () => {
    it('should return 6 monthly buckets with parsed quota counts', async () => {
      txnRepo.createQueryBuilder.mockReturnValue(aggQb({ total: '7' }));

      const result = await service.getSalesChart();

      expect(result).toHaveLength(6);
      expect(result[0]).toMatchObject({ novas: 7, recompra: 0 });
      expect(typeof result[0].label).toBe('string');
    });
  });

  // ─── getTransactionLog ───────────────────────────────────────────────────────

  describe('getTransactionLog', () => {
    it('should paginate and map transactions, falling back for missing user', async () => {
      const qb = aggQb();
      qb.getManyAndCount = jest.fn().mockResolvedValue([
        [
          { id: 't1', amount: '100', quotasAffected: 1, type: 'purchase', status: 'completed', user: { name: 'Alice', email: 'a@b.com' } },
          { id: 't2', amount: '50', quotasAffected: 0, type: 'admin_grant', status: 'completed', user: null },
        ],
        2,
      ]);
      txnRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTransactionLog({ type: 'purchase', userId: 'u1', month: '2025-03', page: 2, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.items[0].userName).toBe('Alice');
      expect(result.items[1].userName).toBe('—'); // missing user fallback
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should cap the limit at 200', async () => {
      const qb = aggQb();
      txnRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTransactionLog({ limit: 9999 });

      expect(result.limit).toBe(200);
      expect(qb.take).toHaveBeenCalledWith(200);
    });
  });

  // ─── getUserExtract ──────────────────────────────────────────────────────────

  describe('getUserExtract', () => {
    it('should return null when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      expect(await service.getUserExtract('missing')).toBeNull();
    });

    it('should aggregate the user transactions, earnings and payouts', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1', name: 'Alice', email: 'a@b.com', title: 'gold',
        partnerLevel: 'vip', isActive: true, sponsorId: 'sp',
        quotaBalance: 10, purchasedQuotas: 10, splitQuotas: 0,
        totalEarnings: 500, sponsor: { name: 'Sponsor' },
      });
      txnRepo.find.mockResolvedValue([
        { id: 't1', type: 'purchase', status: 'completed', amount: 2500, quotasAffected: 1 },
        { id: 't2', type: 'purchase', status: 'completed', amount: 2500, quotasAffected: 1 },
      ]);
      earningRepo.find.mockResolvedValue([{ id: 'e1', bonusType: 'dividend', amount: 100 }]);
      payoutRepo.find.mockResolvedValue([
        { id: 'p1', status: PayoutStatus.COMPLETED, amount: 300 },
      ]);

      const result = await service.getUserExtract('u1');

      expect(result!.user.name).toBe('Alice');
      expect(result!.user.sponsorName).toBe('Sponsor');
      expect(result!.summary.totalSpent).toBe(5000);
      expect(result!.summary.totalReceived).toBe(300);
      expect(result!.summary.transactionsCount).toBe(2);
      expect(result!.summary.earningsCount).toBe(1);
    });
  });
});
