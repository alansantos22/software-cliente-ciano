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
    applyTheme(newTheme);
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light');
  }

  function applyTheme(t: 'light' | 'dark') {
    const root = document.documentElement;
    // Add transition class for smooth switching
    root.setAttribute('data-theme-transition', '');
    root.setAttribute('data-theme', t);
    // Remove transition class after animation completes
    setTimeout(() => root.removeAttribute('data-theme-transition'), 350);
  }

  function detectSystemTheme(): 'light' | 'dark' {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function loadPreferences() {
    const storedLocale = localStorage.getItem('locale') as 'pt-BR' | 'en' | null;
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (storedLocale) {
      locale.value = storedLocale;
    }

    if (storedTheme) {
      // User has explicit preference — use it
      theme.value = storedTheme;
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      // No stored preference — detect from OS
      const systemTheme = detectSystemTheme();
      theme.value = systemTheme;
      document.documentElement.setAttribute('data-theme', systemTheme);
    }

    // Listen for OS theme changes (applies only when user hasn't set a manual preference)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          const newTheme = e.matches ? 'dark' : 'light';
          theme.value = newTheme;
          applyTheme(newTheme);
        }
      });
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
    toggleTheme,
    loadPreferences,
  };
});
