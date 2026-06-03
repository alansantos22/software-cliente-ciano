import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EarningsService } from './earnings.service';
import { Earning } from './entities/earning.entity';
import { MonthlyEarningSummary } from './entities/monthly-earning-summary.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { BonusType } from '../../shared/interfaces/enums';

const makeQueryBuilder = (rawResult: Record<string, string | null> = { total: '0' }) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(rawResult),
});

describe('EarningsService', () => {
  let service: EarningsService;
  let earningRepo: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let summaryRepo: {
    findOne: jest.Mock;
    count: jest.Mock;
  };
  let txnRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock };
  let payoutRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    earningRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQueryBuilder()),
    };
    summaryRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };
    txnRepo = { find: jest.fn().mockResolvedValue([]) };
    userRepo = { find: jest.fn().mockResolvedValue([]) };
    payoutRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQueryBuilder()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarningsService,
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(MonthlyEarningSummary), useValue: summaryRepo },
        { provide: getRepositoryToken(QuotaTransaction), useValue: txnRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
      ],
    }).compile();

    service = module.get<EarningsService>(EarningsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getEarnings ─────────────────────────────────────────────────────────────

  describe('getEarnings', () => {
    it('should return an empty paginated result when no data exists', async () => {
      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1); // Math.max(1, ...)
    });

    it('should map own earnings into history rows (level 0)', async () => {
      earningRepo.find.mockResolvedValue([
        {
          id: 1,
          bonusType: BonusType.REPURCHASE,
          amount: 50,
          description: 'Repurchase bonus',
          level: 0,
          referenceMonth: '2025-03',
          status: 'pending',
          cutoffEligible: true,
          createdAt: new Date('2025-03-10'),
          processedAt: null,
          sourceUserName: 'Foo',
        },
      ]);

      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 'e-1',
        source: 'earning',
        bonusType: BonusType.REPURCHASE,
        amount: 50,
        level: 0,
        sourceUserName: 'Foo',
      });
    });

    it('should hide post-batch types (DIVIDEND/TEAM/LEADERSHIP) until processed', async () => {
      earningRepo.find.mockResolvedValue([
        {
          id: 2,
          bonusType: BonusType.TEAM,
          amount: 20,
          description: 'Team bonus',
          level: 0,
          referenceMonth: '2025-03',
          status: 'pending',
          cutoffEligible: true,
          createdAt: new Date('2025-03-10'),
          processedAt: null, // not yet processed → hidden
          sourceUserName: null,
        },
      ]);

      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.total).toBe(0);
    });

    it('should render own purchases as negative amounts', async () => {
      txnRepo.find.mockResolvedValueOnce([
        {
          id: 9,
          amount: 2500,
          description: 'Compra',
          quotasAffected: 1,
          referenceMonth: '2025-03',
          status: 'completed',
          createdAt: new Date('2025-03-05'),
        },
      ]);

      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 't-9',
        source: 'purchase',
        bonusType: 'purchase',
        amount: -2500,
        level: 0,
      });
    });

    it('should paginate the combined result set', async () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        bonusType: BonusType.REPURCHASE,
        amount: 1,
        description: 'r',
        level: 0,
        referenceMonth: '2025-03',
        status: 'pending',
        cutoffEligible: true,
        createdAt: new Date(2025, 2, (i % 27) + 1),
        processedAt: null,
        sourceUserName: null,
      }));
      earningRepo.find.mockResolvedValue(rows);

      const page1 = await service.getEarnings('user-1', 1, 20);
      const page2 = await service.getEarnings('user-1', 2, 20);

      expect(page1.total).toBe(25);
      expect(page1.items).toHaveLength(20);
      expect(page1.totalPages).toBe(2);
      expect(page2.items).toHaveLength(5);
    });
  });

  // ─── getOverview ─────────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('should compute totalEarned from completed payouts and other metrics from earnings', async () => {
      // totalEarned comes from payoutRepo
      payoutRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '1500.00' }));
      // pending, thisMonth, lastMonth come from earningRepo (in order)
      earningRepo.createQueryBuilder
        .mockReturnValueOnce(makeQueryBuilder({ total: '300.00' })) // pendingEarnings
        .mockReturnValueOnce(makeQueryBuilder({ total: '500.00' })) // thisMonth
        .mockReturnValueOnce(makeQueryBuilder({ total: '200.00' })); // lastMonth

      summaryRepo.count.mockResolvedValue(3);

      const result = await service.getOverview('user-1');

      expect(result.totalEarned).toBe(1500);
      expect(result.pendingEarnings).toBe(300);
      expect(result.thisMonthEarnings).toBe(500);
      expect(result.lastMonthEarnings).toBe(200);
      expect(result.averageMonthly).toBeCloseTo(500); // 1500 / 3
    });

    it('should return 0 averageMonthly when no monthly summaries exist', async () => {
      payoutRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '0' }));
      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '0' }));
      summaryRepo.count.mockResolvedValue(0);

      const result = await service.getOverview('user-1');

      expect(result.averageMonthly).toBe(0);
    });

    it('should handle null totals from query builder', async () => {
      payoutRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: null }));
      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: null }));
      summaryRepo.count.mockResolvedValue(0);

      const result = await service.getOverview('user-1');

      expect(result.totalEarned).toBe(0);
    });
  });

  // ─── buildMonthlySummary ─────────────────────────────────────────────────────

  describe('buildMonthlySummary', () => {
    it('should correctly sum earnings by bonus type', async () => {
      const earnings = [
        { bonusType: BonusType.FIRST_PURCHASE, amount: 100 },
        { bonusType: BonusType.REPURCHASE, amount: 50 },
        { bonusType: BonusType.REPURCHASE, amount: 30 },
        { bonusType: BonusType.TEAM, amount: 20 },
        { bonusType: BonusType.LEADERSHIP, amount: 10 },
        { bonusType: BonusType.DIVIDEND, amount: 200 },
      ];
      earningRepo.find.mockResolvedValue(earnings);

      const result = await service.buildMonthlySummary('user-1', '2025-03');

      expect(result.firstPurchase).toBe(100);
      expect(result.repurchase).toBe(80);
      expect(result.team).toBe(20);
      expect(result.leadership).toBe(10);
      expect(result.dividend).toBe(200);
      expect(result.networkEarnings).toBe(210); // 100+80+20+10
      expect(result.total).toBe(410); // networkEarnings + dividend
    });

    it('should return zero totals when no earnings exist', async () => {
      earningRepo.find.mockResolvedValue([]);

      const result = await service.buildMonthlySummary('user-1', '2025-03');

      expect(result.total).toBe(0);
      expect(result.networkEarnings).toBe(0);
    });

    it('should set cutoffDate to last day of previous month', async () => {
      earningRepo.find.mockResolvedValue([]);

      const result = await service.buildMonthlySummary('user-1', '2025-03');

      // Last day of Feb 2025 = 2025-02-28
      expect(result.cutoffDate).toBe('2025-02-28');
    });
  });

  // ─── getByType ───────────────────────────────────────────────────────────────

  describe('getByType', () => {
    it('should return earnings filtered by bonus type', async () => {
      const earnings = [{ id: 'e1', bonusType: BonusType.DIVIDEND }];
      earningRepo.find.mockResolvedValue(earnings);

      const result = await service.getByType('user-1', BonusType.DIVIDEND);

      expect(result).toEqual(earnings);
      expect(earningRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', bonusType: BonusType.DIVIDEND },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ─── getMonthlySummary ───────────────────────────────────────────────────────

  describe('getMonthlySummary', () => {
    it('should return existing summary from DB when found', async () => {
      const existing = { userId: 'user-1', month: '2025-02', total: 500 };
      summaryRepo.findOne.mockResolvedValue(existing);

      const result = await service.getMonthlySummary('user-1', '2025-02');

      expect(result).toEqual(existing);
      expect(earningRepo.find).not.toHaveBeenCalled();
    });

    it('should build summary on the fly when not in DB', async () => {
      summaryRepo.findOne.mockResolvedValue(null);
      earningRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlySummary('user-1', '2025-02');

      expect(result).toBeDefined();
      expect(earningRepo.find).toHaveBeenCalled();
    });
  });
});
