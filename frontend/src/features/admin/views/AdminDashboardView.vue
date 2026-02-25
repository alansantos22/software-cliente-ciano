<template>
  <div class="admin-cmd">

    <!-- ===================================================== -->
    <!-- 🚨 URGENTE: Alertas Acionáveis                        -->
    <!-- ===================================================== -->
    <AdminAlertBar
      :total="pendingPayouts.total"
      :count="pendingPayouts.count"
      :payment-day="paymentDay"
      :reference-month="currentPeriod"
      @go-to-payouts="goToPayouts"
    />

    <!-- Header -->
    <header class="admin-cmd__header">
      <div>
        <h1 class="admin-cmd__title">Centro de Comando</h1>
        <p class="admin-cmd__subtitle">
          Painel Administrativo · Grupo Ciano ·
          <span>{{ todayFormatted }}</span>
        </p>
      </div>
      <RouterLink to="/admin/payouts" class="admin-cmd__header-link">
        Gerenciar Pagamentos →
      </RouterLink>
    </header>

    <!-- ===================================================== -->
    <!-- BLOCO 1 · O que está acontecendo agora?               -->
    <!-- ===================================================== -->
    <div class="block-divider">
      <span class="block-divider__label">1 · O que está acontecendo agora?</span>
    </div>

    <section class="admin-cmd__kpis">
      <DsStatCard
        label="Receita do Mês"
        :value="kpis.monthRevenue"
        :is-currency="true"
        :trend="kpis.monthRevenueTrend"
        icon="💰"
        subtitle="Mês atual vs. mês anterior"
      />
      <DsStatCard
        label="Usuários Ativos"
        :value="`${kpis.activeUsers} (${kpis.retentionRate}%)`"
        icon="✅"
        subtitle="Taxa de retenção da base"
      />
      <DsStatCard
        label="Cotas Este Mês"
        :value="String(kpis.monthQuotas)"
        :trend="kpis.monthQuotasTrend"
        icon="📊"
        subtitle="Novas cotas vendidas"
      />
      <DsStatCard
        label="Histórico Total"
        :value="kpis.totalRevenue"
        :is-currency="true"
        icon="🏦"
        subtitle="Desde o início da operação"
      />
      <!-- Caixa de Dividendos Prometido (card especial âmbar) -->
      <div class="kpi-dividend" role="region" aria-label="Caixa de dividendos prometido">
        <div class="kpi-dividend__header">
          <span class="kpi-dividend__icon">💸</span>
          <span class="kpi-dividend__label">Caixa de Dividendos</span>
        </div>
        <div class="kpi-dividend__value">{{ formatCurrency(kpis.dividendPool) }}</div>
        <p class="kpi-dividend__subtitle">Comprometido para pagar no dia {{ paymentDay }}</p>
        <div class="kpi-dividend__bar">
          <div
            class="kpi-dividend__bar-fill"
            :style="{ width: dividendPoolPercent + '%' }"
            :title="`${dividendPoolPercent}% da receita comprometida`"
          />
        </div>
        <span class="kpi-dividend__bar-label">{{ dividendPoolPercent }}% da receita do mês</span>
      </div>
    </section>

    <!-- ===================================================== -->
    <!-- BLOCO 2 · Motor de Preço + Gráfico de Vendas          -->
    <!-- ===================================================== -->
    <div class="block-divider">
      <span class="block-divider__label">2 · Operações &amp; Dinâmica de Preço</span>
    </div>

    <section class="admin-cmd__ops">
      <AdminPriceEngine
        :quota-price="currentQuotaPrice"
        :lot-progress="lotProgress"
        :lot-size="lotSize"
        :lot-number="lotNumber"
        :current-constant="currentConstant"
        @force-split="handleForceSplit"
        @adjust-constant="handleAdjustConstant"
      />

      <DsCard class="chart-card">
        <template #header>
          <h2>Vendas por Tipo</h2>
          <div class="chart-legend">
            <span class="chart-legend__dot chart-legend__dot--novas" />
            <span class="chart-legend__text">Novas Cotas</span>
            <span class="chart-legend__dot chart-legend__dot--recompra" />
            <span class="chart-legend__text">Recompra / Ativação</span>
          </div>
        </template>

        <div class="stacked-chart">
          <div class="stacked-chart__area">
            <div class="stacked-chart__guide" v-for="n in 4" :key="n" :style="{ bottom: (n * 25) + '%' }">
              <span class="stacked-chart__guide-label">{{ Math.round(chartMaxTotal * n * 0.25) }}</span>
            </div>
            <div class="stacked-chart__bars">
              <div
                v-for="bar in salesChartData"
                :key="bar.label"
                class="stacked-chart__bar-group"
              >
                <span class="stacked-chart__bar-total">{{ bar.novas + bar.recompra }}</span>
                <div
                  class="stacked-chart__bar"
                  :style="{ height: getBarHeightPercent(bar) + '%' }"
                  :title="`${bar.label}: ${bar.novas} novas + ${bar.recompra} recompra`"
                >
                  <div class="stacked-chart__segment stacked-chart__segment--recompra" :style="{ flex: bar.recompra }" />
                  <div class="stacked-chart__segment stacked-chart__segment--novas" :style="{ flex: bar.novas }" />
                </div>
                <span class="stacked-chart__month">{{ bar.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </DsCard>
    </section>

    <!-- ===================================================== -->
    <!-- BLOCO 3 · Saúde da Rede                               -->
    <!-- ===================================================== -->
    <div class="block-divider">
      <span class="block-divider__label">3 · Saúde da Rede</span>
    </div>

    <section class="admin-cmd__health">
      <DsCard class="title-dist-card">
        <template #header>
          <h2>Distribuição de Títulos</h2>
        </template>
        <div class="title-distribution">
          <div v-for="title in titleDistribution" :key="title.name" class="title-bar">
            <span class="title-bar__icon-name">{{ title.icon }} {{ title.name }}</span>
            <div class="title-bar__progress">
              <div class="title-bar__fill" :style="{ width: title.percentage + '%', background: title.color }" />
            </div>
            <span class="title-bar__count">{{ title.count }}</span>
          </div>
        </div>
      </DsCard>

      <DsCard class="crm-card">
        <template #header>
          <h2>CRM de Usuários</h2>
          <div class="crm-header-meta">
            <span class="crm-header-meta__hint">🐋 Baleias · 🟢 Ativo · 🟡 Em risco · 🔴 Inativo</span>
            <RouterLink to="/admin/users" class="view-all">Ver todos →</RouterLink>
          </div>
        </template>
        <AdminCrmTable
          :users="sortedUsers"
          :quota-price="currentQuotaPrice"
          @action="handleCrmAction"
        />
      </DsCard>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DsStatCard, DsCard } from '@/design-system';
import AdminAlertBar from '../components/AdminAlertBar.vue';
import AdminPriceEngine from '../components/AdminPriceEngine.vue';
import AdminCrmTable from '../components/AdminCrmTable.vue';
import {
  mockUsers,
  mockPayouts,
  mockMonthlyConfigs,
  mockGlobalSettings,
  mockDelay,
} from '@/mocks';
import type { MockUser } from '@/mocks';

const router = useRouter();

// =====================================================
// Constants / Config
// =====================================================
const currentQuotaPrice = ref(2500);
const lotProgress = ref(140);
const lotSize = ref(200);
const lotNumber = ref(3);
const currentConstant = ref(7);
const paymentDay = ref(mockGlobalSettings.paymentDay);
const currentPeriod = new Date().toISOString().slice(0, 7);

const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());

// =====================================================
// KPIs
// =====================================================
interface KpiState {
  monthRevenue: number;
  monthRevenueTrend: number;
  activeUsers: number;
  retentionRate: number;
  monthQuotas: number;
  monthQuotasTrend: number;
  totalRevenue: number;
  dividendPool: number;
}

const kpis = ref<KpiState>({
  monthRevenue: 0,
  monthRevenueTrend: 0,
  activeUsers: 0,
  retentionRate: 0,
  monthQuotas: 0,
  monthQuotasTrend: 0,
  totalRevenue: 0,
  dividendPool: 0,
});

const dividendPoolPercent = computed(() => {
  if (!kpis.value.monthRevenue) return 0;
  return Math.round((kpis.value.dividendPool / kpis.value.monthRevenue) * 100);
});

// =====================================================
// Title distribution
// =====================================================
const titleDistribution = ref([
  { name: 'Bronze',   icon: '🥉', color: '#CD7F32', count: 0, percentage: 0 },
  { name: 'Prata',    icon: '🥈', color: '#C0C0C0', count: 0, percentage: 0 },
  { name: 'Ouro',     icon: '🥇', color: '#FFD700', count: 0, percentage: 0 },
  { name: 'Diamante', icon: '💎', color: '#00BCD4', count: 0, percentage: 0 },
]);

// =====================================================
// Pending Payouts
// =====================================================
const pendingPayouts = ref({ total: 0, count: 0 });

// =====================================================
// CRM Users (sorted by LTV desc)
// =====================================================
const sortedUsers = computed<MockUser[]>(() =>
  [...mockUsers]
    .sort(
      (a, b) =>
        b.purchasedQuotas * currentQuotaPrice.value -
        a.purchasedQuotas * currentQuotaPrice.value,
    )
    .slice(0, 10),
);

// =====================================================
// Sales Chart Data (last 6 months)
// =====================================================
const salesChartData = [
  { label: 'Set', novas: 32, recompra: 8  },
  { label: 'Out', novas: 45, recompra: 14 },
  { label: 'Nov', novas: 38, recompra: 20 },
  { label: 'Dez', novas: 55, recompra: 28 },
  { label: 'Jan', novas: 61, recompra: 35 },
  { label: 'Fev', novas: 48, recompra: 42 },
];

const chartMaxTotal = computed(() =>
  Math.max(...salesChartData.map(d => d.novas + d.recompra)),
);

function getBarHeightPercent(bar: typeof salesChartData[0]): number {
  return Math.round(((bar.novas + bar.recompra) / chartMaxTotal.value) * 100);
}

// =====================================================
// Helpers
// =====================================================
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function goToPayouts() {
  router.push('/admin/payouts');
}

function handleForceSplit() {
  console.info('[Admin] Force split triggered');
}

function handleAdjustConstant(value: number) {
  currentConstant.value = value;
  console.info('[Admin] Constant adjusted to', value);
}

function handleCrmAction(type: 'extrato' | 'bloquear' | 'mensagem', user: MockUser) {
  if (type === 'extrato') {
    router.push(`/admin/users/${user.id}`);
  } else {
    console.info(`[Admin] Action "${type}" on user`, user.id);
  }
}

// =====================================================
// Load Data
// =====================================================
onMounted(async () => {
  await mockDelay(250);

  const users = mockUsers;
  const config = mockMonthlyConfigs[0];

  const monthQuotas = 48;
  const prevMonthQuotas = 40;
  const monthRevenue = monthQuotas * currentQuotaPrice.value;
  const prevMonthRevenue = prevMonthQuotas * currentQuotaPrice.value;
  const totalQuotas = users.reduce((s, u) => s + u.quotaBalance, 0);
  const activeUsers = users.filter(u => u.isActive).length;
  const dividendPoolRate = config?.dividendPoolPercent ?? 20;
  const dividendPool = monthRevenue * (dividendPoolRate / 100);

  kpis.value = {
    monthRevenue,
    monthRevenueTrend: Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100),
    activeUsers,
    retentionRate: Math.round((activeUsers / users.length) * 100),
    monthQuotas,
    monthQuotasTrend: Math.round(((monthQuotas - prevMonthQuotas) / prevMonthQuotas) * 100),
    totalRevenue: totalQuotas * currentQuotaPrice.value,
    dividendPool,
  };

  const titleCounts = users.reduce((acc: Record<string, number>, u) => {
    acc[u.title] = (acc[u.title] || 0) + 1;
    return acc;
  }, {});

  titleDistribution.value = titleDistribution.value.map(t => ({
    ...t,
    count: titleCounts[t.name.toLowerCase()] || 0,
    percentage: ((titleCounts[t.name.toLowerCase()] || 0) / users.length) * 100,
  }));

  // Ciclo de pagamento mensal — a empresa processa pagamentos no dia fixo (paymentDay)
  // Não são saques solicitados pelos usuários
  const cyclePayouts = mockPayouts.filter(
    p => p.referenceMonth === currentPeriod && (p.status === 'pending' || p.status === 'processing'),
  );
  pendingPayouts.value = {
    total: cyclePayouts.reduce((s, p) => s + p.amount, 0),
    count: cyclePayouts.length,
  };
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ============================================================
// Container
// ============================================================
.admin-cmd {
  padding: $spacing-6;
  max-width: 1440px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }
}

// ============================================================
// Header
// ============================================================
.admin-cmd__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: $spacing-6;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.admin-cmd__title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 $spacing-1;
  color: $text-primary;
}

.admin-cmd__subtitle {
  color: $text-secondary;
  font-size: 0.875rem;
  margin: 0;

  span {
    font-style: italic;
    opacity: 0.8;
  }
}

.admin-cmd__header-link {
  color: $primary-600;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  padding: $spacing-2 $spacing-4;
  border: 1px solid $primary-300;
  border-radius: $radius-md;
  transition: all 0.2s;

  &:hover {
    background: $primary-50;
    border-color: $primary-500;
  }
}

// ============================================================
// Block dividers
// ============================================================
.block-divider {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  margin: $spacing-8 0 $spacing-4;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $border-light;
  }

  &__label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: $text-tertiary;
    white-space: nowrap;
    padding: 0 $spacing-2;
  }
}

// ============================================================
// BLOCK 1: KPIs
// ============================================================
.admin-cmd__kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $spacing-4;
  margin-bottom: $spacing-6;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

// Dividend card
.kpi-dividend {
  @include card;
  background: linear-gradient(135deg, #fff8e1, #fff3cd);
  border: 1px solid rgba($accent-500, 0.4);
  box-shadow: 0 2px 8px rgba($accent-500, 0.12);
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__icon { font-size: 1.2rem; }

  &__label {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $accent-800;
  }

  &__value {
    font-size: 1.45rem;
    font-weight: 800;
    color: $accent-900;
    margin: $spacing-1 0;
    font-variant-numeric: tabular-nums;
  }

  &__subtitle {
    font-size: 0.78rem;
    color: $accent-700;
    margin: 0;
  }

  &__bar {
    height: 6px;
    background: rgba($accent-500, 0.2);
    border-radius: $radius-full;
    margin-top: $spacing-2;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: linear-gradient(90deg, $accent-500, $accent-700);
    border-radius: $radius-full;
    transition: width 0.8s ease;
    max-width: 100%;
  }

  &__bar-label {
    font-size: 0.72rem;
    color: $accent-700;
    margin-top: 4px;
  }
}

// ============================================================
// BLOCK 2: Ops (Motor + Chart)
// ============================================================
.admin-cmd__ops {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: $spacing-4;
  margin-bottom: $spacing-6;
  align-items: stretch;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  flex-wrap: wrap;

  &__dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;

    &--novas    { background: $primary-500; }
    &--recompra { background: $secondary-500; }
  }

  &__text {
    font-size: 0.78rem;
    color: $text-secondary;
    font-weight: 400;
    margin-right: $spacing-2;
  }
}

// CSS Stacked Bar Chart
.stacked-chart {
  padding: $spacing-2 0;
}

.stacked-chart__area {
  position: relative;
  height: 240px;
  display: flex;
  align-items: flex-end;
  padding-left: 32px;
}

.stacked-chart__guide {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;

  &::after {
    content: '';
    position: absolute;
    left: 28px;
    right: 0;
    height: 1px;
    background: $border-light;
    opacity: 0.7;
  }
}

.stacked-chart__guide-label {
  font-size: 0.65rem;
  color: $text-tertiary;
  width: 26px;
  text-align: right;
  position: relative;
  z-index: 1;
}

.stacked-chart__bars {
  display: flex;
  align-items: flex-end;
  gap: $spacing-3;
  flex: 1;
  height: 100%;
  padding: 0 $spacing-2;

  @media (max-width: 600px) {
    gap: $spacing-2;
  }
}

.stacked-chart__bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-1;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.stacked-chart__bar-total {
  font-size: 0.7rem;
  font-weight: 700;
  color: $text-secondary;
}

.stacked-chart__bar {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 52px;
  min-height: 4px;
  border-radius: $radius-sm $radius-sm 0 0;
  overflow: hidden;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;

  &:hover .stacked-chart__segment {
    filter: brightness(1.1);
  }
}

.stacked-chart__segment {
  min-height: 2px;

  &--recompra { background: $secondary-500; opacity: 0.85; }
  &--novas    { background: $primary-500; }
}

.stacked-chart__month {
  font-size: 0.72rem;
  color: $text-tertiary;
  font-weight: 600;
}

// ============================================================
// BLOCK 3: Health (Distribution + CRM)
// ============================================================
.admin-cmd__health {
  display: grid;
  grid-template-columns: 1fr 2.5fr;
  gap: $spacing-4;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.title-dist-card h2,
.crm-card h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.title-distribution {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.title-bar {
  display: grid;
  grid-template-columns: 80px 1fr 28px;
  align-items: center;
  gap: $spacing-3;

  &__icon-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: $text-primary;
    white-space: nowrap;
  }

  &__progress {
    height: 20px;
    background: $neutral-100;
    border-radius: $radius-md;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: $radius-md;
    transition: width 0.6s ease;
    min-width: 4px;
  }

  &__count {
    text-align: right;
    font-weight: 700;
    font-size: 0.875rem;
    color: $text-primary;
  }
}

.crm-header-meta {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  flex-wrap: wrap;

  &__hint {
    font-size: 0.75rem;
    color: $text-tertiary;
    font-weight: 400;
  }
}

.view-all {
  color: $primary-600;
  text-decoration: none;
  font-size: 0.875rem;
  white-space: nowrap;

  &:hover { text-decoration: underline; }
}
</style>
