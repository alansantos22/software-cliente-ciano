import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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
  title: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  partnerLevel: 'socio' | 'platinum' | 'vip' | 'imperial';
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
  };
});
