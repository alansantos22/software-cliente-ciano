<template>
  <div class="pix-payment">
    <div class="pix-payment__header">
      <div class="pix-payment__status-dot" :class="{ 'status-dot--pulse': !isPaid }"></div>
      <h2>Pague com PIX</h2>
      <p>Escaneie o QR Code ou copie o código no seu banco</p>
    </div>

    <div class="pix-payment__body">
      <!-- Coluna esquerda: QR + código -->
      <div class="pix-payment__main">
        <!-- Timer -->
        <div
          class="pix-payment__timer"
          :class="{
            'timer--warning': remainingSeconds < 180 && remainingSeconds > 0,
            'timer--expired': remainingSeconds === 0,
          }"
        >
          <span class="timer__label">
            {{ remainingSeconds > 0 ? 'Expira em' : 'Código expirado' }}
          </span>
          <span class="timer__value">{{ formattedTime }}</span>
        </div>

        <!-- QR Code mock visual -->
        <div class="pix-payment__qr-wrap">
          <div v-if="!isPaid" class="qr-code">
            <div class="qr-code__corner qr-code__corner--tl">
              <div class="corner-inner"></div>
            </div>
            <div class="qr-code__corner qr-code__corner--tr">
              <div class="corner-inner"></div>
            </div>
            <div class="qr-code__corner qr-code__corner--bl">
              <div class="corner-inner"></div>
            </div>
            <div class="qr-code__data"></div>
            <div class="qr-code__logo">
              <span>⚡</span>
            </div>
          </div>

          <!-- Paid state overlay -->
          <Transition name="paid-reveal">
            <div v-if="isPaid" class="pix-payment__paid-overlay">
              <div class="paid-check">✓</div>
              <p>Pagamento confirmado!</p>
            </div>
          </Transition>
        </div>

        <!-- Pix code copy -->
        <div class="pix-payment__code-area">
          <code class="pix-code">{{ truncatedPixCode }}</code>
          <button class="copy-btn" :class="{ 'copy-btn--copied': isCopied }" @click="copyPixCode">
            <span>{{ isCopied ? '✓ Copiado!' : '📋 Copiar código' }}</span>
          </button>
        </div>

        <!-- Instrução passo a passo -->
        <ol class="pix-payment__steps">
          <li>Abra o app do seu banco</li>
          <li>Escolha a opção <strong>Pagar com PIX</strong></li>
          <li>Escaneie o QR Code ou cole o código copiado</li>
          <li>Confirme o valor de <strong>{{ formatCurrency(amount) }}</strong></li>
        </ol>
      </div>

      <!-- Coluna direita: info + CTA referral -->
      <div class="pix-payment__sidebar">
        <!-- Resumo aguardando -->
        <div class="pix-payment__order-card">
          <p class="order-card__label">Pedido</p>
          <p class="order-card__number">#{{ orderNumber }}</p>
          <DsBadge variant="warning">Aguardando pagamento</DsBadge>
          <div class="order-card__amount">{{ formatCurrency(amount) }}</div>
        </div>

        <!-- CTA de indicação enquanto aguarda -->
        <div class="pix-payment__referral">
          <p class="referral__eyebrow">💡 Enquanto aguardamos...</p>
          <h3>Comece a montar sua rede agora</h3>
          <p class="referral__desc">
            Compartilhe seu link de indicação e ganhe comissões em cada nova 
            adesão da sua rede.
          </p>
          <div class="referral__link-box">
            <span class="referral__link">ciano.com.br/{{ referralCode }}</span>
            <button
              class="referral__copy-btn"
              :class="{ 'referral__copy-btn--copied': isReferralCopied }"
              @click="copyReferralLink"
            >
              {{ isReferralCopied ? '✓ Copiado!' : '📋 Copiar meu link' }}
            </button>
          </div>
        </div>

        <!-- Polling status -->
        <div class="pix-payment__polling">
          <div class="polling-dot"></div>
          <span>Confirmando pagamento automaticamente...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DsBadge } from '@/design-system';

// ─── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  orderNumber: string;
  pixCode: string;
  amount: number;
  referralCode: string;
}>();

const emit = defineEmits<{
  paid: [];
}>();

// ─── State ────────────────────────────────────────────────────────────────────
const remainingSeconds = ref(900); // 15 minutes
const isCopied = ref(false);
const isReferralCopied = ref(false);
const isPaid = ref(false);

let timerInterval: ReturnType<typeof setInterval> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let pollCount = ref(0);

// ─── Computed ─────────────────────────────────────────────────────────────────
const formattedTime = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60);
  const s = remainingSeconds.value % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const truncatedPixCode = computed(() => {
  if (props.pixCode.length > 40) {
    return props.pixCode.slice(0, 40) + '...';
  }
  return props.pixCode;
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  // Countdown timer
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--;
    } else {
      clearInterval(timerInterval!);
    }
  }, 1000);

  // Simulate polling (mock: confirm payment after ~8 seconds for demo)
  pollInterval = setInterval(() => {
    pollCount.value++;
    // In production: call API to check payment status
    // For mock: confirm after 8th poll (8 seconds)
    if (pollCount.value >= 8) {
      clearInterval(pollInterval!);
      isPaid.value = true;
      setTimeout(() => {
        emit('paid');
      }, 1200);
    }
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (pollInterval) clearInterval(pollInterval);
});

// ─── Methods ──────────────────────────────────────────────────────────────────
async function copyPixCode() {
  try {
    await navigator.clipboard.writeText(props.pixCode);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } catch {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  }
}

async function copyReferralLink() {
  const link = `ciano.com.br/${props.referralCode}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    // fallback
  }
  isReferralCopied.value = true;
  setTimeout(() => {
    isReferralCopied.value = false;
  }, 2500);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.pix-payment {
  @include flex-column;
  gap: $spacing-6;

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

  &__status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: $success;

    &.status-dot--pulse {
      animation: pulse-dot 1.5s infinite;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: $spacing-8;
    align-items: start;

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
    }
  }

  &__main {
    @include flex-column;
    align-items: center;
    gap: $spacing-5;
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  &__timer {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3 $spacing-5;
    border-radius: $radius-full;
    background: $secondary-50;
    border: 2px solid $secondary-200;
    transition: all 0.3s ease;

    &.timer--warning {
      background: $accent-50;
      border-color: $accent-200;

      .timer__value {
        color: $warning-dark;
      }
    }

    &.timer--expired {
      background: #fef2f2;
      border-color: $error-light;

      .timer__value {
        color: $error;
      }
    }
  }

  .timer__label {
    font-size: 0.8rem;
    color: $text-secondary;
    font-weight: 500;
  }

  .timer__value {
    font-size: 1.4rem;
    font-weight: 800;
    color: $success-dark;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  // ── QR Code visual ────────────────────────────────────────────────────────
  &__qr-wrap {
    position: relative;
    width: 220px;
    height: 220px;
    @include flex-center;
  }

  .qr-code {
    width: 220px;
    height: 220px;
    background: white;
    border: 3px solid $neutral-900;
    border-radius: $radius-lg;
    position: relative;
    padding: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);

    &__corner {
      position: absolute;
      width: 48px;
      height: 48px;
      border: 5px solid $neutral-900;
      border-radius: 4px;

      &--tl { top: 12px; left: 12px; border-right: none; border-bottom: none; }
      &--tr { top: 12px; right: 12px; border-left: none; border-bottom: none; }
      &--bl { bottom: 12px; left: 12px; border-right: none; border-top: none; }

      .corner-inner {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        bottom: 8px;
        background: $neutral-900;
        border-radius: 2px;
      }
    }

    &__data {
      position: absolute;
      inset: 20px;
      background-image:
        radial-gradient(circle, #{$neutral-900} 40%, transparent 40%);
      background-size: 9px 9px;
      opacity: 0.75;
    }

    &__logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 42px;
      height: 42px;
      background: white;
      border-radius: $radius-md;
      @include flex-center;
      font-size: 1.4rem;
      box-shadow: 0 0 0 4px white;
    }
  }

  &__paid-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.95);
    border-radius: $radius-lg;
    @include flex-center;
    flex-direction: column;
    gap: $spacing-2;

    .paid-check {
      width: 64px;
      height: 64px;
      background: $success;
      border-radius: 50%;
      @include flex-center;
      color: white;
      font-size: 2rem;
      font-weight: 700;
    }

    p {
      font-weight: 700;
      color: $success-dark;
      font-size: 0.9rem;
    }
  }

  // ── Pix code ──────────────────────────────────────────────────────────────
  &__code-area {
    @include flex-column;
    align-items: center;
    gap: $spacing-3;
    width: 100%;
    max-width: 340px;
  }

  .pix-code {
    display: block;
    width: 100%;
    padding: $spacing-3 $spacing-4;
    background: $neutral-100;
    border-radius: $radius-md;
    font-size: 0.7rem;
    word-break: break-all;
    text-align: center;
    color: $neutral-700;
    line-height: 1.5;
  }

  .copy-btn {
    padding: $spacing-3 $spacing-6;
    background: $primary-500;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover { background: $primary-700; }

    &--copied {
      background: $success;

      &:hover { background: $success-dark; }
    }
  }

  // ── Steps ─────────────────────────────────────────────────────────────────
  &__steps {
    margin: 0;
    padding: 0 0 0 $spacing-5;
    width: 100%;
    max-width: 340px;

    li {
      font-size: 0.85rem;
      color: $text-secondary;
      padding: $spacing-1 0;
      line-height: 1.5;

      strong { color: $neutral-800; }
    }
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  &__sidebar {
    @include flex-column;
    gap: $spacing-5;
    position: sticky;
    top: $spacing-6;
  }

  &__order-card {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    padding: $spacing-5;
    background: $neutral-50;
    @include flex-column;
    gap: $spacing-2;

    .order-card__label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: $text-tertiary;
      font-weight: 600;
      margin: 0;
    }

    .order-card__number {
      font-size: 1.1rem;
      font-weight: 700;
      color: $neutral-900;
      margin: 0;
    }

    .order-card__amount {
      font-size: 1.5rem;
      font-weight: 800;
      color: $primary-700;
      margin-top: $spacing-2;
    }
  }

  // ── Referral CTA ──────────────────────────────────────────────────────────
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

    .referral__desc {
      font-size: 0.825rem;
      color: $text-secondary;
      margin: 0;
      line-height: 1.5;
    }
  }

  .referral__link-box {
    @include flex-column;
    gap: $spacing-2;
  }

  .referral__link {
    font-size: 0.8rem;
    font-weight: 600;
    color: $primary-700;
    background: white;
    border: 1px solid $primary-200;
    border-radius: $radius-md;
    padding: $spacing-2 $spacing-3;
    word-break: break-all;
  }

  .referral__copy-btn {
    padding: $spacing-3;
    background: $accent-500;
    color: $neutral-900;
    border: none;
    border-radius: $radius-lg;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;

    &:hover { background: $accent-600; }

    &--copied {
      background: $success;
      color: white;
    }
  }

  // ── Polling indicator ─────────────────────────────────────────────────────
  &__polling {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: 0.775rem;
    color: $text-tertiary;
    justify-content: center;

    .polling-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: $success;
      animation: pulse-dot 1.2s infinite;
    }
  }
}

// ── Animations ────────────────────────────────────────────────────────────────
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.paid-reveal-enter-active {
  animation: paid-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes paid-pop {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: scale(1); }
}
</style>
