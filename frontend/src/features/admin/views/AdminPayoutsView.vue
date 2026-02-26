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

    <!-- Lançamento de Lucro do Período -->
    <section class="admin-payouts-view__profit-entry">
      <DsCard>
        <template #header>
          <div>
            <h2>📋 Lançamento de Lucro do Período</h2>
            <p class="profit-entry__subtitle">Insira o lucro líquido do período para calcular automaticamente o valor a distribuir para cada cotista.</p>
          </div>
        </template>

        <div class="profit-entry-form">
          <div class="profit-entry-form__field">
            <label>Mês de Referência</label>
            <DsMonthPicker v-model="profitMonth" />
          </div>

          <div class="profit-entry-form__field">
            <label>Lucro Líquido do Período (R$)</label>
            <DsInput
              v-model.number="netProfit"
              type="number"
              min="0"
              step="100"
              placeholder="Ex: 150000"
            />
          </div>

          <div class="profit-entry-form__preview">
            <span class="profit-preview__item">
              Pool de dividendos: <strong>{{ dividendPoolPercent }}%</strong>
            </span>
            <span class="profit-preview__separator">→</span>
            <span class="profit-preview__item profit-preview__item--highlight">
              A distribuir: <strong>{{ formatCurrency(dividendPool) }}</strong>
            </span>
            <span class="profit-preview__item">
              entre <strong>{{ totalActiveQuotas }}</strong> cotas ativas
            </span>
          </div>

          <DsButton
            variant="primary"
            :disabled="!netProfit || netProfit <= 0"
            @click="calculateDistribution"
          >
            📊 Ver Distribuição Calculada
          </DsButton>
        </div>

        <DsAlert v-if="generationSuccess" type="success">
          Pagamentos gerados com sucesso e adicionados à fila de pendentes!
        </DsAlert>
      </DsCard>
    </section>

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

    <!-- Distribuição Calculada -->
    <section v-if="showDistribution" class="admin-payouts-view__distribution">
      <DsCard>
        <template #header>
          <div>
            <h2>💰 Distribuição Calculada &mdash; {{ profitMonth }}</h2>
            <span class="distribution-meta">
              Pool: {{ formatCurrency(dividendPool) }} · {{ distributionPreview.length }} cotistas
            </span>
          </div>
          <DsButton variant="primary" @click="generatePayoutsFromProfit">
            ✅ Gerar Pagamentos
          </DsButton>
        </template>

        <DsTable :columns="distributionColumns" :data="distributionPreview" :loading="false">
          <template #user="{ row }">
            <div class="user-cell">
              <div class="user-cell__avatar">{{ getInitials(row.user) }}</div>
              <span class="user-cell__name">{{ row.user }}</span>
            </div>
          </template>
          <template #amount="{ row }">
            <strong class="amount-cell">{{ formatCurrency(row.amount) }}</strong>
          </template>
        </DsTable>
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
  DsAlert,
  DsDropdown,
  DsMonthPicker,
  DsModal,
  DsEmptyState,
} from '@/design-system';
import { getPendingPayouts, mockDelay, mockUsers, mockMonthlyConfigs, type PayoutRequest } from '@/mocks';

// State
const isLoading = ref(false);
const payouts = ref<PayoutRequest[]>([]);
const selectedPayouts = ref<string[]>([]);
const selectedPayout = ref<PayoutRequest | null>(null);
const showDetailsModal = ref(false);

// ─── Profit Entry State ───────────────────────────────────────
const netProfit = ref<number>(0);
const profitMonth = ref<string>(new Date().toISOString().slice(0, 7));
const showDistribution = ref(false);
const generationSuccess = ref(false);

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

const distributionColumns = [
  { key: 'user',   label: 'Cotista' },
  { key: 'quotas', label: 'Cotas',   align: 'right' as const, width: '80px' },
  { key: 'share',  label: '% do Pool', align: 'right' as const, width: '110px' },
  { key: 'amount', label: 'A Receber', align: 'right' as const, width: '150px' },
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

// ─── Profit Distribution Computeds ─────────────────────────────────
const dividendPoolPercent = computed(() => {
  const config = mockMonthlyConfigs.find(c => c.month === profitMonth.value);
  return config?.dividendPoolPercent ?? 20;
});

const dividendPool = computed(() =>
  Math.round(netProfit.value * (dividendPoolPercent.value / 100) * 100) / 100
);

const totalActiveQuotas = computed(() =>
  mockUsers.filter(u => u.isActive && u.quotaBalance > 0).reduce((s, u) => s + u.quotaBalance, 0)
);

const distributionPreview = computed(() => {
  if (!dividendPool.value || totalActiveQuotas.value === 0) return [];
  return mockUsers
    .filter(u => u.isActive && u.quotaBalance > 0)
    .map(u => ({
      id: u.id,
      user: u.name,
      quotas: u.quotaBalance,
      share: ((u.quotaBalance / totalActiveQuotas.value) * 100).toFixed(2) + '%',
      amount: Math.round((u.quotaBalance / totalActiveQuotas.value) * dividendPool.value * 100) / 100,
      pixKey: u.email,
    }))
    .sort((a, b) => b.amount - a.amount);
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

function calculateDistribution() {
  if (netProfit.value > 0) showDistribution.value = true;
}

function generatePayoutsFromProfit() {
  const newPayouts: PayoutRequest[] = distributionPreview.value.map((row, i) => ({
    id: `auto-${Date.now()}-${i}`,
    userId: row.id,
    userName: row.user,
    amount: row.amount,
    pixKey: row.pixKey,
    pixKeyType: 'email' as const,
    status: 'pending' as const,
    referenceMonth: profitMonth.value,
    requestedAt: new Date().toISOString(),
    processedAt: null,
    completedAt: null,
    failureReason: null,
    transactionId: null,
  }));
  payouts.value = [...newPayouts, ...payouts.value];
  stats.value.pending += distributionPreview.value.reduce((s, r) => s + r.amount, 0);
  generationSuccess.value = true;
  setTimeout(() => { generationSuccess.value = false; }, 4000);
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

// ─── Profit Entry Section ─────────────────────────────────────────
.admin-payouts-view__profit-entry {
  margin-bottom: $spacing-6;
}

.admin-payouts-view__distribution {
  margin-bottom: $spacing-6;
}

.profit-entry__subtitle {
  font-size: 0.875rem;
  color: $text-secondary;
  margin: $spacing-1 0 0;
}

.profit-entry-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    max-width: 400px;

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: $text-secondary;
    }
  }

  &__preview {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-wrap: wrap;
    padding: $spacing-3 $spacing-4;
    background: rgba($primary-500, 0.05);
    border: 1px solid rgba($primary-500, 0.15);
    border-radius: $radius-lg;
    font-size: 0.875rem;
    color: $text-secondary;
  }
}

.profit-preview {
  &__item {
    strong { font-weight: 700; color: $text-primary; }

    &--highlight strong {
      color: $success-dark;
      font-size: 1rem;
    }
  }

  &__separator {
    color: $text-tertiary;
    font-size: 1rem;
  }
}

.distribution-meta {
  font-size: 0.875rem;
  color: $text-secondary;
  margin-top: 2px;
}

.user-cell {
  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: $text-primary;
  }
}
</style>
