<template>
  <div class="checkout-view">
    <!-- Header -->
    <header class="checkout-view__header">
      <h1>Adquirir Cotas</h1>
      <p class="checkout-view__subtitle">
        Escolha o pacote de cotas e realize seu investimento
      </p>
    </header>

    <!-- Steps Indicator -->
    <div class="checkout-view__steps">
      <div
        v-for="(stepItem, index) in steps"
        :key="stepItem.id"
        class="step"
        :class="{
          'step--active': currentStep === index,
          'step--completed': currentStep > index,
        }"
      >
        <div class="step__number">
          {{ currentStep > index ? '✓' : index + 1 }}
        </div>
        <span class="step__label">{{ stepItem.label }}</span>
      </div>
    </div>

    <!-- Step Content -->
    <div class="checkout-view__content">
      <!-- Step 1: Select Package -->
      <section v-if="currentStep === 0" class="checkout-step">
        <h2>Selecione um Pacote</h2>

        <div class="packages-grid">
          <DsCard
            v-for="pkg in packages"
            :key="pkg.id"
            class="package-card"
            :class="{ 'package-card--selected': selectedPackage?.id === pkg.id }"
            @click="selectPackage(pkg)"
          >
            <div class="package-card__badge" v-if="pkg.popular">
              ⭐ Mais Popular
            </div>
            <h3 class="package-card__title">{{ pkg.name }}</h3>
            <div class="package-card__quotas">
              <strong>{{ pkg.quotas }}</strong> cotas
            </div>
            <div class="package-card__price">
              {{ formatCurrency(pkg.price) }}
            </div>
            <ul class="package-card__benefits">
              <li v-for="benefit in pkg.benefits" :key="benefit">
                ✓ {{ benefit }}
              </li>
            </ul>
            <DsButton
              :variant="selectedPackage?.id === pkg.id ? 'primary' : 'outline'"
              style="width: 100%"
            >
              {{ selectedPackage?.id === pkg.id ? 'Selecionado' : 'Selecionar' }}
            </DsButton>
          </DsCard>
        </div>

        <div class="checkout-step__actions">
          <DsButton
            variant="primary"
            size="lg"
            :disabled="!selectedPackage"
            @click="nextStep"
          >
            Continuar
          </DsButton>
        </div>
      </section>

      <!-- Step 2: Payment Method -->
      <section v-if="currentStep === 1" class="checkout-step">
        <h2>Método de Pagamento</h2>

        <div class="payment-methods">
          <DsCard
            v-for="method in paymentMethods"
            :key="method.id"
            class="payment-card"
            :class="{ 'payment-card--selected': selectedPaymentMethod?.id === method.id }"
            @click="selectPaymentMethod(method)"
          >
            <span class="payment-card__icon">{{ method.icon }}</span>
            <div class="payment-card__info">
              <strong>{{ method.name }}</strong>
              <span>{{ method.description }}</span>
            </div>
            <div class="payment-card__check">
              {{ selectedPaymentMethod?.id === method.id ? '✓' : '' }}
            </div>
          </DsCard>
        </div>

        <div class="checkout-step__actions">
          <DsButton variant="ghost" @click="prevStep">
            Voltar
          </DsButton>
          <DsButton
            variant="primary"
            size="lg"
            :disabled="!selectedPaymentMethod"
            @click="nextStep"
          >
            Continuar
          </DsButton>
        </div>
      </section>

      <!-- Step 3: Confirmation -->
      <section v-if="currentStep === 2" class="checkout-step">
        <h2>Confirmar Pedido</h2>

        <DsCard class="order-summary">
          <h3>Resumo do Pedido</h3>

          <div class="summary-row">
            <span>Pacote:</span>
            <strong>{{ selectedPackage?.name }}</strong>
          </div>
          <div class="summary-row">
            <span>Quantidade de Cotas:</span>
            <strong>{{ selectedPackage?.quotas }} cotas</strong>
          </div>
          <div class="summary-row">
            <span>Pagamento:</span>
            <strong>{{ selectedPaymentMethod?.name }}</strong>
          </div>

          <hr />

          <div class="summary-row summary-row--total">
            <span>Total:</span>
            <strong>{{ formatCurrency(selectedPackage?.price || 0) }}</strong>
          </div>
        </DsCard>

        <DsAlert type="info">
          Ao confirmar, você será redirecionado para finalizar o pagamento.
        </DsAlert>

        <div class="checkout-step__actions">
          <DsButton variant="ghost" @click="prevStep">
            Voltar
          </DsButton>
          <DsButton
            variant="primary"
            size="lg"
            :loading="isProcessing"
            @click="confirmOrder"
          >
            Confirmar Compra
          </DsButton>
        </div>
      </section>

      <!-- Step 4: Success -->
      <section v-if="currentStep === 3" class="checkout-step checkout-step--success">
        <div class="success-content">
          <div class="success-icon">✅</div>
          <h2>Pedido Realizado!</h2>
          <p>Seu pedido foi processado com sucesso.</p>

          <DsCard class="success-details">
            <div class="summary-row">
              <span>Número do Pedido:</span>
              <strong>#{{ orderNumber }}</strong>
            </div>
            <div class="summary-row">
              <span>Status:</span>
              <DsBadge variant="warning">Aguardando Pagamento</DsBadge>
            </div>
          </DsCard>

          <div v-if="selectedPaymentMethod?.id === 'pix'" class="pix-section">
            <h3>Pague com PIX</h3>
            <div class="pix-qr">
              <div class="qr-placeholder">📱 QR Code PIX</div>
            </div>
            <div class="pix-code">
              <code>{{ pixCode }}</code>
              <DsCopyButton :text="pixCode" />
            </div>
            <p class="pix-expiry">Código válido por 30 minutos</p>
          </div>

          <div class="checkout-step__actions">
            <DsButton variant="primary" size="lg" @click="goToDashboard">
              Voltar ao Dashboard
            </DsButton>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  DsCard,
  DsButton,
  DsAlert,
  DsBadge,
  DsCopyButton,
} from '@/design-system';
import { mockQuotaConfig, mockDelay } from '@/mocks';

interface QuotaPackage {
  id: string;
  name: string;
  quotas: number;
  price: number;
  popular?: boolean;
  benefits: string[];
}

const router = useRouter();

// State
const currentStep = ref(0);
const selectedPackage = ref<QuotaPackage | null>(null);
const selectedPaymentMethod = ref<PaymentMethod | null>(null);
const isProcessing = ref(false);
const orderNumber = ref('');
const pixCode = ref('');

// Data
const steps = [
  { id: 'package', label: 'Pacote' },
  { id: 'payment', label: 'Pagamento' },
  { id: 'confirm', label: 'Confirmar' },
  { id: 'success', label: 'Sucesso' },
];

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'pix', name: 'PIX', icon: '💲', description: 'Pagamento instantâneo' },
  { id: 'boleto', name: 'Boleto Bancário', icon: '📄', description: 'Até 3 dias úteis' },
  { id: 'credit', name: 'Cartão de Crédito', icon: '💳', description: 'Até 12x sem juros' },
];

// Computed - Generate packages from config
const packages = computed<QuotaPackage[]>(() => [
  {
    id: 'basic',
    name: 'Básico',
    quotas: 5,
    price: 5 * mockQuotaConfig.quotaPrice,
    benefits: ['Acesso ao sistema', 'Dividendos mensais', 'Indicação direta 10%'],
  },
  {
    id: 'standard',
    name: 'Padrão',
    quotas: 15,
    price: 15 * mockQuotaConfig.quotaPrice,
    popular: true,
    benefits: ['Todos do Básico', 'Bônus de rede nível 1-2', 'Suporte prioritário'],
  },
  {
    id: 'premium',
    name: 'Premium',
    quotas: 50,
    price: 50 * mockQuotaConfig.quotaPrice,
    benefits: ['Todos do Padrão', 'Bônus de rede nível 1-5', 'Acesso VIP', 'Consultor dedicado'],
  },
]);

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function selectPackage(pkg: QuotaPackage) {
  selectedPackage.value = pkg;
}

function selectPaymentMethod(method: PaymentMethod) {
  selectedPaymentMethod.value = method;
}

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

async function confirmOrder() {
  isProcessing.value = true;

  await mockDelay(1500);

  // Generate mock order data
  orderNumber.value = `CQ${Date.now().toString().slice(-8)}`;
  pixCode.value = `00020126580014BR.GOV.BCB.PIX0136${crypto.randomUUID()}5204000053039865802BR5925CIANO COTAS POUSADAS6009SAO PAULO62070503***63041234`;

  isProcessing.value = false;
  currentStep.value = 3;
}

function goToDashboard() {
  router.push('/dashboard');
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.checkout-view {
  padding: $spacing-6;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  &__header {
    text-align: center;
    margin-bottom: $spacing-6;

    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: $spacing-2;
    }
  }

  &__subtitle {
    color: $text-secondary;
    margin: 0;
  }

  &__steps {
    display: flex;
    justify-content: center;
    gap: $spacing-2;
    margin-bottom: $spacing-6;
    flex-wrap: wrap;
  }

  &__content {
    margin-top: $spacing-6;
  }
}

.step {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  background: $neutral-100;
  border-radius: $radius-full;
  transition: all 0.2s;

  &--active {
    background: $primary-500;
    color: white;

    .step__number {
      background: white;
      color: $primary-500;
    }
  }

  &--completed {
    background: $success-light;
    color: $success-dark;

    .step__number {
      background: $success;
      color: white;
    }
  }

  &__number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: $neutral-300;
    color: $text-secondary;
    @include flex-center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__label {
    font-size: 0.875rem;
    font-weight: 500;

    @media (max-width: 576px) {
      display: none;
    }
  }
}

.checkout-step {
  h2 {
    font-size: 1.25rem;
    margin-bottom: $spacing-6;
    text-align: center;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: $spacing-4;
    margin-top: $spacing-6;
  }

  &--success {
    text-align: center;
  }
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.package-card {
  position: relative;
  cursor: pointer;
  text-align: center;
  padding: $spacing-6 !important;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }

  &--selected {
    border-color: $primary-500;
    background: $primary-50;
  }

  &__badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: $warning;
    color: white;
    padding: 4px 12px;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  &__title {
    font-size: 1.25rem;
    color: $text-primary;
    margin-bottom: $spacing-2;
  }

  &__quotas {
    font-size: 0.875rem;
    color: $text-secondary;
    margin-bottom: $spacing-3;

    strong {
      color: $primary-600;
      font-size: 1.5rem;
    }
  }

  &__price {
    font-size: 1.75rem;
    font-weight: 700;
    color: $primary-600;
    margin-bottom: $spacing-4;
  }

  &__benefits {
    list-style: none;
    padding: 0;
    margin: 0 0 $spacing-4;
    text-align: left;
    font-size: 0.875rem;
    color: $text-secondary;

    li {
      padding: $spacing-1 0;
    }
  }
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
  max-width: 500px;
  margin: 0 auto;
}

.payment-card {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4 !important;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    border-color: $primary-300;
  }

  &--selected {
    border-color: $primary-500;
    background: $primary-50;
  }

  &__icon {
    font-size: 2rem;
  }

  &__info {
    flex: 1;
    @include flex-column;
    gap: 2px;

    span {
      font-size: 0.875rem;
      color: $text-secondary;
    }
  }

  &__check {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: $primary-500;
    color: white;
    @include flex-center;
    font-size: 0.875rem;
  }
}

.order-summary {
  max-width: 500px;
  margin: 0 auto $spacing-4;

  h3 {
    margin-bottom: $spacing-4;
  }

  hr {
    border: none;
    border-top: 1px solid $neutral-200;
    margin: $spacing-4 0;
  }
}

.summary-row {
  @include flex-between;
  padding: $spacing-2 0;
  color: $text-secondary;

  strong {
    color: $text-primary;
  }

  &--total {
    font-size: 1.25rem;

    strong {
      color: $primary-600;
    }
  }
}

.success-content {
  max-width: 500px;
  margin: 0 auto;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: $spacing-4;
}

.success-details {
  margin: $spacing-4 0;
}

.pix-section {
  margin-top: $spacing-6;

  h3 {
    margin-bottom: $spacing-4;
  }
}

.pix-qr {
  margin-bottom: $spacing-4;
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background: $neutral-100;
  border-radius: $radius-md;
  @include flex-center;
  font-size: 2rem;
  color: $text-tertiary;
}

.pix-code {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3;
  background: $neutral-100;
  border-radius: $radius-md;
  margin-bottom: $spacing-2;

  code {
    flex: 1;
    font-size: 0.75rem;
    word-break: break-all;
    text-align: left;
    max-height: 60px;
    overflow: hidden;
  }
}

.pix-expiry {
  font-size: 0.875rem;
  color: $text-tertiary;
}
</style>
