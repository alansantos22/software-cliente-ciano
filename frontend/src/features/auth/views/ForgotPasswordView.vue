<template>
  <div class="forgot-page">
    <div class="forgot-panel">

      <!-- Marca -->
      <div class="forgot-panel__brand">
        <img src="@/assets/logo.svg" alt="Ciano" class="forgot-panel__logo" />
        <span class="forgot-panel__brand-name">Ciano</span>
      </div>

      <!-- Cabeçalho -->
      <div class="forgot-panel__heading">
        <h1 class="forgot-panel__title">Esqueceu sua senha?</h1>
        <p class="forgot-panel__subtitle">
          Informe seu e-mail e enviaremos um link para redefinir a senha.
        </p>
      </div>

      <!-- Alertas -->
      <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsAlert v-if="sent" type="success">
        <strong>E-mail enviado!</strong> Verifique sua caixa de entrada (e spam) para o link de recuperação.
      </DsAlert>

      <!-- Formulário -->
      <form v-if="!sent" class="forgot-form" @submit.prevent="handleSubmit">
        <DsInput
          v-model="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          :error="emailError"
          required
        />

        <DsButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          class="forgot-form__submit"
        >
          Enviar link de recuperação
        </DsButton>
      </form>

      <!-- Botão de reenvio (pós-sucesso) -->
      <div v-if="sent" class="forgot-panel__resend">
        <p>Não recebeu?</p>
        <DsButton
          variant="outline"
          size="md"
          :disabled="resendCooldown > 0"
          @click="handleSubmit"
        >
          {{ resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail' }}
        </DsButton>
      </div>

      <!-- Rodapé -->
      <div class="forgot-panel__footer">
        <RouterLink to="/login" class="forgot-panel__back">
          <font-awesome-icon icon="arrow-left" />
          Voltar ao login
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { authService } from '@/shared/services/auth.service';

const email = ref('');
const emailError = ref('');
const error = ref('');
const isLoading = ref(false);
const sent = ref(false);
const resendCooldown = ref(0);

let cooldownTimer: ReturnType<typeof setInterval> | null = null;

function startCooldown() {
  resendCooldown.value = 60;
  cooldownTimer = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

async function handleSubmit() {
  emailError.value = '';
  error.value = '';

  if (!email.value) {
    emailError.value = 'E-mail é obrigatório';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'E-mail inválido';
    return;
  }

  isLoading.value = true;

  try {
    await authService.forgotPassword(email.value);
    sent.value = true;
    startCooldown();
  } catch {
    error.value = 'Erro ao enviar e-mail. Tente novamente.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

.forgot-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  @include flex-center;
  padding: $spacing-8 $spacing-4;
}

.forgot-panel {
  background: var(--bg-primary);
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
    color: var(--primary-700);
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
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.9375rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  &__resend {
    display: flex;
    align-items: center;
    gap: $spacing-3;

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  }

  &__footer {
    text-align: center;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: $spacing-2;
    color: var(--primary-600);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__submit {
    width: 100%;
    margin-top: $spacing-1;
  }
}
</style>
