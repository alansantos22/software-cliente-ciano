<template>
  <div class="reset-page">
    <div class="reset-panel">

      <!-- Marca -->
      <div class="reset-panel__brand">
        <img src="@/assets/logo.svg" alt="Ciano" class="reset-panel__logo" />
        <span class="reset-panel__brand-name">Ciano</span>
      </div>

      <!-- Cabeçalho -->
      <div class="reset-panel__heading">
        <h1 class="reset-panel__title">Redefinir senha</h1>
        <p class="reset-panel__subtitle">
          Escolha uma nova senha segura para sua conta.
        </p>
      </div>

      <!-- Alertas -->
      <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsAlert v-if="success" type="success">
        Senha alterada com sucesso! Redirecionando para o login…
      </DsAlert>

      <!-- Formulário -->
      <form v-if="!success" class="reset-form" @submit.prevent="handleSubmit">
        <DsInput
          v-model="form.password"
          type="password"
          label="Nova senha"
          placeholder="Mínimo 8 caracteres"
          :error="errors.password"
          required
        />

        <DsInput
          v-model="form.confirmPassword"
          type="password"
          label="Confirmar nova senha"
          placeholder="Repita a senha"
          :error="errors.confirmPassword"
          required
        />

        <!-- Strength indicator -->
        <div class="reset-form__strength">
          <div class="reset-form__strength-bar">
            <div
              class="reset-form__strength-fill"
              :style="{ width: `${strengthPercent}%` }"
              :class="`reset-form__strength-fill--${strengthLevel}`"
            />
          </div>
          <span :class="`reset-form__strength-label--${strengthLevel}`">
            {{ strengthLabel }}
          </span>
        </div>

        <DsButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          class="reset-form__submit"
        >
          Redefinir senha
        </DsButton>
      </form>

      <!-- Rodapé -->
      <div class="reset-panel__footer">
        <RouterLink to="/login" class="reset-panel__back">
          <font-awesome-icon icon="arrow-left" />
          Voltar ao login
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { mockDelay } from '@/mocks';

const route  = useRoute();
const router = useRouter();

const isLoading = ref(false);
const error     = ref('');
const success   = ref(false);

const form = reactive({
  password:        '',
  confirmPassword: '',
});

const errors = reactive({
  password:        '',
  confirmPassword: '',
});

// ── Password strength ────────────────────────────────────────────────────────
const strengthPercent = computed(() => {
  const p = form.password;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8)  score += 25;
  if (p.length >= 12) score += 10;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 25;
  if (/\d/.test(p))       score += 20;
  if (/[^a-zA-Z0-9]/.test(p)) score += 20;
  return Math.min(score, 100);
});

const strengthLevel = computed<'weak' | 'fair' | 'strong'>(() => {
  if (strengthPercent.value < 40) return 'weak';
  if (strengthPercent.value < 70) return 'fair';
  return 'strong';
});

const strengthLabel = computed(() => {
  if (!form.password) return '';
  if (strengthLevel.value === 'weak')   return 'Fraca';
  if (strengthLevel.value === 'fair')   return 'Razoável';
  return 'Forte';
});

// ── Validation ────────────────────────────────────────────────────────────────
function validate(): boolean {
  let valid = true;
  errors.password = '';
  errors.confirmPassword = '';

  if (!form.password) {
    errors.password = 'Senha é obrigatória';
    valid = false;
  } else if (form.password.length < 8) {
    errors.password = 'Mínimo de 8 caracteres';
    valid = false;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirme a senha';
    valid = false;
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'As senhas não coincidem';
    valid = false;
  }

  return valid;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  error.value = '';
  if (!validate()) return;

  isLoading.value = true;

  try {
    // Token from URL would be sent to API
    const _token = route.params.token;
    await mockDelay(800);
    success.value = true;
    setTimeout(() => router.push('/login'), 2000);
  } catch {
    error.value = 'Erro ao redefinir senha. O link pode ter expirado.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

.reset-page {
  min-height: 100vh;
  background: $bg-secondary;
  @include flex-center;
  padding: $spacing-8 $spacing-4;
}

.reset-panel {
  background: $bg-primary;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  padding: $spacing-8;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  &__brand {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  &__brand-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: $primary-700;
    letter-spacing: -0.03em;
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__title {
    font-size: 1.625rem;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: $text-secondary;
    margin: 0;
    line-height: 1.5;
  }

  &__footer {
    text-align: center;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: $spacing-2;
    color: $primary-600;
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__submit {
    width: 100%;
    margin-top: $spacing-1;
  }

  // ── Strength indicator ──
  &__strength {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin-top: calc(-1 * #{$spacing-2});
  }

  &__strength-bar {
    flex: 1;
    height: 4px;
    background: $bg-tertiary;
    border-radius: 2px;
    overflow: hidden;
  }

  &__strength-fill {
    height: 100%;
    transition: width 0.3s ease, background 0.3s ease;
    border-radius: 2px;

    &--weak   { background: $error; }
    &--fair   { background: $warning; }
    &--strong { background: $success; }
  }

  &__strength-label {
    &--weak   { color: $error;  font-size: 0.8125rem; font-weight: 600; }
    &--fair   { color: $warning; font-size: 0.8125rem; font-weight: 600; }
    &--strong { color: $success; font-size: 0.8125rem; font-weight: 600; }
  }
}
</style>
