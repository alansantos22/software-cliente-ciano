<template>
  <div class="quota-calc">
    <!-- Left: Controls -->
    <div class="quota-calc__controls">
      <div class="quota-calc__header">
        <h2>Quantas cotas deseja adquirir?</h2>
        <p class="quota-calc__subtitle">Cada cota vale <strong>{{ formatCurrency(quotaPrice) }}</strong></p>
      </div>

      <!-- Microcopy gamificado -->
      <Transition name="microcopy-fade" mode="out-in">
        <div v-if="selectedQuotas > 0" class="quota-calc__microcopy" :key="microcopyKey">
          <span class="microcopy__base">
            Você já possui <strong>{{ currentUserQuotas }} cotas</strong>. Adicionando
            <strong>{{ selectedQuotas }}</strong>, você totaliza
          </span>
          <span class="microcopy__total" :style="{ color: targetLevel.color }">
            <strong>{{ totalQuotas }} cotas</strong>
          </span>
          <span v-if="isUpgrading" class="microcopy__upgrade">
            e sobe para <strong :style="{ color: targetLevel.color }">{{ targetLevel.label }} {{ targetLevel.icon }}</strong>! 🚀
          </span>
          <span v-else class="microcopy__same">
            mantendo o nível <strong :style="{ color: targetLevel.color }">{{ targetLevel.label }}</strong>.
          </span>
        </div>
      </Transition>

      <!-- Contador numérico -->
      <div class="quota-calc__counter">
        <button
          class="counter-btn counter-btn--minus"
          :disabled="selectedQuotas <= 1"
          @click="decrement"
          aria-label="Diminuir cotas"
        >
          <span>−</span>
        </button>

        <div class="counter-display">
          <Transition name="counter-flip" mode="out-in">
            <span class="counter-value" :key="selectedQuotas">{{ selectedQuotas }}</span>
          </Transition>
          <span class="counter-label">{{ selectedQuotas === 1 ? 'cota' : 'cotas' }}</span>
        </div>

        <button
          class="counter-btn counter-btn--plus"
          :disabled="selectedQuotas >= 100"
          @click="increment"
          aria-label="Aumentar cotas"
        >
          <span>+</span>
        </button>
      </div>

      <!-- Preço total -->
      <div class="quota-calc__price-display">
        <Transition name="price-fade" mode="out-in">
          <span class="price-value" :key="selectedQuotas">{{ formatCurrency(totalPrice) }}</span>
        </Transition>
        <span class="price-installment">ou 12x de {{ formatCurrency(totalPrice / 12) }} no cartão</span>
      </div>

      <!-- Presets inteligentes -->
      <div class="quota-calc__presets">
        <p class="presets-label">Atalhos por nível</p>
        <div class="presets-grid">
          <button
            v-for="preset in smartPresets"
            :key="preset.key"
            class="preset-btn"
            :class="{ 'preset-btn--active': selectedQuotas === preset.quotas }"
            :style="{ '--level-color': preset.color }"
            @click="setPreset(preset.quotas)"
          >
            <span class="preset-icon">{{ preset.icon }}</span>
            <div class="preset-info">
              <span class="preset-level">{{ preset.label }}</span>
              <span class="preset-count">{{ preset.quotas }} cotas</span>
            </div>
            <span class="preset-price">{{ formatCurrency(preset.quotas * quotaPrice) }}</span>
          </button>
        </div>
      </div>

      <DsButton variant="primary" size="lg" class="quota-calc__cta" @click="$emit('next')">
        Continuar com {{ selectedQuotas }} {{ selectedQuotas === 1 ? 'cota' : 'cotas' }} →
      </DsButton>
    </div>

    <!-- Right: Painel de benefícios gamificado -->
    <div class="quota-calc__benefits">
      <h3 class="benefits-title">O que você desbloqueia</h3>

      <div
        v-for="level in levels"
        :key="level.key"
        class="benefit-tier"
        :class="{
          'benefit-tier--unlocked': totalQuotas >= level.min,
          'benefit-tier--just-unlocked': justUnlockedLevel === level.key,
          'benefit-tier--target': targetLevel.key === level.key && totalQuotas < level.min,
        }"
        :style="{ '--c': level.color }"
      >
        <div class="benefit-tier__header">
          <div class="benefit-tier__name">
            <span class="tier-icon">{{ level.icon }}</span>
            <span class="tier-label">{{ level.label }}</span>
            <span class="tier-min">{{ level.min }}+ cotas</span>
          </div>
          <div class="benefit-tier__status">
            <Transition name="unlock-bounce" mode="out-in">
              <span v-if="totalQuotas >= level.min" key="unlocked" class="status-badge status-badge--unlocked">
                ✅ Desbloqueado
              </span>
              <span v-else key="locked" class="status-badge status-badge--locked">
                🔒 faltam {{ level.min - totalQuotas }}
              </span>
            </Transition>
          </div>
        </div>

        <ul class="benefit-tier__list" :class="{ 'benefit-tier__list--locked': totalQuotas < level.min }">
          <li v-for="benefit in level.benefits" :key="benefit">
            <span class="benefit-check">{{ totalQuotas >= level.min ? '✓' : '○' }}</span>
            <span>{{ benefit }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { DsButton } from '@/design-system';

// ─── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  currentUserQuotas: number;
  quotaPrice: number;
}>();

const emit = defineEmits<{
  next: [];
  'update:quotas': [value: number];
}>();

// ─── State ────────────────────────────────────────────────────────────────────
const selectedQuotas = ref(1);
const justUnlockedLevel = ref<string | null>(null);
const previousTotalQuotas = ref(props.currentUserQuotas + 1);

// ─── Level definitions ────────────────────────────────────────────────────────
const levels = [
  {
    key: 'socio',
    label: 'Sócio',
    min: 1,
    icon: '🤝',
    color: '#00bcd4',
    benefits: [
      'Participação nos lucros do Grupo Ciano',
      'Participação na valorização do grupo',
      'Pode indicar e ganhar comissões',
      'Acesso ao grupo geral de investidores',
    ],
  },
  {
    key: 'platinum',
    label: 'Platinum',
    min: 10,
    icon: '✨',
    color: '#94a3b8',
    benefits: [
      '30% desconto em pousadas Ciano',
      'Comissão maior nas indicações',
      'Acesso antecipado a lotes com desconto',
      'Reunião mensal com Marcos Maziero',
    ],
  },
  {
    key: 'vip',
    label: 'VIP',
    min: 20,
    icon: '👑',
    color: '#eab308',
    benefits: [
      '50% desconto em todas as pousadas',
      '1 final de semana gratuito por ano',
      'Convites para eventos e inaugurações',
      'Nome listado como Sócio VIP nas pousadas',
    ],
  },
  {
    key: 'imperial',
    label: 'Imperial',
    min: 60,
    icon: '💎',
    color: '#a855f7',
    benefits: [
      'Hospedagem gratuita ilimitada (até 3 acompanhantes)',
      'Pode residir em pousada com desconto',
      '40% desconto para familiares',
      'Viagem anual com Marcos Maziero',
      'Quadro com foto no hall da pousada',
      'Canal VIP direto com Marcos',
    ],
  },
];

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalQuotas = computed(() => props.currentUserQuotas + selectedQuotas.value);
const totalPrice = computed(() => selectedQuotas.value * props.quotaPrice);

const targetLevel = computed(() => {
  return [...levels].reverse().find((l) => totalQuotas.value >= l.min) ?? levels[0];
});

const currentLevelFromUser = computed(() => {
  return [...levels].reverse().find((l) => props.currentUserQuotas >= l.min) ?? levels[0];
});

const isUpgrading = computed(() => targetLevel.value.key !== currentLevelFromUser.value.key);

const microcopyKey = computed(() => `${selectedQuotas.value}-${targetLevel.value.key}`);

// Smart presets: quantas cotas comprar para chegar em cada nível
const smartPresets = computed(() => {
  return levels
    .filter((l) => l.min > props.currentUserQuotas)
    .map((l) => ({
      key: l.key,
      label: l.label,
      icon: l.icon,
      color: l.color,
      quotas: l.min - props.currentUserQuotas,
    }));
});

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(totalQuotas, (newVal, oldVal) => {
  // Detect when a new tier threshold is crossed
  for (const level of levels) {
    if (oldVal < level.min && newVal >= level.min) {
      justUnlockedLevel.value = level.key;
      setTimeout(() => {
        justUnlockedLevel.value = null;
      }, 1500);
      break;
    }
  }
  emit('update:quotas', selectedQuotas.value);
});

// ─── Methods ──────────────────────────────────────────────────────────────────
function increment() {
  if (selectedQuotas.value < 100) {
    selectedQuotas.value++;
  }
}

function decrement() {
  if (selectedQuotas.value > 1) {
    selectedQuotas.value--;
  }
}

function setPreset(quotas: number) {
  selectedQuotas.value = quotas;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Expose selected quotas so parent can read
defineExpose({ selectedQuotas });
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.quota-calc {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-8;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  &__controls {
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
  }

  &__subtitle {
    color: $text-secondary;
    font-size: 0.9rem;
    margin: 0;
  }

  // ── Microcopy ──────────────────────────────────────────────────────────────
  &__microcopy {
    background: linear-gradient(135deg, $primary-50 0%, $accent-50 100%);
    border: 1px solid $primary-200;
    border-radius: $radius-lg;
    padding: $spacing-4;
    font-size: 0.9rem;
    color: $neutral-700;
    line-height: 1.7;

    .microcopy__total {
      font-size: 1.05rem;
      font-weight: 700;
    }

    .microcopy__upgrade {
      display: inline;
      font-weight: 500;
    }
  }

  // ── Counter ────────────────────────────────────────────────────────────────
  &__counter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-6;
    padding: $spacing-6;
    background: $neutral-50;
    border-radius: $radius-xl;
    border: 2px solid $neutral-200;
  }

  .counter-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 2px solid $primary-500;
    background: white;
    color: $primary-600;
    font-size: 1.5rem;
    font-weight: 700;
    cursor: pointer;
    @include flex-center;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: $primary-500;
      color: white;
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: $neutral-300;
    }

    &--plus {
      background: $primary-500;
      color: white;

      &:hover:not(:disabled) {
        background: $primary-700;
        border-color: $primary-700;
      }
    }
  }

  .counter-display {
    @include flex-column;
    align-items: center;
    min-width: 80px;
  }

  .counter-value {
    font-size: 3.5rem;
    font-weight: 800;
    color: $primary-600;
    line-height: 1;
  }

  .counter-label {
    font-size: 0.8rem;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  // ── Price display ──────────────────────────────────────────────────────────
  &__price-display {
    text-align: center;
    @include flex-column;
    align-items: center;
    gap: $spacing-1;
  }

  .price-value {
    font-size: 2rem;
    font-weight: 800;
    color: $primary-700;
  }

  .price-installment {
    font-size: 0.8rem;
    color: $text-tertiary;
  }

  // ── Presets ────────────────────────────────────────────────────────────────
  &__presets {
    @include flex-column;
    gap: $spacing-3;
  }

  .presets-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $text-tertiary;
    margin: 0;
  }

  .presets-grid {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  .preset-btn {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-4;
    border: 2px solid $neutral-200;
    border-radius: $radius-lg;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;

    &:hover {
      border-color: var(--level-color);
      background: color-mix(in srgb, var(--level-color) 6%, white);
      transform: translateX(4px);
    }

    &--active {
      border-color: var(--level-color);
      background: color-mix(in srgb, var(--level-color) 10%, white);
      box-shadow: 0 0 0 1px var(--level-color);
    }

    .preset-icon {
      font-size: 1.2rem;
    }

    .preset-info {
      @include flex-column;
      gap: 1px;
    }

    .preset-level {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--level-color);
    }

    .preset-count {
      font-size: 0.8rem;
      color: $text-tertiary;
    }

    .preset-price {
      font-weight: 700;
      font-size: 0.875rem;
      color: $neutral-700;
    }
  }

  // ── CTA ────────────────────────────────────────────────────────────────────
  &__cta {
    width: 100%;
  }

  // ── Benefits Panel ─────────────────────────────────────────────────────────
  &__benefits {
    @include flex-column;
    gap: $spacing-3;
    position: sticky;
    top: $spacing-6;
  }

  .benefits-title {
    font-size: 1rem;
    font-weight: 700;
    color: $neutral-700;
    margin-bottom: $spacing-2;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

// ── Benefit tier ──────────────────────────────────────────────────────────────
.benefit-tier {
  border: 2px solid $neutral-200;
  border-radius: $radius-lg;
  overflow: hidden;
  transition: all 0.35s ease;

  &--unlocked {
    border-color: var(--c);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 20%, transparent);

    .benefit-tier__header {
      background: color-mix(in srgb, var(--c) 12%, white);
    }
  }

  &--just-unlocked {
    animation: tier-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &--target {
    border-color: color-mix(in srgb, var(--c) 40%, $neutral-300);
    border-style: dashed;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-3 $spacing-4;
    background: $neutral-50;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  &__name {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  .tier-icon {
    font-size: 1.1rem;
  }

  .tier-label {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--c, #{$neutral-700});
  }

  .tier-min {
    font-size: 0.75rem;
    color: $text-tertiary;
    background: $neutral-100;
    padding: 1px 6px;
    border-radius: $radius-full;
  }

  &__list {
    list-style: none;
    padding: $spacing-3 $spacing-4;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    transition: opacity 0.3s ease;

    &--locked {
      opacity: 0.38;
      filter: grayscale(1);
    }

    li {
      display: flex;
      align-items: flex-start;
      gap: $spacing-2;
      font-size: 0.825rem;
      color: $neutral-700;
    }

    .benefit-check {
      color: var(--c, #{$success});
      flex-shrink: 0;
      font-size: 0.875rem;
    }
  }
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: $radius-full;
  white-space: nowrap;

  &--unlocked {
    background: color-mix(in srgb, var(--c) 15%, white);
    color: var(--c, #{$success-dark});
  }

  &--locked {
    background: $neutral-100;
    color: $text-tertiary;
  }
}

// ── Animations ────────────────────────────────────────────────────────────────
@keyframes tier-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

.microcopy-fade-enter-active,
.microcopy-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.microcopy-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.microcopy-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.counter-flip-enter-active,
.counter-flip-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.counter-flip-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.counter-flip-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.price-fade-enter-active,
.price-fade-leave-active {
  transition: opacity 0.15s ease;
}
.price-fade-enter-from,
.price-fade-leave-to {
  opacity: 0;
}

.unlock-bounce-enter-active {
  animation: unlock-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.unlock-bounce-leave-active {
  transition: opacity 0.15s ease;
}
.unlock-bounce-leave-to {
  opacity: 0;
}

@keyframes unlock-pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
