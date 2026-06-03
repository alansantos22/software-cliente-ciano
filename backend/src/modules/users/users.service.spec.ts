import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { PartnerLevel } from '../../shared/interfaces/enums';

const recentDate = () => new Date();
const oldDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
};

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    email: 'u1@test.com',
    sponsorId: null,
    purchasedQuotas: 0,
    quotaBalance: 0,
    partnerLevel: PartnerLevel.SOCIO,
    lastPurchaseDate: recentDate(),
    ...over,
  }) as unknown as User;

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (u) => u),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('lookups', () => {
    it('findById should query by id and exclude soft-deleted', async () => {
      const u = makeUser();
      userRepo.findOne.mockResolvedValue(u);

      const result = await service.findById('u1');

      expect(result).toBe(u);
      const arg = userRepo.findOne.mock.calls[0][0];
      expect(arg.where.id).toBe('u1');
      expect(arg.where.deletedAt).toBeDefined();
    });

    it('findByEmail should query by email', async () => {
      await service.findByEmail('a@b.com');
      expect(userRepo.findOne.mock.calls[0][0].where.email).toBe('a@b.com');
    });

    it('findByReferralCode should query by referralCode', async () => {
      await service.findByReferralCode('CODE123');
      expect(userRepo.findOne.mock.calls[0][0].where.referralCode).toBe('CODE123');
    });

    it('getDirectReferrals should query by sponsorId', async () => {
      await service.getDirectReferrals('sponsor-1');
      expect(userRepo.find.mock.calls[0][0].where.sponsorId).toBe('sponsor-1');
    });
  });

  describe('getUpline', () => {
    it('should walk the sponsor chain up to maxLevels', async () => {
      const u1 = makeUser({ id: 'u1', sponsorId: 'u2' });
      const u2 = makeUser({ id: 'u2', sponsorId: 'u3' });
      const u3 = makeUser({ id: 'u3', sponsorId: null });

      const byId: Record<string, User> = { u1, u2, u3 };
      userRepo.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve(byId[where.id] ?? null),
      );

      const upline = await service.getUpline('u1');

      expect(upline.map((u) => u.id)).toEqual(['u2', 'u3']);
    });

    it('should stop when the user has no sponsor', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'u1', sponsorId: null }));

      const upline = await service.getUpline('u1');

      expect(upline).toEqual([]);
    });

    it('should respect the maxLevels limit', async () => {
      // chain: u1 -> u2 -> u3 -> u4 ...
      userRepo.findOne.mockImplementation(({ where }: any) => {
        const n = Number(where.id.replace('u', ''));
        return Promise.resolve(makeUser({ id: where.id, sponsorId: `u${n + 1}` }));
      });

      const upline = await service.getUpline('u1', 2);

      expect(upline).toHaveLength(2);
    });
  });

  describe('isUserActive', () => {
    it('should be false when there is no lastPurchaseDate', () => {
      expect(service.isUserActive(makeUser({ lastPurchaseDate: null as unknown as Date }))).toBe(false);
    });

    it('should be true for a recent purchase', () => {
      expect(service.isUserActive(makeUser({ lastPurchaseDate: recentDate() }))).toBe(true);
    });

    it('should be false for a purchase older than 6 months', () => {
      expect(service.isUserActive(makeUser({ lastPurchaseDate: oldDate() }))).toBe(false);
    });
  });

  describe('calculatePartnerLevel', () => {
    it.each([
      [0, PartnerLevel.SOCIO],
      [9, PartnerLevel.SOCIO],
      [10, PartnerLevel.PLATINUM],
      [19, PartnerLevel.PLATINUM],
      [20, PartnerLevel.VIP],
      [59, PartnerLevel.VIP],
      [60, PartnerLevel.IMPERIAL],
      [100, PartnerLevel.IMPERIAL],
    ])('should map %i quotas to %s', (quotas, expected) => {
      expect(service.calculatePartnerLevel(quotas)).toBe(expected);
    });
  });

  describe('updatePartnerLevel', () => {
    it('should update when the level changes', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'u1', purchasedQuotas: 25, partnerLevel: PartnerLevel.SOCIO }),
      );

      await service.updatePartnerLevel('u1');

      expect(userRepo.update).toHaveBeenCalledWith('u1', { partnerLevel: PartnerLevel.VIP });
    });

    it('should not update when the level is unchanged', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'u1', purchasedQuotas: 25, partnerLevel: PartnerLevel.VIP }),
      );

      await service.updatePartnerLevel('u1');

      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should no-op when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await service.updatePartnerLevel('missing');

      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('aggregates', () => {
    it('getAllActiveUsers should filter out inactive users', async () => {
      userRepo.find.mockResolvedValue([
        makeUser({ id: 'a', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'b', lastPurchaseDate: oldDate() }),
      ]);

      const result = await service.getAllActiveUsers();

      expect(result.map((u) => u.id)).toEqual(['a']);
    });

    it('countActiveInNetwork should count only active directs', async () => {
      userRepo.find.mockResolvedValue([
        makeUser({ id: 'a', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'b', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'c', lastPurchaseDate: oldDate() }),
      ]);

      const count = await service.countActiveInNetwork('root');

      expect(count).toBe(2);
    });

    it('getAllUsersWithQuotas should query for non-zero balances', async () => {
      await service.getAllUsersWithQuotas();
      expect(userRepo.find.mock.calls[0][0].where.quotaBalance).toBeDefined();
    });
  });

  describe('save / getRepository', () => {
    it('save should delegate to the repository', async () => {
      const u = makeUser();
      await service.save(u);
      expect(userRepo.save).toHaveBeenCalledWith(u);
    });

    it('getRepository should expose the underlying repo', () => {
      expect(service.getRepository()).toBe(userRepo);
    });
  });
});
