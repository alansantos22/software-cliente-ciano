<template>
  <div class="reset-password-view">
    <div class="reset-password-view__container">
      <h1>{{ t('auth.resetPassword') }}</h1>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-field">
          <label for="password">{{ t('auth.newPassword') }}</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
          />
        </div>

        <div class="form-field">
          <label for="confirmPassword">{{ t('auth.confirmPassword') }}</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
          />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? t('common.loading') : t('auth.resetPassword') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const isLoading = ref(false);
const form = reactive({
  password: '',
  confirmPassword: '',
});

async function handleSubmit() {
  if (form.password !== form.confirmPassword) {
    alert('As senhas não conferem!');
    return;
  }

  isLoading.value = true;
  // TODO: Implement reset password API call
  console.log('Token:', route.params.token);
  setTimeout(() => {
    isLoading.value = false;
    alert('Senha alterada com sucesso!');
    router.push('/login');
  }, 1000);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.reset-password-view {
  @include flex-center;
  min-height: 100vh;
  background: linear-gradient(135deg, $primary-700 0%, $primary-500 100%);
  padding: $spacing-4;

  &__container {
    width: 100%;
    max-width: 400px;
    background: $bg-primary;
    border-radius: $radius-xl;
    padding: $spacing-8;
    box-shadow: $shadow-xl;
    text-align: center;

    h1 {
      font-size: 1.5rem;
      margin-bottom: $spacing-6;
    }
  }
}

.form-field {
  margin-bottom: $spacing-4;
  text-align: left;

  label {
    display: block;
    margin-bottom: $spacing-2;
    font-weight: 500;
  }

  input {
    @include input-base;
  }
}

button {
  @include button-base;
  width: 100%;
  height: $button-height-lg;
  background: $primary-500;
  color: white;

  &:hover:not(:disabled) {
    background: $primary-600;
  }
}
</style>
