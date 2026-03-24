import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SplitEngineService } from './split-engine.service';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { SplitEvent } from '../../modules/quotas/entities/split-event.entity';
import { User } from '../../modules/users/entities/user.entity';
import { SplitEventType } from '../../shared/interfaces/enums';

function makeState(overrides: Partial<QuotaSystemState> = {}): QuotaSystemState {
  return {
    id: 1,
    currentQuotaPrice: 2000,
    totalQuotasSold: 0,
    splitCount: 0,
    currentPhase: 0,
    nextEventTarget: 50,
    nextEventLabel: 'Aumento de Preço',
    totalSplitQuotas: 0,
    ...overrides,
  } as QuotaSystemState;
}

const makeQueryBuilderUpdate = () => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
});

const makeQueryBuilderSelect = (rawResult = { total: '0' }) => ({
  select: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(rawResult),
});

describe('SplitEngineService', () => {
  let service: SplitEngineService;
  let stateRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let eventRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let userRepo: {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    stateRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(makeState()),
      save: jest.fn().mockResolvedValue(makeState()),
    };
    eventRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };
    userRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitEngineService,
        { provide: getRepositoryToken(QuotaSystemState), useValue: stateRepo },
        { provide: getRepositoryToken(SplitEvent), useValue: eventRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<SplitEngineService>(SplitEngineService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getState ────────────────────────────────────────────────────────────────

  describe('getState', () => {
    it('should return existing state', async () => {
      const state = makeState({ currentQuotaPrice: 2500 });
      stateRepo.findOne.mockResolvedValue(state);

      const result = await service.getState();

      expect(result.currentQuotaPrice).toBe(2500);
    });

    it('should create default state when none exists', async () => {
      stateRepo.findOne.mockResolvedValue(null);
      stateRepo.create.mockReturnValue(makeState());
      stateRepo.save.mockResolvedValue(makeState());

      const result = await service.getState();

      expect(stateRepo.create).toHaveBeenCalledWith({ id: 1 });
      expect(stateRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── calculateTarget (indirectly via checkAndProcess) ────────────────────────

  describe('calculateTarget', () => {
    it('should return 50 for split count 0 (50 * 2^0)', async () => {
      // Target = 50 * 2^0 = 50
      // With 49 sold, nothing should happen
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 49, currentPhase: 0, splitCount: 0 }));

      await service.checkAndProcess();

      expect(stateRepo.save).not.toHaveBeenCalled();
    });

    it('should return 100 for split count 1 (50 * 2^1)', async () => {
      // Target = 50 * 2^1 = 100
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 99, currentPhase: 0, splitCount: 1 }));

      await service.checkAndProcess();

      expect(stateRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── checkAndProcess ─────────────────────────────────────────────────────────

  describe('checkAndProcess', () => {
    it('should do nothing when sold quotas are below target', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 10 }));

      await service.checkAndProcess();

      expect(stateRepo.save).not.toHaveBeenCalled();
    });

    it('should advance phase when target is reached and phase < 3', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 0, splitCount: 0 }));
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      await service.checkAndProcess();

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: SplitEventType.PRICE_INCREASE }),
      );
      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 1 }),
      );
    });

    it('should set new price on phase advance (BASE_PRICE + PRICE_INCREMENT * phase)', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 0, splitCount: 0 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });
      eventRepo.save.mockResolvedValue({});

      await service.checkAndProcess();

      // Phase 1: 2000 + 500*1 = 2500
      expect((savedState as Partial<QuotaSystemState>)?.currentQuotaPrice).toBe(2500);
    });

    it('should execute split when phase >= 3 and target is reached', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 3, splitCount: 0 }));
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '20' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.checkAndProcess();

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: SplitEventType.SPLIT }),
      );
    });

    it('should reset price to BASE_PRICE (2000) after split', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 3, splitCount: 0, currentQuotaPrice: 3500 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '0' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.checkAndProcess();

      expect((savedState as Partial<QuotaSystemState>)?.currentQuotaPrice).toBe(2000);
    });

    it('should increment split count after split', async () => {
      // splitCount=0 → target = 50*2^0 = 50; totalQuotasSold=50 triggers split
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 3, splitCount: 0 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '0' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.checkAndProcess();

      expect((savedState as Partial<QuotaSystemState>)?.splitCount).toBe(1);
    });
  });

  // ─── incrementQuotasSold ─────────────────────────────────────────────────────

  describe('incrementQuotasSold', () => {
    it('should add quantity to totalQuotasSold', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 10 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });

      await service.incrementQuotasSold(5);

      expect((savedState as Partial<QuotaSystemState>)?.totalQuotasSold).toBe(15);
    });
  });

  // ─── nextEventLabel ──────────────────────────────────────────────────────────

  describe('nextEventLabel', () => {
    it('should set label to Split when advancing to phase 3', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 2, splitCount: 0 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });
      eventRepo.save.mockResolvedValue({});

      await service.checkAndProcess();

      expect((savedState as Partial<QuotaSystemState>)?.nextEventLabel).toBe('Split');
    });

    it('should set label to Aumento de Preço after a split', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 3, splitCount: 0 }));

      let savedState: Partial<QuotaSystemState> | null = null;
      stateRepo.save.mockImplementation((s: Partial<QuotaSystemState>) => {
        savedState = s;
        return Promise.resolve(s);
      });
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '0' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.checkAndProcess();

      expect((savedState as Partial<QuotaSystemState>)?.nextEventLabel).toBe('Aumento de Preço');
    });
  });
});
