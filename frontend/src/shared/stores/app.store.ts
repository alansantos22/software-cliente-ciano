import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false);
  const isSidebarOpen = ref(true);
  const locale = ref<'pt-BR' | 'en'>('pt-BR');
  const theme = ref<'light' | 'dark'>('light');

  // Actions
  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value;
  }

  function setLocale(newLocale: 'pt-BR' | 'en') {
    locale.value = newLocale;
    localStorage.setItem('locale', newLocale);
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  function loadPreferences() {
    const storedLocale = localStorage.getItem('locale') as 'pt-BR' | 'en' | null;
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (storedLocale) {
      locale.value = storedLocale;
    }

    if (storedTheme) {
      theme.value = storedTheme;
      document.documentElement.setAttribute('data-theme', storedTheme);
    }
  }

  return {
    // State
    isLoading,
    isSidebarOpen,
    locale,
    theme,
    // Actions
    setLoading,
    toggleSidebar,
    setLocale,
    setTheme,
    loadPreferences,
  };
});
