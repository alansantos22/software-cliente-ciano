import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService } from '@/shared/services/auth.service';

export interface User {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  city: string;
  state: string;
  pixKey: string;
  role: 'user' | 'admin';
  referralCode: string;
  isActive: boolean;
  /** Data da última compra de cota. Conta expira 6 meses após esta data. */
  lastPurchaseDate?: string | null;
  title: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  partnerLevel: 'socio' | 'platinum' | 'vip' | 'imperial';
  /**
   * Cotas compradas diretamente (DEFINEM O NÍVEL do usuário).
   * ⚠️ Usar este campo para verificar/exibir nível e progresso de nível.
   */
  purchasedQuotas: number;
  /**
   * Cotas recebidas via split.
   * ⚠️ NÃO contam para nível — apenas para cálculo de dividendos.
   */
  splitQuotas: number;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const userFullName = computed(() => user.value?.fullName || '');
  const userReferralCode = computed(() => user.value?.referralCode || '');

  // Actions
  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  function setUser(userData: User) {
    user.value = userData;
  }

  function clearAuth() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  function loadFromStorage() {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;
    }
  }

  async function fetchUser() {
    if (!accessToken.value) return;
    try {
      isLoading.value = true;
      const { data } = await authService.me();
      user.value = data;
    } catch {
      clearAuth();
    } finally {
      isLoading.value = false;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    const { data } = await authService.login({ email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    isLoading.value = false;
    return data;
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        await authService.logout(refreshToken.value);
      }
    } finally {
      clearAuth();
    }
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    // Getters
    isAuthenticated,
    isAdmin,
    userFullName,
    userReferralCode,
    // Actions
    setTokens,
    setUser,
    clearAuth,
    loadFromStorage,
    fetchUser,
    login,
    logout,
  };
});
