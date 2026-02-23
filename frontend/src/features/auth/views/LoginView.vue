<template>
  <div class="login-page">

    <!-- ══ ESQUERDA: Formulário (40%) ══════════════════════════ -->
    <section class="login-page__form-panel">
      <div class="login-panel">

        <!-- Marca -->
        <div class="login-panel__brand">
          <img src="@/assets/logo.svg" alt="Ciano" class="login-panel__logo" />
          <span class="login-panel__brand-name">Ciano</span>
        </div>

        <!-- Cabeçalho de boas-vindas -->
        <div class="login-panel__heading">
          <h1 class="login-panel__title">Bem-vindo de volta,&nbsp;investidor</h1>
          <p class="login-panel__subtitle">Acesse seu painel e acompanhe seus rendimentos</p>
        </div>

        <!-- Alerta de erro -->
        <DsAlert v-if="error" type="error" dismissible @dismiss="error = ''">
          {{ error }}
        </DsAlert>

        <!-- Formulário -->
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
            class="login-form__submit"
          >
            Acessar minha conta
          </DsButton>
        </form>

        <!-- Selo de segurança -->
        <div class="login-panel__trust">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Ambiente seguro e criptografado</span>
        </div>

        <!-- Rodapé cadastro -->
        <div class="login-panel__footer">
          <p>
            Ainda não é sócio?
            <RouterLink to="/register">Cadastre-se e conheça os planos</RouterLink>
          </p>
        </div>

        <!-- Credenciais demo — apenas em desenvolvimento -->
        <div v-if="isDev" class="login-panel__demo">
          <span class="login-panel__demo-badge">DEV</span>
          <p><strong>admin@ciano.com</strong> · qualquer senha</p>
        </div>

      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { DsInput, DsButton, DsAlert } from '@/design-system';
import { mockAuthenticate, mockTokens, mockDelay, type MockUser } from '@/mocks';

const router    = useRouter();
const authStore = useAuthStore();

// ── Modo desenvolvimento ──────────────────────────────────────
const isDev = import.meta.env.DEV;

// ── Estado do formulário ──────────────────────────────────────
const isLoading = ref(false);
const error     = ref('');
const errors    = reactive({ email: '', password: '' });

const form = reactive({
  email:      '',
  password:   '',
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
@use '@/assets/scss/colors'  as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins'  as *;

// ═══════════════════════════════════════════════════════════════
// WRAPPER
// ═══════════════════════════════════════════════════════════════
.login-page {
  min-height: 100vh;
  background: $bg-secondary;
  @include flex-center;
  padding: $spacing-8 $spacing-4;
}

// ═══════════════════════════════════════════════════════════════
// PAINEL — Formulário
// ═══════════════════════════════════════════════════════════════
.login-page__form-panel {
  background: $bg-primary;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  padding: $spacing-8;
  width: 100%;
  max-width: 460px;
}

.login-panel {
  width: 100%;
  max-width: 400px;
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

  // ── Demo (somente DEV) ──
  &__demo {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-4;
    background: $neutral-100;
    border: 1px dashed $neutral-300;
    border-radius: 8px;
    font-size: 0.8125rem;
    color: $text-secondary;
  }

  &__demo-badge {
    flex-shrink: 0;
    background: $warning;
    color: #fff;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: 4px;
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMULÁRIO
// ═══════════════════════════════════════════════════════════════
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
    user-select: none;

    input { accent-color: $primary-500; }
  }

  &__forgot {
    color: $primary-600;
    text-decoration: none;
    font-weight: 500;

    &:hover { text-decoration: underline; }
  }

  &__submit { width: 100%; margin-top: $spacing-1; }
}


</style>
