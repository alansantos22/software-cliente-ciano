<template>
  <div class="confirmation-view">
    <!-- Celebration header -->
    <div class="confirmation-view__hero">
      <div class="hero__glow" :style="{ '--c': levelConfig.color }"></div>

      <Transition name="pop-in" appear>
        <div class="hero__badge" :style="{ '--c': levelConfig.color }">
          <font-awesome-icon :icon="['fas', levelConfig.icon]" class="hero__badge-icon" />
        </div>
      </Transition>

      <Transition name="slide-up" appear>
        <div class="hero__text">
          <p class="hero__eyebrow">Investimento realizado com sucesso!</p>
          <h1 class="hero__title">
            Bem-vindo ao nível
            <span :style="{ color: levelConfig.color }">{{ levelConfig.label }}</span>!
          </h1>
          <p class="hero__subtitle">
            Pedido <strong>#{{ transactionId }}</strong> confirmado.
            {{ methodMessage }}
          </p>
        </div>
      </Transition>
    </div>

    <!-- Impact cards -->
    <Transition name="slide-up" appear>
      <div class="confirmation-view__impact" style="transition-delay: 0.15s">
        <div class="impact-card">
          <span class="impact-card__icon">
            <font-awesome-icon :icon="['fas', 'coins']" />
          </span>
          <span class="impact-card__label">Cotas adquiridas</span>
          <span class="impact-card__value">{{ quotaCount }}</span>
        </div>
        <div class="impact-card impact-card--level" :style="{ '--c': levelConfig.color }">
          <span class="impact-card__icon">
            <font-awesome-icon :icon="['fas', levelConfig.icon]" />
          </span>
          <span class="impact-card__label">Seu novo status</span>
          <span class="impact-card__value" :style="{ color: levelConfig.color }">
            {{ levelConfig.label }}
          </span>
        </div>
        <div class="impact-card">
          <span class="impact-card__icon">
            <font-awesome-icon :icon="['fas', 'arrow-trend-up']" />
          </span>
          <span class="impact-card__label">Benefícios ativos</span>
          <span class="impact-card__value">{{ levelConfig.benefitsCount }}+</span>
        </div>
      </div>
    </Transition>

    <!-- Benefícios desbloqueados -->
    <Transition name="slide-up" appear>
      <div class="confirmation-view__benefits" style="transition-delay: 0.25s">
        <h3>Benefícios desbloqueados</h3>
        <ul>
          <li v-for="b in levelConfig.benefits" :key="b">
            <span class="benefit-check" :style="{ color: levelConfig.color }">✓</span>
            <span>{{ b }}</span>
          </li>
        </ul>
      </div>
    </Transition>

    <!-- Referral CTA -->
    <Transition name="slide-up" appear>
      <div class="confirmation-view__referral" style="transition-delay: 0.35s">
        <div class="referral__content">
          <p class="referral__eyebrow">Multiplique seus rendimentos</p>
          <h3>Compartilhe e receba comissões</h3>
          <p>
            Cada novo investidor que entrar pelo seu link rende comissões diretas
            para você. Comece agora com a endorfina em alta!
          </p>
          <div class="referral__box">
            <div class="referral__link-display">
              <span>ciano.com.br/</span><strong>{{ referralCode }}</strong>
            </div>
            <button
              class="referral__copy-btn"
              :class="{ 'referral__copy-btn--copied': isCopied }"
              @click="copyLink"
            >
              <font-awesome-icon :icon="['fas', isCopied ? 'check' : 'copy']" />
              {{ isCopied ? 'Link copiado!' : 'Copiar meu link de indicação' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Actions -->
    <Transition name="slide-up" appear>
      <div class="confirmation-view__actions" style="transition-delay: 0.45s">
        <DsButton variant="outline" @click="router.push('/quotas')">
          Ver minhas cotas
        </DsButton>
        <DsButton variant="primary" size="lg" @click="router.push('/dashboard')">
          Ir para o Dashboard →
        </DsButton>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import confetti from 'canvas-confetti';
import { useAuthStore } from '@/shared/stores';
import { DsButton } from '@/design-system';

// ─── Router / Stores ──────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// ─── Level config ─────────────────────────────────────────────────────────────
const levelConfigs = {
  socio: {
    key: 'socio',
    label: 'Sócio',
    icon: 'handshake',
    color: '#00bcd4',
    benefitsCount: 4,
    benefits: [
      'Participação nos lucros do Grupo Ciano',
      'Participação na valorização do grupo',
      'Comissões por indicações',
      'Acesso ao grupo geral de investidores',
    ],
  },
  platinum: {
    key: 'platinum',
    label: 'Platinum',
    icon: 'star',
    color: '#64748b',
    benefitsCount: 8,
    benefits: [
      '30% desconto em pousadas Ciano',
      'Comissão maior nas indicações',
      'Acesso antecipado a lotes com desconto',
      'Reunião mensal com Marcos Maziero',
    ],
  },
  vip: {
    key: 'vip',
    label: 'VIP',
    icon: 'crown',
    color: '#b45309',
    benefitsCount: 12,
    benefits: [
      '50% desconto em todas as pousadas',
      '1 final de semana gratuito por ano',
      'Convites para eventos e inaugurações',
      'Nome listado como Sócio VIP nas pousadas',
    ],
  },
  imperial: {
    key: 'imperial',
    label: 'Imperial',
    icon: 'gem',
    color: '#7c3aed',
    benefitsCount: 18,
    benefits: [
      'Hospedagem gratuita ilimitada',
      'Pode residir em pousada com desconto especial',
      '40% desconto para familiares',
      'Viagem anual com Marcos Maziero',
      'Quadro com sua foto no hall da pousada',
      'Canal VIP direto com Marcos',
    ],
  },
};

// ─── Route data ───────────────────────────────────────────────────────────────
const transactionId = computed(() => route.params.transactionId as string);
const quotaCount = computed(() => Number(route.query.quotas) || 0);
const paymentMethod = computed(() => (route.query.method as string) || 'pix');
const levelKey = computed(() => (route.query.level as string) || 'socio');

const levelConfig = computed(
  () => levelConfigs[levelKey.value as keyof typeof levelConfigs] ?? levelConfigs.socio,
);

const referralCode = computed(() => authStore.user?.referralCode ?? 'CIANO');

const methodMessage = computed(() => {
  switch (paymentMethod.value) {
    case 'pix':
      return 'Pagamento PIX confirmado instantaneamente.';
    case 'boleto':
      return 'Boleto compensado. Suas cotas já estão ativas.';
    case 'credit':
      return 'Pagamento via cartão confirmado pela Pagar.me.';
    default:
      return 'Suas cotas estão ativas.';
  }
});

// ─── State ────────────────────────────────────────────────────────────────────
const isCopied = ref(false);

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  launchConfetti();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#B8860B', '#C0C0C0', '#FFD700', '#0097a7', '#1a2e4a', '#4a3728'];

  // First burst
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.5, y: 0.55 },
    colors,
    gravity: 0.9,
  });

  // Second burst after a short delay (left + right cannons)
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 250);
}

async function copyLink() {
  const link = `ciano.com.br/${referralCode.value}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch (_) {
    /* fallback */
  }
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 3000);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.confirmation-view {
  @include flex-column;
  align-items: center;
  gap: $spacing-8;
  padding: $spacing-10 $spacing-6;
  max-width: 680px;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: $spacing-8 $spacing-4;
    gap: $spacing-6;
  }

  // ── Hero ──────────────────────────────────────────────────────────────────
  &__hero {
    @include flex-column;
    align-items: center;
    gap: $spacing-5;
    text-align: center;
    position: relative;
    width: 100%;
  }

  .hero__glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--c) 20%, transparent) 0%, transparent 70%);
    pointer-events: none;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  .hero__badge {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: linear-gradient(135deg, white, color-mix(in srgb, var(--c) 15%, white));
    border: 4px solid var(--c);
    @include flex-center;
    box-shadow: 0 8px 32px color-mix(in srgb, var(--c) 30%, transparent);
  }

  .hero__badge-icon {
    font-size: 2.4rem;
    color: var(--c);
  }

  .hero__text {
    @include flex-column;
    gap: $spacing-2;
  }

  .hero__eyebrow {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $success-dark;
    margin: 0;
  }

  .hero__title {
    font-size: 2rem;
    font-weight: 800;
    color: $neutral-900;
    line-height: 1.2;
    margin: 0;

    @media (max-width: 480px) {
      font-size: 1.5rem;
    }
  }

  .hero__subtitle {
    color: $text-secondary;
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.6;
  }

  // ── Impact cards ──────────────────────────────────────────────────────────
  &__impact {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-4;
    width: 100%;

    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }
  }

  .impact-card {
    @include flex-column;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-5;
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    background: white;
    text-align: center;

    &--level {
      border-color: var(--c);
      background: white;
    }

    &__icon {
      font-size: 1.4rem;
      color: $neutral-500;

      .impact-card--level & {
        color: var(--c);
      }
    }

    &__label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: $text-tertiary;
    }

    &__value {
      font-size: 1.25rem;
      font-weight: 800;
      color: $neutral-900;
    }
  }

  // ── Benefits ──────────────────────────────────────────────────────────────
  &__benefits {
    border: 2px solid $neutral-200;
    border-radius: $radius-xl;
    padding: $spacing-5;
    background: white;
    width: 100%;

    h3 {
      font-size: 1rem;
      font-weight: 700;
      color: $neutral-800;
      margin-bottom: $spacing-4;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      @include flex-column;
      gap: $spacing-2;
    }

    li {
      display: flex;
      align-items: flex-start;
      gap: $spacing-3;
      font-size: 0.875rem;
      color: $neutral-700;
    }

    .benefit-check {
      font-size: 1rem;
      flex-shrink: 0;
    }
  }

  // ── Referral ──────────────────────────────────────────────────────────────
  &__referral {
    background: $neutral-900;
    border: 1px solid $neutral-800;
    border-radius: $radius-2xl;
    padding: $spacing-6;
    width: 100%;

    .referral__content {
      @include flex-column;
      gap: $spacing-4;
    }

    .referral__eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: $primary-400;
      margin: 0;
    }

    h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    p {
      font-size: 0.875rem;
      color: $neutral-400;
      line-height: 1.6;
      margin: 0;
    }
  }

  .referral__box {
    @include flex-column;
    gap: $spacing-3;
  }

  .referral__link-display {
    background: $neutral-800;
    border: 1px solid $neutral-700;
    border-radius: $radius-lg;
    padding: $spacing-3 $spacing-4;
    font-size: 0.875rem;
    color: $neutral-300;

    strong { font-weight: 800; color: white; }
  }

  .referral__copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    width: 100%;
    padding: $spacing-4;
    background: $primary-500;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover { background: $primary-600; transform: translateY(-1px); }
    &--copied { background: $success; color: white; }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  &__actions {
    display: flex;
    gap: $spacing-4;
    width: 100%;

    @media (max-width: 500px) {
      flex-direction: column;
    }

    > * {
      flex: 1;

      @media (max-width: 500px) {
        width: 100%;
      }
    }
  }
}

// ─── Animations ───────────────────────────────────────────────────────────────
@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

.pop-in-enter-active {
  animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
}

.slide-up-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
  transition-delay: var(--delay, 0s);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
</style>
