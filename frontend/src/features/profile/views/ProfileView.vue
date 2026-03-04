<template>
  <div class="profile-view">
    <!-- Header -->
    <DsCard>
      <div class="profile-view__header">
        <div class="profile-view__avatar-section">
          <div :class="['profile-view__avatar', `profile-view__avatar--${user?.partnerLevel || 'socio'}`]">
            {{ userInitials }}
          </div>
          <div class="profile-view__identity">
            <h2 class="profile-view__name">{{ user?.fullName }}</h2>
            <div class="profile-view__badges">
              <DsBadge :variant="levelBadgeVariant" size="md">
                {{ t(`partnerLevels.${user?.partnerLevel || 'socio'}`) }}
              </DsBadge>
              <DsBadge v-if="user?.title && user.title !== 'none'" :variant="titleBadgeVariant" size="sm">
                {{ t(`titles.${user.title}`) }}
              </DsBadge>
              <DsBadge :variant="user?.isActive ? 'success' : 'error'" size="sm">
                {{ user?.isActive ? t('profile.active') : t('profile.inactive') }}
              </DsBadge>
            </div>
          </div>
        </div>

        <div class="profile-view__referral">
          <span class="profile-view__referral-label">{{ t('profile.referralCode') }}</span>
          <div class="profile-view__referral-value">
            <code>{{ user?.referralCode || '---' }}</code>
            <DsCopyButton
              v-if="user?.referralCode"
              :text="referralLink"
              :tooltip-text="t('profile.copyReferralLink')"
            />
          </div>
        </div>
      </div>
    </DsCard>

    <!-- Dados Pessoais -->
    <DsCard>
      <template #header>
        <div class="profile-view__section-header">
          <font-awesome-icon icon="user" class="profile-view__section-icon" />
          <span>{{ t('profile.personalData') }}</span>
        </div>
      </template>

      <form class="profile-view__form" @submit.prevent="savePersonalData">
        <div class="profile-view__grid">
          <DsInput
            v-model="form.fullName"
            :label="t('profile.fullName')"
            :placeholder="t('profile.fullNamePlaceholder')"
            :disabled="!editing"
            required
          />
          <DsInput
            v-model="form.email"
            :label="t('profile.email')"
            type="email"
            :placeholder="t('profile.emailPlaceholder')"
            :disabled="!editing"
            required
          />
          <DsInput
            v-model="form.cpf"
            :label="t('profile.cpf')"
            :placeholder="t('profile.cpfPlaceholder')"
            disabled
            :hint="t('profile.cpfHint')"
          />
          <DsInput
            v-model="form.phone"
            :label="t('profile.phone')"
            type="tel"
            :placeholder="t('profile.phonePlaceholder')"
            :disabled="!editing"
          />
          <DsInput
            v-model="form.city"
            :label="t('profile.city')"
            :placeholder="t('profile.cityPlaceholder')"
            :disabled="!editing"
          />
          <DsInput
            v-model="form.state"
            :label="t('profile.state')"
            :placeholder="t('profile.statePlaceholder')"
            :disabled="!editing"
          />
        </div>

        <div class="profile-view__actions">
          <template v-if="editing">
            <DsButton variant="ghost" @click="cancelEdit">
              {{ t('common.cancel') }}
            </DsButton>
            <DsButton variant="primary" type="submit" :loading="saving">
              <template #icon><font-awesome-icon icon="check" /></template>
              {{ t('common.save') }}
            </DsButton>
          </template>
          <DsButton v-else variant="outline" @click="startEdit">
            <template #icon><font-awesome-icon icon="pen" /></template>
            {{ t('common.edit') }}
          </DsButton>
        </div>
      </form>
    </DsCard>

    <!-- Dados Financeiros -->
    <DsCard>
      <template #header>
        <div class="profile-view__section-header">
          <font-awesome-icon icon="wallet" class="profile-view__section-icon" />
          <span>{{ t('profile.financialData') }}</span>
        </div>
      </template>

      <form class="profile-view__form" @submit.prevent="saveFinancialData">
        <div class="profile-view__grid profile-view__grid--single">
          <DsInput
            v-model="form.pixKey"
            :label="t('profile.pixKey')"
            :placeholder="t('profile.pixKeyPlaceholder')"
            :disabled="!editingPix"
            :hint="t('profile.pixKeyHint')"
          />
        </div>

        <div class="profile-view__actions">
          <template v-if="editingPix">
            <DsButton variant="ghost" @click="cancelPixEdit">
              {{ t('common.cancel') }}
            </DsButton>
            <DsButton variant="primary" type="submit" :loading="savingPix">
              <template #icon><font-awesome-icon icon="check" /></template>
              {{ t('common.save') }}
            </DsButton>
          </template>
          <DsButton v-else variant="outline" @click="startPixEdit">
            <template #icon><font-awesome-icon icon="pen" /></template>
            {{ t('common.edit') }}
          </DsButton>
        </div>
      </form>
    </DsCard>

    <!-- Informações da Conta -->
    <DsCard>
      <template #header>
        <div class="profile-view__section-header">
          <font-awesome-icon icon="circle-info" class="profile-view__section-icon" />
          <span>{{ t('profile.accountInfo') }}</span>
        </div>
      </template>

      <div class="profile-view__info-grid">
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.accountType') }}</span>
          <span class="profile-view__info-value">
            {{ user?.role === 'admin' ? t('profile.administrator') : t('profile.partner') }}
          </span>
        </div>
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.partnerLevel') }}</span>
          <span class="profile-view__info-value">
            <DsBadge :variant="levelBadgeVariant" size="sm">
              {{ t(`partnerLevels.${user?.partnerLevel || 'socio'}`) }}
            </DsBadge>
          </span>
        </div>
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.currentTitle') }}</span>
          <span class="profile-view__info-value">
            {{ t(`titles.${user?.title || 'none'}`) }}
          </span>
        </div>
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.purchasedQuotas') }}</span>
          <span class="profile-view__info-value profile-view__info-value--highlight">
            {{ user?.purchasedQuotas || 0 }}
          </span>
        </div>
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.splitQuotas') }}</span>
          <span class="profile-view__info-value">
            {{ user?.splitQuotas || 0 }}
          </span>
        </div>
        <div class="profile-view__info-item">
          <span class="profile-view__info-label">{{ t('profile.totalQuotas') }}</span>
          <span class="profile-view__info-value profile-view__info-value--highlight">
            {{ (user?.purchasedQuotas || 0) + (user?.splitQuotas || 0) }}
          </span>
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
import { ref, computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/shared/stores/auth.store';
import { DsCard, DsInput, DsButton, DsBadge, DsCopyButton, DsAlert } from '@/design-system';

const { t } = useI18n();
const authStore = useAuthStore();

const user = computed(() => authStore.user);

const userInitials = computed(() => {
  const fullName = user.value?.fullName || 'U';
  return fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
});

const referralLink = computed(() => {
  const code = user.value?.referralCode || '';
  return `${window.location.origin}/invite/${code}`;
});

const levelBadgeVariant = computed(() => {
  const map: Record<string, 'primary' | 'info' | 'warning' | 'secondary'> = {
    socio: 'primary',
    platinum: 'info',
    vip: 'warning',
    imperial: 'secondary',
  };
  return map[user.value?.partnerLevel || 'socio'] || 'primary';
});

const titleBadgeVariant = computed(() => {
  const map: Record<string, 'default' | 'warning' | 'info' | 'primary'> = {
    bronze: 'default',
    silver: 'info',
    gold: 'warning',
    diamond: 'primary',
  };
  return map[user.value?.title || 'none'] || 'default';
});

// === Edição de Dados Pessoais ===
const editing = ref(false);
const saving = ref(false);

const form = reactive({
  fullName: '',
  email: '',
  cpf: '',
  phone: '',
  city: '',
  state: '',
  pixKey: '',
});

function loadFormData() {
  if (user.value) {
    form.fullName = user.value.fullName;
    form.email = user.value.email;
    form.cpf = user.value.cpf;
    form.phone = user.value.phone;
    form.city = user.value.city;
    form.state = user.value.state;
    form.pixKey = user.value.pixKey;
  }
}

watch(user, loadFormData, { immediate: true });

function startEdit() {
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  loadFormData();
}

async function savePersonalData() {
  saving.value = true;
  // Mock: simula delay de API
  await new Promise(resolve => setTimeout(resolve, 1000));
  saving.value = false;
  editing.value = false;
  showFeedback('success', t('profile.saveSuccess'));
}

// === Edição PIX ===
const editingPix = ref(false);
const savingPix = ref(false);

function startPixEdit() {
  editingPix.value = true;
}

function cancelPixEdit() {
  editingPix.value = false;
  loadFormData();
}

async function saveFinancialData() {
  savingPix.value = true;
  await new Promise(resolve => setTimeout(resolve, 1000));
  savingPix.value = false;
  editingPix.value = false;
  showFeedback('success', t('profile.pixSaveSuccess'));
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

.profile-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  // ── Header Card ──
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-6;
    flex-wrap: wrap;
  }

  &__avatar-section {
    display: flex;
    align-items: center;
    gap: $spacing-5;
  }

  &__avatar {
    @include flex-center;
    width: 72px;
    height: 72px;
    border-radius: $radius-full;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    background: var(--primary-500);
    flex-shrink: 0;
    border: 3px solid transparent;

    &--socio { background: var(--level-socio); }
    &--platinum { background: #8e8e8e; border-color: var(--level-platinum); color: var(--neutral-800); }
    &--vip { background: var(--level-vip); border-color: #e6ad06; }
    &--imperial { background: var(--level-imperial); border-color: #a020a0; }
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__name {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  &__badges {
    display: flex;
    gap: $spacing-2;
    flex-wrap: wrap;
  }

  &__referral {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    align-items: flex-end;

    @media (max-width: 600px) {
      align-items: flex-start;
      width: 100%;
    }
  }

  &__referral-label {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    font-weight: 500;
  }

  &__referral-value {
    display: flex;
    align-items: center;
    gap: $spacing-2;

    code {
      background: var(--bg-tertiary);
      padding: $spacing-1 $spacing-3;
      border-radius: $radius-md;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--primary-700);
      letter-spacing: 0.5px;
    }
  }

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

  // ── Form ──
  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-6;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-4;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }

    &--single {
      grid-template-columns: 1fr;
      max-width: 480px;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
  }

  // ── Info Grid ──
  &__info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-4;

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__info-item {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    padding: $spacing-4;
    background: var(--bg-secondary);
    border-radius: $radius-md;
  }

  &__info-label {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    font-weight: 500;
  }

  &__info-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);

    &--highlight {
      color: var(--primary-600);
    }
  }
}
</style>
