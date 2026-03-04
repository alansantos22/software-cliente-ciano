<template>
  <div :class="['ds-card', `ds-card--${variant}`]">
    <div v-if="$slots.header" class="ds-card__header">
      <slot name="header" />
    </div>

    <div class="ds-card__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="ds-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'elevated' | 'outlined';
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-card {
  background: var(--bg-primary);
  border-radius: $radius-lg;
  overflow: hidden;

  &--default {
    box-shadow: var(--shadow-md);
  }

  &--elevated {
    box-shadow: var(--shadow-xl);
  }

  &--outlined {
    box-shadow: none;
    border: 1px solid var(--border-default);
  }

  &__header {
    padding: $spacing-4 $spacing-6;
    border-bottom: 1px solid var(--border-light);
    font-weight: 600;
  }

  &__body {
    padding: $spacing-6;
  }

  &__footer {
    padding: $spacing-4 $spacing-6;
    border-top: 1px solid var(--border-light);
    background: var(--bg-secondary);
  }
}
</style>
