<template>
  <div class="forgot-password-view">
    <div class="forgot-password-view__container">
      <h1>{{ t('auth.forgotPassword') }}</h1>
      <p>Digite seu e-mail para receber o link de recuperação.</p>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-field">
          <label for="email">{{ t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.email')"
            required
          />
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? t('common.loading') : t('auth.sendResetLink') }}
        </button>
      </form>

      <router-link to="/login" class="back-link">
        {{ t('auth.backToLogin') }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const email = ref('');
const isLoading = ref(false);

async function handleSubmit() {
  isLoading.value = true;
  // TODO: Implement forgot password
  setTimeout(() => {
    isLoading.value = false;
    alert('E-mail de recuperação enviado!');
  }, 1000);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.forgot-password-view {
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
      margin-bottom: $spacing-2;
    }

    p {
      color: $text-secondary;
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
  margin-bottom: $spacing-4;

  &:hover:not(:disabled) {
    background: $primary-600;
  }
}

.back-link {
  color: $primary-600;

  &:hover {
    text-decoration: underline;
  }
}
</style>
