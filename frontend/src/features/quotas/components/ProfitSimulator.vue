<template>
  <div class="profit-simulator">
    <div class="profit-simulator__header">
      <span class="profit-simulator__eyebrow">Simule seus Ganhos</span>
      <h2 class="profit-simulator__title">Quanto você pode ganhar?</h2>
      <p class="profit-simulator__subtitle">
        Ajuste os sliders e veja seu potencial de renda mensal em tempo real
      </p>
    </div>

    <div class="profit-simulator__body">
      <!-- Controls -->
      <div class="profit-simulator__controls">

        <!-- Slider: Investimento -->
        <div class="sim-control">
          <div class="sim-control__label-row">
            <label class="sim-control__label">Quantas cotas você quer adquirir?</label>
            <span class="sim-control__value">
              {{ Math.round(investment / QUOTA_PRICE) }} {{ Math.round(investment / QUOTA_PRICE) === 1 ? 'cota' : 'cotas' }}
              &nbsp;—&nbsp;{{ formatCurrency(investment) }}
            </span>
          </div>
          <input
            v-model.number="investment"
            type="range"
            :min="QUOTA_PRICE"
            :max="40 * QUOTA_PRICE"
            :step="QUOTA_PRICE"
            class="sim-slider"
          />
          <div class="sim-control__track-labels">
            <span>1 cota</span>
            <span>40 cotas</span>
          </div>
        </div>

        <!-- Slider: Indicações -->
        <div class="sim-control">
          <div class="sim-control__label-row">
            <label class="sim-control__label">Quantas pessoas você vai indicar?</label>
            <span class="sim-control__value">{{ referrals }} indicados</span>
          </div>
          <input
            v-model.number="referrals"
            type="range"
            :min="0"
            :max="20"
            :step="1"
            class="sim-slider"
          />
          <div class="sim-control__track-labels">
            <span>0 indicados</span>
            <span>20 indicados</span>
          </div>
        </div>

      </div>

      <!-- Results Panel -->
      <div class="profit-simulator__results">

        <div class="sim-result-card">
          <div class="sim-result-card__icon">📊</div>
          <div class="sim-result-card__info">
            <span class="sim-result-card__label">Dividendos Mensais</span>
            <span class="sim-result-card__amount">{{ formatCurrency(monthlyDividends) }}</span>
          </div>
        </div>

        <div class="sim-result-card">
          <div class="sim-result-card__icon">🤝</div>
          <div class="sim-result-card__info">
            <span class="sim-result-card__label">Bônus de Indicação</span>
            <span class="sim-result-card__amount">{{ formatCurrency(referralBonus) }}</span>
          </div>
        </div>

        <div class="sim-result-card sim-result-card--total">
          <div class="sim-result-card__icon">🚀</div>
          <div class="sim-result-card__info">
            <span class="sim-result-card__label">Total Mensal Estimado</span>
            <span class="sim-result-card__amount sim-result-card__amount--big">
              {{ formatCurrency(totalMonthly) }}
            </span>
          </div>
        </div>

        <div class="sim-roi">
          <span class="sim-roi__label">Retorno sobre Investimento (mês)</span>
          <span class="sim-roi__value">{{ roiPercent }}%</span>
        </div>
      </div>
    </div>

    <p class="profit-simulator__disclaimer">
      * Estimativa calculada com base no histórico recente e uma margem de segurança conservadora de 10%. Rentabilidade passada não garante retornos futuros. Valores reais podem superar os estimados.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Constants (mirrors QuotaInfoView.vue) ---
const QUOTA_PRICE = 2500;           // R$ 2.500,00 per quota — canonical value
const GROSS_YIELD_PER_QUOTA = 200;  // R$ per quota last period
const SAFETY_MARGIN = 0.10;         // 10% conservative buffer on displayed estimates
const NET_YIELD_PER_QUOTA = Math.round(GROSS_YIELD_PER_QUOTA * (1 - SAFETY_MARGIN)); // 180
const DIRECT_COMMISSION = 0.10;     // 10% of referred purchase
const AVG_QUOTA_PURCHASE = 10_000;  // avg R$ 10k purchase per new referral (4 cotas)

const investment = ref(10 * QUOTA_PRICE); // default: 10 cotas = R$ 25.000
const referrals = ref(3);

const monthlyDividends = computed(() => {
  const quotas = Math.round(investment.value / QUOTA_PRICE);
  return quotas * NET_YIELD_PER_QUOTA;
});

const referralBonus = computed(() =>
  Math.round(referrals.value * AVG_QUOTA_PURCHASE * DIRECT_COMMISSION)
);

const totalMonthly = computed(() =>
  monthlyDividends.value + referralBonus.value
);

const roiPercent = computed(() =>
  investment.value > 0
    ? ((totalMonthly.value / investment.value) * 100).toFixed(1)
    : '0.0'
);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.profit-simulator {
  background: linear-gradient(135deg, $neutral-900 0%, #0a2f35 100%);
  border-radius: 24px;
  padding: $spacing-10 $spacing-8;
  color: $text-inverse;

  @media (max-width: 768px) {
    padding: $spacing-8 $spacing-5;
  }

  &__header {
    text-align: center;
    margin-bottom: $spacing-8;
  }

  &__eyebrow {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: $primary-300;
    margin-bottom: $spacing-3;
  }

  &__title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    margin: 0 0 $spacing-2;
    color: #fff;
  }

  &__subtitle {
    color: rgba(255,255,255,0.6);
    font-size: 0.9375rem;
    margin: 0;
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-8;
    align-items: start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: $spacing-6;
  }

  &__results {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__disclaimer {
    margin-top: $spacing-6;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    text-align: center;
    line-height: 1.5;
  }
}

// ─── Sliders ─────────────────────────────────────────────
.sim-control {
  &__label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $spacing-3;
  }

  &__label {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.75);
  }

  &__value {
    font-size: 1rem;
    font-weight: 700;
    color: $primary-300;
  }

  &__track-labels {
    display: flex;
    justify-content: space-between;
    margin-top: $spacing-2;
    font-size: 0.6875rem;
    color: rgba(255,255,255,0.35);
  }
}

.sim-slider {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  outline: none;
  cursor: pointer;
  transition: background 0.2s;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-400, $primary-600);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba($primary-500, 0.5);
    border: 2px solid rgba(255,255,255,0.3);
    transition: transform 0.15s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  &::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-400, $primary-600);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba($primary-500, 0.5);
    border: 2px solid rgba(255,255,255,0.3);
  }
}

// ─── Result Cards ─────────────────────────────────────────
.sim-result-card {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: $spacing-4 $spacing-5;
  transition: background 0.2s;

  &--total {
    background: linear-gradient(135deg, rgba($primary-500,0.25), rgba($secondary-500,0.15));
    border-color: rgba($primary-400, 0.4);
  }

  &__icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.55);
  }

  &__amount {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;

    &--big {
      font-size: 1.5rem;
      color: $primary-300;
    }
  }
}

.sim-roi {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba($accent-500, 0.12);
  border: 1px solid rgba($accent-500, 0.3);
  border-radius: 10px;
  padding: $spacing-3 $spacing-5;
  margin-top: $spacing-2;

  &__label {
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.6);
  }

  &__value {
    font-size: 1.25rem;
    font-weight: 800;
    color: $accent-300;
  }
}
</style>
