<template>
  <div class="hero-card">
    <div class="hero-card__glow" />
    <div class="hero-card__header">
      <span class="hero-card__label">Ganhos da Rede</span>
      <span class="hero-card__icon">
        <font-awesome-icon icon="money-bill-wave" />
      </span>
    </div>

    <div class="hero-card__value">{{ formattedValue }}</div>

    <div class="hero-card__footer">
      <span class="hero-card__trend">
        <font-awesome-icon icon="arrow-trend-up" />
        {{ trend }}
      </span>
      <span class="hero-card__period">esse mês</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: number;
  trend?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: '+0%',
});

const formattedValue = computed(() =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(props.value),
);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.hero-card {
  position: relative;
  overflow: hidden;
  border-radius: $radius-lg;
  padding: $spacing-6;
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 30%, #ffd700 65%, #ffe066 100%);
  box-shadow: 0 8px 32px rgba(212, 160, 23, 0.45);
  color: #1a0e00;

  &__glow {
    position: absolute;
    top: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    pointer-events: none;
  }

  &__header {
    @include flex-between;
    margin-bottom: $spacing-3;
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.8;
  }

  &__icon {
    font-size: 1.25rem;
    opacity: 0.75;
  }

  &__value {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: $spacing-4;
    letter-spacing: -0.02em;

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: 0.8125rem;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.15);
    padding: 2px $spacing-2;
    border-radius: $radius-full;
  }

  &__period {
    opacity: 0.7;
  }
}
</style>
