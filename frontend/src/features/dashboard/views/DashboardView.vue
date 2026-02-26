<template>
  <div class="dashboard-view">

    <!-- ① Split Ticker ─────────────────────────────────────── -->
    <SplitTicker
      :current-price="ticker.currentPrice"
      :progress="ticker.splitProgress"
      :next-event="ticker.nextEventLabel"
      :quotas-remaining="ticker.quotasToNextEvent"
      :change-percent="ticker.changePercent"
      @buy="goToCheckout"
    />

    <div class="dashboard-view__body">

      <!-- ② Header ─────────────────────────────────────────── -->
      <header class="dashboard-view__header">
        <div class="dashboard-view__welcome">
          <h1>Olá, {{ firstName }}!</h1>
          <DsBadge :variant="titleColor">{{ titleLabel }}</DsBadge>
        </div>

        <div class="dashboard-view__career-col">
          <LevelProgressBar
            :current-level="career.currentLevel"
            :next-level="career.nextLevel"
            :current-value="career.currentValue"
            :target-value="career.targetValue"
            :bonus-percent="career.bonusPercentUnlock"
          />
        </div>

        <div class="dashboard-view__header-right">
          <StatusWidget
            :status="health.status"
            :days-remaining="health.daysRemaining"
            @renew="goToCheckout"
          />
          <DsButton variant="primary" size="lg" @click="goToCheckout">
            <template #icon><font-awesome-icon icon="cart-shopping" /></template>
            Comprar Cotas
          </DsButton>
        </div>
      </header>

      <!-- ③ KPI Cards ──────────────────────────────────────── -->
      <section class="dashboard-view__kpis">
        <!-- Patrimônio -->
        <div class="kpi-card kpi-card--patrimony">
          <div class="kpi-card__icon">
            <font-awesome-icon icon="gem" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Patrimônio</span>
            <span class="kpi-card__value">{{ formatCurrency(kpi.estimatedPatrimony) }}</span>
            <span class="kpi-card__sub">Cotas × valor atual da cota</span>
          </div>
        </div>

        <!-- Saldo a receber no próximo pagamento -->
        <div
          class="kpi-card kpi-card--wallet"
          :class="kpi.paymentWindowOpen ? 'kpi-card--highlight' : 'kpi-card--locked'"
        >
          <div class="kpi-card__icon">
            <font-awesome-icon :icon="kpi.paymentWindowOpen ? 'wallet' : 'lock'" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Saldo a Receber</span>

            <!-- Dentro da janela: exibe o valor calculado -->
            <template v-if="kpi.paymentWindowOpen">
              <span class="kpi-card__value kpi-card__value--big">
                {{ formatCurrency(kpi.availableWithdraw) }}
              </span>
              <span class="kpi-card__sub">
                <font-awesome-icon icon="calendar-check" />
                Pagamento em {{ kpi.nextPaymentDate ? formatDate(kpi.nextPaymentDate) : 'breve' }}
              </span>
            </template>

            <!-- Fora da janela: aguardando fechamento do lucro das pousadas -->
            <template v-else>
              <span class="kpi-card__value kpi-card__value--big kpi-card__value--muted">
                •••••
              </span>
              <span class="kpi-card__sub kpi-card__sub--info">
                <font-awesome-icon icon="clock" />
                Disponível {{ kpi.daysUntilPayment > 5 ? `em ${kpi.daysUntilPayment - 5} dia(s)` : 'em breve' }}
                &mdash; aguardando lucro das pousadas
              </span>
            </template>
          </div>

          <!-- Badge mostrando quando abre a janela -->
          <div v-if="!kpi.paymentWindowOpen" class="kpi-card__payment-badge">
            <font-awesome-icon icon="calendar-day" />
            Dia {{ kpi.paymentDay }}
          </div>
        </div>

        <!-- Saúde da rede -->
        <div
          class="kpi-card kpi-card--network"
          :class="kpi.inactiveDirects > 0 ? 'kpi-card--network-warn' : ''"
        >
          <div class="kpi-card__icon">
            <font-awesome-icon icon="sitemap" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Saúde da Rede</span>
            <span class="kpi-card__value">
              {{ kpi.activeDirects }}/{{ kpi.totalDirects }}
              <span class="kpi-card__value-unit">Ativos</span>
            </span>
            <span class="kpi-card__sub" :class="kpi.inactiveDirects > 0 ? 'text-warning' : ''">
              <template v-if="kpi.inactiveDirects > 0">
                ⚠ {{ kpi.inactiveDirects }} inativo(s) — você perde bônus deles
              </template>
              <template v-else>
                ✅ Toda a rede está ativa
              </template>
            </span>
          </div>
        </div>
      </section>
      <!-- ④ Donut + Tabela de atividade ────────────────────── -->
      <div class="dashboard-view__mid">

        <!-- Earnings Donut -->
        <section class="dashboard-view__donut-card">
          <DsCard>
            <template #header>
              <h2>Origem dos seus Ganhos</h2>
              <DsMonthPicker v-model="selectedMonth" />
            </template>

            <DonutChart :data="earningsSources" />

            <template #footer>
              <div class="earnings-footer">
                <span>Total do Mês:</span>
                <strong>{{ formatCurrency(totalMonthlyEarnings) }}</strong>
              </div>
            </template>
          </DsCard>
        </section>

        <!-- Recent Activity -->
        <section class="dashboard-view__activity-card">
          <DsCard>
            <template #header>
              <h2>Atividade Recente</h2>
              <RouterLink to="/earnings" class="view-all">
                Ver histórico
                <font-awesome-icon icon="arrow-right" />
              </RouterLink>
            </template>

            <ul class="activity-list">
              <li
                v-for="item in recentActivity"
                :key="item.id"
                class="activity-item"
              >
                <div
                  class="activity-item__avatar"
                  :style="item.sourceAvatarColor
                    ? { background: item.sourceAvatarColor }
                    : {}"
                  :class="!item.sourceAvatarColor ? 'activity-item__avatar--system' : ''"
                >
                  <template v-if="item.sourceAvatarInitials">
                    {{ item.sourceAvatarInitials }}
                  </template>
                  <font-awesome-icon v-else :icon="activityIcon(item.type)" />
                </div>

                <div class="activity-item__body">
                  <span class="activity-item__title">{{ item.description }}</span>
                  <span v-if="item.sourceUserName" class="activity-item__source">
                    via {{ item.sourceUserName }}
                  </span>
                  <span class="activity-item__date">{{ formatDate(item.date) }}</span>
                </div>

                <div class="activity-item__right">
                  <DsBadge :variant="activityVariant(item.type)" class="activity-item__badge">
                    {{ item.type }}
                  </DsBadge>
                  <span
                    class="activity-item__amount"
                    :class="item.amount >= 0 ? 'text-success' : 'text-muted'"
                  >
                    {{ item.amount >= 0 ? '+' : '' }}{{ formatCurrency(item.amount) }}
                  </span>
                </div>
              </li>
            </ul>

            <DsEmptyState
              v-if="recentActivity.length === 0"
              icon="📋"
              title="Sem atividades"
              description="Suas atividades recentes aparecerão aqui"
            />
          </DsCard>
        </section>
      </div><!-- /.dashboard-view__mid -->

      <!-- ⑤ Quick Links ───────────────────────────────────── -->
      <section class="dashboard-view__links">
        <div class="quick-link" @click="goToNetwork">
          <span class="quick-link__icon quick-link__icon--network">
            <font-awesome-icon icon="sitemap" />
          </span>
          <span class="quick-link__text">Ver Minha Rede</span>
          <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
        </div>
        <div class="quick-link" @click="goToQuotas">
          <span class="quick-link__icon quick-link__icon--quotas">
            <font-awesome-icon icon="coins" />
          </span>
          <span class="quick-link__text">Informações de Cotas</span>
          <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
        </div>
        <div class="quick-link" @click="copyReferralLink">
          <span class="quick-link__icon quick-link__icon--referral">
            <font-awesome-icon icon="dollar-sign" />
          </span>
          <span class="quick-link__text">Copiar Link de Indicação</span>
          <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
        </div>
      </section>

      <!-- ⑥ Referral Card ──────────────────────────────────── -->
      <section class="dashboard-view__referral">
        <div class="referral-card">
          <div class="referral-card__icon">
            <font-awesome-icon icon="share-nodes" />
          </div>
          <div class="referral-card__content">
            <span class="referral-card__eyebrow">Seu código de patrocínio</span>
            <div class="referral-card__code-row">
              <span class="referral-card__code">{{ authStore.user?.referralCode ?? '—' }}</span>
              <span class="referral-card__link">ciano.com.br/r/{{ authStore.user?.referralCode ?? '' }}</span>
            </div>
            <p class="referral-card__desc">Compartilhe este link e ganhe comissões em cada nova adesão da sua rede.</p>
          </div>
          <button
            class="referral-card__copy-btn"
            :class="{ 'referral-card__copy-btn--copied': referralLinkCopied }"
            @click="copyReferralLink"
          >
            <font-awesome-icon :icon="['fas', referralLinkCopied ? 'check' : 'copy']" />
            {{ referralLinkCopied ? 'Copiado!' : 'Copiar link' }}
          </button>
        </div>
      </section>

    </div><!-- /.dashboard-view__body -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import {
  DsCard,
  DsBadge,
  DsButton,
  DsMonthPicker,
  DsEmptyState,
} from '@/design-system';
import {
  getMonthlySummary,
  mockDelay,
  mockSplitTicker,
  mockCareerProgress,
  mockAccountHealth,
  mockDashboardKpi,
  mockRecentActivity,
  buildEarningsSources,
  getPaymentWindowStatus,
  type SplitTickerData,
  type CareerProgressData,
  type AccountHealthData,
  type DashboardKpiData,
  type RecentActivityItem,
  type EarningSourceData,
} from '@/mocks';
import SplitTicker from '../components/SplitTicker.vue';
import LevelProgressBar from '../components/LevelProgressBar.vue';
import StatusWidget from '../components/StatusWidget.vue';
import DonutChart from '../components/DonutChart.vue';

const router = useRouter();
const authStore = useAuthStore();

// ─── State ───────────────────────────────────────────────────
const selectedMonth = ref<string>(new Date().toISOString().slice(0, 7));
const referralLinkCopied = ref(false);

const ticker    = ref<SplitTickerData>(mockSplitTicker);
const career    = ref<CareerProgressData>(mockCareerProgress);
const health    = ref<AccountHealthData>(mockAccountHealth);
const kpi       = ref<DashboardKpiData>(mockDashboardKpi);
const recentActivity = ref<RecentActivityItem[]>(mockRecentActivity);
const earningsSources = ref<EarningSourceData[]>([]);

// ─── Computed ────────────────────────────────────────────────
const firstName = computed(() => {
  const full = authStore.userFullName ?? 'Sócio';
  return full.split(' ')[0];
});

const titleLabel = computed(() => {
  const map: Record<string, string> = {
    bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante',
  };
  return map[career.value.currentLevel] ?? career.value.currentLevel;
});

const titleColor = computed((): 'default' | 'success' | 'warning' | 'info' | 'primary' => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    bronze: 'warning', prata: 'default', ouro: 'success', diamante: 'primary',
  };
  return map[career.value.currentLevel] ?? 'default';
});

const totalMonthlyEarnings = computed(() =>
  earningsSources.value.reduce((s, e) => s + e.value, 0)
);

// ─── Methods ─────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function activityIcon(type: string): string {
  const map: Record<string, string> = {
    'Primeira Compra': 'handshake',
    'Bônus Recompra': 'rotate',
    'Bônus Equipe': 'users',
    'Bônus Liderança': 'trophy',
    Dividendo: 'chart-line',
    Compra: 'cart-shopping',
  };
  return map[type] ?? 'money-bill-wave';
}

function activityVariant(type: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    'Primeira Compra': 'success',
    'Bônus Recompra': 'info',
    'Bônus Equipe': 'info',
    'Bônus Liderança': 'success',
    Dividendo: 'primary',
    Compra: 'warning',
  };
  return map[type] ?? 'default';
}

function loadEarnings(month: string) {
  const userId = authStore.user?.id ?? 'user-001';
  const summary = getMonthlySummary(userId, month);
  if (summary) {
    earningsSources.value = buildEarningsSources(
      summary.firstPurchase,
      summary.repurchase,
      summary.team,
      summary.leadership,
      summary.dividend,
    );
  } else {
    // Default mock fallback
    earningsSources.value = buildEarningsSources(1500, 500, 1300, 500, 320);
  }
}

function goToCheckout() { router.push('/checkout'); }
function goToNetwork()  { router.push('/network'); }
function goToQuotas()   { router.push('/quotas'); }

async function copyReferralLink() {
  const link = `https://ciano.com.br/r/${authStore.user?.referralCode}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    console.error('Failed to copy');
  }
  referralLinkCopied.value = true;
  setTimeout(() => { referralLinkCopied.value = false; }, 2500);
}

// Refresh payment window status so the lock reflects real-time day changes
function refreshPaymentWindow() {
  const status = getPaymentWindowStatus(kpi.value.paymentDay);
  kpi.value = {
    ...kpi.value,
    paymentWindowOpen: status.windowOpen,
    daysUntilPayment: status.daysUntilPayment,
    nextPaymentDate: status.nextPaymentDate,
  };
}

// ─── Watchers & Lifecycle ────────────────────────────────────
watch(selectedMonth, loadEarnings);

onMounted(async () => {
  await mockDelay(300);
  refreshPaymentWindow();
  loadEarnings(selectedMonth.value);
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.dashboard-view {
  // Body container sits below the Ticker
  &__body {
    padding: $spacing-6;
    max-width: 1400px;
    margin: 0 auto;

    @media (max-width: 768px) {
      padding: $spacing-4;
    }
  }

  // ── Header ──────────────────────────────────────────────────
  &__header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: $spacing-6;
    margin-bottom: $spacing-6;
    background: $neutral-50;
    border: 1px solid $neutral-200;
    border-radius: $radius-xl;
    padding: $spacing-5 $spacing-6;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
      gap: $spacing-4;
    }
  }

  &__welcome {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    min-width: 160px;

    h1 {
      font-size: 1.625rem;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
    }
  }

  &__career-col {
    flex: 1;
    min-width: 0;
  }

  &__header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: $spacing-3;
    flex-shrink: 0;

    @media (max-width: 1024px) {
      align-items: flex-start;
    }
  }

  // ── KPI Cards ───────────────────────────────────────────────
  &__kpis {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: 900px) {
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 576px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Mid section ────────────────────────────────────────────
  &__mid {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Quick Links ────────────────────────────────────────────
  &__links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-4;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
}

// ── KPI Card ────────────────────────────────────────────────
.kpi-card {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-5;
  border-radius: $radius-xl;
  border: 1.5px solid $neutral-200;
  background: #fff;
  position: relative;
  transition: box-shadow 0.2s;

  &:hover { box-shadow: $shadow-md; }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &__body {
    @include flex-column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: $text-tertiary;
    font-weight: 600;
  }

  &__value {
    font-size: 1.375rem;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.2;

    &--big { font-size: 1.625rem; }
  }

  &__value-unit {
    font-size: 0.875rem;
    font-weight: 500;
    color: $text-tertiary;
    margin-left: 4px;
  }

  &__sub {
    font-size: 0.75rem;
    color: $text-tertiary;
  }

  &--patrimony {
    .kpi-card__icon { background: rgba($primary-500, 0.1); color: $primary-600; }
  }

  &--wallet {
    .kpi-card__icon { background: rgba($success, 0.1); color: $success-dark; }
  }

  &--highlight {
    border-color: rgba($success, 0.4);
    background: linear-gradient(135deg, rgba($success, 0.04) 0%, #fff 100%);
    .kpi-card__value { color: $success-dark; }
  }

  &--locked {
    border-color: $neutral-300;
    background: $neutral-50;
    opacity: 0.85;

    .kpi-card__icon {
      background: rgba($neutral-400, 0.15);
      color: $neutral-500;
    }
  }

  &__value--muted {
    color: $neutral-400;
    letter-spacing: 0.25em;
    font-size: 1.25rem;
  }

  &__sub--info {
    color: $primary-600;
    font-weight: 500;
  }

  &__payment-badge {
    position: absolute;
    top: $spacing-3;
    right: $spacing-3;
    background: $neutral-200;
    color: $neutral-600;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &--network {
    .kpi-card__icon { background: rgba($accent-500, 0.12); color: $accent-700; }
  }

  &--network-warn {
    border-color: rgba($warning, 0.4);
    background: linear-gradient(135deg, rgba($warning, 0.04) 0%, #fff 100%);
  }
}

// ── Activity list ────────────────────────────────────────────
.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3 $spacing-2;
  border-radius: $radius-md;
  transition: background 0.15s;

  &:hover { background: $neutral-50; }

  &__avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: $neutral-300;
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--system {
      background: rgba($primary-500, 0.1);
      color: $primary-600;
      font-size: 1rem;
    }
  }

  &__body {
    @include flex-column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 500;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__source {
    font-size: 0.75rem;
    color: $primary-600;
    font-style: italic;
  }

  &__date {
    font-size: 0.6875rem;
    color: $text-tertiary;
  }

  &__right {
    @include flex-column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  &__badge { font-size: 0.6875rem; }

  &__amount {
    font-size: 0.9375rem;
    font-weight: 700;
    white-space: nowrap;
  }
}

// ── Earnings footer ──────────────────────────────────────────
.earnings-footer {
  @include flex-between;
  padding-top: $spacing-3;
  border-top: 1px solid $neutral-200;
  font-size: 0.9375rem;

  strong {
    color: $primary-700;
    font-size: 1.125rem;
    font-weight: 700;
  }
}

// ── Quick links ──────────────────────────────────────────────
.view-all {
  color: $primary-600;
  text-decoration: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: $spacing-1;
  &:hover { text-decoration: underline; }
}

.quick-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4 $spacing-5;
  background: $bg-primary;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
    .quick-link__arrow { transform: translateX(4px); color: $primary-600; }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 1.125rem;
    flex-shrink: 0;

    &--network  { background: rgba($primary-500, 0.1); color: $primary-600; }
    &--quotas   { background: rgba($success, 0.1);     color: $success-dark; }
    &--referral { background: rgba($accent-500, 0.1);  color: #a07400; }
  }

  &__text {
    flex: 1;
    color: $text-primary;
    font-weight: 500;
    font-size: 0.9375rem;
  }

  &__arrow {
    color: $text-tertiary;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }
}

// ── Utilities ────────────────────────────────────────────────
.text-success { color: $success; }
.text-muted   { color: $text-tertiary; }
.text-warning { color: $warning; }

// ── Referral Card ────────────────────────────────────────────
.dashboard-view__referral {
  margin-top: $spacing-4;
}

.referral-card {
  display: flex;
  align-items: center;
  gap: $spacing-5;
  padding: $spacing-5 $spacing-6;
  background: linear-gradient(135deg, rgba($accent-500, 0.08) 0%, rgba($primary-500, 0.06) 100%);
  border: 1.5px solid rgba($accent-500, 0.25);
  border-radius: $radius-xl;
  flex-wrap: wrap;

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba($accent-500, 0.15);
    color: $accent-700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &__content {
    @include flex-column;
    gap: $spacing-1;
    flex: 1;
    min-width: 0;
  }

  &__eyebrow {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $text-tertiary;
  }

  &__code-row {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-wrap: wrap;
  }

  &__code {
    font-size: 1.25rem;
    font-weight: 800;
    color: $accent-800;
    letter-spacing: 0.12em;
    font-family: 'Courier New', monospace;
    background: rgba($accent-500, 0.12);
    padding: 2px 10px;
    border-radius: $radius-md;
    border: 1px solid rgba($accent-500, 0.3);
  }

  &__link {
    font-size: 0.8125rem;
    color: $text-secondary;
    font-style: italic;
  }

  &__desc {
    font-size: 0.8125rem;
    color: $text-tertiary;
    margin: 0;
  }

  &__copy-btn {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-5;
    background: $accent-600;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover { background: $accent-700; transform: translateY(-1px); }

    &--copied {
      background: $success;
      &:hover { background: $success-dark; }
    }
  }
}
</style>
