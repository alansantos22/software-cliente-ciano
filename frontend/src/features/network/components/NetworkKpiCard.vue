<template>
  <div :class="['kpi-card', variant && `kpi-card--${variant}`]">
    <div class="kpi-card__header">
      <span class="kpi-card__label">{{ label }}</span>
      <span class="kpi-card__icon">
        <slot name="icon" />
      </span>
    </div>

    <div class="kpi-card__value">{{ value }}</div>

    <div v-if="trendText" class="kpi-card__trend">
      <font-awesome-icon :icon="trendUp ? 'arrow-trend-up' : 'arrow-trend-down'" />
      {{ trendText }}
    </div>

    <div v-if="subtitle" class="kpi-card__subtitle">{{ subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value: string | number;
  trendText?: string;
  trendUp?: boolean;
  subtitle?: string;
  variant?: 'default' | 'alert' | 'success';
}

withDefaults(defineProps<Props>(), {
  trendUp: true,
  variant: 'default',
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.kpi-card {
  background: $bg-primary;
  border-radius: $radius-lg;
  padding: $spacing-5 $spacing-6;
  box-shadow: $shadow-md;
  border-left: 4px solid transparent;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: $shadow-lg;
    transform: translateY(-1px);
  }

  &--alert {
    border-left-color: $warning;

    .kpi-card__value {
      color: $warning-dark;
    }
  }

  &--success {
    border-left-color: $success;

    .kpi-card__value {
      color: $success-dark;
    }
  }

  &__header {
    @include flex-between;
    margin-bottom: $spacing-2;
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__icon {
    font-size: 1.125rem;
    color: $text-tertiary;
  }

  &__value {
    font-size: 1.75rem;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.1;
    margin-bottom: $spacing-2;
    letter-spacing: -0.02em;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    font-size: 0.8125rem;
    font-weight: 600;
    color: $success-dark;
    background: $secondary-50;
    padding: 2px $spacing-2;
    border-radius: $radius-full;
  }

  &__subtitle {
    font-size: 0.8125rem;
    color: $text-tertiary;
    margin-top: $spacing-1;
  }
}
</style>
