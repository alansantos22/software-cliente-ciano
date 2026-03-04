<template>
  <div class="settings-view">

    <!-- ① Aparência -->
    <DsCard>
      <template #header>
        <div class="settings-view__section-header">
          <font-awesome-icon icon="palette" class="settings-view__section-icon" />
          <span>{{ t('settings.appearance') }}</span>
        </div>
      </template>

      <div class="settings-view__option">
        <div class="settings-view__option-info">
          <span class="settings-view__option-label">{{ t('settings.theme') }}</span>
          <span class="settings-view__option-desc">{{ t('settings.themeDesc') }}</span>
        </div>
        <div class="settings-view__theme-toggle">
          <button
            :class="['settings-view__theme-btn', { 'settings-view__theme-btn--active': !hasManualTheme }]"
            @click="setAutoTheme"
          >
            <font-awesome-icon icon="desktop" />
            Auto
          </button>
          <button
            :class="['settings-view__theme-btn', { 'settings-view__theme-btn--active': hasManualTheme && appStore.theme === 'light' }]"
            @click="appStore.setTheme('light')"
          >
            <font-awesome-icon icon="sun" />
            {{ t('settings.light') }}
          </button>
          <button
            :class="['settings-view__theme-btn', { 'settings-view__theme-btn--active': hasManualTheme && appStore.theme === 'dark' }]"
            @click="appStore.setTheme('dark')"
          >
            <font-awesome-icon icon="moon" />
            {{ t('settings.dark') }}
          </button>
        </div>
      </div>
    </DsCard>

    <!-- ② Idioma -->
    <DsCard>
      <template #header>
        <div class="settings-view__section-header">
          <font-awesome-icon icon="globe" class="settings-view__section-icon" />
          <span>{{ t('settings.language') }}</span>
        </div>
      </template>

      <div class="settings-view__option">
        <div class="settings-view__option-info">
          <span class="settings-view__option-label">{{ t('settings.selectLanguage') }}</span>
          <span class="settings-view__option-desc">{{ t('settings.languageDesc') }}</span>
        </div>
        <div class="settings-view__language-options">
          <button
            v-for="lang in languages"
            :key="lang.code"
            :class="['settings-view__lang-btn', { 'settings-view__lang-btn--active': appStore.locale === lang.code }]"
            @click="changeLocale(lang.code)"
          >
            <span class="settings-view__lang-flag">{{ lang.flag }}</span>
            <span class="settings-view__lang-name">{{ lang.name }}</span>
          </button>
        </div>
      </div>
    </DsCard>

    <!-- ③ Segurança -->
    <DsCard>
      <template #header>
        <div class="settings-view__section-header">
          <font-awesome-icon icon="shield-halved" class="settings-view__section-icon" />
          <span>{{ t('settings.security') }}</span>
        </div>
      </template>

      <form class="settings-view__form" @submit.prevent="changePassword">
        <div class="settings-view__form-grid">
          <DsInput
            v-model="passwordForm.currentPassword"
            :label="t('settings.currentPassword')"
            type="password"
            :placeholder="t('settings.currentPasswordPlaceholder')"
            :error="passwordErrors.currentPassword"
            required
          />
          <DsInput
            v-model="passwordForm.newPassword"
            :label="t('settings.newPassword')"
            type="password"
            :placeholder="t('settings.newPasswordPlaceholder')"
            :error="passwordErrors.newPassword"
            :hint="t('settings.passwordHint')"
            required
          />
          <DsInput
            v-model="passwordForm.confirmPassword"
            :label="t('settings.confirmNewPassword')"
            type="password"
            :placeholder="t('settings.confirmPasswordPlaceholder')"
            :error="passwordErrors.confirmPassword"
            required
          />
        </div>

        <div class="settings-view__actions">
          <DsButton variant="primary" type="submit" :loading="savingPassword">
            <template #icon><font-awesome-icon icon="lock" /></template>
            {{ t('settings.changePassword') }}
          </DsButton>
        </div>
      </form>
    </DsCard>

    <!-- ④ Notificações -->
    <DsCard>
      <template #header>
        <div class="settings-view__section-header">
          <font-awesome-icon icon="bell" class="settings-view__section-icon" />
          <span>{{ t('settings.notifications') }}</span>
        </div>
      </template>

      <div class="settings-view__notifications">
        <div
          v-for="(pref, key) in notificationPrefs"
          :key="key"
          class="settings-view__notif-item"
        >
          <div class="settings-view__option-info">
            <span class="settings-view__option-label">{{ pref.label }}</span>
            <span class="settings-view__option-desc">{{ pref.desc }}</span>
          </div>
          <label class="settings-view__toggle">
            <input
              type="checkbox"
              v-model="pref.enabled"
              class="settings-view__toggle-input"
              @change="saveNotificationPrefs"
            />
            <span class="settings-view__toggle-slider" />
          </label>
        </div>
      </div>
    </DsCard>

    <!-- Feedback -->
    <DsAlert v-if="feedback.show" :type="feedback.type" dismissible @dismiss="feedback.show = false">
      {{ feedback.message }}
    </DsAlert>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/shared/stores/app.store';
import { DsCard, DsInput, DsButton, DsAlert } from '@/design-system';

const { t, locale } = useI18n();
const appStore = useAppStore();

// === Tema ===
const hasManualTheme = computed(() => !!localStorage.getItem('theme'));

function setAutoTheme() {
  localStorage.removeItem('theme');
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  appStore.setTheme(systemDark ? 'dark' : 'light');
  // Re-remove localStorage since setTheme saves it
  localStorage.removeItem('theme');
  showFeedback('success', t('settings.themeAuto') || 'Tema automático ativado');
}

// === Idioma ===
const languages = [
  { code: 'pt-BR' as const, name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en' as const, name: 'English', flag: '🇺🇸' },
];

function changeLocale(code: 'pt-BR' | 'en') {
  appStore.setLocale(code);
  locale.value = code;
  showFeedback('success', t('settings.languageChanged'));
}

// === Segurança ===
const savingPassword = ref(false);

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

function validatePasswordForm(): boolean {
  let valid = true;
  passwordErrors.currentPassword = '';
  passwordErrors.newPassword = '';
  passwordErrors.confirmPassword = '';

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = t('settings.fieldRequired');
    valid = false;
  }
  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = t('settings.fieldRequired');
    valid = false;
  } else if (passwordForm.newPassword.length < 8) {
    passwordErrors.newPassword = t('auth.passwordMinLength');
    valid = false;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    valid = false;
  }
  return valid;
}

async function changePassword() {
  if (!validatePasswordForm()) return;

  savingPassword.value = true;
  // Mock: simula delay de API
  await new Promise(resolve => setTimeout(resolve, 1200));
  savingPassword.value = false;
  passwordForm.currentPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  showFeedback('success', t('settings.passwordChanged'));
}

// === Notificações ===
const notificationPrefs = reactive({
  payments: {
    label: t('settings.notifPayments'),
    desc: t('settings.notifPaymentsDesc'),
    enabled: true,
  },
  network: {
    label: t('settings.notifNetwork'),
    desc: t('settings.notifNetworkDesc'),
    enabled: true,
  },
  promotions: {
    label: t('settings.notifPromotions'),
    desc: t('settings.notifPromotionsDesc'),
    enabled: false,
  },
  system: {
    label: t('settings.notifSystem'),
    desc: t('settings.notifSystemDesc'),
    enabled: true,
  },
});

function saveNotificationPrefs() {
  showFeedback('success', t('settings.notifSaved'));
}

// === Feedback ===
const feedback = reactive({
  show: false,
  type: 'success' as 'success' | 'error' | 'info' | 'warning',
  message: '',
});

function showFeedback(type: typeof feedback.type, message: string) {
  feedback.type = type;
  feedback.message = message;
  feedback.show = true;
  setTimeout(() => { feedback.show = false; }, 4000);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.settings-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  // ── Section Header ──
  &__section-header {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__section-icon {
    color: var(--primary-500);
    font-size: 1.125rem;
  }

  // ── Option Row ──
  &__option {
    @include flex-between;
    gap: $spacing-4;
    flex-wrap: wrap;
  }

  &__option-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__option-label {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  &__option-desc {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
  }

  // ── Theme Toggle ──
  &__theme-toggle {
    display: flex;
    border: 1px solid var(--border-default);
    border-radius: $radius-lg;
    overflow: hidden;
  }

  &__theme-btn {
    @include flex-center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-4;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s ease;

    &:hover {
      background: var(--bg-tertiary);
    }

    &--active {
      background: var(--primary-500);
      color: white;

      &:hover {
        background: var(--primary-600);
      }
    }
  }

  // ── Language Options ──
  &__language-options {
    display: flex;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  &__lang-btn {
    @include flex-center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: $radius-lg;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--primary-300);
      background: var(--primary-50);
    }

    &--active {
      border-color: var(--primary-500);
      background: var(--primary-50);
    }
  }

  &__lang-flag {
    font-size: 1.25rem;
  }

  &__lang-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  // ── Form ──
  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-6;
  }

  &__form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-4;
    max-width: 480px;
  }

  &__actions {
    display: flex;
    justify-content: flex-start;
    gap: $spacing-3;
  }

  // ── Notifications ──
  &__notifications {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__notif-item {
    @include flex-between;
    gap: $spacing-4;
    padding: $spacing-4 0;
    border-bottom: 1px solid var(--border-light);

    &:last-child {
      border-bottom: none;
    }
  }

  // ── Toggle Switch ──
  &__toggle {
    position: relative;
    display: inline-flex;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;

    &:checked + .settings-view__toggle-slider {
      background: var(--primary-500);

      &::before {
        transform: translateX(20px);
      }
    }

    &:focus + .settings-view__toggle-slider {
      box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.2);
    }
  }

  &__toggle-slider {
    width: 44px;
    height: 24px;
    background: var(--neutral-300);
    border-radius: $radius-full;
    transition: background 0.2s ease;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: $radius-full;
      transition: transform 0.2s ease;
      box-shadow: var(--shadow-sm);
    }
  }
}
</style>
