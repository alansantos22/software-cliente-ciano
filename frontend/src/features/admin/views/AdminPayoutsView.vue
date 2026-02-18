<template>
  <div class="admin-payouts-view">
    <!-- Header -->
    <header class="admin-payouts-view__header">
      <div>
        <h1>Gerenciamento de Pagamentos</h1>
        <p class="admin-payouts-view__subtitle">Processe e acompanhe os pagamentos aos cotistas</p>
      </div>
      <div class="admin-payouts-view__actions">
        <DsButton variant="outline" @click="exportPayouts">
          📥 Exportar
        </DsButton>
        <DsButton variant="primary" :disabled="selectedPayouts.length === 0" @click="processSelected">
          Processar Selecionados ({{ selectedPayouts.length }})
        </DsButton>
      </div>
    </header>

    <!-- Stats -->
    <section class="admin-payouts-view__stats">
      <DsStatCard
        label="Total Pendente"
        :value="formatCurrency(stats.pending)"
        icon="⏳"
      />
      <DsStatCard
        label="Processando"
        :value="formatCurrency(stats.processing)"
        icon="🔄"
      />
      <DsStatCard
        label="Pago Este Mês"
        :value="formatCurrency(stats.paidThisMonth)"
        icon="✅"
      />
      <DsStatCard
        label="Total Histórico"
        :value="formatCurrency(stats.totalPaid)"
        icon="💰"
      />
    </section>

    <!-- Filters -->
    <section class="admin-payouts-view__filters">
      <DsCard>
        <div class="filters-row">
          <DsInput
            v-model="filters.search"
            placeholder="Buscar por nome..."
            type="text"
          />
          <DsDropdown
            v-model="filters.status"
            :options="statusOptions"
            placeholder="Status"
          />
          <DsMonthPicker v-model="filters.month" />
          <DsButton variant="ghost" @click="clearFilters">
            Limpar Filtros
          </DsButton>
        </div>
      </DsCard>
    </section>

    <!-- Payouts Table -->
    <section class="admin-payouts-view__table">
      <DsCard>
        <DsTable
          :columns="columns"
          :data="filteredPayouts"
          :loading="isLoading"
          selectable
          @selection-change="onSelectionChange as any"
        >
          <template #user="{ row }">
            <div class="user-cell">
              <div class="user-cell__avatar">{{ getInitials(row.userName) }}</div>
              <div class="user-cell__info">
                <strong>{{ row.userName }}</strong>
                <span>{{ row.userEmail }}</span>
              </div>
            </div>
          </template>
          <template #amount="{ row }">
            <strong class="amount-cell">{{ formatCurrency(row.amount) }}</strong>
          </template>
          <template #status="{ row }">
            <DsBadge :variant="getStatusVariant(row.status)">
              {{ getStatusLabel(row.status) }}
            </DsBadge>
          </template>
          <template #actions="{ row }">
            <div class="actions-cell">
              <DsButton
                v-if="row.status === 'pending'"
                variant="primary"
                size="sm"
                @click="processPayout(row)"
              >
                Processar
              </DsButton>
              <DsButton
                v-if="row.status === 'processing'"
                variant="primary"
                size="sm"
                @click="confirmPayout(row)"
              >
                Confirmar
              </DsButton>
              <DsButton
                variant="ghost"
                size="sm"
                @click="viewDetails(row)"
              >
                Detalhes
              </DsButton>
            </div>
          </template>
        </DsTable>

        <DsEmptyState
          v-if="filteredPayouts.length === 0 && !isLoading"
          icon="💸"
          title="Nenhum pagamento encontrado"
          description="Tente ajustar os filtros de busca"
        />
      </DsCard>
    </section>

    <!-- Payout Details Modal -->
    <DsModal v-model="showDetailsModal" title="Detalhes do Pagamento">
      <div v-if="selectedPayout" class="payout-details">
        <div class="detail-row">
          <span>Usuário:</span>
          <strong>{{ selectedPayout.userName }}</strong>
        </div>
        <div class="detail-row">
          <span>Email/Chave:</span>
          <strong>{{ selectedPayout.pixKey }}</strong>
        </div>
        <div class="detail-row">
          <span>Valor:</span>
          <strong class="amount-cell">{{ formatCurrency(selectedPayout.amount) }}</strong>
        </div>
        <div class="detail-row">
          <span>Chave PIX:</span>
          <strong>{{ selectedPayout.pixKey }}</strong>
        </div>
        <div class="detail-row">
          <span>Tipo Chave:</span>
          <DsBadge>{{ selectedPayout.pixKeyType }}</DsBadge>
        </div>
        <div class="detail-row">
          <span>Status:</span>
          <DsBadge :variant="getStatusVariant(selectedPayout.status)">
            {{ getStatusLabel(selectedPayout.status) }}
          </DsBadge>
        </div>
        <div class="detail-row">
          <span>Solicitado em:</span>
          <strong>{{ formatDate(selectedPayout.requestedAt) }}</strong>
        </div>
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="showDetailsModal = false">Fechar</DsButton>
        <DsButton
          v-if="selectedPayout?.status === 'pending'"
          variant="primary"
          @click="processPayout(selectedPayout); showDetailsModal = false"
        >
          Processar Pagamento
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  DsCard,
  DsStatCard,
  DsTable,
  DsBadge,
  DsButton,
  DsInput,
  DsDropdown,
  DsMonthPicker,
  DsModal,
  DsEmptyState,
} from '@/design-system';
import { getPendingPayouts, mockDelay, type PayoutRequest } from '@/mocks';

// State
const isLoading = ref(false);
const payouts = ref<PayoutRequest[]>([]);
const selectedPayouts = ref<string[]>([]);
const selectedPayout = ref<PayoutRequest | null>(null);
const showDetailsModal = ref(false);

const filters = ref({
  search: '',
  status: '',
  month: new Date().toISOString().slice(0, 7),
});

const stats = ref({
  pending: 0,
  processing: 0,
  paidThisMonth: 0,
  totalPaid: 0,
});

// Options
const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Processando', value: 'processing' },
  { label: 'Pago', value: 'paid' },
  { label: 'Cancelado', value: 'cancelled' },
];

const columns = [
  { key: 'user', label: 'Usuário' },
  { key: 'amount', label: 'Valor', align: 'right' as const, width: '120px' },
  { key: 'type', label: 'Tipo', width: '120px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'requestedAt', label: 'Solicitado', width: '120px' },
  { key: 'actions', label: 'Ações', width: '180px' },
];

// Computed
const filteredPayouts = computed(() => {
  let result = payouts.value;

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      p => p.userName.toLowerCase().includes(search) || p.pixKey.toLowerCase().includes(search)
    );
  }

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status);
  }

  return result.map(p => ({
    ...p,
    requestedAt: formatDate(p.requestedAt),
  }));
});

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    pending: 'warning',
    processing: 'info',
    paid: 'success',
    cancelled: 'default',
  };
  return variants[status] || 'default';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    paid: 'Pago',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

function onSelectionChange(ids: string[]) {
  selectedPayouts.value = ids;
}

function clearFilters() {
  filters.value = {
    search: '',
    status: '',
    month: new Date().toISOString().slice(0, 7),
  };
}

function exportPayouts() {
  // TODO: Implement export
  alert('Exportação em desenvolvimento');
}

function processSelected() {
  // TODO: Implement batch processing
  alert(`Processando ${selectedPayouts.value.length} pagamentos`);
}

function processPayout(payout: PayoutRequest) {
  const index = payouts.value.findIndex(p => p.id === payout.id);
  if (index !== -1 && payouts.value[index]) {
    payouts.value[index].status = 'processing';
  }
}

function confirmPayout(payout: PayoutRequest) {
  const index = payouts.value.findIndex(p => p.id === payout.id);
  if (index !== -1 && payouts.value[index]) {
    payouts.value[index].status = 'completed';
  }
}

function viewDetails(payout: PayoutRequest) {
  selectedPayout.value = payout;
  showDetailsModal.value = true;
}

// Load data
onMounted(async () => {
  isLoading.value = true;
  await mockDelay(500);

  payouts.value = getPendingPayouts();

  stats.value = {
    pending: payouts.value.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    processing: payouts.value.filter(p => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0),
    paidThisMonth: 45000,
    totalPaid: 320000,
  };

  isLoading.value = false;
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.admin-payouts-view {
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

  &__actions {
    display: flex;
    gap: $spacing-3;
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

  &__filters {
    margin-bottom: $spacing-4;
  }

  &__table {
    margin-bottom: $spacing-6;
  }
}

.filters-row {
  display: flex;
  gap: $spacing-4;
  flex-wrap: wrap;
  align-items: flex-end;

  > * {
    flex: 1;
    min-width: 150px;
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

.amount-cell {
  color: $success;
}

.actions-cell {
  display: flex;
  gap: $spacing-2;
}

.payout-details {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.detail-row {
  @include flex-between;
  padding: $spacing-2 0;
  border-bottom: 1px solid $neutral-200;

  span {
    color: $text-secondary;
  }

  strong {
    color: $text-primary;
  }
}
</style>
