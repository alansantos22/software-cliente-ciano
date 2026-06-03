import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';

jest.mock('argon2', () => ({
  hash: jest.fn(async () => 'hashed'),
  verify: jest.fn(async () => true),
}));

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    name: 'User',
    email: 'u1@test.com',
    passwordHash: 'stored-hash',
    ...over,
  }) as unknown as User;

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (u) => u),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getProfile', () => {
    it('should throw when the user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(BadRequestException);
    });

    it('should strip the passwordHash from the returned profile', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.getProfile('u1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({ id: 'u1', email: 'u1@test.com' });
    });
  });

  describe('updateProfile', () => {
    it('should persist changes and return the fresh profile', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ name: 'New Name' }));

      const result = await service.updateProfile('u1', { name: 'New Name' });

      expect(userRepo.update).toHaveBeenCalledWith('u1', { name: 'New Name' });
      expect(result).toMatchObject({ name: 'New Name' });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('updatePassword', () => {
    it('should throw when the user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.updatePassword('missing', 'a', 'b')).rejects.toThrow('não encontrado');
    });

    it('should throw when the current password is incorrect', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.updatePassword('u1', 'wrong', 'new')).rejects.toThrow('Senha atual incorreta');
    });

    it('should hash and save the new password on success', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.updatePassword('u1', 'current', 'new');

      expect(argon2.hash).toHaveBeenCalledWith('new');
      expect(user.passwordHash).toBe('new-hash');
      expect(userRepo.save).toHaveBeenCalledWith(user);
      expect(result.message).toContain('sucesso');
    });
  });

  describe('updatePix', () => {
    it('should update the PIX key fields', async () => {
      const result = await service.updatePix('u1', 'cpf', '12345678900');

      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        pixKeyType: 'cpf',
        pixKey: '12345678900',
      });
      expect(result.message).toContain('sucesso');
    });
  });
});
