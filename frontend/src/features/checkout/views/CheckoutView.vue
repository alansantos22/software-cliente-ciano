<template>
  <div class="checkout-view">
    <!-- Progress bar header -->
    <div class="checkout-view__header">
      <div class="checkout-header__top">
        <div class="checkout-header__brand">
          <span class="brand-icon">🏦</span>
          <span>Ciano Investimentos</span>
        </div>
        <div class="checkout-header__secure">
          <span>🔒</span>
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
          <span class="step-label__num">{{ currentStep > idx ? '✓' : idx + 1 }}</span>
          <span class="step-label__text">{{ step }}</span>
        </span>
      </div>
    </div>

    <!-- Step content with slide transitions -->
    <div class="checkout-view__body">
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

        <!-- Step 1: Seleção de pagamento -->
        <section v-else-if="currentStep === 1" key="step-1" class="checkout-view__step">
          <PaymentSelector
            :quotas="selectedQuotas"
            :purchased-quotas="currentUserQuotas"
            :quota-price="quotaPrice"
            @next="onPaymentSelected"
            @back="goToStep(0)"
          />
        </section>

        <!-- Step 2: Confirmação emocional -->
        <section v-else-if="currentStep === 2" key="step-2" class="checkout-view__step">
          <OrderConfirmation
            :quotas="selectedQuotas"
            :purchased-quotas="currentUserQuotas"
            :quota-price="quotaPrice"
            :payment-method="selectedPaymentMethod"
            :is-processing="isProcessing"
            @confirm="processOrder"
            @back="goToStep(1)"
          />
        </section>

        <!-- Step 3: Processamento / pagamento -->
        <section v-else-if="currentStep === 3" key="step-3" class="checkout-view__step">
          <!-- PIX -->
          <PixPayment
            v-if="selectedPaymentMethod === 'pix'"
            :order-number="orderData.orderNumber"
            :pix-code="orderData.pixCode"
            :amount="totalAmount"
            :referral-code="userReferralCode"
            @paid="onPixPaid"
          />

          <!-- Boleto -->
          <BoletoPayment
            v-else-if="selectedPaymentMethod === 'boleto'"
            :order-number="orderData.orderNumber"
            :boleto-code="orderData.boletoCode"
            :amount="totalAmount"
            :referral-code="userReferralCode"
            @go-to-dashboard="goToDashboard"
          />

          <!-- Cartão -->
          <CardRedirect
            v-else-if="selectedPaymentMethod === 'credit'"
            :order-number="orderData.orderNumber"
            :amount="totalAmount"
            :payment-url="orderData.paymentUrl"
          />
        </section>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores';
import { mockQuotaConfig, mockDelay } from '@/mocks';
import QuotaCalculator from '../components/QuotaCalculator.vue';
import PaymentSelector from '../components/PaymentSelector.vue';
import OrderConfirmation from '../components/OrderConfirmation.vue';
import PixPayment from '../components/PixPayment.vue';
import BoletoPayment from '../components/BoletoPayment.vue';
import CardRedirect from '../components/CardRedirect.vue';

// ─── Router & Stores ──────────────────────────────────────────────────────────
const router = useRouter();
const authStore = useAuthStore();

// ─── Constants ────────────────────────────────────────────────────────────────
const quotaPrice = mockQuotaConfig.quotaPrice; // R$ 2.500

const stepLabels = ['Suas Cotas', 'Pagamento', 'Confirmar', 'Finalizar'];

// ─── State ────────────────────────────────────────────────────────────────────
const currentStep = ref(0);
const stepDirection = ref<'forward' | 'back'>('forward');
const selectedQuotas = ref(1);
const selectedPaymentMethod = ref('');
const isProcessing = ref(false);

const orderData = ref({
  orderNumber: '',
  pixCode: '',
  boletoCode: '',
  paymentUrl: '',
});

// ─── Computed ─────────────────────────────────────────────────────────────────
const currentUserQuotas = computed<number>(() => {
  // ⚠️ REGRA DO SISTEMA: apenas cotas COMPRADAS definem o nível
  return authStore.user?.purchasedQuotas ?? 0;
});

const userReferralCode = computed(() => authStore.user?.referralCode ?? 'CIANO');

const totalAmount = computed(() => selectedQuotas.value * quotaPrice);

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

function onPaymentSelected(method: string) {
  selectedPaymentMethod.value = method;
  goToStep(2);
}

// ─── Order processing ─────────────────────────────────────────────────────────
async function processOrder() {
  isProcessing.value = true;

  await mockDelay(1800);

  const id = `CQ${Date.now().toString().slice(-8)}`;
  orderData.value = {
    orderNumber: id,
    pixCode:
      `00020126580014BR.GOV.BCB.PIX0136${id}-${crypto.randomUUID()}` +
      `5204000053039865802BR5925CIANO COTAS POUSADAS6009SAO PAULO62070503***63041234`,
    boletoCode: `34191.09026 01903.140001 41000.020001 3 99700000${String(totalAmount.value).padStart(10, '0')}`,
    // In production: comes from Pagar.me API; base URL for mock
    paymentUrl: '',
  };

  isProcessing.value = false;
  goToStep(3);
}

// ─── Post-payment ─────────────────────────────────────────────────────────────
function onPixPaid() {
  router.push({
    name: 'checkout-confirmation',
    params: { transactionId: orderData.value.orderNumber },
    query: {
      quotas: selectedQuotas.value,
      method: 'pix',
      level: getTargetLevel(currentUserQuotas.value + selectedQuotas.value),
    },
  });
}

function goToDashboard() {
  router.push('/dashboard');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTargetLevel(total: number): string {
  if (total >= 60) return 'imperial';
  if (total >= 20) return 'vip';
  if (total >= 10) return 'platinum';
  return 'socio';
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ─── Layout ───────────────────────────────────────────────────────────────────
.checkout-view {
  min-height: 100vh;
  background: linear-gradient(160deg, #f0f9ff 0%, #fafafa 60%, #f0fdf4 100%);
  @include flex-column;

  &__header {
    background: white;
    border-bottom: 1px solid $neutral-200;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
    position: sticky;
    top: 0;
    z-index: $z-sticky;
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
  border-bottom: 1px solid $neutral-100;

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
  color: $primary-700;

  .brand-icon {
    font-size: 1.1rem;
  }
}

.checkout-header__secure {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  font-size: 0.775rem;
  color: $success-dark;
  font-weight: 600;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
.checkout-view__progress {
  height: 4px;
  background: $neutral-200;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary-500 0%, $secondary-400 100%);
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
  color: $text-tertiary;
  font-weight: 500;
  transition: color 0.3s ease;

  &--active {
    color: $primary-600;

    .step-label__num {
      background: $primary-500;
      color: white;
      border-color: $primary-500;
    }

    .step-label__text {
      font-weight: 700;
    }
  }

  &--done {
    color: $success-dark;

    .step-label__num {
      background: $success;
      color: white;
      border-color: $success;
    }
  }

  &__num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid $neutral-300;
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
