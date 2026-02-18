<template>
  <div :class="['ds-stat-card', { 'ds-stat-card--clickable': clickable }]" @click="handleClick">
    <div class="ds-stat-card__header">
      <span class="ds-stat-card__label">{{ label }}</span>
      <span class="ds-stat-card__icon">
        <slot name="icon">{{ icon }}</slot>
      </span>
    </div>

    <div class="ds-stat-card__value" :class="{ 'ds-stat-card__value--currency': isCurrency }">
      {{ formattedValue }}
    </div>

    <div v-if="subtitle || $slots.subtitle" class="ds-stat-card__subtitle">
      <slot name="subtitle">{{ subtitle }}</slot>
    </div>

    <div v-if="trend !== undefined" :class="['ds-stat-card__trend', trendClass]">
      <span class="ds-stat-card__trend-icon">{{ trendIcon }}</span>
      <span>{{ Math.abs(trend) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: number | string;
  icon?: string;
  subtitle?: string;
  trend?: number;
  isCurrency?: boolean;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isCurrency: false,
  clickable: false,
});

const emit = defineEmits<{
  click: [];
}>();

const formattedValue = computed(() => {
  if (props.isCurrency && typeof props.value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(props.value);
  }
  return props.value;
});

const trendClass = computed(() => {
  if (props.trend === undefined) return '';
  return props.trend > 0 ? 'ds-stat-card__trend--up' : props.trend < 0 ? 'ds-stat-card__trend--down' : '';
});

const trendIcon = computed(() => {
  if (props.trend === undefined) return '';
  return props.trend > 0 ? '↑' : props.trend < 0 ? '↓' : '→';
});

function handleClick() {
  if (props.clickable) {
    emit('click');
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.ds-stat-card {
  @include card;
  padding: $spacing-5;

  &--clickable {
    cursor: pointer;
    transition: transform $transition-fast, box-shadow $transition-fast;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-lg;
    }
  }

  &__header {
    @include flex-between;
    margin-bottom: $spacing-2;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  &__icon {
    font-size: 1.5rem;
  }

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.2;

    &--currency {
      color: $primary-600;
    }
  }

  &__subtitle {
    margin-top: $spacing-2;
    font-size: 0.875rem;
    color: $text-secondary;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    margin-top: $spacing-3;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-full;
    font-size: 0.8125rem;
    font-weight: 500;

    &--up {
      background: rgba($success, 0.15);
      color: $success-dark;
    }

    &--down {
      background: rgba($error, 0.15);
      color: $error-dark;
    }

    &-icon {
      font-size: 0.875rem;
    }
  }
}
</style>
