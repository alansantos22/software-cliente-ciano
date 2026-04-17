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
    pendingEventType: null,
    pendingEventDate: null,
    updatedAt: new Date(),
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
      create: jest.fn().mockImplementation((data) => ({ ...makeState(), ...data })),
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

    it('should create state with phase 1 (R$2500) when none exists (first run)', async () => {
      stateRepo.findOne.mockResolvedValue(null);

      await service.getState();

      expect(stateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, currentPhase: 1, currentQuotaPrice: 2500 }),
      );
      expect(stateRepo.save).toHaveBeenCalled();
    });
  });

  // ─── checkAndProcess ─────────────────────────────────────────────────────────

  describe('checkAndProcess', () => {
    it('should do nothing when sold quotas are below target', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 10 }));

      await service.checkAndProcess();

      // save is not called for scheduling
      expect(stateRepo.save).not.toHaveBeenCalled();
    });

    it('should do nothing if there is already a pending event', async () => {
      stateRepo.findOne.mockResolvedValue(
        makeState({ totalQuotasSold: 50, currentPhase: 0, pendingEventType: SplitEventType.PRICE_INCREASE }),
      );

      await service.checkAndProcess();

      expect(stateRepo.save).not.toHaveBeenCalled();
    });

    it('should schedule price increase when target reached and phase < 2', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 0, splitCount: 0 }));
      stateRepo.save.mockResolvedValue({});

      await service.checkAndProcess();

      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ pendingEventType: SplitEventType.PRICE_INCREASE }),
      );
    });

    it('should schedule split when target reached and phase is at max (2)', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ totalQuotasSold: 50, currentPhase: 2, splitCount: 0 }));
      stateRepo.save.mockResolvedValue({});

      await service.checkAndProcess();

      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ pendingEventType: SplitEventType.SPLIT }),
      );
    });
  });

  // ─── applyPendingEvent ───────────────────────────────────────────────────────

  describe('applyPendingEvent', () => {
    it('should do nothing if no pending event', async () => {
      stateRepo.findOne.mockResolvedValue(makeState({ pendingEventType: null }));

      await service.applyPendingEvent();

      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it('should advance phase when pending event is PRICE_INCREASE', async () => {
      stateRepo.findOne.mockResolvedValue(
        makeState({ totalQuotasSold: 50, currentPhase: 0, splitCount: 0, pendingEventType: SplitEventType.PRICE_INCREASE }),
      );
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      await service.applyPendingEvent();

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: SplitEventType.PRICE_INCREASE }),
      );
      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 1, pendingEventType: null }),
      );
    });

    it('should set price to R$2500 when advancing to phase 1', async () => {
      const state = makeState({ totalQuotasSold: 50, currentPhase: 0, splitCount: 0, pendingEventType: SplitEventType.PRICE_INCREASE });
      stateRepo.findOne.mockResolvedValue(state);
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      await service.applyPendingEvent();

      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentQuotaPrice: 2500 }),
      );
    });

    it('should execute split when pending event is SPLIT', async () => {
      stateRepo.findOne.mockResolvedValue(
        makeState({ totalQuotasSold: 50, currentPhase: 2, splitCount: 0, pendingEventType: SplitEventType.SPLIT }),
      );
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '20' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.applyPendingEvent();

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: SplitEventType.SPLIT }),
      );
      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentQuotaPrice: 2000, currentPhase: 0, splitCount: 1, pendingEventType: null }),
      );
    });

    it('should set nextEventLabel to Split when advancing to max phase (2)', async () => {
      stateRepo.findOne.mockResolvedValue(
        makeState({ totalQuotasSold: 50, currentPhase: 1, splitCount: 0, pendingEventType: SplitEventType.PRICE_INCREASE }),
      );
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      await service.applyPendingEvent();

      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nextEventLabel: 'Split' }),
      );
    });

    it('should set nextEventLabel to Aumento de Preço after split', async () => {
      stateRepo.findOne.mockResolvedValue(
        makeState({ totalQuotasSold: 50, currentPhase: 2, splitCount: 0, pendingEventType: SplitEventType.SPLIT }),
      );
      stateRepo.save.mockResolvedValue({});
      eventRepo.save.mockResolvedValue({});

      const updateQb = makeQueryBuilderUpdate();
      const selectQb = makeQueryBuilderSelect({ total: '0' });
      userRepo.createQueryBuilder
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce({ ...updateQb, update: () => updateQb })
        .mockReturnValueOnce(selectQb);

      await service.applyPendingEvent();

      expect(stateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nextEventLabel: 'Aumento de Preço' }),
      );
    });
  });

  // ─── incrementQuotasSold ─────────────────────────────────────────────────────

  describe('incrementQuotasSold', () => {
    it('should add quantity to totalQuotasSold', async () => {
      const state = makeState({ totalQuotasSold: 10 });
      stateRepo.findOne.mockResolvedValue(state);

      let savedState: any = null;
      stateRepo.save.mockImplementation((s: QuotaSystemState) => {
        savedState = s;
        return Promise.resolve(s);
      });

      await service.incrementQuotasSold(5);

      expect(savedState?.totalQuotasSold).toBe(15);
    });
  });
});
