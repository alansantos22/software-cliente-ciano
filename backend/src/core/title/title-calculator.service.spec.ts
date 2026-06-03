import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TitleCalculatorService } from './title-calculator.service';
import { User } from '../../modules/users/entities/user.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { UserTitle, TitleReqType } from '../../shared/interfaces/enums';

/** A date guaranteed to be within the last 6 months (active). */
const recentDate = () => new Date();
/** A date older than 6 months (inactive). */
const oldDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
};

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    name: 'User',
    title: UserTitle.NONE,
    sponsorId: null,
    lastPurchaseDate: recentDate(),
    ...over,
  }) as unknown as User;

describe('TitleCalculatorService', () => {
  let service: TitleCalculatorService;
  let userRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };
  let titleReqRepo: { find: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    titleReqRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleCalculatorService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: titleReqRepo },
      ],
    }).compile();

    service = module.get<TitleCalculatorService>(TitleCalculatorService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('recalculateTitle', () => {
    it('should return NONE when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.recalculateTitle('missing');

      expect(result).toBe(UserTitle.NONE);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should force NONE for an inactive user without running qualifications', async () => {
      const user = makeUser({ title: UserTitle.GOLD, lastPurchaseDate: oldDate() });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.recalculateTitle('u1');

      expect(result).toBe(UserTitle.NONE);
      // title changed GOLD -> NONE
      expect(userRepo.update).toHaveBeenCalledWith('u1', { title: UserTitle.NONE });
    });

    it('should force NONE when lastPurchaseDate is null (never purchased)', async () => {
      const user = makeUser({ title: UserTitle.NONE, lastPurchaseDate: null as unknown as Date });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.recalculateTitle('u1');

      expect(result).toBe(UserTitle.NONE);
      // no change → no update
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should award BRONZE when active user has 2 active directs (default reqs)', async () => {
      const user = makeUser({ id: 'root', title: UserTitle.NONE, sponsorId: null });
      const directs = [
        makeUser({ id: 'd1', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'd2', lastPurchaseDate: recentDate() }),
      ];

      userRepo.findOne.mockResolvedValue(user);
      // checkPessoasAtivas calls find for directs
      userRepo.find.mockResolvedValue(directs);

      const result = await service.recalculateTitle('root');

      expect(result).toBe(UserTitle.BRONZE);
      expect(userRepo.update).toHaveBeenCalledWith('root', { title: UserTitle.BRONZE });
    });

    it('should not award BRONZE when only 1 of the directs is active', async () => {
      const user = makeUser({ id: 'root', title: UserTitle.NONE });
      const directs = [
        makeUser({ id: 'd1', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'd2', lastPurchaseDate: oldDate() }), // inactive
      ];

      userRepo.findOne.mockResolvedValue(user);
      userRepo.find.mockResolvedValue(directs);

      const result = await service.recalculateTitle('root');

      expect(result).toBe(UserTitle.NONE);
    });

    it('should cascade recalculation to the sponsor when the title changes', async () => {
      const sponsor = makeUser({ id: 'sponsor', title: UserTitle.NONE, sponsorId: null });
      const user = makeUser({ id: 'u1', title: UserTitle.NONE, sponsorId: 'sponsor' });

      userRepo.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve(where.id === 'sponsor' ? sponsor : user),
      );
      // both users have 2 active directs so they qualify for BRONZE
      userRepo.find.mockResolvedValue([
        makeUser({ id: 'a', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'b', lastPurchaseDate: recentDate() }),
      ]);

      await service.recalculateTitle('u1');

      // update called for u1 and cascaded for sponsor
      expect(userRepo.update).toHaveBeenCalledWith('u1', { title: UserTitle.BRONZE });
      expect(userRepo.update).toHaveBeenCalledWith('sponsor', { title: UserTitle.BRONZE });
    });

    it('should prefer DB requirements over defaults when present', async () => {
      const user = makeUser({ id: 'root', title: UserTitle.NONE });
      userRepo.findOne.mockResolvedValue(user);
      // DB requires 5 active people → not met with 2 directs
      titleReqRepo.find.mockResolvedValue([
        {
          title: UserTitle.BRONZE,
          reqType: TitleReqType.PESSOAS_ATIVAS,
          reqQuantity: 5,
          reqLevel: null,
        } as TitleRequirement,
      ]);
      userRepo.find.mockResolvedValue([
        makeUser({ id: 'd1', lastPurchaseDate: recentDate() }),
        makeUser({ id: 'd2', lastPurchaseDate: recentDate() }),
      ]);

      const result = await service.recalculateTitle('root');

      expect(result).toBe(UserTitle.NONE);
    });
  });

  describe('recalculateTitleToRoot', () => {
    it('should walk up the sponsor chain to the root', async () => {
      const spy = jest.spyOn(service, 'recalculateTitle').mockResolvedValue(UserTitle.NONE);

      userRepo.findOne.mockImplementation(({ where }: any) => {
        const chain: Record<string, string | null> = {
          a: 'b',
          b: 'c',
          c: null,
        };
        return Promise.resolve({ id: where.id, sponsorId: chain[where.id] });
      });

      await service.recalculateTitleToRoot('a');

      expect(spy).toHaveBeenCalledWith('a');
      expect(spy).toHaveBeenCalledWith('b');
      expect(spy).toHaveBeenCalledWith('c');
    });

    it('should stop on cycles (visited guard)', async () => {
      const spy = jest.spyOn(service, 'recalculateTitle').mockResolvedValue(UserTitle.NONE);

      // a -> b -> a (cycle)
      userRepo.findOne.mockImplementation(({ where }: any) => {
        const chain: Record<string, string | null> = { a: 'b', b: 'a' };
        return Promise.resolve({ id: where.id, sponsorId: chain[where.id] });
      });

      await service.recalculateTitleToRoot('a');

      expect(spy).toHaveBeenCalledTimes(2); // a and b only
    });
  });

  describe('recalculateAllTitles', () => {
    it('should recalculate the title for every non-deleted user', async () => {
      userRepo.find.mockResolvedValueOnce([
        makeUser({ id: 'u1' }),
        makeUser({ id: 'u2' }),
      ]);
      const spy = jest.spyOn(service, 'recalculateTitle').mockResolvedValue(UserTitle.NONE);

      await service.recalculateAllTitles();

      expect(spy).toHaveBeenCalledWith('u1');
      expect(spy).toHaveBeenCalledWith('u2');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
