<template>
  <div class="register-new-user-view">
    <h1>{{ t('onboarding.registerMember') }}</h1>
    <p class="placeholder">🚧 Cadastro de Membro em construção - Etapa 2 do TODO</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;

.register-new-user-view {
  padding: $spacing-6;

  h1 {
    font-size: 1.75rem;
    margin-bottom: $spacing-6;
  }
}

.placeholder {
  text-align: center;
  padding: $spacing-8;
  background: $neutral-100;
  border-radius: 12px;
  color: $text-secondary;
}
</style>
