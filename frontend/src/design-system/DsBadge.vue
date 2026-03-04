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
    background: var(--neutral-200);
    color: var(--text-secondary);
  }

  &--primary {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  &--secondary {
    background: var(--secondary-100);
    color: var(--secondary-700);
  }

  &--success {
    background: rgba(var(--success-rgb), 0.15);
    color: var(--color-success-dark);
  }

  &--warning {
    background: rgba(var(--warning-rgb), 0.15);
    color: var(--color-warning-dark);
  }

  &--error {
    background: rgba(var(--error-rgb), 0.15);
    color: var(--color-error-dark);
  }

  &--info {
    background: rgba(var(--info-rgb), 0.15);
    color: var(--color-info-dark);
  }
}
</style>
