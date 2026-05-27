import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BonusCalculatorService } from './bonus-calculator.service';
import { SnapshotService } from '../snapshot/snapshot.service';
import { User } from '../../modules/users/entities/user.entity';
import { Earning } from '../../modules/earnings/entities/earning.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { MonthlyFinancialConfig } from '../../modules/admin/entities/monthly-financial-config.entity';
import { BonusType, UserTitle } from '../../shared/interfaces/enums';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Usuário Teste',
    email: 'teste@example.com',
    sponsorId: null,
    lastPurchaseDate: new Date(), // active by default
    purchasedQuotas: 5,
    splitQuotas: 0,
    quotaBalance: 5,
    totalEarnings: 0,
    title: UserTitle.NONE,
    ...overrides,
  } as User;
}

function makeSnapshot(overrides: Partial<MonthlyUserSnapshot> = {}): MonthlyUserSnapshot {
  return {
    userId: 'user-1',
    month: '2025-03',
    name: 'Usuário Teste',
    sponsorId: null,
    title: UserTitle.NONE,
    repurchaseLevels: 0,
    teamLevels: 0,
    leadershipPercent: 0,
    quotaBalance: 5,
    isActive: true,
    ...overrides,
  } as MonthlyUserSnapshot;
}

const makeQueryBuilder = (rawResult = { total: '0' }) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(rawResult),
});

describe('BonusCalculatorService', () => {
  let service: BonusCalculatorService;
  let userRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    increment: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let earningRepo: {
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let titleReqRepo: { findOne: jest.Mock };
  let monthConfigRepo: { findOne: jest.Mock };
  let snapshotService: {
    getSnapshot: jest.Mock;
    captureMonth: jest.Mock;
    hasSnapshot: jest.Mock;
    getHistoricalQuotaBalances: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    earningRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()),
    };
    titleReqRepo = { findOne: jest.fn() };
    monthConfigRepo = { findOne: jest.fn() };
    snapshotService = {
      getSnapshot: jest.fn().mockResolvedValue([]),
      captureMonth: jest.fn().mockResolvedValue({ created: 0, skipped: true }),
      hasSnapshot: jest.fn().mockResolvedValue(true),
      getHistoricalQuotaBalances: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonusCalculatorService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: titleReqRepo },
        { provide: getRepositoryToken(MonthlyFinancialConfig), useValue: monthConfigRepo },
        { provide: SnapshotService, useValue: snapshotService },
      ],
    }).compile();

    service = module.get<BonusCalculatorService>(BonusCalculatorService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── calculateFirstPurchaseBonus ─────────────────────────────────────────────

  describe('calculateFirstPurchaseBonus', () => {
    it('should create a 10% first purchase bonus for the sponsor', async () => {
      const buyer = makeUser({ id: 'buyer-1', sponsorId: 'sponsor-1' });
      const sponsor = makeUser({ id: 'sponsor-1' });
      userRepo.findOne.mockResolvedValue(sponsor);

      let createdEarning: Partial<Earning> | null = null;
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        createdEarning = data;
        return data;
      });

      await service.calculateFirstPurchaseBonus(buyer, 2000, new Date());

      expect(earningRepo.save).toHaveBeenCalled();
      expect(createdEarning).toMatchObject({
        userId: 'sponsor-1',
        bonusType: BonusType.FIRST_PURCHASE,
        amount: 200, // 10% of 2000
      });
      expect(userRepo.increment).toHaveBeenCalledWith({ id: 'sponsor-1' }, 'totalEarnings', 200);
    });

    it('should do nothing if buyer has no sponsor', async () => {
      const buyer = makeUser({ sponsorId: null });

      await service.calculateFirstPurchaseBonus(buyer, 2000, new Date());

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('should do nothing if sponsor is not found', async () => {
      const buyer = makeUser({ sponsorId: 'missing-sponsor' });
      userRepo.findOne.mockResolvedValue(null);

      await service.calculateFirstPurchaseBonus(buyer, 2000, new Date());

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── calculateRepurchaseBonus ────────────────────────────────────────────────

  describe('calculateRepurchaseBonus', () => {
    it('should apply 5% for level 1 and 2% for level 2 to active upline with sufficient title', async () => {
      const buyer = makeUser({ id: 'buyer-1', sponsorId: 'level1-id' });
      const level1 = makeUser({ id: 'level1-id', sponsorId: 'level2-id', title: UserTitle.BRONZE });
      const level2 = makeUser({ id: 'level2-id', sponsorId: null, title: UserTitle.SILVER });

      userRepo.findOne
        .mockResolvedValueOnce(level1)
        .mockResolvedValueOnce(level2);

      titleReqRepo.findOne
        .mockResolvedValueOnce({ title: UserTitle.BRONZE, repurchaseLevels: 1 }) // level1 unlocks 1
        .mockResolvedValueOnce({ title: UserTitle.SILVER, repurchaseLevels: 2 }); // level2 unlocks 2

      const amounts: number[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        amounts.push(data.amount as number);
        return data;
      });

      await service.calculateRepurchaseBonus(buyer, 1000, new Date());

      expect(amounts[0]).toBe(50);  // 5% of 1000 for level 1
      expect(amounts[1]).toBe(20);  // 2% of 1000 for level 2
    });

    it('should skip inactive upline users', async () => {
      const buyer = makeUser({ id: 'buyer-1', sponsorId: 'inactive-sponsor' });
      const inactiveUser = makeUser({
        id: 'inactive-sponsor',
        sponsorId: null,
        lastPurchaseDate: new Date('2020-01-01'), // very old, inactive
      });

      userRepo.findOne.mockResolvedValue(inactiveUser);

      await service.calculateRepurchaseBonus(buyer, 1000, new Date());

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('should stop climbing when sponsorId is null', async () => {
      const buyer = makeUser({ id: 'buyer-1', sponsorId: 'root' });
      const root = makeUser({ id: 'root', sponsorId: null, title: UserTitle.BRONZE });

      userRepo.findOne.mockResolvedValue(root);
      titleReqRepo.findOne.mockResolvedValue({ repurchaseLevels: 1 });

      await service.calculateRepurchaseBonus(buyer, 1000, new Date());

      expect(earningRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ─── calculateDividends ──────────────────────────────────────────────────────

  describe('calculateDividends', () => {
    it('should distribute dividends proportionally to quota holders (from historical balances)', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 'u1' }),
        makeSnapshot({ userId: 'u2' }),
      ]);
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(
        new Map<string, number>([
          ['u1', 10],
          ['u2', 10],
        ]),
      );

      const amounts: number[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        amounts.push(data.amount as number);
        return data;
      });

      await service.calculateDividends('2025-03', 1000);

      expect(amounts).toHaveLength(2);
      expect(amounts[0]).toBeCloseTo(500); // 10/20 * 1000
      expect(amounts[1]).toBeCloseTo(500);
    });

    it('should skip users with no quotas in the historical balance', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 'u1' }),
        makeSnapshot({ userId: 'u2' }),
      ]);
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(
        new Map<string, number>([
          ['u1', 10],
          ['u2', 0],
        ]),
      );

      earningRepo.create.mockImplementation((data: Partial<Earning>) => data);

      await service.calculateDividends('2025-03', 1000);

      expect(earningRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when total quotas is zero', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 'u1' }),
      ]);
      snapshotService.getHistoricalQuotaBalances.mockResolvedValue(
        new Map<string, number>([['u1', 0]]),
      );

      await service.calculateDividends('2025-03', 1000);

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── calculateTeamAndLeadershipBonuses ───────────────────────────────────────

  describe('calculateTeamAndLeadershipBonuses', () => {
    it('should give a 2% team bonus on everything the downline earned', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 's', title: UserTitle.BRONZE, teamLevels: 2 }),
        makeSnapshot({ userId: 'd', sponsorId: 's', title: UserTitle.NONE }),
      ]);

      // Soma de ganhos do downline = R$ 1.000.
      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '1000' }));

      const created: Partial<Earning>[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        created.push(data);
        return data;
      });

      await service.calculateTeamAndLeadershipBonuses('2025-03');

      const team = created.filter((e) => e.bonusType === BonusType.TEAM);
      expect(team).toHaveLength(1);
      expect(team[0]).toMatchObject({ userId: 's', amount: 20 }); // 2% de 1000
    });

    it('should give leadership bonus only over qualified (Gold/Diamond) downline', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 'g', title: UserTitle.GOLD, teamLevels: 4, leadershipPercent: 1 }),
        makeSnapshot({ userId: 'gc', sponsorId: 'g', title: UserTitle.GOLD, teamLevels: 4, leadershipPercent: 1 }),
      ]);

      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '1000' }));

      const created: Partial<Earning>[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        created.push(data);
        return data;
      });

      await service.calculateTeamAndLeadershipBonuses('2025-03');

      const leadership = created.filter((e) => e.bonusType === BonusType.LEADERSHIP);
      expect(leadership).toHaveLength(1);
      expect(leadership[0]).toMatchObject({ userId: 'g', amount: 10 }); // 1% de 1000
    });

    it('should not pay team/leadership to inactive users', async () => {
      snapshotService.getSnapshot.mockResolvedValue([
        makeSnapshot({ userId: 'u1', title: UserTitle.GOLD, teamLevels: 4, leadershipPercent: 1, isActive: false }),
      ]);

      await service.calculateTeamAndLeadershipBonuses('2025-03');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('should be idempotent — skip when team/leadership already exist for the month', async () => {
      earningRepo.count.mockResolvedValue(3);
      userRepo.find.mockResolvedValue([makeUser({ id: 's', title: UserTitle.BRONZE })]);

      await service.calculateTeamAndLeadershipBonuses('2025-03');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });
});
