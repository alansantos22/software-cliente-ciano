<template>
  <div class="split-ticker" :class="urgencyClass">
    <div class="split-ticker__inner">
      <!-- Left: price -->
      <div class="split-ticker__price-block">
        <span class="split-ticker__label">Valor Atual da Cota</span>
        <span class="split-ticker__price">
          <span class="split-ticker__price-dot" />
          {{ formatCurrency(currentPrice) }}
          <span class="split-ticker__trend">▲ {{ changePercent }}%</span>
        </span>
      </div>

      <!-- Center: progress bar -->
      <div class="split-ticker__progress-block">
        <div class="split-ticker__progress-header">
          <span class="split-ticker__progress-label">
            Progresso para {{ nextEvent }}
          </span>
          <span class="split-ticker__progress-value">{{ progress }}%</span>
        </div>
        <div class="split-ticker__bar-track">
          <div
            class="split-ticker__bar-fill"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <p class="split-ticker__microcopy">
          <font-awesome-icon icon="bolt" /> Faltam apenas
          <strong>{{ quotasRemaining }} cotas</strong>
          para a virada de preço!
        </p>
      </div>

      <!-- Right: CTA -->
      <div class="split-ticker__action">
        <button class="split-ticker__btn" @click="$emit('buy')">
          <font-awesome-icon icon="cart-shopping" />
          Comprar Agora
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    currentPrice: number;
    progress: number;
    nextEvent?: string;
    quotasRemaining?: number;
    changePercent?: number;
  }>(),
  {
    nextEvent: 'Aumento de Preço',
    quotasRemaining: 48,
    changePercent: 12.5,
  }
);

defineEmits<{ buy: [] }>();

const urgencyClass = computed(() => {
  if (props.progress >= 90) return 'split-ticker--critical';
  if (props.progress >= 70) return 'split-ticker--warning';
  return '';
});

function formatCurrency(value: number): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return 'R$ 0';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(1.4); }
}

@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.split-ticker {
  background: linear-gradient(135deg, var(--neutral-900) 0%, #0d1f2d 100%);
  border-bottom: 2px solid var(--primary-700);
  border-radius: $radius-lg $radius-lg;
  margin: 0 0 $spacing-6;
  transition: border-color 0.3s;

  &--warning {
    border-bottom-color: var(--color-warning);
    .split-ticker__bar-fill { background: var(--color-warning); }
  }

  &--critical {
    border-bottom-color: var(--color-error);
    border-bottom-width: 3px;
    .split-ticker__bar-fill {
      background: linear-gradient(90deg, var(--color-warning), var(--color-error));
      animation: shimmer 1.5s infinite linear;
      background-size: 400px 100%;
    }
  }

  &__inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: $spacing-3 $spacing-6;
    display: flex;
    align-items: center;
    gap: $spacing-8;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
      padding: $spacing-3 $spacing-4;
    }
  }

  /* ── Price block ── */
  &__price-block {
    @include flex-column;
    gap: 2px;
    min-width: 180px;
  }

  &__label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--neutral-400);
  }

  &__price {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: 1.375rem;
    font-weight: 700;
    color: #fff;
  }

  &__price-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-success);
    animation: pulse-dot 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }

  &__trend {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-success-light);
    background: rgba(var(--success-rgb), 0.15);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* ── Progress block ── */
  &__progress-block {
    flex: 1;
  }

  &__progress-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $spacing-2;
  }

  &__progress-label {
    font-size: 0.8125rem;
    color: var(--neutral-300);
  }

  &__progress-value {
    font-size: 0.875rem;
    font-weight: 700;
    color: #fff;
  }

  &__bar-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-400), var(--primary-200));
    border-radius: 999px;
    transition: width 0.8s ease;
  }

  &__microcopy {
    margin-top: $spacing-1;
    font-size: 0.75rem;
    color: var(--neutral-400);

    strong {
      color: var(--accent-400);
      font-weight: 600;
    }
  }

  /* ── Action ── */
  &__action {
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-5;
    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
    color: #fff;
    border: none;
    border-radius: $radius-md;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(var(--primary-500-rgb), 0.45);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
