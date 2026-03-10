<template>
  <Teleport to="body">
    <div class="mgr-setup">
      <div class="mgr-setup__card">

        <!-- Ícone -->
        <div class="mgr-setup__icon-wrap">
          <font-awesome-icon icon="shield-halved" class="mgr-setup__icon" />
        </div>

        <!-- Título -->
        <h1 class="mgr-setup__title">Configurar Senha Gerente</h1>
        <p class="mgr-setup__subtitle">
          Bem-vindo à Área de Gestão Protegida do Grupo Ciano.
        </p>

        <!-- Aviso de segurança -->
        <div class="mgr-setup__warning">
          <font-awesome-icon icon="triangle-exclamation" />
          <div>
            <strong>Atenção — leia antes de continuar</strong>
            <p>
              Esta senha é <em>diferente</em> da sua senha de acesso ao sistema e funciona
              como uma <strong>passphrase de cofre</strong>. Ela protege operações críticas como
              alteração de cotas, troca de patrocinador e exclusão de cadastros.
            </p>
            <p>Guarde-a em local seguro — <strong>não é possível recuperá-la.</strong></p>
          </div>
        </div>

        <!-- Formulário -->
        <form class="mgr-setup__form" @submit.prevent="handleSubmit" novalidate>
          <DsInput
            v-model="password"
            label="Nova Senha Gerente"
            type="password"
            placeholder="Mínimo 8 caracteres"
            :error="errors.password"
            autocomplete="new-password"
          />
          <DsInput
            v-model="confirmPassword"
            label="Confirmar Senha Gerente"
            type="password"
            placeholder="Repita a senha acima"
            :error="errors.confirm"
            autocomplete="new-password"
          />
          <DsButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="loading"
            :disabled="loading"
          >
            <template #icon>
              <font-awesome-icon icon="lock" />
            </template>
            Ativar Área de Gestão
          </DsButton>
        </form>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { DsInput, DsButton } from '@/design-system';
import { useAdminManagerStore } from '@/shared/stores/adminManager.store';

const store = useAdminManagerStore();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errors = reactive({ password: '', confirm: '' });

function validate(): boolean {
  errors.password = '';
  errors.confirm = '';

  if (password.value.length < 8) {
    errors.password = 'A senha deve ter no mínimo 8 caracteres.';
    return false;
  }
  if (password.value !== confirmPassword.value) {
    errors.confirm = 'As senhas não coincidem.';
    return false;
  }
  return true;
}

async function handleSubmit() {
  if (!validate()) return;
  loading.value = true;
  try {
    await store.setPassword(password.value);
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/mixins' as *;
@use '@/assets/scss/spacing' as *;

.mgr-setup {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  @include flex-center;
  padding: 1.5rem;

  &__card {
    background: var(--bg-primary);
    border-radius: 1rem;
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  &__icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-600, $primary-800);
    @include flex-center;
    box-shadow: 0 8px 24px rgba($primary-700, 0.4);
  }

  &__icon {
    font-size: 2rem;
    color: #fff;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    margin: 0;
  }

  &__subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-align: center;
    margin: -0.5rem 0 0;
  }

  &__warning {
    display: flex;
    gap: 0.75rem;
    background: rgba($warning, 0.12);
    border: 1px solid rgba($warning, 0.35);
    border-radius: 0.5rem;
    padding: 1rem;
    width: 100%;
    color: var(--text-primary);

    .svg-inline--fa {
      color: $warning;
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.2rem;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    strong {
      font-size: 0.875rem;
    }

    p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;

    .ds-button {
      margin-top: 0.25rem;
      width: 100%;
    }
  }
}
</style>
