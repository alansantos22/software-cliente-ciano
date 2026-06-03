import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NetworkService } from './network.service';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { UserRole } from '../../shared/interfaces/enums';

const recentDate = () => new Date();
const oldDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
};

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    name: 'User',
    email: 'u1@test.com',
    phone: '11999',
    title: 'none',
    partnerLevel: 'socio',
    quotaBalance: 0,
    directCount: 0,
    teamCount: 0,
    totalEarnings: 0,
    role: UserRole.USER,
    sponsorId: null,
    lastPurchaseDate: recentDate(),
    createdAt: new Date(),
    ...over,
  }) as unknown as User;

describe('NetworkService', () => {
  let service: NetworkService;
  let userRepo: any;
  let payoutRepo: any;

  beforeEach(async () => {
    userRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    payoutRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Earning), useValue: {} },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
      ],
    }).compile();

    service = module.get<NetworkService>(NetworkService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getTree', () => {
    it('should build a tree of direct referrals', async () => {
      const root = makeUser({ id: 'root', role: UserRole.USER });
      const d1 = makeUser({ id: 'd1', name: 'Direct 1' });

      userRepo.findOne.mockResolvedValue(root);
      // first find = directs of root; second find = children of d1 (none)
      userRepo.find
        .mockResolvedValueOnce([d1])
        .mockResolvedValue([]);

      const tree = await service.getTree('root');

      expect(tree).toHaveLength(1);
      expect(tree[0]).toMatchObject({ id: 'd1', name: 'Direct 1', level: 1, isActive: true });
    });

    it('should also include sponsorless users when requested by an admin', async () => {
      const admin = makeUser({ id: 'admin', role: UserRole.ADMIN });
      userRepo.findOne.mockResolvedValue(admin);
      userRepo.find.mockResolvedValue([]);

      await service.getTree('admin');

      // the where conditions passed to the directs query should include the admin extra clause
      const where = userRepo.find.mock.calls[0][0].where;
      expect(Array.isArray(where)).toBe(true);
      expect(where).toHaveLength(2);
    });

    it('should stop recursing past 6 levels', async () => {
      const root = makeUser({ id: 'root' });
      userRepo.findOne.mockResolvedValue(root);
      // Every find returns one child → recursion would be infinite without the level cap
      userRepo.find.mockImplementation(({ where }: any) => {
        const id = Array.isArray(where) ? where[0].sponsorId : where.sponsorId;
        // generate a unique child id so we can build depth
        return Promise.resolve([makeUser({ id: `${id}-c` })]);
      });

      const tree = await service.getTree('root');

      // descend through children counting depth
      let depth = 0;
      let node = tree[0];
      while (node) {
        depth++;
        node = node.children[0];
      }
      expect(depth).toBe(6);
    });
  });

  describe('getStats', () => {
    it('should aggregate membership, title and level distributions', async () => {
      const root = makeUser({ id: 'root' });
      userRepo.findOne.mockResolvedValue(root);

      // getTree: directs = [a (active bronze), b (inactive none)]
      const a = makeUser({ id: 'a', title: 'bronze', lastPurchaseDate: recentDate(), totalEarnings: 100 });
      const b = makeUser({ id: 'b', title: 'none', lastPurchaseDate: oldDate(), totalEarnings: 50 });

      userRepo.find.mockImplementation(({ where }: any) => {
        const sponsorId = Array.isArray(where) ? where[0].sponsorId : where.sponsorId;
        if (sponsorId === 'root') return Promise.resolve([a, b]);
        return Promise.resolve([]); // a and b have no children
      });

      const stats = await service.getStats('root');

      expect(stats.totalDirect).toBe(2);
      expect(stats.totalTeam).toBe(2);
      expect(stats.totalVolume).toBe(150);
      expect(stats.activeMembers).toBe(1);
      expect(stats.inactiveMembers).toBe(1);
      expect(stats.activeDirects).toBe(1);
      expect(stats.qualifiedBronzes).toBe(1); // active + title !== none
      expect(stats.qualifiedLines).toBe(1); // line 'a' has an active bronze
      expect(stats.titleDistribution.bronze).toBe(1);
      expect(stats.titleDistribution.none).toBe(1);
    });

    it('should compute lifetimeEarnings only from paid payout portions', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'root' }));
      userRepo.find.mockResolvedValue([]);
      payoutRepo.find.mockResolvedValue([
        { networkAmount: 100, quotaAmount: 200, bonusPaidAt: new Date(), dividendPaidAt: null },
        { networkAmount: 50, quotaAmount: 80, bonusPaidAt: null, dividendPaidAt: new Date() },
      ]);

      const stats = await service.getStats('root');

      // 100 (bonus paid) + 80 (dividend paid) = 180
      expect(stats.lifetimeEarnings).toBe(180);
    });
  });

  describe('getMember', () => {
    it('should return null when the member is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.getMember('missing', 'req');
      expect(result).toBeNull();
    });

    it('should return a mapped member profile', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'm1', name: 'Member', lastPurchaseDate: recentDate() }),
      );

      const result = await service.getMember('m1', 'req');

      expect(result).toMatchObject({ id: 'm1', name: 'Member', isActive: true });
      expect(result!.expiresAt).not.toBeNull();
    });

    it('should expose null expiresAt when there is no purchase', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'm1', lastPurchaseDate: null as unknown as Date }),
      );

      const result = await service.getMember('m1', 'req');

      expect(result!.isActive).toBe(false);
      expect(result!.expiresAt).toBeNull();
    });
  });
});
