import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { UserSettings } from './entities/user-settings.entity';

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsRepo: any;

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(UserSettings), useValue: settingsRepo },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getSettings', () => {
    it('should create and persist defaults when none exist', async () => {
      settingsRepo.findOne.mockResolvedValue(null);

      const result = await service.getSettings('u1');

      expect(settingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', theme: 'auto', language: 'pt-BR' }),
      );
      expect(settingsRepo.save).toHaveBeenCalled();
      expect(result).toEqual({
        theme: 'auto',
        language: 'pt-BR',
        notifications: { payments: true, network: true, promotions: false, system: true },
      });
    });

    it('should map an existing settings row into the response shape', async () => {
      settingsRepo.findOne.mockResolvedValue({
        userId: 'u1',
        theme: 'dark',
        language: 'en-US',
        notifyPayments: false,
        notifyNetwork: true,
        notifyPromotions: true,
        notifySystem: false,
      });

      const result = await service.getSettings('u1');

      expect(result).toEqual({
        theme: 'dark',
        language: 'en-US',
        notifications: { payments: false, network: true, promotions: true, system: false },
      });
      expect(settingsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should apply partial updates and merge notification flags', async () => {
      const existing = {
        userId: 'u1',
        theme: 'auto',
        language: 'pt-BR',
        notifyPayments: true,
        notifyNetwork: true,
        notifyPromotions: false,
        notifySystem: true,
      };
      // first findOne = update target; second findOne (inside getSettings) = updated row
      settingsRepo.findOne.mockResolvedValue(existing);

      const result = await service.updateSettings('u1', {
        theme: 'dark',
        notifications: { promotions: true },
      });

      expect(existing.theme).toBe('dark');
      expect(existing.notifyPromotions).toBe(true);
      // untouched flags stay the same
      expect(existing.notifyPayments).toBe(true);
      expect(result.theme).toBe('dark');
    });

    it('should create a row when none exists before updating', async () => {
      settingsRepo.findOne
        .mockResolvedValueOnce(null) // update path: no existing row
        .mockResolvedValueOnce({
          userId: 'u1',
          theme: 'light',
          language: 'pt-BR',
          notifyPayments: true,
          notifyNetwork: true,
          notifyPromotions: false,
          notifySystem: true,
        });

      await service.updateSettings('u1', { theme: 'light' });

      expect(settingsRepo.create).toHaveBeenCalledWith({ userId: 'u1' });
      expect(settingsRepo.save).toHaveBeenCalled();
    });

    it('should not overwrite a flag that is left undefined', async () => {
      const existing = {
        userId: 'u1',
        notifyPayments: true,
        notifyNetwork: false,
        notifyPromotions: false,
        notifySystem: true,
      };
      settingsRepo.findOne.mockResolvedValue(existing);

      await service.updateSettings('u1', { notifications: { network: true } });

      expect(existing.notifyNetwork).toBe(true);
      expect(existing.notifyPayments).toBe(true); // untouched
    });
  });
});
