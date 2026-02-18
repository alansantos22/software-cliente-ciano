<template>
  <div class="earnings-view">

    <!-- Summary Cards -->
    <section class="earnings-view__summary">
      <div class="summary-card summary-card--green">
        <span class="summary-card__label">Total Recebido</span>
        <span class="summary-card__value">{{ formatCurrency(totalIn) }}</span>
        <span class="summary-card__icon"><font-awesome-icon icon="arrow-trend-up" /></span>
      </div>
      <div class="summary-card summary-card--red">
        <span class="summary-card__label">Total Investido</span>
        <span class="summary-card__value">{{ formatCurrency(totalOut) }}</span>
        <span class="summary-card__icon"><font-awesome-icon icon="cart-shopping" /></span>
      </div>
      <div class="summary-card summary-card--blue">
        <span class="summary-card__label">Saldo Líquido</span>
        <span class="summary-card__value" :class="balance >= 0 ? 'text--positive' : 'text--negative'">
          {{ formatCurrency(balance) }}
        </span>
        <span class="summary-card__icon"><font-awesome-icon icon="wallet" /></span>
      </div>
      <div class="summary-card summary-card--purple">
        <span class="summary-card__label">Movimentações</span>
        <span class="summary-card__value">{{ filteredRows.length }}</span>
        <span class="summary-card__icon"><font-awesome-icon icon="clipboard-list" /></span>
      </div>
    </section>

    <!-- Filters -->
    <DsCard class="earnings-view__filters">
      <div class="filters-row">
        <DsMonthPicker v-model="selectedMonth" />

        <div class="filter-group">
          <button
            v-for="f in typeFilters"
            :key="f.value"
            :class="['filter-chip', { 'filter-chip--active': activeFilter === f.value }]"
            @click="activeFilter = f.value"
          >
            <font-awesome-icon :icon="f.icon" />
            {{ f.label }}
          </button>
        </div>
      </div>
    </DsCard>

    <!-- Table -->
    <DsCard class="earnings-view__table-card">
      <template #header>
        <h2>Movimentações</h2>
        <span class="earnings-view__count">{{ filteredRows.length }} registros</span>
      </template>

      <DsTable
        :columns="columns"
        :data="filteredRows"
        :empty-message="'Nenhuma movimentação encontrada para este período.'"
      >
        <!-- Tipo -->
        <template #cell-type="{ row }">
          <DsBadge :variant="getVariant((row as unknown as ActivityRow).type)">{{ (row as unknown as ActivityRow).type }}</DsBadge>
        </template>

        <!-- Descrição -->
        <template #cell-description="{ row }">
          <div class="desc-cell">
            <span class="desc-cell__icon">
              <font-awesome-icon :icon="getTypeIcon((row as unknown as ActivityRow).rawType)" />
            </span>
            <span>{{ (row as unknown as ActivityRow).description }}</span>
          </div>
        </template>

        <!-- Valor -->
        <template #cell-amount="{ row }">
          <span :class="['amount', (row as unknown as ActivityRow).amount >= 0 ? 'amount--positive' : 'amount--negative']">
            {{ (row as unknown as ActivityRow).amount >= 0 ? '+' : '' }}{{ formatCurrency((row as unknown as ActivityRow).amount) }}
          </span>
        </template>

        <!-- Data -->
        <template #cell-date="{ row }">
          <span class="date-cell">{{ formatDate((row as unknown as ActivityRow).date) }}</span>
        </template>
      </DsTable>
    </DsCard>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DsCard from '@/design-system/DsCard.vue';
import DsTable from '@/design-system/DsTable.vue';
import DsBadge from '@/design-system/DsBadge.vue';
import DsMonthPicker from '@/design-system/DsMonthPicker.vue';

// ─── Types ───────────────────────────────────────────
interface ActivityRow {
  id: number;
  type: string;
  rawType: string;
  description: string;
  amount: number;
  date: string;
}

// ─── State ───────────────────────────────────────────
const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const activeFilter = ref('all');

// ─── Mock Data ────────────────────────────────────────
const allRows = ref<ActivityRow[]>([
  { id: 1,  type: 'Comissão',  rawType: 'direct_commission', description: 'Indicação direta — João Silva',          amount:  150.00, date: '2025-01-15' },
  { id: 2,  type: 'Bônus',     rawType: 'network_bonus',     description: 'Bônus de rede — Nível 2',                amount:   75.50, date: '2025-01-14' },
  { id: 3,  type: 'Dividendo', rawType: 'dividend',          description: 'Dividendo mensal — Janeiro 2025',        amount:  320.00, date: '2025-01-10' },
  { id: 4,  type: 'Compra',    rawType: 'purchase',          description: 'Aquisição de cotas',                     amount: -1000.00, date: '2025-01-08' },
  { id: 5,  type: 'Comissão',  rawType: 'direct_commission', description: 'Indicação direta — Maria Fernanda',      amount:  150.00, date: '2025-01-07' },
  { id: 6,  type: 'Bônus',     rawType: 'career_bonus',      description: 'Bônus de carreira — Nível Prata',        amount:  500.00, date: '2025-01-05' },
  { id: 7,  type: 'Bônus',     rawType: 'retention_bonus',   description: 'Bônus de retenção',                      amount:   90.00, date: '2025-01-03' },
  { id: 8,  type: 'Dividendo', rawType: 'dividend',          description: 'Dividendo mensal — Dezembro 2024',       amount:  310.00, date: '2024-12-10' },
  { id: 9,  type: 'Compra',    rawType: 'purchase',          description: 'Aquisição de cotas',                     amount: -500.00, date: '2024-12-05' },
  { id: 10, type: 'Comissão',  rawType: 'direct_commission', description: 'Indicação direta — Carlos Eduardo',      amount:  150.00, date: '2024-12-03' },
  { id: 11, type: 'Bônus',     rawType: 'special_bonus',     description: 'Bônus especial — Campanha Dezembro',     amount:  200.00, date: '2024-12-01' },
  { id: 12, type: 'Dividendo', rawType: 'dividend',          description: 'Dividendo mensal — Novembro 2024',       amount:  295.00, date: '2024-11-10' },
  { id: 13, type: 'Comissão',  rawType: 'direct_commission', description: 'Indicação direta — Ana Paula',           amount:  150.00, date: '2024-11-08' },
  { id: 14, type: 'Bônus',     rawType: 'network_bonus',     description: 'Bônus de rede — Nível 3',                amount:  120.00, date: '2024-11-05' },
  { id: 15, type: 'Compra',    rawType: 'purchase',          description: 'Aquisição de cotas',                     amount: -2000.00, date: '2024-11-01' },
]);

// ─── Filters config ───────────────────────────────────
const typeFilters = [
  { value: 'all',       label: 'Todos',      icon: 'clipboard-list' },
  { value: 'Comissão',  label: 'Comissão',   icon: 'handshake' },
  { value: 'Bônus',     label: 'Bônus',      icon: 'trophy' },
  { value: 'Dividendo', label: 'Dividendo',  icon: 'chart-line' },
  { value: 'Compra',    label: 'Compra',     icon: 'cart-shopping' },
];

// ─── Table columns ────────────────────────────────────
const columns = [
  { key: 'type',        label: 'Tipo',       width: '130px' },
  { key: 'description', label: 'Descrição' },
  { key: 'amount',      label: 'Valor',      align: 'right' as const, width: '140px' },
  { key: 'date',        label: 'Data',       width: '120px' },
];

// ─── Computed ─────────────────────────────────────────
const filteredRows = computed(() => {
  return allRows.value.filter(row => {
    const matchType = activeFilter.value === 'all' || row.type === activeFilter.value;
    return matchType;
  });
});

const totalIn = computed(() =>
  filteredRows.value.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
);

const totalOut = computed(() =>
  filteredRows.value.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
);

const balance = computed(() => totalIn.value - totalOut.value);

// ─── Helpers ──────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date + 'T12:00:00'));
}

function getVariant(type: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    Comissão:  'success',
    Bônus:     'info',
    Dividendo: 'primary',
    Compra:    'warning',
  };
  return map[type] || 'default';
}

function getTypeIcon(rawType: string): string {
  const map: Record<string, string> = {
    direct_commission: 'handshake',
    network_bonus:     'network-wired',
    dividend:          'chart-line',
    career_bonus:      'trophy',
    retention_bonus:   'rotate',
    special_bonus:     'star',
    purchase:          'cart-shopping',
  };
  return map[rawType] || 'money-bill-wave';
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.earnings-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  // ── Summary Cards ──────────────────────────────────
  &__summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__filters {
    :deep(.ds-card__body) {
      padding: 1rem 1.25rem;
    }
  }

  &__table-card {
    :deep(.ds-card__header) {
      display: flex;
      align-items: center;
      justify-content: space-between;

      h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: $neutral-900;
      }
    }
  }

  &__count {
    font-size: 0.8rem;
    color: $neutral-500;
    background: $neutral-100;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
  }
}

// ── Summary Card ───────────────────────────────────────
.summary-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  border: 1px solid $neutral-200;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &__label {
    font-size: 0.78rem;
    font-weight: 500;
    color: $neutral-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__value {
    font-size: 1.5rem;
    font-weight: 700;
    color: $neutral-900;
  }

  &__icon {
    position: absolute;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2rem;
    opacity: 0.12;
  }

  &--green { border-left: 4px solid $success; .summary-card__icon { color: $success; opacity: 0.2; } }
  &--red   { border-left: 4px solid $error;   .summary-card__icon { color: $error;   opacity: 0.2; } }
  &--blue  { border-left: 4px solid $info;    .summary-card__icon { color: $info;    opacity: 0.2; } }
  &--purple{ border-left: 4px solid $primary-500; .summary-card__icon { color: $primary-500; opacity: 0.2; } }
}

// ── Filters ────────────────────────────────────────────
.filters-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  border: 1.5px solid $neutral-300;
  background: #fff;
  color: $neutral-600;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: $primary-500;
    color: $primary-500;
  }

  &--active {
    background: $primary-500;
    border-color: $primary-500;
    color: #fff;
  }
}

// ── Table cells ────────────────────────────────────────
.desc-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &__icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: $neutral-100;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $neutral-500;
    font-size: 0.78rem;
    flex-shrink: 0;
  }
}

.amount {
  font-weight: 600;
  font-size: 0.9rem;

  &--positive { color: $success; }
  &--negative { color: $error; }
}

.date-cell {
  color: $neutral-600;
  font-size: 0.85rem;
}

.text--positive { color: $success; }
.text--negative { color: $error; }
</style>
