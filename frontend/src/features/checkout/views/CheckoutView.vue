<template>
  <div class="checkout-view">
    <!-- Progress bar header -->
    <div class="checkout-view__header">
      <div class="checkout-header__top">
        <div class="checkout-header__brand">
          <font-awesome-icon :icon="['fas', 'landmark']" class="brand-icon" />
          <span>Ciano Investimentos</span>
        </div>
        <div class="checkout-header__secure">
          <font-awesome-icon :icon="['fas', 'shield-halved']" />
          <span>Ambiente seguro</span>
        </div>
      </div>

      <div class="checkout-view__progress">
        <div
          class="progress-bar"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>

      <div class="checkout-view__steps-labels">
        <span
          v-for="(step, idx) in stepLabels"
          :key="step"
          class="step-label"
          :class="{
            'step-label--active': currentStep === idx,
            'step-label--done': currentStep > idx,
          }"
        >
          <span class="step-label__num">
            <font-awesome-icon v-if="currentStep > idx" icon="check" />
            <template v-else>{{ idx + 1 }}</template>
          </span>
          <span class="step-label__text">{{ step }}</span>
        </span>
      </div>
    </div>

    <!-- Step content with slide transitions -->
    <div class="checkout-view__body">
      <DsAlert v-if="purchaseError" type="error" dismissible @dismiss="purchaseError = ''">
        {{ purchaseError }}
      </DsAlert>

      <Transition :name="transitionName" mode="out-in">
        <!-- Step 0: Calculadora de cotas -->
        <section v-if="currentStep === 0" key="step-0" class="checkout-view__step">
          <QuotaCalculator
            :purchased-quotas="currentUserQuotas"
            :quota-price="quotaPrice"
            @update:quotas="selectedQuotas = $event"
            @next="goToStep(1)"
          />
        </section>

        <!-- Step 1: Confirmação. A forma de pagamento (PIX/cartão/parcelas) é
             escolhida na própria página da InfinitePay, então não temos um passo
             de seleção de pagamento aqui. -->
        <section v-else-if="currentStep === 1" key="step-1" class="checkout-view__step">
          <OrderConfirmation
            :quotas="selectedQuotas"
            :purchased-quotas="currentUserQuotas"
            :quota-price="quotaPrice"
            :is-processing="isProcessing"
            @confirm="processOrder"
            @back="goToStep(0)"
          />
          <!-- Ao confirmar, o usuário é redirecionado à InfinitePay para pagar.
               O retorno acontece em /checkout/retorno (CheckoutReturnView). -->
        </section>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/shared/stores';
import { quotasService } from '@/shared/services/quotas.service';
import QuotaCalculator from '../components/QuotaCalculator.vue';
import OrderConfirmation from '../components/OrderConfirmation.vue';
import DsAlert from '@/design-system/DsAlert.vue';

// ─── Stores ───────────────────────────────────────────────────────────────────
const authStore = useAuthStore();

// ─── Constants ────────────────────────────────────────────────────────────────
const quotaPrice = ref(2500);

onMounted(async () => {
  try {
    const { data } = await quotasService.getConfig();
    if (data?.currentPrice) quotaPrice.value = data.currentPrice;
  } catch { /* keep default */ }
});

const stepLabels = ['Suas Cotas', 'Confirmar'];

// ─── State ────────────────────────────────────────────────────────────────────
const currentStep = ref(0);
const stepDirection = ref<'forward' | 'back'>('forward');
const selectedQuotas = ref(1);
const isProcessing = ref(false);
const purchaseError = ref('');

// ─── Computed ─────────────────────────────────────────────────────────────────
const currentUserQuotas = computed<number>(() => {
  // ⚠️ REGRA DO SISTEMA: apenas cotas COMPRADAS definem o nível
  return authStore.user?.purchasedQuotas ?? 0;
});

const progressPercent = computed(() => {
  return Math.round((currentStep.value / (stepLabels.length - 1)) * 100);
});

const transitionName = computed(() =>
  stepDirection.value === 'forward' ? 'step-forward' : 'step-back',
);

// ─── Navigation ───────────────────────────────────────────────────────────────
function goToStep(step: number) {
  stepDirection.value = step > currentStep.value ? 'forward' : 'back';
  currentStep.value = step;
}

// ─── Order processing ─────────────────────────────────────────────────────────
async function processOrder() {
  isProcessing.value = true;
  purchaseError.value = '';

  try {
    // Cria a transação (PENDENTE) e abre o checkout na InfinitePay.
    const { data } = await quotasService.purchase(selectedQuotas.value);

    if (!data?.paymentUrl) {
      purchaseError.value = 'Não foi possível iniciar o pagamento. Tente novamente.';
      return;
    }

    // Guarda o id da transação para a página de retorno consultar o status.
    sessionStorage.setItem('ciano:lastTxn', data.transactionId);

    // Redireciona para a página de pagamento hospedada da InfinitePay
    // (o usuário escolhe PIX ou cartão lá e volta para /checkout/retorno).
    window.location.href = data.paymentUrl;
  } catch (e: any) {
    const msg = e?.response?.data?.message;
    if (Array.isArray(msg)) {
      purchaseError.value = msg.join(' • ');
    } else if (typeof msg === 'string') {
      purchaseError.value = msg;
    } else {
      purchaseError.value = 'Erro ao processar compra. Tente novamente.';
    }
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ─── Layout ───────────────────────────────────────────────────────────────────
.checkout-view {
  min-height: 100vh;
  background: #f8fafc;
  @include flex-column;

  &__header {
    background: white;
    border-bottom: 1px solid var(--neutral-200);
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
    position: sticky;
    top: 0;
  }

  &__body {
    flex: 1;
    padding: $spacing-8 $spacing-6;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;

    @media (max-width: 768px) {
      padding: $spacing-5 $spacing-4;
    }
  }

  &__step {
    animation: none; // handled by Transition
  }
}

// ─── Header top bar ───────────────────────────────────────────────────────────
.checkout-header__top {
  @include flex-between;
  padding: $spacing-3 $spacing-6;
  border-bottom: 1px solid var(--neutral-100);

  @media (max-width: 576px) {
    padding: $spacing-3 $spacing-4;
  }
}

.checkout-header__brand {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--primary-700);

  .brand-icon {
    font-size: 1.1rem;
  }
}

.checkout-header__secure {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  font-size: 0.775rem;
  color: var(--color-success-dark);
  font-weight: 600;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
.checkout-view__progress {
  height: 4px;
  background: var(--neutral-200);
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500) 0%, var(--secondary-400) 100%);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 24px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5));
    animation: shimmer 1.5s infinite;
  }
}

// ─── Step labels ──────────────────────────────────────────────────────────────
.checkout-view__steps-labels {
  display: flex;
  justify-content: space-between;
  padding: $spacing-3 $spacing-6;

  @media (max-width: 576px) {
    padding: $spacing-3 $spacing-4;
  }
}

.step-label {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-weight: 500;
  transition: color 0.3s ease;

  &--active {
    color: var(--primary-600);

    .step-label__num {
      background: var(--primary-500);
      color: white;
      border-color: var(--primary-500);
    }

    .step-label__text {
      font-weight: 700;
    }
  }

  &--done {
    color: var(--color-success-dark);

    .step-label__num {
      background: var(--color-success);
      color: white;
      border-color: var(--color-success);
    }
  }

  &__num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--neutral-300);
    @include flex-center;
    font-size: 0.7rem;
    font-weight: 700;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  &__text {
    @media (max-width: 640px) {
      display: none;
    }
  }
}

// ─── Step transitions ─────────────────────────────────────────────────────────
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

// Forward: new step enters from right, old step exits to left
.step-forward-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.step-forward-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

// Back: new step enters from left, old step exits to right
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.step-back-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

// ─── Animations ───────────────────────────────────────────────────────────────
@keyframes shimmer {
  0% { opacity: 0; transform: translateX(-100%); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateX(100%); }
}
</style>
