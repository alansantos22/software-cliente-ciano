<template>
  <div class="admin-dashboard-view">
    <!-- Header -->
    <header class="admin-dashboard-view__header">
      <h1>Painel Administrativo</h1>
      <p class="admin-dashboard-view__subtitle">Visão geral do sistema de cotas</p>
    </header>

    <!-- Stats Grid -->
    <section class="admin-dashboard-view__stats">
      <DsStatCard
        label="Total de Usuários"
        :value="String(stats.totalUsers)"
        icon="👥"
        subtitle="Usuários cadastrados"
      />
      <DsStatCard
        label="Usuários Ativos"
        :value="String(stats.activeUsers)"
        icon="✅"
        subtitle="Últimos 30 dias"
      />
      <DsStatCard
        label="Total de Cotas"
        :value="String(stats.totalQuotas)"
        icon="📊"
        subtitle="Cotas vendidas"
      />
      <DsStatCard
        label="Receita Total"
        :value="formatCurrency(stats.totalRevenue)"
        icon="💰"
        subtitle="Desde o início"
      />
    </section>

    <!-- Charts Row -->
    <section class="admin-dashboard-view__charts">
      <DsCard class="chart-card">
        <template #header>
          <h2>Vendas por Mês</h2>
          <DsMonthPicker v-model="selectedMonth" />
        </template>
        <div class="chart-placeholder">
          📊 Gráfico de Vendas (integrar Chart.js)
        </div>
      </DsCard>

      <DsCard class="chart-card">
        <template #header>
          <h2>Distribuição de Títulos</h2>
        </template>
        <div class="title-distribution">
          <div
            v-for="title in titleDistribution"
            :key="title.name"
            class="title-bar"
          >
            <span class="title-bar__label">{{ title.icon }} {{ title.name }}</span>
            <div class="title-bar__progress">
              <div
                class="title-bar__fill"
                :style="{ width: title.percentage + '%', background: title.color }"
              />
            </div>
            <span class="title-bar__value">{{ title.count }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <!-- Recent Users Table -->
    <section class="admin-dashboard-view__users">
      <DsCard>
        <template #header>
          <h2>Usuários Recentes</h2>
          <RouterLink to="/admin/users" class="view-all">Ver todos →</RouterLink>
        </template>

        <DsTable :columns="userColumns" :data="recentUsers">
          <template #name="{ row }">
            <div class="user-cell">
              <div class="user-cell__avatar">{{ getInitials(row.name) }}</div>
              <div class="user-cell__info">
                <strong>{{ row.name }}</strong>
                <span>{{ row.email }}</span>
              </div>
            </div>
          </template>
          <template #title="{ row }">
            <DsBadge :variant="getTitleVariant(row.title)" size="sm">
              {{ row.title }}
            </DsBadge>
          </template>
          <template #status="{ row }">
            <DsBadge :variant="row.isActive ? 'success' : 'default'" size="sm">
              {{ row.isActive ? 'Ativo' : 'Inativo' }}
            </DsBadge>
          </template>
        </DsTable>
      </DsCard>
    </section>

    <!-- Pending Payouts -->
    <section class="admin-dashboard-view__payouts">
      <DsCard>
        <template #header>
          <h2>Pagamentos Pendentes</h2>
          <RouterLink to="/admin/payouts" class="view-all">Gerenciar →</RouterLink>
        </template>

        <div class="pending-summary">
          <div class="pending-item">
            <span class="pending-item__label">Total Pendente:</span>
            <strong class="pending-item__value">{{ formatCurrency(pendingPayouts.total) }}</strong>
          </div>
          <div class="pending-item">
            <span class="pending-item__label">Solicitações:</span>
            <strong>{{ pendingPayouts.count }}</strong>
          </div>
          <DsButton variant="primary" @click="goToPayouts">
            Processar Pagamentos
          </DsButton>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  DsStatCard,
  DsCard,
  DsTable,
  DsBadge,
  DsButton,
  DsMonthPicker,
} from '@/design-system';
import { mockUsers, getPendingPayouts, mockDelay } from '@/mocks';

const router = useRouter();

// State
const selectedMonth = ref(new Date().toISOString().slice(0, 7));

// Stats
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalQuotas: 0,
  totalRevenue: 0,
});

const titleDistribution = ref([
  { name: 'Bronze', icon: '🥉', color: '#CD7F32', count: 0, percentage: 0 },
  { name: 'Prata', icon: '🥈', color: '#C0C0C0', count: 0, percentage: 0 },
  { name: 'Ouro', icon: '🥇', color: '#FFD700', count: 0, percentage: 0 },
  { name: 'Diamante', icon: '💎', color: '#00BCD4', count: 0, percentage: 0 },
]);

const recentUsers = ref<(typeof mockUsers[0] & { quotas: number; createdAt: string })[]>([]);
const pendingPayouts = ref({ total: 0, count: 0 });

const userColumns = [
  { key: 'name', label: 'Usuário' },
  { key: 'title', label: 'Título', width: '100px' },
  { key: 'quotas', label: 'Cotas', align: 'right' as const, width: '80px' },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'createdAt', label: 'Cadastro', width: '120px' },
];

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getTitleVariant(title: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    bronze: 'warning',
    prata: 'default',
    ouro: 'success',
    diamante: 'primary',
  };
  return variants[title] || 'default';
}

function goToPayouts() {
  router.push('/admin/payouts');
}

// Load data
onMounted(async () => {
  await mockDelay(300);

  // Calculate stats
  const users = mockUsers;
  const totalQuotas = 2340; // Mock value
  stats.value = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.isActive).length,
    totalQuotas: totalQuotas,
    totalRevenue: totalQuotas * 200,
  };

  // Calculate title distribution
  const titleCounts = users.reduce((acc: Record<string, number>, u) => {
    acc[u.title] = (acc[u.title] || 0) + 1;
    return acc;
  }, {});

  titleDistribution.value = titleDistribution.value.map(t => ({
    ...t,
    count: titleCounts[t.name.toLowerCase()] || 0,
    percentage: ((titleCounts[t.name.toLowerCase()] || 0) / users.length) * 100,
  }));

  // Recent users
  recentUsers.value = users.slice(0, 5).map((u) => ({
    ...u,
    quotas: Math.floor(Math.random() * 100) + 10,
    createdAt: new Date(u.createdAt).toLocaleDateString('pt-BR'),
  }));

  // Pending payouts
  const pending = getPendingPayouts();
  pendingPayouts.value = {
    total: pending.reduce((sum, p) => sum + p.amount, 0),
    count: pending.length,
  };
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.admin-dashboard-view {
  padding: $spacing-6;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  &__header {
    margin-bottom: $spacing-6;

    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: $spacing-1;
    }
  }

  &__subtitle {
    color: $text-secondary;
    margin: 0;
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

  &__charts {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  &__users {
    margin-bottom: $spacing-6;
  }

  &__payouts {
    margin-bottom: $spacing-6;
  }
}

.chart-card {
  h2 {
    font-size: 1rem;
    margin: 0;
  }
}

.chart-placeholder {
  height: 250px;
  @include flex-center;
  background: $neutral-100;
  border-radius: $radius-md;
  color: $text-tertiary;
  font-size: 1.25rem;
}

.title-distribution {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.title-bar {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  &__label {
    width: 100px;
    font-size: 0.875rem;
  }

  &__progress {
    flex: 1;
    height: 24px;
    background: $neutral-100;
    border-radius: $radius-md;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: $radius-md;
    transition: width 0.3s ease;
  }

  &__value {
    width: 40px;
    text-align: right;
    font-weight: 600;
    color: $text-primary;
  }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-500, $secondary-500);
    color: white;
    @include flex-center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__info {
    @include flex-column;
    gap: 2px;

    strong {
      font-size: 0.875rem;
    }

    span {
      font-size: 0.75rem;
      color: $text-tertiary;
    }
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

.pending-summary {
  display: flex;
  align-items: center;
  gap: $spacing-6;
  flex-wrap: wrap;
}

.pending-item {
  @include flex-column;
  gap: 4px;

  &__label {
    font-size: 0.875rem;
    color: $text-secondary;
  }

  &__value {
    font-size: 1.5rem;
    color: $warning;
  }
}
</style>
