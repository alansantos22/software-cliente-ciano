import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { User } from '../users/entities/user.entity';

jest.mock('argon2', () => ({ hash: jest.fn(async () => 'hashed-temp') }));
jest.mock('../../shared/utils/helpers', () => ({
  generateRandomCode: jest.fn(() => 'RANDOM12'),
}));

const baseData = {
  fullName: 'Alice Silva',
  cpf: '12345678900',
  email: 'alice@test.com',
  ddd: '11',
  phone: '999998888',
  city: 'São Paulo',
  state: 'SP',
  pixType: 'cpf',
  pixKey: '12345678900',
};

describe('OnboardingService', () => {
  let service: OnboardingService;
  let userRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => ({ id: 'new-user', ...x })),
      save: jest.fn(async (u) => u),
      increment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('registerUser', () => {
    it('should throw when the email is already registered', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 'existing' }); // email check
      await expect(service.registerUser('sponsor', baseData)).rejects.toThrow('Email já cadastrado');
    });

    it('should throw when the CPF is already registered', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce({ id: 'existing' }); // cpf check fails
      await expect(service.registerUser('sponsor', baseData)).rejects.toThrow('CPF já cadastrado');
    });

    it('should create the user, concat phone, and increment the sponsor direct count', async () => {
      const result = await service.registerUser('sponsor-1', { ...baseData, quotaCount: 5 });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.phone).toBe('11999998888');
      expect(created.sponsorId).toBe('sponsor-1');
      expect(created.referralCode).toBe('CIANO-RANDOM12');
      expect(created.passwordHash).toBe('hashed-temp');
      expect(userRepo.save).toHaveBeenCalled();
      expect(userRepo.increment).toHaveBeenCalledWith({ id: 'sponsor-1' }, 'directCount', 1);
      expect(result).toMatchObject({
        name: 'Alice Silva',
        email: 'alice@test.com',
        referralCode: 'CIANO-RANDOM12',
        temporaryPassword: 'RANDOM12',
      });
    });

    it('should treat a split quota purchase correctly (no purchasedQuotas, no lastPurchaseDate)', async () => {
      await service.registerUser('sponsor', { ...baseData, quotaCount: 4, quotaType: 'split' });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.splitQuotas).toBe(4);
      expect(created.purchasedQuotas).toBe(0);
      expect(created.quotaBalance).toBe(4);
      expect(created.isActive).toBe(true);
      expect(created.lastPurchaseDate).toBeUndefined();
    });

    it('should set lastPurchaseDate for a regular (non-split) quota purchase', async () => {
      await service.registerUser('sponsor', { ...baseData, quotaCount: 3 });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.purchasedQuotas).toBe(3);
      expect(created.splitQuotas).toBe(0);
      expect(created.lastPurchaseDate).toBeInstanceOf(Date);
    });

    it('should register an inactive member when no quotas are bought', async () => {
      await service.registerUser('sponsor', { ...baseData });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.quotaBalance).toBe(0);
      expect(created.isActive).toBe(false);
      expect(created.lastPurchaseDate).toBeUndefined();
    });
  });
});
