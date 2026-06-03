import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { UserTitle } from '../../shared/interfaces/enums';

/** Query builder that returns a fixed getRawOne / getRawMany / getMany. */
const makeQb = (opts: { rawOne?: any; rawMany?: any[]; many?: any[] } = {}) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(opts.rawOne ?? { total: '0' }),
  getRawMany: jest.fn().mockResolvedValue(opts.rawMany ?? []),
  getMany: jest.fn().mockResolvedValue(opts.many ?? []),
});

const recentDate = () => new Date();

describe('DashboardService', () => {
  let service: DashboardService;
  let userRepo: any;
  let stateRepo: any;
  let earningRepo: any;
  let txnRepo: any;
  let payoutRepo: any;
  let settingsRepo: any;
  let titleCalc: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQb()),
    };
    stateRepo = { findOne: jest.fn().mockResolvedValue(null) };
    earningRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQb()),
    };
    txnRepo = { createQueryBuilder: jest.fn(() => makeQb()) };
    payoutRepo = { find: jest.fn().mockResolvedValue([]) };
    settingsRepo = { findOne: jest.fn().mockResolvedValue(null) };
    titleCalc = { recalculateTitle: jest.fn().mockResolvedValue(UserTitle.BRONZE) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: stateRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(QuotaTransaction), useValue: txnRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
        { provide: TitleCalculatorService, useValue: titleCalc },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getKpis', () => {
    it('should return null when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      expect(await service.getKpis('missing')).toBeNull();
    });

    it('should recalculate the title and surface it in the KPIs', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        quotaBalance: 10,
        purchasedQuotas: 5,
        splitQuotas: 0,
        totalEarnings: 0,
        directCount: 0,
        teamCount: 0,
        partnerLevel: 'socio',
        lastPurchaseDate: recentDate(),
      });
      stateRepo.findOne.mockResolvedValue({ currentQuotaPrice: 2500 });

      const result = await service.getKpis('u1');

      expect(titleCalc.recalculateTitle).toHaveBeenCalledWith('u1');
      expect(result!.title).toBe(UserTitle.BRONZE);
      expect(result!.estimatedPatrimony).toBe(25000); // 10 * 2500
      expect(result!.currentPrice).toBe(2500);
      expect(result!.isActive).toBe(true);
    });

    it('should bucket pending payout receivables by payment month and kind', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        quotaBalance: 0,
        purchasedQuotas: 0,
        splitQuotas: 0,
        totalEarnings: 0,
        directCount: 0,
        teamCount: 0,
        partnerLevel: 'socio',
        lastPurchaseDate: recentDate(),
      });
      payoutRepo.find
        // 1st find = pendingPayouts (receivables)
        .mockResolvedValueOnce([
          {
            networkAmount: 100,
            quotaAmount: 200,
            bonusPaymentMonth: '2025-04',
            dividendPaymentMonth: '2025-05',
            paymentMonth: '2025-04',
            referenceMonth: '2025-03',
            bonusPaidAt: null,
            dividendPaidAt: null,
          },
        ])
        // 2nd find = paidPayouts (lifetime)
        .mockResolvedValueOnce([]);

      const result = await service.getKpis('u1');

      expect(result!.networkEarnings).toBe(100);
      expect(result!.quotaEarnings).toBe(200);
      expect(result!.totalReceivable).toBe(300);
      // two distinct payment months → two upcoming entries
      expect(result!.upcomingPayments).toHaveLength(2);
    });

    it('should compute lifetimeEarnings only from paid portions of payouts', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        quotaBalance: 0,
        purchasedQuotas: 0,
        splitQuotas: 0,
        totalEarnings: 0,
        directCount: 0,
        teamCount: 0,
        partnerLevel: 'socio',
        lastPurchaseDate: recentDate(),
      });
      payoutRepo.find
        .mockResolvedValueOnce([]) // receivables
        .mockResolvedValueOnce([
          { networkAmount: 100, quotaAmount: 200, bonusPaidAt: new Date(), dividendPaidAt: null },
          { networkAmount: 50, quotaAmount: 80, bonusPaidAt: null, dividendPaidAt: new Date() },
        ]);

      const result = await service.getKpis('u1');

      expect(result!.lifetimeEarnings).toBe(180); // 100 + 80
    });
  });

  describe('getPaymentWindow', () => {
    it('should report closed when there are no settings', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      expect(await service.getPaymentWindow()).toEqual({ isOpen: false });
    });

    it('should report open when the current day is within the payment day', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-03-10T10:00:00Z'));
      settingsRepo.findOne.mockResolvedValue({ paymentDay: 15 });

      const result = await service.getPaymentWindow();

      expect(result.isOpen).toBe(true);
      expect(result.paymentDay).toBe(15);
      jest.useRealTimers();
    });

    it('should report closed past the payment day', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-03-20T10:00:00Z'));
      settingsRepo.findOne.mockResolvedValue({ paymentDay: 15 });

      expect((await service.getPaymentWindow()).isOpen).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('getQuotaChart', () => {
    it('should fall back to defaults when no state exists', async () => {
      stateRepo.findOne.mockResolvedValue(null);

      const result = await service.getQuotaChart('u1');

      expect(result).toEqual({
        currentPrice: 2000,
        totalSold: 0,
        splitCount: 0,
        phase: 1,
        nextEventTarget: 50,
        nextEventLabel: 'Valorização',
      });
    });

    it('should reflect the persisted system state', async () => {
      stateRepo.findOne.mockResolvedValue({
        currentQuotaPrice: 3000,
        totalQuotasSold: 120,
        splitCount: 2,
        currentPhase: 2,
        nextEventTarget: 80,
        nextEventLabel: 'Split',
      });

      const result = await service.getQuotaChart('u1');

      expect(result.currentPrice).toBe(3000);
      expect(result.phase).toBe(2);
      expect(result.nextEventLabel).toBe('Split');
    });
  });

  describe('getRecentActivity', () => {
    it('should return the latest 10 earnings for the user', async () => {
      const rows = [{ id: 'e1' }];
      earningRepo.find.mockResolvedValue(rows);

      const result = await service.getRecentActivity('u1');

      expect(result).toBe(rows);
      expect(earningRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getNotifications', () => {
    it('should return no alerts when the user has no purchase date', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: null });
      expect(await service.getNotifications('u1')).toEqual([]);
    });

    it('should warn when activation expires within 30 days', async () => {
      const soon = new Date();
      soon.setMonth(soon.getMonth() - 6);
      soon.setDate(soon.getDate() + 15);
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: soon });

      const alerts = await service.getNotifications('u1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('warning');
    });

    it('should emit an error alert when activation has lapsed', async () => {
      const old = new Date();
      old.setMonth(old.getMonth() - 12);
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: old });

      const alerts = await service.getNotifications('u1');

      expect(alerts[0].type).toBe('error');
    });
  });

  describe('getTopEarners', () => {
    it('should map the top earners to a trimmed shape', async () => {
      userRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [
            { id: 'u1', name: 'Alice', title: 'gold', totalEarnings: '500' },
            { id: 'u2', name: 'Bob', title: 'bronze', totalEarnings: '100' },
          ],
        }),
      );

      const result = await service.getTopEarners();

      expect(result).toEqual([
        { name: 'Alice', title: 'gold', totalEarnings: 500 },
        { name: 'Bob', title: 'bronze', totalEarnings: 100 },
      ]);
    });
  });
});
