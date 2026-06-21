import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { User } from '../../modules/users/entities/user.entity';
import { GlobalFinancialSettings } from '../../modules/admin/entities/global-financial-settings.entity';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { PartnerLevelRequirement } from '../../modules/admin/entities/partner-level-requirement.entity';

jest.mock('argon2', () => ({ hash: jest.fn(async () => 'hashed') }));

const repoMock = () => ({
  findOne: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((x) => ({ ...x })),
  save: jest.fn(async (x) => x),
});

describe('SeedService', () => {
  let service: SeedService;
  let userRepo: any;
  let settingsRepo: any;
  let quotaStateRepo: any;
  let titleReqRepo: any;
  let partnerReqRepo: any;
  let config: any;

  beforeEach(async () => {
    userRepo = repoMock();
    settingsRepo = repoMock();
    // ensureManagerPasswordColumn: coluna já existe → nenhum ALTER.
    settingsRepo.metadata = { tableName: 'global_financial_settings' };
    settingsRepo.query = jest.fn().mockResolvedValue([{ COLUMN_NAME: 'manager_password_hash' }]);
    quotaStateRepo = repoMock();
    titleReqRepo = repoMock();
    partnerReqRepo = repoMock();
    config = { get: jest.fn().mockReturnValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: quotaStateRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: titleReqRepo },
        { provide: getRepositoryToken(PartnerLevelRequirement), useValue: partnerReqRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('onModuleInit (fresh database)', () => {
    it('seeds admin, settings, state, titles and partner levels when empty', async () => {
      // all findOne return null → everything gets created
      await service.onModuleInit();

      expect(userRepo.save).toHaveBeenCalled(); // admin
      expect(settingsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
      expect(quotaStateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, currentPhase: 1, currentQuotaPrice: 2500 }),
      );
      // 5 title requirement seeds inserted
      expect(titleReqRepo.save).toHaveBeenCalledTimes(5);
      expect(partnerReqRepo.save).toHaveBeenCalled();
    });

    it('uses ADMIN_* config overrides for the admin user', async () => {
      config.get.mockImplementation((k: string) =>
        ({ ADMIN_EMAIL: 'boss@ciano.com', ADMIN_PASSWORD: 'pw', ADMIN_NAME: 'Boss' }[k]),
      );

      await service.onModuleInit();

      const admin = userRepo.create.mock.calls[0][0];
      expect(admin.email).toBe('boss@ciano.com');
      expect(admin.name).toBe('Boss');
    });
  });

  describe('onModuleInit (already seeded)', () => {
    it('skips creation when records already exist', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'admin' });
      settingsRepo.findOne.mockResolvedValue({ id: 1 });
      quotaStateRepo.findOne.mockResolvedValue({ id: 1 });
      partnerReqRepo.count.mockResolvedValue(4);
      // title requirements already match the canonical seeds → no save
      titleReqRepo.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve({
          title: where.title,
          repurchaseLevels: seedFor(where.title).repurchaseLevels,
          teamLevels: seedFor(where.title).teamLevels,
          leadershipPercent: seedFor(where.title).leadershipPercent,
        }),
      );

      await service.onModuleInit();

      expect(userRepo.save).not.toHaveBeenCalled();
      expect(settingsRepo.save).not.toHaveBeenCalled();
      expect(quotaStateRepo.save).not.toHaveBeenCalled();
      expect(partnerReqRepo.save).not.toHaveBeenCalled();
      expect(titleReqRepo.save).not.toHaveBeenCalled();
    });

    it('heals title requirements whose bonus columns drifted', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'admin' });
      settingsRepo.findOne.mockResolvedValue({ id: 1 });
      quotaStateRepo.findOne.mockResolvedValue({ id: 1 });
      partnerReqRepo.count.mockResolvedValue(4);
      // Existing rows have zeroed bonus columns (the migration-004 bug) → healed
      titleReqRepo.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve({
          title: where.title,
          repurchaseLevels: 0,
          teamLevels: 0,
          leadershipPercent: 0,
        }),
      );

      await service.onModuleInit();

      // BRONZE/SILVER/GOLD/DIAMOND need fixing (NONE stays all-zero) → 4 saves
      expect(titleReqRepo.save).toHaveBeenCalledTimes(4);
    });
  });
});

/** Canonical seed values mirrored from the service for the "no drift" case. */
function seedFor(title: string) {
  const map: Record<string, { repurchaseLevels: number; teamLevels: number; leadershipPercent: number }> = {
    none: { repurchaseLevels: 0, teamLevels: 0, leadershipPercent: 0 },
    bronze: { repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0 },
    silver: { repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0 },
    gold: { repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1 },
    diamond: { repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2 },
  };
  return map[title];
}
