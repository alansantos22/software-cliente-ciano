<template>
  <div class="order-confirmation">
    <div class="order-confirmation__hero">
      <p class="order-confirmation__eyebrow">Revise seu Upgrade</p>
      <h2 class="order-confirmation__title">
        Você está a um passo de se tornar
        <span class="title-level" :style="{ color: targetLevel.color }">
          {{ targetLevel.icon }} {{ targetLevel.label }}
        </span>
      </h2>
    </div>

    <!-- Impact cards -->
    <div class="impact-cards">
      <div class="impact-card impact-card--investment">
        <div class="impact-card__icon">💰</div>
        <div class="impact-card__body">
          <span class="impact-card__label">Você está investindo</span>
          <span class="impact-card__value">{{ formatCurrency(totalAmount) }}</span>
        </div>
      </div>

      <div class="impact-card impact-card--level">
        <div class="impact-card__icon">{{ targetLevel.icon }}</div>
        <div class="impact-card__body">
          <span class="impact-card__label">Seu novo status</span>
          <span class="impact-card__value" :style="{ color: targetLevel.color }">
            Sócio {{ targetLevel.label }}
          </span>
        </div>
      </div>

      <div class="impact-card impact-card--earnings">
        <div class="impact-card__icon">📈</div>
        <div class="impact-card__body">
          <span class="impact-card__label">Estimativa de ganhos/mês</span>
          <span class="impact-card__value">{{ formatCurrency(estimatedMonthly) }}</span>
          <span class="impact-card__sub">Baseado no histórico de dividendos</span>
        </div>
      </div>
    </div>

    <!-- Resumo detalhado -->
    <div class="order-confirmation__summary">
      <div class="summary-item">
        <span class="summary-item__label">Pacote</span>
        <span class="summary-item__value">{{ quotas }} {{ quotas === 1 ? 'cota' : 'cotas' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-item__label">Método de pagamento</span>
        <span class="summary-item__value">
          {{ methodLabels[paymentMethod] ?? paymentMethod }}
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-item__label">Total de cotas após compra</span>
        <span class="summary-item__value" :style="{ color: targetLevel.color }">
          {{ totalQuotas }} cotas
        </span>
      </div>
      <div class="summary-item summary-item--total">
        <span class="summary-item__label">Valor total</span>
        <span class="summary-item__value">{{ formatCurrency(totalAmount) }}</span>
      </div>
    </div>

    <!-- Termos -->
    <p class="order-confirmation__terms">
      Ao finalizar, você concorda com os Termos de Investimento do Grupo Ciano e confirma que as
      informações acima estão corretas.
    </p>

    <!-- Ações -->
    <div class="order-confirmation__actions">
      <DsButton variant="ghost" :disabled="isProcessing" @click="$emit('back')">
        ← Revisar pagamento
      </DsButton>

      <DsButton
        variant="primary"
        size="lg"
        :loading="isProcessing"
        class="order-confirmation__cta"
        @click="$emit('confirm')"
      >
        <span v-if="!isProcessing">
          {{ ctaLabel }}
        </span>
        <span v-else>Processando investimento...</span>
      </DsButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DsButton } from '@/design-system';

// ─── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  quotas: number;
  currentUserQuotas: number;
  quotaPrice: number;
  paymentMethod: string;
  isProcessing: boolean;
}>();

defineEmits<{
  confirm: [];
  back: [];
}>();

// ─── Levels ───────────────────────────────────────────────────────────────────
const levels = [
  { key: 'socio', label: 'Sócio', min: 1, icon: '🤝', color: '#00bcd4' },
  { key: 'platinum', label: 'Platinum', min: 10, icon: '✨', color: '#64748b' },
  { key: 'vip', label: 'VIP', min: 20, icon: '👑', color: '#b45309' },
  { key: 'imperial', label: 'Imperial', min: 60, icon: '💎', color: '#7c3aed' },
];

const methodLabels: Record<string, string> = {
  pix: '⚡ PIX (Aprovação Imediata)',
  credit: '💳 Cartão de Crédito',
  boleto: '📄 Boleto Bancário',
};

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalQuotas = computed(() => props.currentUserQuotas + props.quotas);
const totalAmount = computed(() => props.quotas * props.quotaPrice);

const targetLevel = computed(() => {
  return [...levels].reverse().find((l) => totalQuotas.value >= l.min) ?? levels[0];
});

// Estimated monthly based on 0.8% of invested capital (mock dividend rate)
const estimatedMonthly = computed(() => {
  const totalInvested = totalQuotas.value * props.quotaPrice;
  return totalInvested * 0.008;
});

const ctaLabel = computed(() => {
  const levelLabel = targetLevel.value.label;
  if (levelLabel === 'Sócio') return 'Garantir Minhas Cotas →';
  return `Garantir Minhas Cotas e Subir para ${levelLabel} →`;
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.order-confirmation {
  @include flex-column;
  gap: $spacing-6;
  max-width: 640px;
  margin: 0 auto;

  // ── Hero ──────────────────────────────────────────────────────────────────
  &__hero {
    text-align: center;
  }

  &__eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $primary-600;
    margin-bottom: $spacing-2;
  }

  &__title {
    font-size: 1.6rem;
    font-weight: 700;
    color: $neutral-900;
    line-height: 1.3;

    .title-level {
      display: inline-block;
    }
  }

  // ── Impact cards ──────────────────────────────────────────────────────────
  .impact-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-3;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .impact-card {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    padding: $spacing-4;
    @include flex-column;
    align-items: flex-start;
    gap: $spacing-2;
    background: white;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
    }

    &--investment { border-color: $primary-200; background: $primary-50; }
    &--level { border-color: $accent-200; background: $accent-50; }
    &--earnings { border-color: $secondary-200; background: $secondary-50; }

    &__icon {
      font-size: 1.5rem;
    }

    &__body {
      @include flex-column;
      gap: 2px;
    }

    &__label {
      font-size: 0.75rem;
      color: $text-tertiary;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &__value {
      font-size: 1.1rem;
      font-weight: 800;
      color: $neutral-900;
    }

    &__sub {
      font-size: 0.7rem;
      color: $text-tertiary;
    }
  }

  // ── Resumo ────────────────────────────────────────────────────────────────
  &__summary {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    overflow: hidden;
    background: white;
  }

  .summary-item {
    @include flex-between;
    padding: $spacing-4 $spacing-5;
    border-bottom: 1px solid $neutral-100;
    font-size: 0.9rem;

    &:last-child {
      border-bottom: none;
    }

    &__label {
      color: $text-secondary;
    }

    &__value {
      font-weight: 600;
      color: $neutral-800;
    }

    &--total {
      background: $neutral-50;

      .summary-item__label {
        font-weight: 700;
        color: $neutral-700;
        font-size: 1rem;
      }

      .summary-item__value {
        font-size: 1.25rem;
        font-weight: 800;
        color: $primary-700;
      }
    }
  }

  // ── Terms ─────────────────────────────────────────────────────────────────
  &__terms {
    font-size: 0.775rem;
    color: $text-tertiary;
    text-align: center;
    line-height: 1.6;
    margin: 0;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-4;

    @media (max-width: 500px) {
      flex-direction: column;
    }
  }

  &__cta {
    flex: 1;

    @media (max-width: 500px) {
      width: 100%;
    }
  }
}
</style>
