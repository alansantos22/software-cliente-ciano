<template>
  <div class="card-redirect">
    <div class="card-redirect__card">
      <!-- Spinner animado -->
      <div class="card-redirect__spinner">
        <div class="spinner"></div>
        <div class="spinner-lock">
        <font-awesome-icon :icon="['fas', 'shield-halved']" />
      </div>
      </div>

      <h2>Redirecionando para pagamento seguro...</h2>
      <p>
        Você será direcionado ao ambiente seguro da <strong>Pagar.me</strong> para
        inserir os dados do seu cartão.
      </p>

      <!-- Resumo do pedido -->
      <div class="card-redirect__summary">
        <div class="summary-row">
          <span>Pedido</span>
          <strong>#{{ orderNumber }}</strong>
        </div>
        <div class="summary-row summary-row--total">
          <span>Valor</span>
          <strong>{{ formatCurrency(amount) }}</strong>
        </div>
      </div>

      <!-- Security badges -->
      <div class="card-redirect__badges">
        <div class="security-badge">
          <font-awesome-icon :icon="['fas', 'shield-halved']" />
          <span>SSL 256-bit</span>
        </div>
        <div class="security-badge">
          <font-awesome-icon :icon="['fas', 'circle-check']" />
          <span>PCI-DSS</span>
        </div>
        <div class="security-badge">
          <font-awesome-icon :icon="['fas', 'credit-card']" />
          <span>Pagar.me</span>
        </div>
      </div>

      <p class="card-redirect__note">
        Após o pagamento, você será redirecionado de volta ao Ciano automaticamente.
        Não feche esta janela.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

// ─── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{
  orderNumber: string;
  amount: number;
  paymentUrl: string;
}>();

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  // In production: redirect to Pagar.me after brief delay for UX feedback
  setTimeout(() => {
    if (props.paymentUrl) {
      window.location.href = props.paymentUrl;
    }
    // In mock: no real redirect
  }, 2500);
});

// ─── Methods ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.card-redirect {
  @include flex-center;
  padding: $spacing-8 0;

  &__card {
    max-width: 480px;
    width: 100%;
    @include flex-column;
    align-items: center;
    gap: $spacing-5;
    text-align: center;

    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      color: $neutral-900;
      margin: 0;
    }

    p {
      color: $text-secondary;
      font-size: 0.9rem;
      line-height: 1.6;
      margin: 0;

      strong { color: $neutral-800; }
    }
  }

  // ── Spinner ───────────────────────────────────────────────────────────────
  &__spinner {
    position: relative;
    width: 80px;
    height: 80px;
    @include flex-center;
  }

  .spinner {
    position: absolute;
    inset: 0;
    border: 4px solid $neutral-200;
    border-top-color: $primary-500;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-lock {
    font-size: 1.3rem;
    z-index: 1;
    color: $primary-600;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  &__summary {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    padding: $spacing-4;
    width: 100%;
    background: $neutral-50;
    @include flex-column;
    gap: $spacing-2;
  }

  .summary-row {
    @include flex-between;
    font-size: 0.875rem;
    color: $text-secondary;

    strong { color: $neutral-800; font-weight: 600; }

    &--total {
      padding-top: $spacing-2;
      border-top: 1px solid $neutral-200;
      margin-top: $spacing-1;

      strong {
        font-size: 1.15rem;
        font-weight: 800;
        color: $primary-700;
      }
    }
  }

  // ── Security badges ───────────────────────────────────────────────────────
  &__badges {
    display: flex;
    gap: $spacing-3;
    flex-wrap: wrap;
    justify-content: center;
  }

  .security-badge {
    display: flex;
    align-items: center;
    gap: $spacing-1;
    padding: $spacing-2 $spacing-3;
    background: $secondary-50;
    border: 1px solid $secondary-200;
    border-radius: $radius-full;
    font-size: 0.75rem;
    font-weight: 600;
    color: $success-dark;
  }

  &__note {
    font-size: 0.775rem !important;
    color: $text-tertiary !important;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
