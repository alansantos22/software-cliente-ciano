<template>
  <div class="price-engine">
    <!-- Header -->
    <div class="price-engine__header">
      <div class="price-engine__title-group">
        <span class="price-engine__badge"><font-awesome-icon icon="bolt" /> Motor de Preço</span>
        <span class="price-engine__lot">Lote #{{ lotNumber }}</span>
      </div>
      <div class="price-engine__price">
        {{ formatCurrency(quotaPrice) }}
        <span class="price-engine__price-label">por cota</span>
      </div>
    </div>

    <!-- Split Thermometer -->
    <div class="price-engine__thermometer">
      <div class="price-engine__thermo-labels">
        <span>Progresso do Lote Atual</span>
        <span class="price-engine__thermo-count">
          <strong>{{ lotProgress }}</strong> / {{ lotSize }} cotas vendidas
        </span>
      </div>
      <div class="price-engine__thermo-bar" :title="`${progressPercent}% do lote preenchido`">
        <div
          class="price-engine__thermo-fill"
          :class="thermometerClass"
          :style="{ width: progressPercent + '%' }"
        />
        <span class="price-engine__thermo-label-inline" v-if="progressPercent >= 10">
          {{ progressPercent }}%
        </span>
      </div>
      <p class="price-engine__thermo-cta">
        <span :class="urgencyClass"><font-awesome-icon icon="circle" /></span>
        Faltam <strong>{{ quotasRemaining }} cotas</strong> para o próximo
        {{ progressPercent >= 80 ? 'Split automático' : 'aumento programado' }}.
      </p>
    </div>

    <!-- Actions -->
    <div class="price-engine__actions" v-if="!confirmingAction">
      <button class="price-engine__btn price-engine__btn--force" @click="startConfirm('force-split')">
        <font-awesome-icon icon="bolt" /> Forçar Virada de Lote
      </button>
      <button class="price-engine__btn price-engine__btn--adjust" @click="startConfirm('adjust-constant')">
        <font-awesome-icon icon="wrench" /> Ajustar Constante
      </button>
    </div>

    <!-- Inline Confirmation: Force Split -->
    <div
      v-if="confirmingAction === 'force-split'"
      class="price-engine__confirm price-engine__confirm--danger"
    >
      <p class="price-engine__confirm-msg">
        <font-awesome-icon icon="triangle-exclamation" /> <strong>Atenção:</strong> Forçar a virada de lote encerrará o lote atual imediatamente,
        independente do progresso. Esta ação <strong>não pode ser desfeita</strong>.
      </p>
      <label class="price-engine__confirm-label">
        Digite <code>CONFIRMAR</code> para prosseguir:
        <input
          v-model="confirmInput"
          type="text"
          class="price-engine__confirm-input"
          placeholder="CONFIRMAR"
          autocomplete="off"
        />
      </label>
      <div class="price-engine__confirm-btns">
        <button class="price-engine__btn price-engine__btn--cancel" @click="cancelConfirm">
          Cancelar
        </button>
        <button
          class="price-engine__btn price-engine__btn--confirm"
          :disabled="confirmInput !== 'CONFIRMAR'"
          @click="executeAction"
        >
          Sim, confirmar
        </button>
      </div>
    </div>

    <!-- Inline Confirmation: Adjust Constant -->
    <div
      v-if="confirmingAction === 'adjust-constant'"
      class="price-engine__confirm price-engine__confirm--warning"
    >
      <p class="price-engine__confirm-msg">
        <font-awesome-icon icon="wrench" /> <strong>Ajustar Constante de Estimativa:</strong> Define a velocidade esperada de
        vendas para projeções de dividendo.
      </p>
      <label class="price-engine__confirm-label">
        Nova constante (atual: <strong>{{ currentConstant }}</strong>):
        <input
          v-model.number="newConstantValue"
          type="number"
          min="1"
          max="999"
          class="price-engine__confirm-input"
          placeholder="Ex: 7"
        />
      </label>
      <div class="price-engine__confirm-btns">
        <button class="price-engine__btn price-engine__btn--cancel" @click="cancelConfirm">
          Cancelar
        </button>
        <button
          class="price-engine__btn price-engine__btn--confirm"
          :disabled="!newConstantValue || newConstantValue < 1"
          @click="executeAction"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- Success Feedback -->
    <transition name="feedback-fade">
      <div v-if="successMsg" class="price-engine__success">
        <font-awesome-icon icon="circle-check" /> {{ successMsg }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  quotaPrice?: number;
  lotProgress?: number;
  lotSize?: number;
  lotNumber?: number;
  currentConstant?: number;
}

const props = withDefaults(defineProps<Props>(), {
  quotaPrice: 2500,
  lotProgress: 140,
  lotSize: 200,
  lotNumber: 3,
  currentConstant: 7,
});

const emit = defineEmits<{
  'force-split': [];
  'adjust-constant': [value: number];
}>();

// State
const confirmingAction = ref<null | 'force-split' | 'adjust-constant'>(null);
const confirmInput = ref('');
const newConstantValue = ref<number>(props.currentConstant);
const successMsg = ref('');

// Computed
const progressPercent = computed(() =>
  Math.round((props.lotProgress / props.lotSize) * 100)
);

const quotasRemaining = computed(() => props.lotSize - props.lotProgress);

const thermometerClass = computed(() => {
  if (progressPercent.value >= 85) return 'price-engine__thermo-fill--critical';
  if (progressPercent.value >= 60) return 'price-engine__thermo-fill--warning';
  return 'price-engine__thermo-fill--safe';
});

const urgencyClass = computed(() => {
  if (quotasRemaining.value <= 20) return 'urgency--critical';
  if (quotasRemaining.value <= 60) return 'urgency--warning';
  return 'urgency--ok';
});

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function startConfirm(action: 'force-split' | 'adjust-constant') {
  confirmInput.value = '';
  newConstantValue.value = props.currentConstant;
  confirmingAction.value = action;
}

function cancelConfirm() {
  confirmingAction.value = null;
  confirmInput.value = '';
}

function executeAction() {
  if (confirmingAction.value === 'force-split' && confirmInput.value === 'CONFIRMAR') {
    emit('force-split');
    successMsg.value = 'Virada de lote agendada com sucesso.';
  } else if (confirmingAction.value === 'adjust-constant' && newConstantValue.value >= 1) {
    emit('adjust-constant', newConstantValue.value);
    successMsg.value = `Constante atualizada para ${newConstantValue.value}.`;
  }
  confirmingAction.value = null;
  confirmInput.value = '';
  setTimeout(() => { successMsg.value = ''; }, 4000);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.price-engine {
  background: linear-gradient(135deg, #001f2e 0%, #002a3a 100%);
  border: 1px solid rgba(var(--primary-500-rgb), 0.3);
  border-radius: $radius-lg;
  padding: $spacing-5 $spacing-6;
  color: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(var(--primary-500-rgb), 0.15);

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  // ---- Header ----
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: $spacing-5;
    flex-wrap: wrap;
    gap: $spacing-3;
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(var(--primary-500-rgb), 0.2);
    border: 1px solid rgba(var(--primary-500-rgb), 0.4);
    color: var(--primary-300);
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 10px;
  }

  &__lot {
    font-size: 0.8rem;
    color: rgba(white, 0.45);
  }

  &__price {
    font-size: 2rem;
    font-weight: 800;
    color: var(--primary-300);
    line-height: 1;
    text-align: right;
  }

  &__price-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 400;
    color: rgba(white, 0.45);
    margin-top: 4px;
    text-align: right;
  }

  // ---- Thermometer ----
  &__thermometer {
    margin-bottom: $spacing-5;
  }

  &__thermo-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: rgba(white, 0.6);
    margin-bottom: $spacing-2;
  }

  &__thermo-count {
    strong { color: white; }
  }

  &__thermo-bar {
    position: relative;
    height: 20px;
    background: rgba(white, 0.1);
    border-radius: $radius-full;
    overflow: hidden;
  }

  &__thermo-fill {
    height: 100%;
    border-radius: $radius-full;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);

    &--safe    { background: linear-gradient(90deg, var(--primary-700), var(--primary-400)); }
    &--warning { background: linear-gradient(90deg, var(--color-warning-dark), var(--color-warning-light)); }
    &--critical { background: linear-gradient(90deg, var(--color-error-dark), var(--color-error-light)); }
  }

  &__thermo-label-inline {
    position: absolute;
    right: $spacing-2;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.72rem;
    font-weight: 700;
    color: white;
    pointer-events: none;
  }

  &__thermo-cta {
    margin: $spacing-2 0 0;
    font-size: 0.82rem;
    color: rgba(white, 0.7);

    strong { color: white; }
  }

  // ---- Action Buttons ----
  &__actions {
    display: flex;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  &__btn {
    padding: $spacing-2 $spacing-4;
    border-radius: $radius-md;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &--force {
      background: rgba(var(--error-rgb), 0.15);
      border: 1px solid rgba(var(--error-rgb), 0.5);
      color: var(--color-error-light);
      &:hover { background: rgba(var(--error-rgb), 0.3); }
    }

    &--adjust {
      background: rgba(var(--primary-500-rgb), 0.15);
      border: 1px solid rgba(var(--primary-500-rgb), 0.4);
      color: var(--primary-300);
      &:hover { background: rgba(var(--primary-500-rgb), 0.28); }
    }

    &--cancel {
      background: rgba(white, 0.08);
      border: 1px solid rgba(white, 0.15);
      color: rgba(white, 0.7);
      &:hover { background: rgba(white, 0.14); }
    }

    &--confirm {
      background: var(--primary-600);
      border: 1px solid var(--primary-500);
      color: white;
      &:hover:not(:disabled) { background: var(--primary-500); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }

  // ---- Inline Confirm ----
  &__confirm {
    border-radius: $radius-md;
    padding: $spacing-4;
    margin-top: $spacing-2;

    &--danger {
      background: rgba(var(--error-rgb), 0.1);
      border: 1px solid rgba(var(--error-rgb), 0.35);
    }

    &--warning {
      background: rgba(var(--primary-500-rgb), 0.08);
      border: 1px solid rgba(var(--primary-500-rgb), 0.3);
    }
  }

  &__confirm-msg {
    font-size: 0.83rem;
    color: rgba(white, 0.8);
    margin: 0 0 $spacing-3;
    line-height: 1.5;
    strong { color: white; }
  }

  &__confirm-label {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    font-size: 0.82rem;
    color: rgba(white, 0.65);
    margin-bottom: $spacing-3;

    code {
      background: rgba(white, 0.1);
      border-radius: 4px;
      padding: 1px 5px;
      color: var(--primary-300);
    }
  }

  &__confirm-input {
    background: rgba(white, 0.07);
    border: 1px solid rgba(white, 0.2);
    border-radius: $radius-sm;
    color: white;
    padding: $spacing-2 $spacing-3;
    font-size: 0.875rem;
    width: 100%;
    max-width: 280px;
    outline: none;

    &:focus {
      border-color: var(--primary-400);
      box-shadow: 0 0 0 2px rgba(var(--primary-500-rgb), 0.25);
    }

    &::placeholder { color: rgba(white, 0.3); }
  }

  &__confirm-btns {
    display: flex;
    gap: $spacing-2;
  }

  // ---- Success ----
  &__success {
    margin-top: $spacing-3;
    font-size: 0.875rem;
    color: var(--secondary-400);
    font-weight: 600;
  }
}

// Transitions
.feedback-fade-enter-active,
.feedback-fade-leave-active {
  transition: opacity 0.4s;
}
.feedback-fade-enter-from,
.feedback-fade-leave-to {
  opacity: 0;
}

// Urgency classes
.urgency--ok       { color: var(--secondary-400); }
.urgency--warning  { color: var(--color-warning-light); }
.urgency--critical { color: var(--color-error-light); }
</style>
