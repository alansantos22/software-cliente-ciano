<template>
  <div class="quotas-lp">

    <!-- ============================================================
         1. HERO
    ============================================================ -->
    <section class="hero">
      <div class="hero__backdrop" aria-hidden="true">
        <div class="hero__orb hero__orb--1" />
        <div class="hero__orb hero__orb--2" />
      </div>
      <div class="hero__content">
        <span class="hero__eyebrow">Grupo Ciano de Pousadas &amp; Resorts</span>
        <h1 class="hero__headline">
          Não compre apenas<br />
          <span class="hero__headline-highlight">uma cota.</span><br />
          Seja dono de um<br />
          <span class="hero__headline-highlight">império hoteleiro.</span>
        </h1>
        <p class="hero__sub">
          Torne-se sócio de um grupo hoteleiro em expansão. Receba dividendos mensais,
          ganhe por indicações e evolua sua carreira enquanto o seu patrimônio cresce.
        </p>
        <div class="hero__actions">
          <DsButton variant="primary" size="lg" @click="scrollTo('pricing')">
            Ver Planos e Preços
          </DsButton>
        </div>
        <div class="hero__social-trust">
          <span v-for="m in heroMetrics" :key="m.label" class="hero__metric">
            <strong>{{ m.value }}</strong>
            <span>{{ m.label }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ============================================================
         2. HOW IT WORKS
    ============================================================ -->
    <section class="lp-section how-it-works">
      <div class="section-header">
        <span class="section-eyebrow">Como Funciona</span>
        <h2>De zero a sócio em 4 passos</h2>
      </div>
      <div class="steps-track">
        <div
          v-for="(step, idx) in steps"
          :key="step.title"
          class="step-item"
        >
          <div class="step-item__connector" v-if="idx < steps.length - 1" aria-hidden="true" />
          <div class="step-item__circle">
            <span class="step-item__icon"><font-awesome-icon :icon="step.icon" /></span>
            <span class="step-item__num">{{ idx + 1 }}</span>
          </div>
          <h3 class="step-item__title">{{ step.title }}</h3>
          <p class="step-item__desc">{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ============================================================
         3. PRICING
    ============================================================ -->
    <section id="pricing" class="lp-section pricing-section">

      <!-- Split countdown banner -->
      <div class="split-alert">
        <span class="split-alert__icon"><font-awesome-icon icon="hourglass" /></span>
        <span>
          O preço da cota vai subir no próximo split em:
          <strong class="split-alert__timer">{{ countdownDisplay }}</strong>
        </span>
        <span class="split-alert__tag">Preço atual garantido por tempo limitado</span>
      </div>

      <div class="section-header">
        <span class="section-eyebrow">Pacotes de Investimento</span>
        <h2>Escolha sua posição no grupo</h2>
        <p class="section-sub">Cada pacote já te posiciona em um nível da carreira imediatamente</p>
      </div>

      <div class="packages-grid">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="pkg-card"
          :class="{ 'pkg-card--featured': pkg.popular }"
        >
          <div v-if="pkg.popular" class="pkg-card__ribbon"><font-awesome-icon icon="star" /> Mais Popular</div>

          <div class="pkg-card__level-badge" :style="{ background: pkg.levelColor }">
            <font-awesome-icon :icon="pkg.levelEmoji" /> Você inicia como <strong>{{ pkg.levelName }}</strong>
          </div>

          <h3 class="pkg-card__name">{{ pkg.name }}</h3>
          <div class="pkg-card__subtitle">Seja sócio do {{ pkg.hotelSubtitle }}</div>

          <div class="pkg-card__price-block">
            <div class="pkg-card__quotas">
              <span class="pkg-card__quotas-num">{{ pkg.quotas }}</span>
              <span class="pkg-card__quotas-label">cotas</span>
            </div>
            <div class="pkg-card__price">{{ formatCurrency(pkg.price) }}</div>
            <div class="pkg-card__per-quota">
              {{ formatCurrency(quotaPrice) }} / cota
            </div>
          </div>

          <ul class="pkg-card__benefits">
            <li v-for="b in pkg.benefits" :key="b">
              <span class="pkg-card__check"><font-awesome-icon icon="check" /></span>
              {{ b }}
            </li>
          </ul>

          <DsButton
            :variant="pkg.popular ? 'primary' : 'outline'"
            size="lg"
            class="pkg-card__cta"
            @click="goToCheckout(pkg.id)"
          >
            {{ pkg.ctaLabel }}
          </DsButton>
        </div>
      </div>
    </section>

    <!-- ============================================================
         3. CAREER TIMELINE
    ============================================================ -->
    <section class="lp-section career-section">
      <div class="section-header">
        <span class="section-eyebrow">Plano de Carreira</span>
        <h2>Sua jornada do Bronze ao Diamante</h2>
        <p class="section-sub">Passe o mouse sobre cada nível para ver o que você desbloqueia</p>
      </div>
      <CareerTimeline />
    </section>

    <!-- NOTE: Depoimentos e FAQ removidos por solicitação do cliente -->

    <!-- ============================================================
         5. FOOTER CTA
    ============================================================ -->
    <section class="footer-cta">
      <div class="footer-cta__backdrop" aria-hidden="true" />
      <div class="footer-cta__content">
        <h2 class="footer-cta__headline">
          Pronto para lucrar com o Grupo Ciano?
        </h2>
        <p class="footer-cta__sub">
          Vagas limitadas por período de split. Quanto antes você entrar, mais barata é sua cota.
        </p>
        <DsButton variant="primary" size="lg" @click="goToCheckout()">
          Garantir minha posição agora
        </DsButton>
        <p class="footer-cta__disclaimer">
          Pagamentos via PIX todo dia 5 • Suporte dedicado • Contrato registrado
        </p>
      </div>
    </section>

  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { DsButton } from '@/design-system';
import { quotasService } from '@/shared/services/quotas.service';
import { useQuotaPresentationStore } from '@/shared/stores';
import CareerTimeline from '../components/CareerTimeline.vue';

const router = useRouter();
const presentationStore = useQuotaPresentationStore();

const quotaPrice = ref(2500);

// ─── Hero metrics (gerenciadas pelo admin via Editar Informações) ──
const heroMetrics = computed(() => presentationStore.heroMetrics);

// ─── How it works ──────────────────────────────────────────
const steps = [
  { icon: 'hotel', title: 'Torne-se Sócio', desc: 'Escolha seu pacote e adquira cotas do grupo hoteleiro' },
  { icon: 'dollar-sign', title: 'Receba Dividendos', desc: 'Lucros mensais proporcionais à sua participação' },
  { icon: 'handshake', title: 'Indique e Ganhe', desc: 'Comissões diretas e bônus de rede ilimitados' },
  { icon: 'trophy', title: 'Evolua na Carreira', desc: 'Suba de nível e desbloqueie benefícios exclusivos' },
];

// ─── Packages ──────────────────────────────────────────────
// Safety margin: estimates are shown 10% below last-period yield
// so clients are pleasantly surprised rather than disappointed.
const SAFETY_MARGIN = 0.10;
// Gross yield per quota (R$) — loaded from API
const grossYieldPerQuota = ref(200); // default fallback
const netYieldPerQuota = computed(() => Math.round(grossYieldPerQuota.value * (1 - SAFETY_MARGIN)));

interface Package {
  id: string;
  name: string;
  quotas: number;
  price: number;
  popular?: boolean;
  levelName: string;
  levelEmoji: string;
  levelColor: string;
  hotelSubtitle: string;
  monthlyEstimate: number;
  benefits: string[];
  ctaLabel: string;
}

const packages = computed<Package[]>(() => [
  {
    id: 'socio',
    name: 'Sócio',
    quotas: 1,
    price: quotaPrice.value,
    levelName: 'Sócio',
    levelEmoji: 'handshake',
    levelColor: '#0097a7',
    hotelSubtitle: 'Grupo Ciano',
    monthlyEstimate: netYieldPerQuota.value,
    benefits: [
      'Participação nos lucros do Grupo Ciano',
      'Participação na valorização do grupo',
      'Pode indicar e ganhar comissões (10% primeira compra)',
      'Acesso ao grupo geral de investidores',
    ],
    ctaLabel: 'Tornar-se Sócio',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    quotas: 10,
    price: 10 * quotaPrice.value,
    popular: true,
    levelName: 'Platinum',
    levelEmoji: 'rocket',
    levelColor: '#6B7280',
    hotelSubtitle: 'Resort Ciano Prime',
    monthlyEstimate: 10 * netYieldPerQuota.value,
    benefits: [
      'Todos os benefícios do Sócio',
      '30% de desconto em pousadas Ciano',
      'Comissão maior nas indicações',
      'Acesso antecipado a lotes com desconto',
      'Reunião mensal com Marcos Maziero',
    ],
    ctaLabel: 'Tornar-se Platinum',
  },
  {
    id: 'vip',
    name: 'VIP',
    quotas: 20,
    price: 20 * quotaPrice.value,
    levelName: 'VIP',
    levelEmoji: 'crown',
    levelColor: '#D97706',
    hotelSubtitle: 'Resort Ciano VIP',
    monthlyEstimate: 20 * netYieldPerQuota.value,
    benefits: [
      'Todos os benefícios do Platinum',
      '50% de desconto em pousadas Ciano',
      '1 final de semana gratuito por ano',
      'Convites para eventos e inaugurações',
      'Nome listado como Sócio VIP em todas as pousadas',
      'Comissão ainda maior nas indicações',
    ],
    ctaLabel: 'Tornar-se VIP',
  },
  {
    id: 'imperial',
    name: 'Imperial',
    quotas: 60,
    price: 60 * quotaPrice.value,
    levelName: 'Imperial',
    levelEmoji: 'building-columns',
    levelColor: '#7c3aed',
    hotelSubtitle: 'Resort Ciano Imperial',
    monthlyEstimate: 60 * netYieldPerQuota.value,
    benefits: [
      'Todos os benefícios do VIP',
      'Hospedagem gratuita ilimitada (até 3 acompanhantes)',
      'Máx. 1 quarto simultâneo — pode morar em pousada',
      '40% de desconto para familiares',
      'Viagem anual com Marcos Maziero',
      'Quadro com foto no hall de entrada',
      'Canal VIP direto com Marcos Maziero',
      'Acesso ao grupo Imperial exclusivo',
    ],
    ctaLabel: 'Tornar-se Imperial',
  },
]);

// ─── Split countdown ──────────────────────────────────────
const splitDate = new Date();
splitDate.setDate(splitDate.getDate() + 4);

const remaining = ref(computeRemaining());
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function computeRemaining() {
  const diff = Math.max(0, splitDate.getTime() - Date.now());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { d, h, m, s };
}

const countdownDisplay = computed(() => {
  const { d, h, m, s } = remaining.value;
  if (d > 0) return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
});

onMounted(async () => {
  countdownTimer = setInterval(() => { remaining.value = computeRemaining(); }, 1000);
  try {
    const res = await quotasService.getConfig();
    if (res.data?.currentPrice) quotaPrice.value = res.data.currentPrice;
    if (res.data?.estimatedYieldPerQuota) grossYieldPerQuota.value = res.data.estimatedYieldPerQuota;
  } catch { /* use defaults */ }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

// ─── Helpers ───────────────────────────────────────────────
function formatCurrency(value: number): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return 'R$ 0';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function goToCheckout(packageId?: string) {
  if (packageId) {
    router.push({ path: '/checkout', query: { package: packageId } });
  } else {
    router.push('/checkout');
  }
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ─── Global page shell ─────────────────────────────────────
.quotas-lp {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 $spacing-6 $spacing-12;

  @media (max-width: 768px) {
    padding: 0 $spacing-4 $spacing-10;
  }
}

.lp-section {
  padding: $spacing-16 0;

  @media (max-width: 768px) {
    padding: $spacing-10 0;
  }
}

// ─── Shared Section Header ─────────────────────────────────
.section-header {
  text-align: center;
  margin-bottom: $spacing-10;

  h2 {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    font-weight: 800;
    margin: 0 0 $spacing-3;
    line-height: 1.2;
  }

  &--left {
    text-align: left;
  }
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary-600);
  margin-bottom: $spacing-3;
}

.section-sub {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin: 0;

  &--note {
    font-size: 0.75rem;
    margin-top: $spacing-2;
    opacity: 0.7;
  }
}

// ────────────────────────────────────────────────────────────
// 1. HERO
// ────────────────────────────────────────────────────────────
.hero {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  margin-left: -$spacing-6;
  margin-right: -$spacing-6;
  padding: $spacing-20 $spacing-8;
  overflow: hidden;
  background: linear-gradient(135deg, #051a1f 0%, #083344 50%, #0a4a5a 100%);
  border-radius: 0 0 32px 32px;

  @media (max-width: 768px) {
    margin-left: -$spacing-4;
    margin-right: -$spacing-4;
    padding: $spacing-16 $spacing-5;
    min-height: 80vh;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.25;

    &--1 {
      width: 600px;
      height: 600px;
      background: var(--primary-500);
      top: -200px;
      right: -100px;
    }

    &--2 {
      width: 400px;
      height: 400px;
      background: var(--secondary-500);
      bottom: -100px;
      left: -80px;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    text-align: center;
    max-width: 800px;
  }

  &__eyebrow {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--primary-300);
    margin-bottom: $spacing-4;
    padding: 4px 14px;
    border: 1px solid rgba(var(--primary-300-rgb), 0.3);
    border-radius: 999px;
  }

  &__headline {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900;
    color: #fff;
    line-height: 1.15;
    margin: 0 0 $spacing-5;
  }

  &__headline-highlight {
    color: var(--primary-300);
    display: inline-block;
  }

  &__sub {
    font-size: clamp(0.9375rem, 2vw, 1.125rem);
    color: rgba(255,255,255,0.65);
    line-height: 1.7;
    margin: 0 auto $spacing-8;
    max-width: 600px;
  }

  &__actions {
    display: flex;
    gap: $spacing-4;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: $spacing-10;
  }

  &__social-trust {
    display: flex;
    justify-content: center;
    gap: $spacing-8;
    flex-wrap: wrap;
  }

  &__metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;

    strong {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
    }

    span {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
  }
}

// ────────────────────────────────────────────────────────────
// 2. HOW IT WORKS
// ────────────────────────────────────────────────────────────
.steps-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-4;
  position: relative;

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
}

.step-item {
  position: relative;
  text-align: center;
  padding: $spacing-6;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.08);
  }

  &__connector {
    display: none;

    @media (min-width: 900px) {
      display: block;
      position: absolute;
      right: -16px;
      top: 40%;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 12px solid var(--border-light);
      z-index: 2;
    }
  }

  &__circle {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto $spacing-4;
    background: linear-gradient(135deg, rgba(var(--primary-500-rgb), 0.12), rgba(var(--secondary-500-rgb), 0.08));
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
  }

  &__num {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 22px;
    height: 22px;
    background: var(--primary-500);
    color: #fff;
    border-radius: 50%;
    font-size: 0.6875rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-primary);
  }

  &__title {
    font-size: 1.0625rem;
    font-weight: 700;
    margin: 0 0 $spacing-2;
  }

  &__desc {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
}

// ────────────────────────────────────────────────────────────
// 3. PRICING
// ────────────────────────────────────────────────────────────
.pricing-section {
  padding-top: $spacing-12;
}

.split-alert {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  background: linear-gradient(90deg, rgba(var(--warning-rgb), 0.12), rgba(var(--accent-500-rgb), 0.08));
  border: 1px solid rgba(var(--warning-rgb), 0.35);
  border-radius: 12px;
  padding: $spacing-3 $spacing-5;
  margin-bottom: $spacing-8;
  font-size: 0.9375rem;
  flex-wrap: wrap;

  &__icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  &__timer {
    color: var(--color-warning-dark);
    font-variant-numeric: tabular-nums;
    font-family: monospace;
    font-size: 1.0625rem;
    margin-left: 2px;
  }

  &__tag {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-warning-dark);
    background: rgba(var(--warning-rgb), 0.15);
    padding: 2px 10px;
    border-radius: 999px;

    @media (max-width: 600px) { margin-left: 0; }
  }
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-5;
  align-items: start;

  @media (max-width: 900px) { grid-template-columns: 1fr; max-width: 440px; margin: 0 auto; }
}

.pkg-card {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  padding: $spacing-6;
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  }

  &--featured {
    border: 2px solid var(--primary-500);
    box-shadow: 0 8px 30px rgba(var(--primary-500-rgb), 0.15);
  }

  &__ribbon {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, var(--color-warning), #c49a00);
    color: white;
    padding: 5px 16px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  }

  &__level-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
    color: white;
    font-size: 0.8125rem;
    padding: $spacing-2 $spacing-3;
    border-radius: 10px;
    font-weight: 500;
    margin-top: $spacing-3;

    strong { font-weight: 800; }
  }

  &__name {
    font-size: 1.375rem;
    font-weight: 800;
    margin: 0;
    text-align: center;
  }

  &__subtitle {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    text-align: center;
    margin: -$spacing-2 0 0;
  }

  &__price-block {
    text-align: center;
    padding: $spacing-4 0;
    border-top: 1px solid var(--border-light);
    border-bottom: 1px solid var(--border-light);
  }

  &__quotas {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    margin-bottom: 4px;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  &__quotas-num {
    font-size: 2rem;
    font-weight: 800;
    color: var(--primary-600);
  }

  &__price {
    font-size: 1.875rem;
    font-weight: 800;
    color: var(--neutral-900);
  }

  &__per-quota {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  &__benefits {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      display: flex;
      align-items: flex-start;
      gap: $spacing-2;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }

  &__check {
    color: var(--color-success);
    font-size: 0.8125rem;
    flex-shrink: 0;
    margin-top: 1px;
  }

  &__cta {
    width: 100%;
    margin-top: auto;
  }
}

// ────────────────────────────────────────────────────────────
// 7. FAQ
// ────────────────────────────────────────────────────────────
.faq-section {
  max-width: 760px;
  margin: 0 auto;
}

// ────────────────────────────────────────────────────────────
// 8. FOOTER CTA
// ────────────────────────────────────────────────────────────
.footer-cta {
  position: relative;
  margin: 0;
  margin-left: -$spacing-6;
  margin-right: -$spacing-6;
  padding: $spacing-16 $spacing-8;
  text-align: center;
  overflow: hidden;
  background: linear-gradient(135deg, #051a1f 0%, #083344 50%, #0a4a5a 100%);
  border-radius: 24px;

  @media (max-width: 768px) {
    margin-left: -$spacing-4;
    margin-right: -$spacing-4;
    padding: $spacing-12 $spacing-5;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 70% 30%, rgba(var(--primary-500-rgb), 0.25), transparent 60%);
    pointer-events: none;
  }

  &__content {
    position: relative;
    z-index: 1;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-5;
  }

  &__headline {
    font-size: clamp(1.5rem, 3.5vw, 2.5rem);
    font-weight: 900;
    color: #fff;
    line-height: 1.2;
    margin: 0;
  }

  &__sub {
    font-size: 1rem;
    color: rgba(255,255,255,0.6);
    margin: 0;
    line-height: 1.7;
  }

  &__disclaimer {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    margin: 0;
  }
}





</style>
