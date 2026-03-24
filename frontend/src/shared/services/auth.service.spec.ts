import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module before importing authService
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from './api';
import { authService } from './auth.service';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should POST to /auth/login with credentials', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { accessToken: 'token' } });

      await authService.login({ email: 'test@example.com', password: 'senha123' });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'senha123',
      });
    });

    it('should return the api response', async () => {
      const mockResponse = { data: { accessToken: 'jwt-token', user: { id: 'u1' } } };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.login({ email: 'x@x.com', password: 'pass' });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('register', () => {
    it('should POST to /auth/register with full payload', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      const payload = {
        name: 'João',
        cpf: '123.456.789-00',
        email: 'joao@example.com',
        phone: '11999999999',
        city: 'SP',
        state: 'SP',
        pixKey: 'joao@pix.com',
        password: 'senha123',
      };

      await authService.register(payload);

      expect(api.post).toHaveBeenCalledWith('/auth/register', payload);
    });

    it('should include optional referralCode when provided', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      const payload = {
        name: 'Maria',
        cpf: '987.654.321-00',
        email: 'maria@example.com',
        phone: '11888888888',
        city: 'RJ',
        state: 'RJ',
        pixKey: 'maria@pix.com',
        password: 'senha456',
        referralCode: 'CIANO-REF01',
      };

      await authService.register(payload);

      expect(api.post).toHaveBeenCalledWith('/auth/register', payload);
    });
  });

  describe('refresh', () => {
    it('should POST to /auth/refresh with the refresh token', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { accessToken: 'new-token' } });

      await authService.refresh('my-refresh-token');

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'my-refresh-token',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should POST to /auth/forgot-password with the email', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await authService.forgotPassword('user@example.com');

      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should POST to /auth/reset-password with token and new password', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await authService.resetPassword('reset-token-123', 'newpassword');

      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token-123',
        newPassword: 'newpassword',
      });
    });
  });

  describe('logout', () => {
    it('should POST to /auth/logout with the refresh token', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await authService.logout('my-refresh-token');

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'my-refresh-token',
      });
    });
  });

  describe('me', () => {
    it('should GET /auth/me', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { id: 'user-1', email: 'me@example.com' } });

      await authService.me();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should return the user data', async () => {
      const mockUser = { id: 'user-1', email: 'me@example.com', fullName: 'Test User' };
      vi.mocked(api.get).mockResolvedValue({ data: mockUser });

      const result = await authService.me();

      expect(result).toEqual({ data: mockUser });
    });
  });
});
