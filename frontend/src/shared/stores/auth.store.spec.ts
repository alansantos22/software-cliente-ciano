import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth.store';

// Mock the auth service
vi.mock('@/shared/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

import { authService } from '@/shared/services/auth.service';

const mockUser = {
  id: 'user-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  cpf: '123.456.789-00',
  phone: '11999999999',
  city: 'São Paulo',
  state: 'SP',
  pixKey: 'joao@pix.com',
  role: 'user' as const,
  referralCode: 'CIANO-ABC123',
  isActive: true,
  lastPurchaseDate: null,
  title: 'none' as const,
  partnerLevel: 'socio' as const,
  purchasedQuotas: 5,
  splitQuotas: 0,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ─── initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should start with null user and no tokens', () => {
      const store = useAuthStore();

      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('isAuthenticated should be false when no token', () => {
      const store = useAuthStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('isAdmin should be false initially', () => {
      const store = useAuthStore();
      expect(store.isAdmin).toBe(false);
    });
  });

  // ─── setTokens ──────────────────────────────────────────────────────────────

  describe('setTokens', () => {
    it('should save tokens to state and localStorage', () => {
      const store = useAuthStore();
      store.setTokens('access-123', 'refresh-456');

      expect(store.accessToken).toBe('access-123');
      expect(store.refreshToken).toBe('refresh-456');
      expect(localStorage.getItem('accessToken')).toBe('access-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
    });
  });

  // ─── setUser ────────────────────────────────────────────────────────────────

  describe('setUser', () => {
    it('should update user state', () => {
      const store = useAuthStore();
      store.setUser(mockUser);

      expect(store.user).toEqual(mockUser);
      expect(store.userFullName).toBe('João Silva');
      expect(store.userReferralCode).toBe('CIANO-ABC123');
    });
  });

  // ─── clearAuth ──────────────────────────────────────────────────────────────

  describe('clearAuth', () => {
    it('should clear state and localStorage', () => {
      const store = useAuthStore();
      store.setTokens('access-123', 'refresh-456');
      store.setUser(mockUser);

      store.clearAuth();

      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('isAuthenticated should be false after clearAuth', () => {
      const store = useAuthStore();
      store.setTokens('access-123', 'refresh-456');

      store.clearAuth();

      expect(store.isAuthenticated).toBe(false);
    });
  });

  // ─── loadFromStorage ────────────────────────────────────────────────────────

  describe('loadFromStorage', () => {
    it('should restore tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'stored-access');
      localStorage.setItem('refreshToken', 'stored-refresh');

      const store = useAuthStore();
      store.loadFromStorage();

      expect(store.accessToken).toBe('stored-access');
      expect(store.refreshToken).toBe('stored-refresh');
    });

    it('should not set tokens if localStorage is empty', () => {
      const store = useAuthStore();
      store.loadFromStorage();

      expect(store.accessToken).toBeNull();
      expect(store.refreshToken).toBeNull();
    });

    it('should not restore if only one token is present', () => {
      localStorage.setItem('accessToken', 'only-access');

      const store = useAuthStore();
      store.loadFromStorage();

      expect(store.accessToken).toBeNull();
    });
  });

  // ─── computed getters ───────────────────────────────────────────────────────

  describe('computed getters', () => {
    it('isAuthenticated should be true when accessToken is set', () => {
      const store = useAuthStore();
      store.setTokens('token', 'refresh');

      expect(store.isAuthenticated).toBe(true);
    });

    it('isAdmin should be true for admin role', () => {
      const store = useAuthStore();
      store.setUser({ ...mockUser, role: 'admin' });

      expect(store.isAdmin).toBe(true);
    });

    it('isAdmin should be false for user role', () => {
      const store = useAuthStore();
      store.setUser({ ...mockUser, role: 'user' });

      expect(store.isAdmin).toBe(false);
    });

    it('userFullName should return empty string when user is null', () => {
      const store = useAuthStore();
      expect(store.userFullName).toBe('');
    });

    it('userReferralCode should return empty string when user is null', () => {
      const store = useAuthStore();
      expect(store.userReferralCode).toBe('');
    });
  });

  // ─── login action ───────────────────────────────────────────────────────────

  describe('login', () => {
    it('should set tokens and user on successful login', async () => {
      const loginResponse = {
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: mockUser,
        },
      };
      vi.mocked(authService.login).mockResolvedValue(loginResponse as any);

      const store = useAuthStore();
      await store.login('joao@example.com', 'senha123');

      expect(store.accessToken).toBe('new-access');
      expect(store.refreshToken).toBe('new-refresh');
      expect(store.user).toEqual(mockUser);
      expect(store.isLoading).toBe(false);
    });

    it('should throw error on login failure', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Credenciais inválidas'));

      const store = useAuthStore();
      await expect(store.login('bad@email.com', 'wrong')).rejects.toThrow();
    });
  });

  // ─── logout action ──────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call authService.logout and clear auth state', async () => {
      vi.mocked(authService.logout).mockResolvedValue({} as any);

      const store = useAuthStore();
      store.setTokens('access', 'refresh-token');
      store.setUser(mockUser);

      await store.logout();

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
    });

    it('should still clearAuth even if authService.logout fails', async () => {
      vi.mocked(authService.logout).mockRejectedValue(new Error('network error'));

      const store = useAuthStore();
      store.setTokens('access', 'refresh-token');
      store.setUser(mockUser);

      // try/finally in the store propagates the error, but clearAuth still runs
      await store.logout().catch(() => {});

      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
    });

    it('should not call authService.logout when no refresh token', async () => {
      const store = useAuthStore();
      // No tokens set

      await store.logout();

      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  // ─── fetchUser action ───────────────────────────────────────────────────────

  describe('fetchUser', () => {
    it('should fetch and set user when token exists', async () => {
      vi.mocked(authService.me).mockResolvedValue({ data: mockUser } as any);

      const store = useAuthStore();
      store.setTokens('access', 'refresh');

      await store.fetchUser();

      expect(store.user).toEqual(mockUser);
      expect(store.isLoading).toBe(false);
    });

    it('should clear auth on fetchUser failure', async () => {
      vi.mocked(authService.me).mockRejectedValue(new Error('Unauthorized'));

      const store = useAuthStore();
      store.setTokens('access', 'refresh');

      await store.fetchUser();

      expect(store.user).toBeNull();
      expect(store.accessToken).toBeNull();
    });

    it('should not call authService.me when no token', async () => {
      const store = useAuthStore();

      await store.fetchUser();

      expect(authService.me).not.toHaveBeenCalled();
    });
  });
});
