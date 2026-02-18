<template>
  <div class="login-view">
    <div class="login-view__container">
      <div class="login-view__header">
        <img src="@/assets/logo.svg" alt="Ciano" class="login-view__logo" />
        <h1 class="login-view__title">Ciano</h1>
        <p class="login-view__subtitle">Sistema de Cotas para Pousadas</p>
      </div>

      <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>

      <form class="login-form" @submit.prevent="handleLogin">
        <DsInput
          v-model="form.email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          :error="errors.email"
          required
        />

        <DsInput
          v-model="form.password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          :error="errors.password"
          required
        />

        <div class="login-form__options">
          <label class="login-form__remember">
            <input v-model="form.rememberMe" type="checkbox" />
            <span>Lembrar-me</span>
          </label>
          <RouterLink to="/forgot-password" class="login-form__forgot">
            Esqueci minha senha
          </RouterLink>
        </div>

        <DsButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          style="width: 100%"
        >
          Entrar
        </DsButton>
      </form>

      <div class="login-view__footer">
        <p>Não tem conta? <RouterLink to="/register">Cadastre-se</RouterLink></p>
      </div>

      <!-- Demo credentials hint -->
      <div class="login-view__demo">
        <p><strong>Demo:</strong> admin@ciano.com / qualquer senha</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { mockAuthenticate, mockTokens, mockDelay, type MockUser } from '@/mocks';

const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(false);
const error = ref('');
const errors = reactive({
  email: '',
  password: '',
});

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
});

function validate(): boolean {
  errors.email = '';
  errors.password = '';

  if (!form.email) {
    errors.email = 'E-mail é obrigatório';
    return false;
  }

  if (!form.password) {
    errors.password = 'Senha é obrigatória';
    return false;
  }

  return true;
}

async function handleLogin() {
  error.value = '';

  if (!validate()) return;

  isLoading.value = true;

  try {
    await mockDelay(800);

    const user = mockAuthenticate(form.email, form.password);

    if (!user) {
      error.value = 'E-mail ou senha inválidos';
      isLoading.value = false;
      return;
    }

    // Set tokens
    authStore.setTokens(mockTokens.accessToken, mockTokens.refreshToken);

    // Transform mock user to auth user format
    authStore.setUser(transformUser(user));

    // Navigate to dashboard
    router.push('/dashboard');
  } catch (e) {
    error.value = 'Erro ao realizar login. Tente novamente.';
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

function transformUser(mockUser: MockUser) {
  return {
    id: mockUser.id,
    fullName: mockUser.name,
    email: mockUser.email,
    cpf: mockUser.cpf,
    phone: mockUser.phone,
    city: 'São Paulo',
    state: 'SP',
    pixKey: mockUser.email,
    role: mockUser.role as 'admin' | 'user',
    referralCode: mockUser.referralCode,
    isActive: mockUser.isActive,
    title: mockUser.title,
    partnerLevel: mockUser.partnerLevel,
  };
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.login-view {
  min-height: 100vh;
  @include flex-center;
  background: linear-gradient(135deg, $primary-500 0%, $secondary-500 100%);
  padding: $spacing-4;

  &__container {
    width: 100%;
    max-width: 420px;
    background: $bg-primary;
    border-radius: $radius-xl;
    box-shadow: $shadow-xl;
    padding: $spacing-8;
  }

  &__header {
    text-align: center;
    margin-bottom: $spacing-8;
  }

  &__logo {
    width: 80px;
    height: 80px;
    margin-bottom: $spacing-4;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    color: $primary-600;
    margin: 0 0 $spacing-2;
  }

  &__subtitle {
    color: $text-secondary;
    margin: 0;
  }

  &__footer {
    text-align: center;
    margin-top: $spacing-6;
    color: $text-secondary;

    a {
      color: $primary-600;
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__demo {
    margin-top: $spacing-4;
    padding: $spacing-3;
    background: $neutral-100;
    border-radius: $radius-md;
    text-align: center;
    font-size: 0.875rem;
    color: $text-tertiary;

    strong {
      color: $text-secondary;
    }
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__options {
    @include flex-between;
    font-size: 0.875rem;
  }

  &__remember {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    cursor: pointer;
    color: $text-secondary;

    input {
      accent-color: $primary-500;
    }
  }

  &__forgot {
    color: $primary-600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
