import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EarningsService } from './earnings.service';
import { Earning } from './entities/earning.entity';
import { MonthlyEarningSummary } from './entities/monthly-earning-summary.entity';
import { BonusType } from '../../shared/interfaces/enums';

const makeQueryBuilder = (rawResult: Record<string, string> = { total: '0' }) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(rawResult),
});

describe('EarningsService', () => {
  let service: EarningsService;
  let earningRepo: {
    findAndCount: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let summaryRepo: {
    findOne: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(async () => {
    earningRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };
    summaryRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarningsService,
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(MonthlyEarningSummary), useValue: summaryRepo },
      ],
    }).compile();

    service = module.get<EarningsService>(EarningsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getEarnings ─────────────────────────────────────────────────────────────

  describe('getEarnings', () => {
    it('should return paginated earnings', async () => {
      const items = [{ id: 'e1', amount: 100 }, { id: 'e2', amount: 200 }];
      earningRepo.findAndCount.mockResolvedValue([items, 2]);

      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate total pages correctly', async () => {
      earningRepo.findAndCount.mockResolvedValue([[], 45]);

      const result = await service.getEarnings('user-1', 1, 20);

      expect(result.totalPages).toBe(3);
    });

    it('should apply correct skip offset for page 2', async () => {
      earningRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getEarnings('user-1', 2, 20);

      expect(earningRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });
  });

  // ─── getOverview ─────────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('should return earnings overview with all metrics', async () => {
      earningRepo.createQueryBuilder
        .mockReturnValueOnce(makeQueryBuilder({ total: '1500.00' })) // totalEarned
        .mockReturnValueOnce(makeQueryBuilder({ total: '300.00' }))  // pendingEarnings
        .mockReturnValueOnce(makeQueryBuilder({ total: '500.00' }))  // thisMonth
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
      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '0' }));
      summaryRepo.count.mockResolvedValue(0);

      const result = await service.getOverview('user-1');

      expect(result.averageMonthly).toBe(0);
    });

    it('should handle null totals from query builder', async () => {
      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: null as unknown as string }));
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
      expect(result.total).toBe(410);           // networkEarnings + dividend
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
