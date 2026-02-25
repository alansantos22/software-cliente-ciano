<template>
  <div class="payment-selector">
    <!-- Área central: métodos de pagamento -->
    <div class="payment-selector__main">
      <div class="payment-selector__header">
        <h2>Como você quer pagar?</h2>
        <p>Escolha a forma de pagamento de sua preferência</p>
      </div>

      <!-- Radio cards de pagamento -->
      <div class="payment-methods">
        <label
          v-for="method in methods"
          :key="method.id"
          class="payment-card"
          :class="{ 'payment-card--selected': selectedMethodId === method.id }"
          :style="selectedMethodId === method.id ? { '--m-color': method.color } : {}"
        >
          <input
            v-model="selectedMethodId"
            type="radio"
            :value="method.id"
            class="payment-card__input"
          />

          <div class="payment-card__icon">{{ method.icon }}</div>

          <div class="payment-card__body">
            <div class="payment-card__name">{{ method.name }}</div>
            <div class="payment-card__desc">{{ method.description }}</div>

            <!-- Logos de bandeiras para cartão -->
            <div v-if="method.id === 'credit'" class="payment-card__brands">
              <span class="brand-badge">VISA</span>
              <span class="brand-badge">Master</span>
              <span class="brand-badge">Elo</span>
              <span class="brand-badge">Amex</span>
            </div>
          </div>

          <div class="payment-card__tag-area">
            <span class="payment-card__tag" :class="`payment-card__tag--${method.tagType}`">
              {{ method.tag }}
            </span>
          </div>

          <!-- Radio visual check -->
          <div class="payment-card__radio">
            <div
              class="radio-dot"
              :class="{ 'radio-dot--active': selectedMethodId === method.id }"
            >
              <div class="radio-dot__inner" v-if="selectedMethodId === method.id" />
            </div>
          </div>
        </label>
      </div>

      <!-- Selo de segurança -->
      <div class="payment-selector__security">
        <span class="security-icon">🔒</span>
        <span>Pagamento processado de forma <strong>segura e criptografada</strong></span>
      </div>

      <!-- Ações -->
      <div class="payment-selector__actions">
        <DsButton variant="ghost" @click="$emit('back')">← Voltar</DsButton>
        <DsButton
          variant="primary"
          size="lg"
          :disabled="!selectedMethodId"
          @click="handleNext"
        >
          Continuar para confirmação →
        </DsButton>
      </div>
    </div>

    <!-- Sidebar direita: resumo sticky -->
    <aside class="payment-selector__sidebar">
      <div class="order-summary">
        <h3 class="order-summary__title">Resumo da compra</h3>

        <div class="order-summary__level">
          <div
            class="level-badge"
            :style="{ background: targetLevel.gradientStart, color: 'white' }"
          >
            <span>{{ targetLevel.icon }}</span>
            <span>{{ targetLevel.label }}</span>
          </div>
          <span class="level-badge__desc">Seu novo nível</span>
        </div>

        <div class="order-summary__rows">
          <div class="summary-row">
            <span>Cotas adquiridas</span>
            <strong>{{ quotas }}</strong>
          </div>
          <div class="summary-row">
            <span>Cotas compradas após esta compra</span>
            <strong :style="{ color: targetLevel.color }">{{ totalQuotas }} cotas compradas</strong>
          </div>
          <div class="summary-row">
            <span>Valor por cota</span>
            <strong>{{ formatCurrency(quotaPrice) }}</strong>
          </div>
        </div>

        <div class="order-summary__divider"></div>

        <div class="order-summary__total">
          <span>Total</span>
          <strong>{{ formatCurrency(totalAmount) }}</strong>
        </div>

        <div v-if="selectedMethodId === 'credit'" class="order-summary__installment">
          12x de {{ formatCurrency(totalAmount / 12) }}
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { DsButton } from '@/design-system';

// ─── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  quotas: number;
  purchasedQuotas: number;
  quotaPrice: number;
}>();

const emit = defineEmits<{
  next: [method: string];
  back: [];
}>();

// ─── State ────────────────────────────────────────────────────────────────────
const selectedMethodId = ref<string | null>(null);

// ─── Level config ────────────────────────────────────────────────────────────
const levels = [
  { key: 'socio', label: 'Sócio', min: 1, icon: '🤝', color: '#00bcd4', gradientStart: '#00bcd4' },
  { key: 'platinum', label: 'Platinum', min: 10, icon: '✨', color: '#64748b', gradientStart: '#94a3b8' },
  { key: 'vip', label: 'VIP', min: 20, icon: '👑', color: '#b45309', gradientStart: '#eab308' },
  { key: 'imperial', label: 'Imperial', min: 60, icon: '💎', color: '#7c3aed', gradientStart: '#a855f7' },
];

// ─── Payment methods ──────────────────────────────────────────────────────────
const methods = [
  {
    id: 'pix',
    name: 'PIX',
    icon: '⚡',
    description: 'Escaneie o QR Code no seu banco e pronto.',
    tag: '✅ Aprovação Imediata',
    tagType: 'instant',
    color: '#16a34a',
  },
  {
    id: 'credit',
    name: 'Cartão de Crédito',
    icon: '💳',
    description: 'Parcelamento disponível.',
    tag: 'Até 12x',
    tagType: 'installment',
    color: '#2563eb',
  },
  {
    id: 'boleto',
    name: 'Boleto Bancário',
    icon: '📄',
    description: 'Pague em qualquer banco ou lotérica.',
    tag: 'Até 3 dias úteis',
    tagType: 'slow',
    color: '#d97706',
  },
];

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalQuotas = computed(() => props.purchasedQuotas + props.quotas);
const totalAmount = computed(() => props.quotas * props.quotaPrice);

const targetLevel = computed(() => {
  return [...levels].reverse().find((l) => totalQuotas.value >= l.min) ?? levels[0];
});

// ─── Methods ──────────────────────────────────────────────────────────────────
function handleNext() {
  if (selectedMethodId.value) {
    emit('next', selectedMethodId.value);
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.payment-selector {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: $spacing-8;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  &__main {
    @include flex-column;
    gap: $spacing-6;
  }

  &__header {
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: $neutral-900;
      margin-bottom: $spacing-1;
    }

    p {
      color: $text-secondary;
      font-size: 0.9rem;
      margin: 0;
    }
  }

  &__security {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    font-size: 0.8rem;
    color: $text-tertiary;
    padding: $spacing-3;
    border-top: 1px solid $neutral-200;

    strong {
      color: $success-dark;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-4;

    @media (max-width: 576px) {
      flex-direction: column;
    }
  }

  // ── Payment methods ──────────────────────────────────────────────────────
  &__sidebar {
    position: sticky;
    top: $spacing-6;
  }
}

.payment-methods {
  @include flex-column;
  gap: $spacing-3;
}

.payment-card {
  display: grid;
  grid-template-columns: 48px 1fr auto 24px;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4 $spacing-5;
  border: 2px solid $neutral-200;
  border-radius: $radius-xl;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: $primary-300;
    background: $primary-50;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 188, 212, 0.12);
  }

  &--selected {
    border-color: var(--m-color, #{$primary-500});
    background: color-mix(in srgb, var(--m-color, #{$primary-500}) 5%, white);
    box-shadow: 0 0 0 1px var(--m-color, #{$primary-500}), 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  &__input {
    display: none;
  }

  &__icon {
    font-size: 2rem;
    @include flex-center;
  }

  &__body {
    @include flex-column;
    gap: $spacing-1;
  }

  &__name {
    font-weight: 700;
    font-size: 1rem;
    color: $neutral-900;
  }

  &__desc {
    font-size: 0.825rem;
    color: $text-secondary;
  }

  &__brands {
    display: flex;
    gap: $spacing-1;
    margin-top: $spacing-1;
  }

  &__tag-area {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  &__tag {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: $radius-full;
    white-space: nowrap;

    &--instant {
      background: $secondary-50;
      color: $success-dark;
      border: 1px solid $secondary-200;
    }

    &--installment {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    &--slow {
      background: $accent-50;
      color: $warning-dark;
      border: 1px solid $accent-100;
    }
  }
}

.brand-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding: 2px 5px;
  border-radius: $radius-sm;
  background: $neutral-100;
  color: $neutral-600;
}

.radio-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid $neutral-300;
  @include flex-center;
  transition: border-color 0.2s ease;

  &--active {
    border-color: var(--m-color, #{$primary-500});
  }

  &__inner {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--m-color, #{$primary-500});
    animation: radio-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

@keyframes radio-pop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

// ── Order Summary Sidebar ─────────────────────────────────────────────────────
.order-summary {
  border: 2px solid $neutral-200;
  border-radius: $radius-xl;
  padding: $spacing-5;
  background: $neutral-50;
  @include flex-column;
  gap: $spacing-4;

  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: $neutral-700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  &__level {
    @include flex-column;
    align-items: flex-start;
    gap: $spacing-1;
  }

  .level-badge {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-4;
    border-radius: $radius-full;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .level-badge__desc {
    font-size: 0.75rem;
    color: $text-tertiary;
    margin-left: $spacing-2;
  }

  &__rows {
    @include flex-column;
    gap: $spacing-2;
  }

  &__divider {
    height: 1px;
    background: $neutral-200;
    margin: 0;
  }

  &__total {
    @include flex-between;
    font-size: 1.1rem;
    font-weight: 700;
    color: $neutral-900;

    strong {
      color: $primary-700;
      font-size: 1.3rem;
    }
  }

  &__installment {
    text-align: center;
    font-size: 0.8rem;
    color: $text-tertiary;
  }
}

.summary-row {
  @include flex-between;
  font-size: 0.875rem;
  color: $text-secondary;

  strong {
    color: $neutral-800;
    font-weight: 600;
  }
}
</style>
