<template>
  <div class="checkout-confirmation-view">
    <h1>{{ t('checkout.congratulations') }}</h1>
    <p>{{ t('checkout.orderCreated') }}</p>
    <p class="placeholder">Transaction ID: {{ route.params.transactionId }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;

.checkout-confirmation-view {
  padding: $spacing-6;
  text-align: center;

  h1 {
    font-size: 2rem;
    color: $success;
    margin-bottom: $spacing-4;
  }
}

.placeholder {
  padding: $spacing-4;
  background: $neutral-100;
  border-radius: 8px;
  margin-top: $spacing-4;
}
</style>
