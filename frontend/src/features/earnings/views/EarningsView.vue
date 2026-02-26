<template>
  <div class="earnings-view">

    <!-- Summary Cards -->
    <section class="earnings-view__summary">
      <div class="summary-card summary-card--teal">
        <span class="summary-card__label">Ganhos de Rede</span>
        <span class="summary-card__value">{{ formatCurrency(networkEarnings) }}</span>
        <span class="summary-card__sublabel">Primeira compra, recompra, equipe, liderança</span>
        <span class="summary-card__icon"><font-awesome-icon icon="network-wired" /></span>
      </div>
      <div class="summary-card summary-card--purple">
        <span class="summary-card__label">Ganhos de Cotas</span>
        <span class="summary-card__value">{{ formatCurrency(quotaEarnings) }}</span>
        <span class="summary-card__sublabel">Dividendos mensais das pousadas</span>
        <span class="summary-card__icon"><font-awesome-icon icon="coins" /></span>
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
    </section>

    <!-- Filters -->
    <DsCard class="earnings-view__filters">
      <div class="filters-row">
        <DsMonthPicker v-model="selectedMonth" />

        <div class="filter-group">
            <!-- Group filters -->
            <button
              :class="['filter-chip', 'filter-chip--group', { 'filter-chip--active': activeFilter === 'rede' }]"
              @click="activeFilter = 'rede'"
            >
              <font-awesome-icon icon="network-wired" />
              Ganhos de Rede
            </button>
            <button
              :class="['filter-chip', 'filter-chip--group', { 'filter-chip--active': activeFilter === 'cotas' }]"
              @click="activeFilter = 'cotas'"
            >
              <font-awesome-icon icon="coins" />
              Ganhos de Cotas
            </button>
            <span class="filter-divider"></span>
            <!-- Individual type filters -->
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
          <div class="date-cell-wrap">
            <span class="date-cell">{{ formatDate((row as unknown as ActivityRow).date) }}</span>
            <span
              v-if="(row as unknown as ActivityRow).cutoffEligible === false"
              class="cutoff-badge"
              title="Compra realizada após o corte do mês (dia 1º do mês de referência). Será pago no próximo ciclo — dia 15 do mês seguinte."
            >
              <font-awesome-icon icon="calendar-xmark" /> Próx. Mês
            </span>
          </div>
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
  /**
   * false when the underlying purchase happened AFTER the cutoff (last day
   * of the previous month). The earning will be paid in the next cycle.
   */
  cutoffEligible?: boolean;
}

// ─── State ───────────────────────────────────────────
const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const activeFilter = ref('all');

// ─── Mock Data ────────────────────────────────────────
const allRows = ref<ActivityRow[]>([
  // ── Janeiro 2025 ────────────────────────────────────────────────────────
  { id: 1,  type: 'Comissão',  rawType: 'first_purchase', description: 'Bônus primeira compra — João Silva',     amount:  150.00, date: '2025-01-15', cutoffEligible: false },
  { id: 2,  type: 'Bônus',     rawType: 'repurchase',     description: 'Bônus recompra — Nível 2',               amount:   75.50, date: '2025-01-14', cutoffEligible: false },
  { id: 3,  type: 'Dividendo', rawType: 'dividend',       description: 'Dividendo mensal — Janeiro 2025',        amount:  320.00, date: '2025-01-10', cutoffEligible: true  },
  { id: 4,  type: 'Compra',    rawType: 'purchase',       description: 'Aquisição de cotas',                     amount: -2500.00, date: '2025-01-08' },
  { id: 5,  type: 'Comissão',  rawType: 'first_purchase', description: 'Bônus primeira compra — Maria Fernanda', amount:  150.00, date: '2025-01-07', cutoffEligible: false },
  { id: 6,  type: 'Bônus',     rawType: 'leadership',     description: 'Bônus de liderança — Nível Ouro',        amount:  500.00, date: '2025-01-05', cutoffEligible: true  },
  { id: 7,  type: 'Bônus',     rawType: 'team_bonus',     description: 'Bônus de equipe — 2% do total',          amount:   90.00, date: '2025-01-03', cutoffEligible: true  },
  // ── Dezembro 2024 ───────────────────────────────────────────────────────
  { id: 8,  type: 'Dividendo', rawType: 'dividend',       description: 'Dividendo mensal — Dezembro 2024',       amount:  310.00, date: '2024-12-10', cutoffEligible: true  },
  { id: 9,  type: 'Compra',    rawType: 'purchase',       description: 'Aquisição de cotas',                     amount: -2500.00, date: '2024-12-05' },
  { id: 10, type: 'Comissão',  rawType: 'first_purchase', description: 'Bônus primeira compra — Carlos Eduardo', amount:  150.00, date: '2024-12-03', cutoffEligible: false },
  { id: 11, type: 'Bônus',     rawType: 'repurchase',     description: 'Bônus recompra — Nível 3',               amount:  200.00, date: '2024-12-01', cutoffEligible: false },
  // ── Novembro 2024 ───────────────────────────────────────────────────────
  { id: 12, type: 'Dividendo', rawType: 'dividend',       description: 'Dividendo mensal — Novembro 2024',       amount:  295.00, date: '2024-11-10', cutoffEligible: true  },
  { id: 13, type: 'Comissão',  rawType: 'first_purchase', description: 'Bônus primeira compra — Ana Paula',      amount:  150.00, date: '2024-11-08', cutoffEligible: false },
  { id: 14, type: 'Bônus',     rawType: 'repurchase',     description: 'Bônus recompra — Nível 2',               amount:  120.00, date: '2024-11-05', cutoffEligible: false },
  { id: 15, type: 'Compra',    rawType: 'purchase',       description: 'Aquisição de cotas',                     amount: -5000.00, date: '2024-11-01' },
  // ── Fevereiro 2026 (mês atual) ─────────────────────────────────────────
  // Compras realizadas em fevereiro são APÓS o corte (31/jan)
  // → dividendos e comissões gerados por elas só entram no ciclo de março
  { id: 16, type: 'Dividendo', rawType: 'dividend',       description: 'Dividendo mensal — Fev 2026 (compra após corte)',        amount:  345.00, date: '2026-02-15', cutoffEligible: false },
  { id: 17, type: 'Bônus',     rawType: 'repurchase',     description: 'Bônus recompra — Lucas Oliveira (compra após corte)',    amount:   95.00, date: '2026-02-10', cutoffEligible: false },
  { id: 18, type: 'Comissão',  rawType: 'first_purchase', description: 'Bônus 1ª compra — Rafael Duarte (compra após corte)',   amount:  150.00, date: '2026-02-08', cutoffEligible: false },
  { id: 19, type: 'Compra',    rawType: 'purchase',       description: 'Aquisição de 1 cota (após corte de jan — dividendo em mar)', amount: -2500.00, date: '2026-02-03' },
  { id: 20, type: 'Bônus',     rawType: 'leadership',     description: 'Bônus liderança Ouro — ref. jan/2026 (dentro do corte)', amount:  500.00, date: '2026-02-15', cutoffEligible: true  },
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
    // Month filter
    const matchMonth = row.date.startsWith(selectedMonth.value);
    // Type / group filter
    const matchType = (() => {
      if (activeFilter.value === 'all')   return true;
      if (activeFilter.value === 'rede')  return row.type === 'Comissão' || row.type === 'Bônus';
      if (activeFilter.value === 'cotas') return row.type === 'Dividendo';
      return row.type === activeFilter.value;
    })();
    return matchMonth && matchType;
  });
});

/**
 * Ganhos de Rede = Comissão + Bônus (tudo menos dividendos e compras).
 * Regra: são os ganhos gerados pela atividade da rede (indicacões e recompras).
 */
const networkEarnings = computed(() =>
  filteredRows.value
    .filter(r => r.type === 'Comissão' || r.type === 'Bônus')
    .reduce((s, r) => s + r.amount, 0)
);

/**
 * Ganhos de Cotas = Dividendos apenas.
 * Regra: ganhos de rede = ganhos totais − ganhos de cotas.
 */
const quotaEarnings = computed(() =>
  filteredRows.value
    .filter(r => r.type === 'Dividendo')
    .reduce((s, r) => s + r.amount, 0)
);

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
    first_purchase: 'handshake',
    repurchase:     'rotate',
    team_bonus:     'users',
    leadership:     'trophy',
    dividend:       'chart-line',
    purchase:       'cart-shopping',
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

  &__sublabel {
    font-size: 0.7rem;
    color: $neutral-400;
    margin-top: 2px;
    line-height: 1.3;
    padding-right: 2.5rem; // avoid overlapping icon
  }

  &__icon {
    position: absolute;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2rem;
    opacity: 0.12;
  }

  &--green { border-left: 4px solid $success;      .summary-card__icon { color: $success;      opacity: 0.2; } }
  &--red   { border-left: 4px solid $error;        .summary-card__icon { color: $error;        opacity: 0.2; } }
  &--blue  { border-left: 4px solid $info;         .summary-card__icon { color: $info;         opacity: 0.2; } }
  &--purple{ border-left: 4px solid $primary-500;  .summary-card__icon { color: $primary-500;  opacity: 0.2; } }
  &--teal  {
    border-left: 4px solid $accent-500;
    .summary-card__icon { color: $accent-500; opacity: 0.2; }
    .summary-card__value { color: darken(#00bcd4, 10%); }
  }
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

  &--group {
    border-style: dashed;
    font-weight: 600;

    &.filter-chip--active {
      background: $accent-500;
      border-color: $accent-500;
    }
  }
}

// Vertical divider between group and individual filter chips
.filter-divider {
  display: inline-block;
  width: 1px;
  height: 24px;
  background: $neutral-300;
  align-self: center;
  flex-shrink: 0;
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

// Wrapper that stacks date + cutoff badge vertically
.date-cell-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

// Badge shown when a purchase was made after the monthly cutoff
.cutoff-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  color: $warning-dark;
  background: rgba($warning, 0.12);
  border: 1px solid rgba($warning, 0.4);
  padding: 1px 6px;
  border-radius: 10px;
  white-space: nowrap;
  cursor: help;
}

.text--positive { color: $success; }
.text--negative { color: $error; }
</style>
