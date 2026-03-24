import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserRole } from '../../shared/interfaces/enums';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  verify: jest.fn(),
}));

const mockUser: Partial<User> = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  name: 'Test User',
  cpf: '123.456.789-00',
  phone: '11999999999',
  city: 'São Paulo',
  state: 'SP',
  pixKey: 'test@pix.com',
  role: UserRole.USER,
  referralCode: 'CIANO-ABC123',
  isActive: true,
  sponsorId: null,
  purchasedQuotas: 0,
  splitQuotas: 0,
  quotaBalance: 0,
  totalEarnings: 0,
  lastPurchaseDate: null,
};

function makeUserRepo(overrides: Partial<ReturnType<typeof makeUserRepo>> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockReturnValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
    increment: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeRefreshRepo(overrides: object = {}) {
  return {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue({ id: 'refresh-id', token: 'refresh-token', expiresAt: new Date() }),
    save: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeResetRepo(overrides: object = {}) {
  return {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue({}),
    save: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof makeUserRepo>;
  let refreshRepo: ReturnType<typeof makeRefreshRepo>;
  let resetRepo: ReturnType<typeof makeResetRepo>;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userRepo = makeUserRepo();
    refreshRepo = makeRefreshRepo();
    resetRepo = makeResetRepo();
    jwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };
    configService = { get: jest.fn().mockReturnValue('7d') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: resetRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      refreshRepo.create.mockReturnValue({ token: 'rt', expiresAt: new Date(Date.now() + 86400000) });
      refreshRepo.save.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'secret123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'noone@example.com', password: 'x' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login({ email: 'test@example.com', password: 'x' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'senha123',
      name: 'New User',
      cpf: '987.654.321-00',
      phone: '11888888888',
      city: 'Rio',
      state: 'RJ',
      pixKey: 'new@pix.com',
    };

    it('should create a new user and return tokens', async () => {
      userRepo.findOne.mockResolvedValue(null); // no conflict
      userRepo.create.mockReturnValue({ ...mockUser, email: dto.email });
      userRepo.save.mockResolvedValue({ ...mockUser, email: dto.email });
      refreshRepo.create.mockReturnValue({ token: 'rt', expiresAt: new Date(Date.now() + 86400000) });
      refreshRepo.save.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepo.findOne.mockResolvedValueOnce(mockUser); // email conflict

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if CPF already exists', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null)    // email ok
        .mockResolvedValueOnce(mockUser); // cpf conflict

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid referral code', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // email ok
        .mockResolvedValueOnce(null) // cpf ok
        .mockResolvedValueOnce(null); // referral not found

      await expect(service.register({ ...dto, referralCode: 'INVALID' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should increment sponsor directCount when registering with valid referral', async () => {
      const sponsor = { ...mockUser, id: 'sponsor-id', referralCode: 'CIANO-VALID1' };
      userRepo.findOne
        .mockResolvedValueOnce(null)   // email ok
        .mockResolvedValueOnce(null)   // cpf ok
        .mockResolvedValueOnce(sponsor); // valid referral
      userRepo.create.mockReturnValue({ ...mockUser, sponsorId: sponsor.id });
      userRepo.save.mockResolvedValue({ ...mockUser, sponsorId: sponsor.id });
      refreshRepo.create.mockReturnValue({ token: 'rt', expiresAt: new Date(Date.now() + 86400000) });
      refreshRepo.save.mockResolvedValue({});

      await service.register({ ...dto, referralCode: 'CIANO-VALID1' });

      expect(userRepo.increment).toHaveBeenCalledWith({ id: sponsor.id }, 'directCount', 1);
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      refreshRepo.findOne.mockResolvedValue({
        token: 'valid-refresh-token',
        revokedAt: null,
        expiresAt: futureDate,
        user: mockUser,
      });
      refreshRepo.create.mockReturnValue({ token: 'new-rt', expiresAt: futureDate });
      refreshRepo.save.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      refreshRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'bad-token' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      refreshRepo.findOne.mockResolvedValue({
        token: 'expired-token',
        revokedAt: null,
        expiresAt: pastDate,
        user: mockUser,
      });

      await expect(service.refresh({ refreshToken: 'expired-token' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should always return success message (prevent email enumeration)', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'ghost@example.com' });
      expect(result.message).toContain('link de recuperação');
    });

    it('should create a reset token when user exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      resetRepo.create.mockReturnValue({ token: 'reset-token', expiresAt: new Date() });
      resetRepo.save.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(resetRepo.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  // ─── resetPassword ───────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('should change password and mark token as used', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      resetRepo.findOne.mockResolvedValue({
        token: 'valid-token',
        usedAt: null,
        expiresAt: futureDate,
        userId: mockUser.id,
      });
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      resetRepo.save.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', newPassword: 'newpass' });

      expect(userRepo.save).toHaveBeenCalled();
      expect(result.message).toContain('Senha redefinida');
    });

    it('should throw BadRequestException for invalid or used token', async () => {
      resetRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'bad', newPassword: 'x' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      resetRepo.findOne.mockResolvedValue({
        token: 'expired',
        usedAt: null,
        expiresAt: pastDate,
        userId: mockUser.id,
      });

      await expect(service.resetPassword({ token: 'expired', newPassword: 'x' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token if found', async () => {
      const storedToken = { token: 'rt', revokedAt: null };
      refreshRepo.findOne.mockResolvedValue(storedToken);
      refreshRepo.save.mockResolvedValue({});

      const result = await service.logout('rt');

      expect(refreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
      expect(result.message).toContain('Logout realizado');
    });

    it('should return success even if token not found', async () => {
      refreshRepo.findOne.mockResolvedValue(null);

      const result = await service.logout('nonexistent-token');

      expect(result.message).toContain('Logout realizado');
      expect(refreshRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── getMe ───────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should return sanitized user data', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getMe('user-uuid-1');

      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
