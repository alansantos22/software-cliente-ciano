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
    </section>

    <!-- Filters -->
    <DsCard class="earnings-view__filters">
      <div class="filters-row">
        <DsMonthPicker v-model="selectedMonth" />

        <select v-model="selectedLevel" class="earnings-view__level-select" aria-label="Filtrar por nível">
          <option value="">Todos os níveis</option>
          <option value="0">Próprias</option>
          <option value="1">Nível 1</option>
          <option value="2">Nível 2</option>
          <option value="3">Nível 3</option>
          <option value="4">Nível 4</option>
          <option value="5">Nível 5</option>
          <option value="6">Nível 6</option>
        </select>

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

        <!-- Nível -->
        <template #cell-level="{ row }">
          <span class="level-cell">
            {{ (row as unknown as ActivityRow).level === 0 ? 'Própria' : `N${(row as unknown as ActivityRow).level}` }}
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
import { ref, computed, watch, onMounted } from 'vue';
import DsCard from '@/design-system/DsCard.vue';
import DsTable from '@/design-system/DsTable.vue';
import DsBadge from '@/design-system/DsBadge.vue';
import DsMonthPicker from '@/design-system/DsMonthPicker.vue';
import { earningsService } from '@/shared/services/earnings.service';

// ─── Types ───────────────────────────────────────────
interface ActivityRow {
  id: number;
  type: string;
  rawType: string;
  description: string;
  amount: number;
  date: string;
  level: number;
  /**
   * false when the underlying purchase happened AFTER the cutoff (last day
   * of the previous month). The earning will be paid in the next cycle.
   */
  cutoffEligible?: boolean;
}

// ─── State ────────────────────────────────────────
const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const selectedLevel = ref<string>('');
const activeFilter = ref('all');

// ─── Data loaded from API ─────────────────────────────
const allRows = ref<ActivityRow[]>([]);

const bonusTypeLabel: Record<string, string> = {
  firstPurchase: 'Comissão',
  first_purchase: 'Comissão',
  repurchase: 'Bônus',
  team: 'Bônus',
  leadership: 'Bônus',
  dividend: 'Dividendo',
  purchase: 'Compra',
};

async function loadEarnings() {
  try {
    const { data } = await earningsService.list(
      1,
      200,
      selectedMonth.value,
      selectedLevel.value || undefined,
    );
    if (data?.items) {
      allRows.value = data.items.map((e: any, i: number) => ({
        id: i + 1,
        type: bonusTypeLabel[e.bonusType] || e.bonusType,
        rawType: e.bonusType,
        description: e.description || '',
        amount: Number(e.amount) || 0,
        date: (e.createdAt || '').slice(0, 10),
        level: Number(e.level) || 0,
        cutoffEligible: e.cutoffEligible ?? true,
      }));
    }
  } catch {
    allRows.value = [];
  }
}

watch([selectedMonth, selectedLevel], loadEarnings);
onMounted(loadEarnings);

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
  { key: 'description', label: 'Descrição' },  { key: 'level',       label: 'Nível',      width: '90px',  align: 'center' as const },  { key: 'amount',      label: 'Valor',      align: 'right' as const, width: '140px' },
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

const totalOut = computed(() =>
  filteredRows.value.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
);

// ─── Helpers ──────────────────────────────────────────
function formatCurrency(value: number): string {
  const safe = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safe);
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
@use 'sass:color';
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
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;

    @media (max-width: 768px) {
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
        color: var(--neutral-900);
      }
    }
  }

  &__count {
    font-size: 0.8rem;
    color: var(--neutral-500);
    background: var(--neutral-100);
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
  }

  &__level-select {
    height: 36px;
    padding: 0 0.75rem;
    border-radius: 8px;
    border: 1.5px solid var(--neutral-300);
    background: var(--bg-primary);
    color: var(--neutral-700);
    font-size: 0.85rem;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: var(--primary-500);
    }
  }
}

// ── Summary Card ───────────────────────────────────────
.summary-card {
  position: relative;
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  border: 1px solid var(--neutral-200);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &__label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--neutral-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--neutral-900);
  }

  &__sublabel {
    font-size: 0.7rem;
    color: var(--neutral-400);
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

  &--green { border-left: 4px solid var(--color-success);      .summary-card__icon { color: var(--color-success);      opacity: 0.2; } }
  &--red   { border-left: 4px solid var(--color-error);        .summary-card__icon { color: var(--color-error);        opacity: 0.2; } }
  &--blue  { border-left: 4px solid var(--color-info);         .summary-card__icon { color: var(--color-info);         opacity: 0.2; } }
  &--purple{ border-left: 4px solid var(--primary-500);  .summary-card__icon { color: var(--primary-500);  opacity: 0.2; } }
  &--teal  {
    border-left: 4px solid var(--accent-500);
    .summary-card__icon { color: var(--accent-500); opacity: 0.2; }
    .summary-card__value { color: color.adjust(#00bcd4, $lightness: -10%); }
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
  border: 1.5px solid var(--neutral-300);
  background: var(--bg-primary);
  color: var(--neutral-600);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--primary-500);
    color: var(--primary-500);
  }

  &--active {
    background: var(--primary-500);
    border-color: var(--primary-500);
    color: #fff;
  }

  &--group {
    border-style: dashed;
    font-weight: 600;

    &.filter-chip--active {
      background: var(--accent-500);
      border-color: var(--accent-500);
    }
  }
}

// Vertical divider between group and individual filter chips
.filter-divider {
  display: inline-block;
  width: 1px;
  height: 24px;
  background: var(--neutral-300);
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
    background: var(--neutral-100);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--neutral-500);
    font-size: 0.78rem;
    flex-shrink: 0;
  }
}

.amount {
  font-weight: 600;
  font-size: 0.9rem;

  &--positive { color: var(--color-success); }
  &--negative { color: var(--color-error); }
}

.level-cell {
  display: inline-block;
  min-width: 38px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--neutral-100);
  color: var(--neutral-700);
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
}

.date-cell {
  color: var(--neutral-600);
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
  color: var(--color-warning-dark);
  background: rgba(var(--warning-rgb), 0.12);
  border: 1px solid rgba(var(--warning-rgb), 0.4);
  padding: 1px 6px;
  border-radius: 10px;
  white-space: nowrap;
  cursor: help;
}

.text--positive { color: var(--color-success); }
.text--negative { color: var(--color-error); }
</style>
