<template>
  <div class="register-page">
    <div class="register-panel">

      <!-- Marca -->
      <div class="register-panel__brand">
        <img src="@/assets/logo.svg" alt="Ciano" class="register-panel__logo" />
        <span class="register-panel__brand-name">Ciano</span>
      </div>

      <!-- Cabeçalho -->
      <div class="register-panel__heading">
        <h1 class="register-panel__title">Crie sua conta</h1>
        <p class="register-panel__subtitle">
          Preencha os dados abaixo. Sua conta será ativada após a aquisição de uma cota.
        </p>
      </div>

      <!-- Alerta -->
      <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsAlert v-if="success" type="success">
        Cadastro realizado! Redirecionando para o login…
      </DsAlert>

      <!-- Formulário -->
      <form class="register-form" @submit.prevent="handleRegister">

        <!-- Nome completo -->
        <DsInput
          v-model="form.fullName"
          type="text"
          label="Nome completo"
          placeholder="João da Silva"
          :error="errors.fullName"
          required
        />

        <!-- E-mail -->
        <DsInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          :error="errors.email"
          required
        />

        <!-- CPF + Telefone lado a lado -->
        <div class="register-form__row">
          <DsInput
            v-model="form.cpf"
            type="text"
            label="CPF"
            placeholder="000.000.000-00"
            :error="errors.cpf"
            required
          />
          <DsInput
            v-model="form.phone"
            type="text"
            label="Telefone"
            placeholder="(00) 00000-0000"
            :error="errors.phone"
          />
        </div>

        <!-- Senha + Confirmar -->
        <DsInput
          v-model="form.password"
          type="password"
          label="Senha"
          placeholder="Mínimo 8 caracteres"
          :error="errors.password"
          required
        />
        <DsInput
          v-model="form.confirmPassword"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          :error="errors.confirmPassword"
          required
        />

        <!-- Código de indicação (opcional) -->
        <DsInput
          v-model="form.referralCode"
          type="text"
          label="Código de indicação (opcional)"
          placeholder="Ex: CIANO-XXXX"
          :error="errors.referralCode"
          :readonly="isReferralLocked"
        />
        <p v-if="isReferralLocked" class="register-form__referral-hint">
          🌟 Você foi convidado por um patrocinador Ciano.
        </p>

        <DsButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          class="register-form__submit"
        >
          Criar conta
        </DsButton>
      </form>

      <!-- Selo de segurança -->
      <div class="register-panel__trust">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Ambiente seguro e criptografado</span>
      </div>

      <!-- Rodapé -->
      <div class="register-panel__footer">
        <p>Já tem conta? <RouterLink to="/login">Entrar</RouterLink></p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { mockDelay } from '@/mocks';

const router = useRouter();
const route  = useRoute();

const isLoading = ref(false);
const error     = ref('');
const success   = ref(false);

const form = reactive({
  fullName:        '',
  email:           '',
  cpf:             '',
  phone:           '',
  password:        '',
  confirmPassword: '',
  referralCode:    '',
});

// Pré-preenche o código de convite vindo da URL (?ref=CODIGO)
const isReferralLocked = computed(() => !!route.query.ref);

onMounted(() => {
  const refCode = route.query.ref;
  if (refCode && typeof refCode === 'string') {
    form.referralCode = refCode;
  }
});

const errors = reactive({
  fullName:        '',
  email:           '',
  cpf:             '',
  phone:           '',
  password:        '',
  confirmPassword: '',
  referralCode:    '',
});

function validate(): boolean {
  let valid = true;

  // Limpar
  Object.keys(errors).forEach((k) => ((errors as Record<string, string>)[k] = ''));

  if (!form.fullName.trim()) {
    errors.fullName = 'Nome é obrigatório';
    valid = false;
  }

  if (!form.email) {
    errors.email = 'E-mail é obrigatório';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'E-mail inválido';
    valid = false;
  }

  if (!form.cpf) {
    errors.cpf = 'CPF é obrigatório';
    valid = false;
  }

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

async function handleRegister() {
  error.value = '';
  if (!validate()) return;

  isLoading.value = true;

  try {
    // Simulação — substituir pela chamada real à API quando disponível
    await mockDelay(900);
    success.value = true;
    setTimeout(() => router.push('/login'), 2000);
  } catch {
    error.value = 'Erro ao realizar cadastro. Tente novamente.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

// ═══════════════════════════════════════════════════════════════
// WRAPPER
// ═══════════════════════════════════════════════════════════════
.register-page {
  min-height: 100vh;
  background: $bg-secondary;
  @include flex-center;
  padding: $spacing-8 $spacing-4;
}

// ═══════════════════════════════════════════════════════════════
// PAINEL — Formulário
// ═══════════════════════════════════════════════════════════════
.register-panel {
  background: $bg-primary;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  padding: $spacing-8;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  // ── Marca ──
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

  // ── Títulos ──
  &__heading {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__title {
    font-size: 1.625rem;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.25;
    margin: 0;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: $text-secondary;
    margin: 0;
    line-height: 1.5;
  }

  // ── Selo de segurança ──
  &__trust {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    color: $text-tertiary;
    font-size: 0.8125rem;
    justify-content: center;

    svg { color: $success; }
  }

  // ── Rodapé ──
  &__footer {
    text-align: center;
    color: $text-secondary;
    font-size: 0.9rem;
    margin: 0;

    a {
      color: $primary-600;
      text-decoration: none;
      font-weight: 600;

      &:hover { text-decoration: underline; }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMULÁRIO
// ═══════════════════════════════════════════════════════════════
.register-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-4;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__submit { width: 100%; margin-top: $spacing-1; }

  &__referral-hint {
    margin-top: calc(-1 * #{$spacing-2});
    font-size: 0.8125rem;
    color: $primary-700;
    background: $primary-50;
    border: 1px solid $primary-100;
    border-radius: 8px;
    padding: $spacing-2 $spacing-3;
  }
}
</style>
