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

      <!-- ① Código de Patrocínio ──────────────────────────── -->
      <section class="dashboard-view__referral">
        <div class="referral-card">
          <div class="referral-card__icon">
            <font-awesome-icon icon="share-nodes" />
          </div>
          <div class="referral-card__content">
            <span class="referral-card__eyebrow">Seu código de patrocínio</span>
            <div class="referral-card__code-row">
              <span class="referral-card__code">{{ authStore.user?.referralCode ?? '—' }}</span>
              <span class="referral-card__link">redeciano.com.br/r/{{ authStore.user?.referralCode ?? '' }}</span>
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

      <!-- ② Header ─────────────────────────────────────────── -->
      <header class="dashboard-view__header">
        <div class="dashboard-view__welcome">
          <h1>Olá, {{ firstName }}!</h1>
          <DsBadge :variant="titleColor">{{ titleLabel }}</DsBadge>
        </div>

        <div class="dashboard-view__career-col">
          <LevelProgressBar
            :current-level="career.currentLevel"
            :next-level="career.nextLevel || 'diamante'"
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
          <div class="kpi-card__icon" style="color: #0891b2">
            <font-awesome-icon icon="gem" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Patrimônio</span>
            <span class="kpi-card__value">{{ formatCurrency(kpi.estimatedPatrimony) }}</span>
            <span class="kpi-card__sub">Cotas × valor atual da cota</span>
          </div>
        </div>

        <!-- Total de Cotas -->
        <div class="kpi-card kpi-card--quotas" @click="goToQuotas" style="cursor: pointer">
          <div class="kpi-card__icon" style="color: #0891b2">
            <font-awesome-icon icon="layer-group" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Total de Cotas</span>
            <span class="kpi-card__value">{{ kpi.quotaBalance ?? 0 }} <span class="kpi-card__value-unit">cotas</span></span>
            <span class="kpi-card__sub">Suas cotas acumuladas</span>
          </div>
        </div>

        <!-- Saldo a receber no próximo pagamento -->
        <div class="kpi-card kpi-card--wallet kpi-card--highlight">
          <div class="kpi-card__icon" style="color: #7c3aed">
            <font-awesome-icon icon="wallet" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Previsão a Receber</span>
            <span class="kpi-card__value kpi-card__value--big">
              {{ formatCurrency(totalReceivable) }}
            </span>
            <div class="kpi-card__breakdown">
              <span>
                <font-awesome-icon icon="sitemap" />
                Rede: {{ formatCurrency(kpi.networkEarnings) }}
              </span>
              <span>
                <font-awesome-icon icon="coins" />
                Cotas: {{ formatCurrency(kpi.quotaEarnings) }}
              </span>
            </div>
            <span class="kpi-card__sub">
              <font-awesome-icon icon="calendar-check" />
              Pagamento em {{ kpi.nextPaymentDate ? formatDate(kpi.nextPaymentDate) : 'breve' }}
            </span>
          </div>
        </div>

        <!-- Saúde da rede -->
        <div
          class="kpi-card kpi-card--network"
          :class="kpi.inactiveDirects > 0 ? 'kpi-card--network-warn' : ''"
        >
          <div class="kpi-card__icon" :style="kpi.inactiveDirects > 0 ? { color: '#d97706' } : { color: '#16a34a' }">
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
                <font-awesome-icon icon="triangle-exclamation" /> {{ kpi.inactiveDirects }} inativo(s) — você perde bônus deles
              </template>
              <template v-else>
                <font-awesome-icon icon="circle-check" /> Toda a rede está ativa
              </template>
            </span>
          </div>
        </div>

        <!-- Ganhos da Vida (lifetime earnings) -->
        <div class="kpi-card kpi-card--lifetime">
          <div class="kpi-card__icon" style="color: #7c3aed">
            <font-awesome-icon icon="trophy" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Ganhos da Vida</span>
            <span class="kpi-card__value kpi-card__value--big">{{ formatCurrency(kpi.lifetimeEarnings) }}</span>
            <span class="kpi-card__sub">Total acumulado desde o cadastro</span>
          </div>
        </div>

        <!-- Perda por inatividade -->
        <div v-if="kpi.inactivityLoss > 0" class="kpi-card kpi-card--loss">
          <div class="kpi-card__icon" style="color: #dc2626">
            <font-awesome-icon icon="arrow-trend-down" />
          </div>
          <div class="kpi-card__body">
            <span class="kpi-card__label">Perdido por Inatividade</span>
            <span class="kpi-card__value kpi-card__value--big kpi-card__value--danger">{{ formatCurrency(kpi.inactivityLoss) }}</span>
            <span class="kpi-card__sub kpi-card__sub--danger">
              <font-awesome-icon icon="triangle-exclamation" /> Valor estimado que deixou de receber por não estar ativo
            </span>
          </div>
        </div>
      </section>

      <!-- ③b Sales Cards (Own vs Network) ──────────────────── -->
      <section class="dashboard-view__sales">
        <div class="sales-card">
          <div class="sales-card__icon" style="color: #0891b2">
            <font-awesome-icon icon="cart-shopping" />
          </div>
          <div class="sales-card__body">
            <span class="sales-card__label">Suas Compras</span>
            <span class="sales-card__value">{{ kpi.ownSalesCount ?? 0 }} cotas</span>
            <span class="sales-card__sub">{{ formatCurrency(kpi.ownSalesValue ?? 0) }} este mês</span>
          </div>
        </div>
        <div class="sales-card">
          <div class="sales-card__icon" style="color: #16a34a">
            <font-awesome-icon icon="users" />
          </div>
          <div class="sales-card__body">
            <span class="sales-card__label">Compras da Rede</span>
            <span class="sales-card__value">{{ kpi.networkSalesCount ?? 0 }} cotas</span>
            <span class="sales-card__sub">{{ formatCurrency(kpi.networkSalesValue ?? 0) }} este mês</span>
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
              icon="clipboard-list"
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
import { dashboardService } from '@/shared/services/dashboard.service';
import { earningsService } from '@/shared/services/earnings.service';
import SplitTicker from '../components/SplitTicker.vue';
import LevelProgressBar from '../components/LevelProgressBar.vue';
import StatusWidget from '../components/StatusWidget.vue';
import DonutChart from '../components/DonutChart.vue';

const router = useRouter();
const authStore = useAuthStore();

// ─── Types ────────────────────────────────────────────────────
interface SplitTickerData {
  currentPrice: number;
  splitProgress: number;
  nextEventLabel: string;
  quotasToNextEvent: number;
  changePercent: number;
}

type LevelKey = 'bronze' | 'prata' | 'ouro' | 'diamante';

interface CareerProgressData {
  currentLevel: LevelKey;
  nextLevel: LevelKey | '';
  currentValue: number;
  targetValue: number;
  bonusPercentUnlock: number;
}

interface AccountHealthData {
  status: 'active' | 'warning' | 'critical';
  daysRemaining: number;
}

interface DashboardKpiData {
  estimatedPatrimony: number;
  availableWithdraw: number;
  activeDirects: number;
  totalDirects: number;
  inactiveDirects: number;
  networkTotal: number;
  paymentDay: number;
  paymentWindowOpen: boolean;
  daysUntilPayment: number;
  nextPaymentDate: string;
  networkEarnings: number;
  quotaEarnings: number;
  lifetimeEarnings: number;
  inactivityLoss: number;
  ownSalesCount: number;
  ownSalesValue: number;
  networkSalesCount: number;
  networkSalesValue: number;
  partnerLevel?: string;
  quotaBalance?: number;
  isActive?: boolean;
}

interface RecentActivityItem {
  id: string;
  type: string;
  description: string;
  sourceUserName: string | null;
  sourceAvatarInitials: string | null;
  sourceAvatarColor: string | null;
  amount: number;
  date: string;
}

interface EarningSourceData {
  label: string;
  value: number;
  color: string;
}

// ─── State ───────────────────────────────────────────────────
const selectedMonth = ref<string>(new Date().toISOString().slice(0, 7));
const referralLinkCopied = ref(false);

const ticker = ref<SplitTickerData>({
  currentPrice: 0,
  splitProgress: 0,
  nextEventLabel: '',
  quotasToNextEvent: 0,
  changePercent: 0,
});

const career = ref<CareerProgressData>({
  currentLevel: 'bronze',
  nextLevel: '',
  currentValue: 0,
  targetValue: 0,
  bonusPercentUnlock: 0,
});

const health = ref<AccountHealthData>({
  status: 'active',
  daysRemaining: 0,
});

const kpi = ref<DashboardKpiData>({
  estimatedPatrimony: 0,
  availableWithdraw: 0,
  activeDirects: 0,
  totalDirects: 0,
  inactiveDirects: 0,
  networkTotal: 0,
  paymentDay: 15,
  paymentWindowOpen: false,
  daysUntilPayment: 0,
  nextPaymentDate: '',
  networkEarnings: 0,
  quotaEarnings: 0,
  lifetimeEarnings: 0,
  inactivityLoss: 0,
  ownSalesCount: 0,
  ownSalesValue: 0,
  networkSalesCount: 0,
  networkSalesValue: 0,
});

const recentActivity = ref<RecentActivityItem[]>([]);
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

const totalReceivable = computed(() => {
  const network = Number(kpi.value.networkEarnings) || 0;
  const quota = Number(kpi.value.quotaEarnings) || 0;
  return network + quota;
});

// ─── Methods ─────────────────────────────────────────────────
function formatCurrency(value: number): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
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

async function loadEarnings(month: string) {
  try {
    const { data } = await earningsService.monthly(month);
    if (data) {
      earningsSources.value = [
        { label: 'Primeira Compra', value: data.firstPurchase || 0, color: '#10b981' },
        { label: 'Recompra',        value: data.repurchase || 0,     color: '#3b82f6' },
        { label: 'Equipe',          value: data.team || 0,           color: '#8b5cf6' },
        { label: 'Liderança',       value: data.leadership || 0,     color: '#f59e0b' },
        { label: 'Dividendo',       value: data.dividend || 0,       color: '#06b6d4' },
      ].filter(s => s.value > 0);
    }
  } catch {
    earningsSources.value = [];
  }
}

function goToCheckout() { router.push('/checkout'); }
function goToNetwork()  { router.push('/network'); }
function goToQuotas()   { router.push('/quotas'); }

async function copyReferralLink() {
  const link = `https://redeciano.com.br/r/${authStore.user?.referralCode}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    console.error('Failed to copy');
  }
  referralLinkCopied.value = true;
  setTimeout(() => { referralLinkCopied.value = false; }, 2500);
}

// Refresh payment window status
async function refreshPaymentWindow() {
  try {
    const { data } = await dashboardService.getPaymentWindow();
    if (data) {
      kpi.value = { ...kpi.value, ...data };
    }
  } catch { /* non-critical */ }
}

// ─── Watchers & Lifecycle ────────────────────────────────────
watch(selectedMonth, loadEarnings);

onMounted(async () => {
  try {
    // Load KPIs, chart data, and recent activity in parallel
    const [kpiRes, chartRes, activityRes] = await Promise.all([
      dashboardService.getKpis(),
      dashboardService.getQuotaChart(),
      dashboardService.getRecentActivity(),
    ]);

    if (kpiRes.data) {
      kpi.value = kpiRes.data;

      // Map career progress from KPI data
      const currentLevel = kpiRes.data.partnerLevel || 'socio';
      const levelProgression: Record<string, string> = {
        socio: 'bronze',
        bronze: 'prata',
        prata: 'ouro',
        ouro: 'diamante',
        diamante: '',
      };
      const levelTargets: Record<string, number> = {
        bronze: 2,    // 2 pessoas ativas
        prata: 1,     // 1 indicado Bronze
        ouro: 2,      // 2 Bronzes em linhas diferentes
        diamante: 3,  // 3 Bronzes em linhas diferentes
      };
      const nextLevel = levelProgression[currentLevel] || '';

      career.value = {
        currentLevel: currentLevel as LevelKey,
        nextLevel: nextLevel as LevelKey | '',
        currentValue: kpiRes.data.qualifiedCount || kpiRes.data.quotaBalance || 0,
        targetValue: levelTargets[nextLevel] || 0,
        bonusPercentUnlock: nextLevel ? 2 : 0,
      };

      // Map health from active status
      health.value = {
        status: kpiRes.data.isActive ? 'active' : 'critical',
        daysRemaining: kpiRes.data.daysUntilExpiry || 0,
      };
    }

    if (chartRes.data) {
      ticker.value = {
        currentPrice: chartRes.data.currentPrice || 0,
        splitProgress: chartRes.data.totalSold ? Math.round((chartRes.data.totalSold / chartRes.data.nextEventTarget) * 100) : 0,
        nextEventLabel: chartRes.data.nextEventLabel || '',
        quotasToNextEvent: (chartRes.data.nextEventTarget || 0) - (chartRes.data.totalSold || 0),
        changePercent: 0,
      };
    }

    if (activityRes.data) {
      recentActivity.value = (activityRes.data as any[]).map(e => ({
        id: e.id,
        type: e.bonusType || e.description || '',
        description: e.description || '',
        amount: e.amount || 0,
        date: e.createdAt || '',
        sourceUserName: e.sourceUserName || null,
        sourceAvatarInitials: e.sourceUserName ? e.sourceUserName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : null,
        sourceAvatarColor: null,
      }));
    }
  } catch {
    /* fail silently — page shows empty state */
  }

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
    background: var(--neutral-50);
    border: 1px solid var(--neutral-200);
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
    grid-template-columns: repeat(3, 1fr);
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
  border: 1.5px solid var(--neutral-200);
  background: var(--bg-primary);
  position: relative;
  transition: box-shadow 0.2s;

  &:hover { box-shadow: var(--shadow-md); }

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
    color: var(--text-tertiary);
    font-weight: 600;
  }

  &__value {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;

    &--big { font-size: 1.625rem; }
  }

  &__value-unit {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-left: 4px;
  }

  &__sub {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  &--patrimony {
    .kpi-card__icon { background: rgba(var(--primary-500-rgb), 0.1); color: var(--primary-600); }
  }

  &--wallet {
    .kpi-card__icon { background: rgba(var(--success-rgb), 0.1); color: var(--color-success-dark); }
  }

  &--highlight {
    border-color: rgba(var(--success-rgb), 0.4);
    background: linear-gradient(135deg, rgba(var(--success-rgb), 0.04) 0%, var(--bg-primary) 100%);
    .kpi-card__value { color: var(--color-success-dark); }
  }

  &--locked {
    border-color: var(--neutral-300);
    background: var(--neutral-50);
    opacity: 0.85;

    .kpi-card__icon {
      background: rgba(var(--neutral-400-rgb), 0.15);
      color: var(--neutral-500);
    }
  }

  &__value--muted {
    color: var(--neutral-400);
    letter-spacing: 0.25em;
    font-size: 1.25rem;
  }

  &__sub--info {
    color: var(--primary-600);
    font-weight: 500;
  }

  &__breakdown {
    display: flex;
    gap: $spacing-3;
    flex-wrap: wrap;
    font-size: 0.73rem;
    color: var(--text-secondary);
    font-weight: 600;
    margin-top: 1px;

    span {
      display: flex;
      align-items: center;
      gap: 3px;
      svg { opacity: 0.7; }
    }
  }

  &__payment-badge {
    position: absolute;
    top: $spacing-3;
    right: $spacing-3;
    background: var(--neutral-200);
    color: var(--neutral-600);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &--network {
    .kpi-card__icon { background: rgba(var(--accent-500-rgb), 0.12); color: var(--accent-700); }
  }

  &--network-warn {
    border-color: rgba(var(--warning-rgb), 0.4);
    background: linear-gradient(135deg, rgba(var(--warning-rgb), 0.04) 0%, var(--bg-primary) 100%);
  }

  &--lifetime {
    .kpi-card__icon { background: rgba(#7c3aed, 0.1); }
  }

  &--loss {
    border-color: rgba(var(--error-rgb), 0.3);
    background: linear-gradient(135deg, rgba(var(--error-rgb), 0.04) 0%, var(--bg-primary) 100%);
    .kpi-card__icon { background: rgba(var(--error-rgb), 0.1); }
  }

  &__value--danger { color: var(--color-error) !important; }
  &__sub--danger { color: var(--color-error); font-weight: 500; }
}

// ── Sales Cards ─────────────────────────────────────────────
.dashboard-view__sales {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-4;
  margin-bottom: $spacing-6;

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

.sales-card {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-5;
  border-radius: $radius-xl;
  border: 1.5px solid var(--neutral-200);
  background: var(--bg-primary);
  transition: box-shadow 0.2s;

  &:hover { box-shadow: var(--shadow-md); }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 1.1rem;
    flex-shrink: 0;
    background: rgba(var(--primary-500-rgb), 0.08);
  }

  &__body {
    @include flex-column;
    gap: 2px;
  }

  &__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-tertiary);
    font-weight: 600;
  }

  &__value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  &__sub {
    font-size: 0.75rem;
    color: var(--text-tertiary);
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

  &:hover { background: var(--neutral-50); }

  &__avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--neutral-300);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--system {
      background: rgba(var(--primary-500-rgb), 0.1);
      color: var(--primary-600);
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
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__source {
    font-size: 0.75rem;
    color: var(--primary-600);
    font-style: italic;
  }

  &__date {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
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
  border-top: 1px solid var(--neutral-200);
  font-size: 0.9375rem;

  strong {
    color: var(--primary-700);
    font-size: 1.125rem;
    font-weight: 700;
  }
}

// ── Quick links ──────────────────────────────────────────────
.view-all {
  color: var(--primary-600);
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
  background: var(--bg-primary);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    .quick-link__arrow { transform: translateX(4px); color: var(--primary-600); }
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

    &--network  { background: rgba(var(--primary-500-rgb), 0.1); color: var(--primary-600); }
    &--quotas   { background: rgba(var(--success-rgb), 0.1);     color: var(--color-success-dark); }
    &--referral { background: rgba(var(--accent-500-rgb), 0.1);  color: #a07400; }
  }

  &__text {
    flex: 1;
    color: var(--text-primary);
    font-weight: 500;
    font-size: 0.9375rem;
  }

  &__arrow {
    color: var(--text-tertiary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }
}

// ── Utilities ────────────────────────────────────────────────
.text-success { color: var(--color-success); }
.text-muted   { color: var(--text-tertiary); }
.text-warning { color: var(--color-warning); }

// ── Referral Card ────────────────────────────────────────────
.dashboard-view__referral {
  margin-top: $spacing-4;
}

.referral-card {
  display: flex;
  align-items: center;
  gap: $spacing-5;
  padding: $spacing-5 $spacing-6;
  background: linear-gradient(135deg, rgba(var(--accent-500-rgb), 0.08) 0%, rgba(var(--primary-500-rgb), 0.06) 100%);
  border: 1.5px solid rgba(var(--accent-500-rgb), 0.25);
  border-radius: $radius-xl;
  flex-wrap: wrap;

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(var(--accent-500-rgb), 0.15);
    color: var(--accent-700);
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
    color: var(--text-tertiary);
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
    color: var(--accent-800);
    letter-spacing: 0.12em;
    font-family: 'Courier New', monospace;
    background: rgba(var(--accent-500-rgb), 0.12);
    padding: 2px 10px;
    border-radius: $radius-md;
    border: 1px solid rgba(var(--accent-500-rgb), 0.3);
  }

  &__link {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  &__desc {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  &__copy-btn {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-5;
    background: var(--accent-600);
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover { background: var(--accent-700); transform: translateY(-1px); }

    &--copied {
      background: var(--color-success);
      &:hover { background: var(--color-success-dark); }
    }
  }
}
</style>
