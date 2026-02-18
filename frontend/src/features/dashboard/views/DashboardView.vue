<template>
  <div class="dashboard-view">
    <!-- Header Section -->
    <header class="dashboard-view__header">
      <div class="dashboard-view__welcome">
        <h1>Bem-vindo, {{ authStore.userFullName }}!</h1>
        <p class="dashboard-view__subtitle">
          <DsBadge :variant="titleColor">{{ overview.title }}</DsBadge>
          <span>{{ overview.partnerLevel }}</span>
        </p>
      </div>
      <div class="dashboard-view__actions">
        <DsButton variant="primary" @click="goToCheckout">
          <template #icon><span>🛒</span></template>
          Comprar Cotas
        </DsButton>
      </div>
    </header>

    <!-- Stats Grid -->
    <section class="dashboard-view__stats">
      <DsStatCard
        label="Saldo de Cotas"
        :value="formatCurrency(overview.quotaBalance)"
        subtitle="Total em cotas disponíveis"
      >
        <template #icon><font-awesome-icon icon="coins" /></template>
      </DsStatCard>
      <DsStatCard
        label="Ganhos Totais"
        :value="formatCurrency(overview.totalEarnings)"
        subtitle="Rendimentos acumulados"
      >
        <template #icon><font-awesome-icon icon="arrow-trend-up" /></template>
      </DsStatCard>
      <DsStatCard
        label="Rede Direta"
        :value="String(overview.directReferrals)"
        subtitle="Indicados diretos ativos"
      >
        <template #icon><font-awesome-icon icon="users" /></template>
      </DsStatCard>
      <DsStatCard
        label="Total na Rede"
        :value="String(overview.networkSize)"
        subtitle="Membros em toda a rede"
      >
        <template #icon><font-awesome-icon icon="globe" /></template>
      </DsStatCard>
    </section>

    <!-- Earnings Breakdown -->
    <section class="dashboard-view__earnings">
      <DsCard>
        <template #header>
          <h2>Resumo de Ganhos</h2>
          <DsMonthPicker v-model="selectedMonth" />
        </template>

        <div class="earnings-grid">
          <div
            v-for="earning in monthlyEarnings"
            :key="earning.type"
            class="earning-item"
          >
            <span class="earning-item__icon">
              <font-awesome-icon :icon="getEarningFaIcon(earning.type)" />
            </span>
            <div class="earning-item__info">
              <span class="earning-item__label">{{ earning.label }}</span>
              <span class="earning-item__value">{{ formatCurrency(earning.value) }}</span>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="earnings-total">
            <span>Total do Mês:</span>
            <strong>{{ formatCurrency(totalMonthlyEarnings) }}</strong>
          </div>
        </template>
      </DsCard>
    </section>

    <!-- Recent Activity -->
    <section class="dashboard-view__activity">
      <DsCard>
        <template #header>
          <h2>Atividade Recente</h2>
          <RouterLink to="/earnings" class="view-all">
            Ver histórico
            <font-awesome-icon icon="arrow-right" />
          </RouterLink>
        </template>

        <DsTable
          :columns="activityColumns"
          :data="recentActivity"
          :loading="false"
        >
          <template #type="{ row }">
            <DsBadge :variant="getActivityVariant(row.type)">
              {{ row.type }}
            </DsBadge>
          </template>
          <template #amount="{ row }">
            <span :class="row.amount >= 0 ? 'text-success' : 'text-error'">
              {{ row.amount >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
            </span>
          </template>
        </DsTable>

        <DsEmptyState
          v-if="recentActivity.length === 0"
          icon="📋"
          title="Sem atividades"
          description="Suas atividades recentes aparecerão aqui"
        />
      </DsCard>
    </section>

    <!-- Quick Links -->
    <section class="dashboard-view__links">
      <DsCard class="quick-link" @click="goToNetwork">
        <span class="quick-link__icon quick-link__icon--network">
          <font-awesome-icon icon="sitemap" />
        </span>
        <span class="quick-link__text">Ver Minha Rede</span>
        <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
      </DsCard>
      <DsCard class="quick-link" @click="goToQuotas">
        <span class="quick-link__icon quick-link__icon--quotas">
          <font-awesome-icon icon="coins" />
        </span>
        <span class="quick-link__text">Informações de Cotas</span>
        <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
      </DsCard>
      <DsCard class="quick-link" @click="copyReferralLink">
        <span class="quick-link__icon quick-link__icon--referral">
          <font-awesome-icon icon="dollar-sign" />
        </span>
        <span class="quick-link__text">Copiar Link de Indicação</span>
        <font-awesome-icon icon="arrow-right" class="quick-link__arrow" />
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import {
  DsCard,
  DsStatCard,
  DsTable,
  DsBadge,
  DsButton,
  DsMonthPicker,
  DsEmptyState,
} from '@/design-system';
import {
  getUserOverview,
  getMonthlySummary,
  mockDelay,
} from '@/mocks';

const router = useRouter();
const authStore = useAuthStore();

// State
const selectedMonth = ref<string>(
  new Date().toISOString().slice(0, 7) // YYYY-MM
);

interface OverviewData {
  userId: string;
  quotaBalance: number;
  totalEarnings: number;
  directReferrals: number;
  networkSize: number;
  title: string;
  partnerLevel: string;
}

interface EarningItem {
  type: string;
  label: string;
  value: number;
}

const overview = ref<OverviewData>({
  userId: '',
  quotaBalance: 0,
  totalEarnings: 0,
  directReferrals: 0,
  networkSize: 0,
  title: 'bronze',
  partnerLevel: 'socio',
});
const monthlyEarnings = ref<EarningItem[]>([]);

// Activity mock data
const recentActivity = ref([
  { id: 1, type: 'Comissão', description: 'Indicação direta - João Silva', amount: 150, date: '2025-01-15' },
  { id: 2, type: 'Bônus', description: 'Bônus de rede - Nível 2', amount: 75.50, date: '2025-01-14' },
  { id: 3, type: 'Dividendo', description: 'Dividendo mensal', amount: 320, date: '2025-01-10' },
  { id: 4, type: 'Compra', description: 'Aquisição de cotas', amount: -1000, date: '2025-01-08' },
]);

const activityColumns = [
  { key: 'type', label: 'Tipo', width: '120px' },
  { key: 'description', label: 'Descrição' },
  { key: 'amount', label: 'Valor', align: 'right' as const },
  { key: 'date', label: 'Data', width: '120px' },
];

// Computed
const titleColor = computed(() => {
  const colors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    bronze: 'warning',
    prata: 'default',
    ouro: 'success',
    diamante: 'primary',
  };
  return colors[overview.value.title] || 'default';
});

const totalMonthlyEarnings = computed(() =>
  monthlyEarnings.value.reduce((sum, e) => sum + e.value, 0)
);

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getEarningFaIcon(type: string): string {
  const icons: Record<string, string> = {
    direct_commission: 'handshake',
    network_bonus: 'network-wired',
    dividend: 'chart-line',
    career_bonus: 'trophy',
    retention_bonus: 'rotate',
    special_bonus: 'star',
  };
  return icons[type] || 'money-bill-wave';
}

function getActivityVariant(type: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    Comissão: 'success',
    Bônus: 'info',
    Dividendo: 'primary',
    Compra: 'warning',
  };
  return variants[type] || 'default';
}

function goToCheckout() {
  router.push('/checkout');
}

function goToNetwork() {
  router.push('/network');
}

function goToQuotas() {
  router.push('/quotas');
}

async function copyReferralLink() {
  const link = `https://ciano.com.br/r/${authStore.user?.referralCode}`;
  try {
    await navigator.clipboard.writeText(link);
    // TODO: Show toast notification
    alert('Link copiado!');
  } catch {
    console.error('Failed to copy');
  }
}

// Watch month changes to re-fetch earnings
watch(selectedMonth, async (newMonth) => {
  const userId = authStore.user?.id || 'user-001';
  const summary = getMonthlySummary(userId, newMonth);
  if (summary) {
    monthlyEarnings.value = [
      { type: 'direct_commission', label: 'Comissão Direta', value: summary.direct },
      { type: 'network_bonus', label: 'Bônus de Rede', value: summary.indirect },
      { type: 'dividend', label: 'Dividendos', value: summary.residual },
      { type: 'career_bonus', label: 'Bônus de Carreira', value: summary.leadership },
      { type: 'retention_bonus', label: 'Bônus de Retenção', value: summary.fidelity },
    ];
  } else {
    monthlyEarnings.value = [
      { type: 'direct_commission', label: 'Comissão Direta', value: 0 },
      { type: 'network_bonus', label: 'Bônus de Rede', value: 0 },
      { type: 'dividend', label: 'Dividendos', value: 0 },
      { type: 'career_bonus', label: 'Bônus de Carreira', value: 0 },
      { type: 'retention_bonus', label: 'Bônus de Retenção', value: 0 },
    ];
  }
});

// Lifecycle
onMounted(async () => {
  await mockDelay(300);

  const userId = authStore.user?.id || 'user-001';
  const userOverview = getUserOverview(userId);

  if (userOverview) {
    overview.value = {
      userId: userOverview.userId,
      quotaBalance: userOverview.thisMonthEarnings,
      totalEarnings: userOverview.totalEarned,
      directReferrals: 12, // Mock value
      networkSize: 45, // Mock value
      title: 'ouro',
      partnerLevel: 'Sócio Premium',
    };
  }

  // Get monthly summary and convert to earnings format
  const summary = getMonthlySummary(userId, selectedMonth.value);
  if (summary) {
    monthlyEarnings.value = [
      { type: 'direct_commission', label: 'Comissão Direta', value: summary.direct },
      { type: 'network_bonus', label: 'Bônus de Rede', value: summary.indirect },
      { type: 'dividend', label: 'Dividendos', value: summary.residual },
      { type: 'career_bonus', label: 'Bônus de Carreira', value: summary.leadership },
      { type: 'retention_bonus', label: 'Bônus de Retenção', value: summary.fidelity },
    ];
  } else {
    // Default mock data
    monthlyEarnings.value = [
      { type: 'direct_commission', label: 'Comissão Direta', value: 1500 },
      { type: 'network_bonus', label: 'Bônus de Rede', value: 750 },
      { type: 'dividend', label: 'Dividendos', value: 2000 },
      { type: 'career_bonus', label: 'Bônus de Carreira', value: 500 },
      { type: 'retention_bonus', label: 'Bônus de Retenção', value: 250 },
    ];
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.dashboard-view {
  padding: $spacing-6;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  &__header {
    @include flex-between;
    flex-wrap: wrap;
    gap: $spacing-4;
    margin-bottom: $spacing-6;
  }

  &__welcome {
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: $spacing-2;
    }
  }

  &__subtitle {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    color: $text-secondary;
    text-transform: capitalize;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 576px) {
      grid-template-columns: 1fr;
    }
  }

  &__earnings {
    margin-bottom: $spacing-6;
  }

  &__activity {
    margin-bottom: $spacing-6;
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-4;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
}

.earnings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

.earning-item {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3;
  background: $neutral-50;
  border-radius: $radius-md;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba($primary-500, 0.1);
    color: $primary-600;
    border-radius: 8px;
    font-size: 0.9375rem;
    flex-shrink: 0;
  }

  &__info {
    @include flex-column;
    gap: 2px;
  }

  &__label {
    font-size: 0.875rem;
    color: $text-secondary;
  }

  &__value {
    font-weight: 600;
    color: $success;
  }
}

.earnings-total {
  @include flex-between;
  padding-top: $spacing-3;
  border-top: 1px solid $neutral-200;
  font-size: 1rem;

  strong {
    color: $primary-600;
    font-size: 1.25rem;
  }
}

.view-all {
  color: $primary-600;
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    text-decoration: underline;
  }
}

.quick-link {
  cursor: pointer;
  display: flex !important;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4 $spacing-5 !important;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;

    .quick-link__arrow {
      transform: translateX(4px);
      color: $primary-600;
    }
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

.text-success {
  color: $success;
}

.text-error {
  color: $error;
}
</style>
