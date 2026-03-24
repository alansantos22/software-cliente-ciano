import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BonusCalculatorService } from './bonus-calculator.service';
import { User } from '../../modules/users/entities/user.entity';
import { Earning } from '../../modules/earnings/entities/earning.entity';
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
    createQueryBuilder: jest.Mock;
  };
  let titleReqRepo: { findOne: jest.Mock };
  let monthConfigRepo: { findOne: jest.Mock };

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
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()),
    };
    titleReqRepo = { findOne: jest.fn() };
    monthConfigRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonusCalculatorService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: titleReqRepo },
        { provide: getRepositoryToken(MonthlyFinancialConfig), useValue: monthConfigRepo },
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
    it('should distribute dividends proportionally to quota holders', async () => {
      const users = [
        makeUser({ id: 'u1', quotaBalance: 10 }),
        makeUser({ id: 'u2', quotaBalance: 10 }),
      ];
      userRepo.find.mockResolvedValue(users);

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

    it('should skip users with no quotas', async () => {
      const users = [
        makeUser({ id: 'u1', quotaBalance: 10 }),
        makeUser({ id: 'u2', quotaBalance: 0 }),
      ];
      userRepo.find.mockResolvedValue(users);

      earningRepo.create.mockImplementation((data: Partial<Earning>) => data);

      await service.calculateDividends('2025-03', 1000);

      expect(earningRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when total quotas is zero', async () => {
      userRepo.find.mockResolvedValue([makeUser({ quotaBalance: 0 })]);

      await service.calculateDividends('2025-03', 1000);

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── calculateLeadershipBonus ─────────────────────────────────────────────────

  describe('calculateLeadershipBonus', () => {
    it('should calculate 1% leadership bonus for GOLD title when qualified downline has earnings', async () => {
      const goldUser = makeUser({ id: 'gold-1', title: UserTitle.GOLD });
      const qualifiedDownline = makeUser({ id: 'gold-child', title: UserTitle.GOLD, sponsorId: 'gold-1' });

      // First call: allUsers; subsequent calls inside getQualifiedDownlineEarnings
      userRepo.find
        .mockResolvedValueOnce([goldUser])           // allUsers
        .mockResolvedValueOnce([qualifiedDownline])  // level 1 downline
        .mockResolvedValueOnce([]);                  // level 2 downline (empty → stop)

      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '1000' }));

      const amounts: number[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        amounts.push(data.amount as number);
        return data;
      });

      await service.calculateLeadershipBonus('2025-03');

      expect(earningRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bonusType: BonusType.LEADERSHIP }),
      );
      expect(amounts[0]).toBeCloseTo(10); // 1% of 1000
    });

    it('should calculate 2% leadership bonus for DIAMOND title', async () => {
      const diamondUser = makeUser({ id: 'diamond-1', title: UserTitle.DIAMOND });
      const qualifiedDownline = makeUser({ id: 'diamond-child', title: UserTitle.DIAMOND, sponsorId: 'diamond-1' });

      userRepo.find
        .mockResolvedValueOnce([diamondUser])        // allUsers
        .mockResolvedValueOnce([qualifiedDownline])  // level 1 downline
        .mockResolvedValueOnce([]);                  // stop

      earningRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ total: '500' }));

      const amounts: number[] = [];
      earningRepo.create.mockImplementation((data: Partial<Earning>) => {
        amounts.push(data.amount as number);
        return data;
      });

      await service.calculateLeadershipBonus('2025-03');

      expect(earningRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bonusType: BonusType.LEADERSHIP }),
      );
      expect(amounts[0]).toBeCloseTo(10); // 2% of 500
    });

    it('should not give leadership bonus to users below GOLD', async () => {
      const silverUser = makeUser({ id: 'silver-1', title: UserTitle.SILVER });
      userRepo.find.mockResolvedValue([silverUser]);

      await service.calculateLeadershipBonus('2025-03');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── calculateTeamBonus ──────────────────────────────────────────────────────

  describe('calculateTeamBonus', () => {
    it('should skip users with no team levels unlocked', async () => {
      const user = makeUser({ id: 'u1', title: UserTitle.BRONZE });
      userRepo.find.mockResolvedValue([user]);
      titleReqRepo.findOne.mockResolvedValue({ title: UserTitle.BRONZE, teamLevels: 0 });

      await service.calculateTeamBonus('2025-03');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('should skip inactive users in team bonus calculation', async () => {
      const inactiveUser = makeUser({
        id: 'u1',
        title: UserTitle.SILVER,
        lastPurchaseDate: new Date('2020-01-01'),
      });
      userRepo.find.mockResolvedValue([inactiveUser]);

      await service.calculateTeamBonus('2025-03');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });
  });
});
