<template>
  <div class="audit">
    <header class="audit__header">
      <div>
        <RouterLink to="/admin" class="audit__back">← Voltar ao Painel</RouterLink>
        <h1 class="audit__title">Histórico de Movimentações</h1>
        <p class="audit__subtitle">Todas as transações registradas na plataforma · audit trail completo</p>
      </div>
    </header>

    <!-- Filters -->
    <div class="audit__filters">
      <input
        v-model="filterUser"
        type="text"
        class="audit__search"
        placeholder="Buscar por usuário ou descrição..."
      />
      <select v-model="filterType" class="audit__select">
        <option value="">Todos os tipos</option>
        <option value="purchase">Compra</option>
        <option value="admin_grant">Concessão Admin</option>
        <option value="adjustment">Ajuste</option>
        <option value="split">Split</option>
        <option value="bonus">Bônus</option>
        <option value="reversal">Estorno</option>
      </select>
      <input
        v-model="filterMonth"
        type="month"
        class="audit__month"
        title="Filtrar por mês de referência"
      />
      <button class="audit__clear-btn" @click="clearFilters">Limpar</button>
      <span class="audit__count">{{ total }} registro(s)</span>
    </div>

    <!-- Table -->
    <div class="audit__card">
      <div v-if="loading" class="audit__loading">Carregando movimentações...</div>

      <div v-else-if="items.length === 0" class="audit__empty">
        Nenhuma movimentação encontrada para os filtros selecionados.
      </div>

      <div v-else class="audit__table-wrap">
        <table class="audit__table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuário</th>
              <th>Tipo</th>
              <th>Cotas</th>
              <th>Valor</th>
              <th>Descrição</th>
              <th>Mês Ref.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              :class="['audit__row', `audit__row--${item.type}`]"
            >
              <td class="audit__date-cell">
                <span class="audit__date">{{ formatDate(item.createdAt) }}</span>
                <span class="audit__time">{{ formatTime(item.createdAt) }}</span>
              </td>
              <td class="audit__user-cell">
                <span class="audit__user-name">{{ item.userName }}</span>
                <span class="audit__user-email">{{ item.userEmail }}</span>
              </td>
              <td class="audit__type-cell">
                <span :class="['audit__type-badge', `audit__type-badge--${item.type}`]">
                  <font-awesome-icon :icon="getTypeIcon(item.type)" />
                  {{ getTypeLabel(item.type) }}
                </span>
              </td>
              <td class="audit__quotas-cell">
                <span
                  v-if="item.quotasAffected !== 0"
                  :class="['audit__quotas', item.quotasAffected > 0 ? 'audit__quotas--pos' : 'audit__quotas--neg']"
                >
                  {{ item.quotasAffected > 0 ? '+' : '' }}{{ item.quotasAffected }}
                </span>
                <span v-else class="audit__quotas--zero">—</span>
              </td>
              <td class="audit__amount-cell">
                <span v-if="item.amount > 0" class="audit__amount">
                  {{ formatCurrency(item.amount) }}
                </span>
                <span v-else class="audit__amount--zero">—</span>
              </td>
              <td class="audit__desc-cell" :title="item.description">
                {{ item.description }}
              </td>
              <td class="audit__month-cell">{{ item.referenceMonth }}</td>
              <td class="audit__status-cell">
                <span :class="['audit__status', `audit__status--${item.status}`]">
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="audit__pagination">
        <button :disabled="page === 1" class="audit__page-btn" @click="page--">← Anterior</button>
        <span class="audit__page-info">Página {{ page }} de {{ totalPages }}</span>
        <button :disabled="page === totalPages" class="audit__page-btn" @click="page++">Próximo →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { adminService } from '@/shared/services/admin.service';

interface TransactionItem {
  id: string;
  createdAt: string;
  completedAt: string | null;
  type: string;
  status: string;
  amount: number;
  quotasAffected: number;
  description: string;
  referenceMonth: string;
  userId: string;
  userName: string;
  userEmail: string;
}

const items = ref<TransactionItem[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const limit = 50;

const filterUser = ref('');
const filterType = ref('');
const filterMonth = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const filteredItems = computed(() => {
  let list = items.value;
  if (filterUser.value.trim()) {
    const q = filterUser.value.toLowerCase();
    list = list.filter(i =>
      i.userName.toLowerCase().includes(q) ||
      i.userEmail.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
    );
  }
  return list;
});

async function load() {
  loading.value = true;
  try {
    const res = await adminService.getTransactionLog({
      type: filterType.value || undefined,
      month: filterMonth.value || undefined,
      page: page.value,
      limit,
    });
    if (res.data) {
      items.value = res.data.items || [];
      total.value = res.data.total || 0;
    }
  } catch {
    /* fail silently */
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filterUser.value = '';
  filterType.value = '';
  filterMonth.value = '';
  page.value = 1;
}

watch([filterType, filterMonth, page], () => load());
watch([filterType, filterMonth], () => { page.value = 1; });

onMounted(load);

// Helpers
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    purchase: 'Compra',
    admin_grant: 'Concessão Admin',
    adjustment: 'Ajuste',
    split: 'Split',
    bonus: 'Bônus',
    reversal: 'Estorno',
  };
  return map[type] ?? type;
}

function getTypeIcon(type: string): string {
  const map: Record<string, string> = {
    purchase: 'cart-shopping',
    admin_grant: 'user-plus',
    adjustment: 'screwdriver-wrench',
    split: 'code-branch',
    bonus: 'gift',
    reversal: 'rotate-left',
  };
  return map[type] ?? 'circle';
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Concluído',
    pending: 'Pendente',
    failed: 'Falhou',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.audit {
  padding: $spacing-6;
  max-width: 1440px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }
}

.audit__header {
  margin-bottom: $spacing-6;
}

.audit__back {
  display: inline-block;
  font-size: 0.85rem;
  color: var(--primary-600);
  text-decoration: none;
  margin-bottom: $spacing-2;
  &:hover { text-decoration: underline; }
}

.audit__title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 $spacing-1;
  color: var(--text-primary);
}

.audit__subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.audit__filters {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  margin-bottom: $spacing-4;
  flex-wrap: wrap;
}

.audit__search,
.audit__select,
.audit__month {
  padding: $spacing-2 $spacing-3;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  font-size: 0.875rem;
  color: var(--text-primary);
  background: var(--surface-card);
  outline: none;
  &:focus {
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.12);
  }
}

.audit__search { min-width: 240px; }

.audit__clear-btn {
  padding: $spacing-2 $spacing-3;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  background: none;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  &:hover { background: var(--neutral-100); }
}

.audit__count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.audit__card {
  @include card;
}

.audit__loading,
.audit__empty {
  text-align: center;
  padding: $spacing-10;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.audit__table-wrap {
  overflow-x: auto;
}

.audit__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th {
    padding: $spacing-3 $spacing-4;
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    border-bottom: 2px solid var(--border-light);
    white-space: nowrap;
  }
}

.audit__row {
  transition: background 0.12s;
  &:hover { background: var(--neutral-50); }

  td {
    padding: $spacing-3 $spacing-4;
    border-bottom: 1px solid var(--border-light);
    vertical-align: middle;
  }

  &--adjustment td:first-child {
    border-left: 3px solid var(--color-warning);
  }
  &--purchase td:first-child {
    border-left: 3px solid var(--color-success);
  }
  &--split td:first-child {
    border-left: 3px solid var(--primary-500);
  }
  &--bonus td:first-child {
    border-left: 3px solid var(--secondary-500);
  }
  &--reversal td:first-child {
    border-left: 3px solid var(--color-error);
  }
}

.audit__date-cell {
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audit__date {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.audit__time {
  font-size: 0.72rem;
  color: var(--text-tertiary);
}

.audit__user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
}

.audit__user-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.audit__user-email {
  font-size: 0.72rem;
  color: var(--text-tertiary);
}

.audit__type-badge {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  padding: 3px 10px;
  border-radius: $radius-full;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;

  &--purchase    { background: rgba(var(--success-rgb), 0.1);  color: var(--color-success); border: 1px solid rgba(var(--success-rgb), 0.3); }
  &--admin_grant { background: rgba(217, 119, 6, 0.12);        color: #92400e;              border: 1px solid rgba(217, 119, 6, 0.35); }
  &--adjustment  { background: rgba(var(--warning-rgb), 0.12); color: #92400e;              border: 1px solid rgba(var(--warning-rgb), 0.35); }
  &--split       { background: rgba(var(--primary-500-rgb), 0.1); color: var(--primary-700); border: 1px solid rgba(var(--primary-500-rgb), 0.3); }
  &--bonus       { background: rgba(var(--secondary-500-rgb), 0.1); color: var(--secondary-700); border: 1px solid rgba(var(--secondary-500-rgb), 0.3); }
  &--reversal    { background: rgba(var(--error-rgb), 0.1);   color: var(--color-error);   border: 1px solid rgba(var(--error-rgb), 0.3); }
}

.audit__quotas {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  &--pos { color: var(--color-success); }
  &--neg { color: var(--color-error); }
  &--zero { color: var(--text-tertiary); }
}

.audit__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-success);
  &--zero { color: var(--text-tertiary); }
}

.audit__desc-cell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.audit__month-cell {
  font-size: 0.82rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.audit__status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 0.72rem;
  font-weight: 700;

  &--completed  { background: rgba(var(--success-rgb), 0.1);  color: var(--color-success); }
  &--pending    { background: rgba(var(--warning-rgb), 0.12); color: #92400e; }
  &--failed     { background: rgba(var(--error-rgb), 0.1);   color: var(--color-error); }
  &--cancelled  { background: var(--neutral-100); color: var(--text-tertiary); }
}

.audit__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-4;
  padding: $spacing-4;
  border-top: 1px solid var(--border-light);
}

.audit__page-btn {
  padding: $spacing-2 $spacing-4;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  background: none;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--text-primary);
  &:hover:not(:disabled) { background: var(--neutral-50); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.audit__page-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
