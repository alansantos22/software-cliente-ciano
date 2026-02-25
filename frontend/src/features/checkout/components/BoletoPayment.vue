<template>
  <div class="boleto-payment">
    <div class="boleto-payment__header">
      <div class="boleto-payment__icon">📄</div>
      <h2>Boleto Gerado!</h2>
      <p>
        Pague até <strong>{{ dueDateFormatted }}</strong> em qualquer banco,
        caixa eletrônico ou lotérica.
      </p>
    </div>

    <!-- Código de barras -->
    <div class="boleto-payment__code-section">
      <p class="code-label">Código do boleto</p>
      <div class="code-box">
        <code>{{ boletoCode }}</code>
        <button
          class="code-copy-btn"
          :class="{ 'code-copy-btn--copied': isCopied }"
          @click="copyCode"
        >
          {{ isCopied ? '✓ Copiado!' : '📋 Copiar' }}
        </button>
      </div>
    </div>

    <!-- Barras visuais (mock código de barras) -->
    <div class="boleto-payment__barcode">
      <div v-for="n in 60" :key="n" class="barcode-line" :style="barcodeStyle(n)"></div>
    </div>

    <!-- Pedido info -->
    <div class="boleto-payment__order-info">
      <div class="info-row">
        <span>Número do pedido</span>
        <strong>#{{ orderNumber }}</strong>
      </div>
      <div class="info-row">
        <span>Valor</span>
        <strong>{{ formatCurrency(amount) }}</strong>
      </div>
      <div class="info-row">
        <span>Vencimento</span>
        <strong>{{ dueDateFormatted }}</strong>
      </div>
      <div class="info-row">
        <span>Status</span>
        <DsBadge variant="warning">Aguardando pagamento</DsBadge>
      </div>
    </div>

    <!-- Alerta informativo -->
    <DsAlert type="info">
      Após o pagamento, a confirmação pode levar até <strong>3 dias úteis</strong>.
      Suas cotas serão ativadas automaticamente após a compensação bancária.
    </DsAlert>

    <!-- Ações -->
    <div class="boleto-payment__actions">
      <DsButton variant="outline" @click="downloadBoleto">
        ⬇ Baixar PDF
      </DsButton>
      <DsButton variant="primary" size="lg" @click="$emit('goToDashboard')">
        Ir para o Dashboard
      </DsButton>
    </div>

    <!-- Referral CTA -->
    <div class="boleto-payment__referral">
      <p class="referral__eyebrow">💡 Enquanto aguardamos a compensação...</p>
      <h3>Compartilhe e já comece a ganhar</h3>
      <div class="referral__link-row">
        <span class="referral__link">ciano.com.br/{{ referralCode }}</span>
        <button
          class="referral__btn"
          :class="{ 'referral__btn--copied': isReferralCopied }"
          @click="copyReferral"
        >
          {{ isReferralCopied ? '✓ Copiado!' : '📋 Copiar meu link de indicação' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { DsButton, DsBadge, DsAlert } from '@/design-system';

// ─── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  orderNumber: string;
  boletoCode: string;
  amount: number;
  referralCode: string;
}>();

defineEmits<{
  goToDashboard: [];
}>();

// ─── State ────────────────────────────────────────────────────────────────────
const isCopied = ref(false);
const isReferralCopied = ref(false);

// ─── Computed ─────────────────────────────────────────────────────────────────
const dueDateFormatted = computed(() => {
  const due = new Date();
  due.setDate(due.getDate() + 3);
  return due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
});

// ─── Methods ──────────────────────────────────────────────────────────────────
async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.boletoCode);
  } catch (_) { /* fallback */ }
  isCopied.value = true;
  setTimeout(() => { isCopied.value = false; }, 2500);
}

async function copyReferral() {
  try {
    await navigator.clipboard.writeText(`ciano.com.br/${props.referralCode}`);
  } catch (_) { /* fallback */ }
  isReferralCopied.value = true;
  setTimeout(() => { isReferralCopied.value = false; }, 2500);
}

function downloadBoleto() {
  // In production: trigger real PDF download
  alert('Download do boleto iniciado (mock)');
}

// Generate pseudorandom barcode line widths deterministically
function barcodeStyle(n: number): Record<string, string> {
  const seed = (n * 2654435761) % 256;
  const width = seed % 3 === 0 ? '3px' : '1.5px';
  const opacity = seed % 5 === 0 ? '0.4' : '1';
  return { width, opacity };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.boleto-payment {
  @include flex-column;
  gap: $spacing-6;
  max-width: 600px;
  margin: 0 auto;

  &__header {
    text-align: center;
    @include flex-column;
    align-items: center;
    gap: $spacing-2;

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: $neutral-900;
      margin: 0;
    }

    p {
      color: $text-secondary;
      font-size: 0.9rem;
      margin: 0;
    }
  }

  &__icon {
    font-size: 2.5rem;
  }

  // ── Código de barras ──────────────────────────────────────────────────────
  &__code-section {
    @include flex-column;
    gap: $spacing-2;

    .code-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: $text-tertiary;
      margin: 0;
    }
  }

  .code-box {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-4;
    background: $neutral-100;
    border-radius: $radius-lg;
    border: 1px solid $neutral-200;

    code {
      flex: 1;
      font-size: 0.8rem;
      word-break: break-all;
      color: $neutral-700;
    }
  }

  .code-copy-btn {
    padding: $spacing-2 $spacing-4;
    background: $primary-500;
    color: white;
    border: none;
    border-radius: $radius-md;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
    flex-shrink: 0;

    &:hover { background: $primary-700; }
    &--copied { background: $success; }
  }

  // ── Barcode visual ────────────────────────────────────────────────────────
  &__barcode {
    display: flex;
    align-items: stretch;
    height: 60px;
    background: white;
    border: 1px solid $neutral-200;
    border-radius: $radius-md;
    padding: $spacing-2 $spacing-4;
    gap: 2px;
    overflow: hidden;
  }

  .barcode-line {
    background: $neutral-900;
    flex-shrink: 0;
    border-radius: 1px;
  }

  // ── Order info ────────────────────────────────────────────────────────────
  &__order-info {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    overflow: hidden;
  }

  .info-row {
    @include flex-between;
    padding: $spacing-4 $spacing-5;
    border-bottom: 1px solid $neutral-100;
    font-size: 0.875rem;

    &:last-child { border-bottom: none; }

    span { color: $text-secondary; }
    strong { color: $neutral-800; font-weight: 600; }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  &__actions {
    display: flex;
    gap: $spacing-4;
    align-items: center;

    @media (max-width: 500px) {
      flex-direction: column;

      > * { width: 100%; }
    }
  }

  // ── Referral ──────────────────────────────────────────────────────────────
  &__referral {
    border: 2px solid $accent-200;
    border-radius: $radius-xl;
    padding: $spacing-5;
    background: $accent-50;
    @include flex-column;
    gap: $spacing-3;

    .referral__eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      color: $warning-dark;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
    }

    h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: $neutral-900;
      margin: 0;
    }
  }

  .referral__link-row {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  .referral__link {
    font-size: 0.8rem;
    font-weight: 600;
    color: $primary-700;
    background: white;
    border: 1px solid $primary-200;
    border-radius: $radius-md;
    padding: $spacing-2 $spacing-3;
  }

  .referral__btn {
    padding: $spacing-3 $spacing-4;
    background: $accent-500;
    color: $neutral-900;
    border: none;
    border-radius: $radius-lg;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;

    &:hover { background: $accent-600; }
    &--copied { background: $success; color: white; }
  }
}
</style>
