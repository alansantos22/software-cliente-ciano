<template>
  <span :class="['ds-badge', `ds-badge--${variant}`, `ds-badge--${size}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;

.ds-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 9999px;
  white-space: nowrap;

  // === SIZES ===
  &--sm {
    padding: 2px $spacing-2;
    font-size: 0.75rem;
  }

  &--md {
    padding: $spacing-1 $spacing-3;
    font-size: 0.8125rem;
  }

  &--lg {
    padding: $spacing-2 $spacing-4;
    font-size: 0.875rem;
  }

  // === VARIANTS ===
  &--default {
    background: $neutral-200;
    color: $text-secondary;
  }

  &--primary {
    background: $primary-100;
    color: $primary-700;
  }

  &--secondary {
    background: $secondary-100;
    color: $secondary-700;
  }

  &--success {
    background: rgba($success, 0.15);
    color: $success-dark;
  }

  &--warning {
    background: rgba($warning, 0.15);
    color: $warning-dark;
  }

  &--error {
    background: rgba($error, 0.15);
    color: $error-dark;
  }

  &--info {
    background: rgba($info, 0.15);
    color: $info-dark;
  }
}
</style>
