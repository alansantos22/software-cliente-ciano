<template>
  <div class="not-found">
    <div class="not-found__content">
      <h1 class="not-found__title">404</h1>
      <p class="not-found__text">{{ t('common.pageNotFound') || 'Página não encontrada' }}</p>
      <router-link to="/dashboard" class="not-found__link">
        {{ t('common.back') || 'Voltar' }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.not-found {
  @include flex-center;
  min-height: 100vh;
  background: $bg-secondary;

  &__content {
    text-align: center;
  }

  &__title {
    font-size: 6rem;
    font-weight: 700;
    color: $primary-500;
    margin-bottom: $spacing-4;
  }

  &__text {
    font-size: 1.5rem;
    color: $text-secondary;
    margin-bottom: $spacing-6;
  }

  &__link {
    display: inline-block;
    padding: $spacing-3 $spacing-6;
    background: $primary-500;
    color: white;
    border-radius: $radius-md;
    transition: background $transition-fast;

    &:hover {
      background: $primary-600;
      text-decoration: none;
    }
  }
}
</style>
