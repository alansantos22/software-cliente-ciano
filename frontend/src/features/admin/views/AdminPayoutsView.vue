<template>
  <div class="admin-payouts-view">

    <!-- ══════════════════════════════════════════════════════════
         CABEÇALHO
    ══════════════════════════════════════════════════════════ -->
    <header class="admin-payouts-view__header">
      <div>
        <h1>Fechamento de Folha de Pagamento</h1>
        <p class="admin-payouts-view__subtitle">
          Calcule e aprove a distribuição mensal de dividendos para os cotistas
        </p>
      </div>
    </header>

    <!-- ══════════════════════════════════════════════════════════
         ETAPA 1 — GATILHO MENSAL
         Sempre visível no topo. Bloqueado se o mês já foi processado.
    ══════════════════════════════════════════════════════════ -->
    <section class="admin-payouts-view__trigger">
      <DsCard class="trigger-card">
        <template #header>
          <div>
            <h2 class="trigger-card__title"><font-awesome-icon icon="clipboard-list" /> Etapa 1 — Lançamento do Lucro</h2>
            <p class="trigger-card__subtitle">
              Selecione o mês de competência, informe o lucro líquido e visualize como os
              dividendos serão distribuídos entre os cotistas antes de aprovar.
            </p>
          </div>
        </template>

        <!-- Alerta: mês já processado -->
        <DsAlert v-if="isMonthAlreadyProcessed" type="warning" class="trigger-card__lock-alert">
          <font-awesome-icon icon="triangle-exclamation" /> A distribuição de <strong>{{ formatMonthLabel(profitMonth) }}</strong> já foi
          processada. Apenas operações de pagamento na lista abaixo estão liberadas.
        </DsAlert>

        <div class="profit-entry-form">
          <div class="profit-entry-form__fields">
            <div class="profit-entry-form__field">
              <label>Mês de Referência (Competência)</label>
              <DsMonthPicker v-model="profitMonth" />
            </div>

            <div class="profit-entry-form__field">
              <label>Lucro Líquido do Período (R$)</label>
              <DsInput
                v-model.number="netProfit"
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 150.000,00"
                :disabled="isMonthAlreadyProcessed"
              />
            </div>

            <div class="profit-entry-form__field profit-entry-form__field--payment-month">
              <label>Mês de Pagamento</label>
              <div class="payment-month-display">
                <span class="payment-month-display__ref">{{ formatMonthLabel(profitMonth) }}</span>
                <font-awesome-icon icon="arrow-right" class="payment-month-display__arrow" />
                <span class="payment-month-display__pay">{{ formatMonthLabel(paymentMonth) }}</span>
              </div>
              <span class="payment-month-display__note">Dividendos pagos 2 meses após a competência</span>
            </div>
          </div>

          <div v-if="!isMonthAlreadyProcessed" class="profit-entry-form__preview">
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
            v-if="!isMonthAlreadyProcessed"
            variant="primary"
            size="lg"
            :disabled="!netProfit || netProfit <= 0"
            class="trigger-card__cta"
            @click="calculateDistribution"
          >
            <font-awesome-icon icon="chart-pie" /> Ver Distribuição Calculada
          </DsButton>
        </div>
      </DsCard>
    </section>

    <!-- ══════════════════════════════════════════════════════════
         ETAPA 2 — PRÉVIA DA DISTRIBUIÇÃO
         Aparece após clicar em "Ver Distribuição Calculada".
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide-down">
      <section v-if="showDistribution" class="admin-payouts-view__distribution">
        <DsCard>
          <template #header>
            <div>
              <h2><font-awesome-icon icon="dollar-sign" /> Etapa 2 — Prévia da Distribuição &mdash; {{ formatMonthLabel(profitMonth) }} <span class="distribution-payment-arrow">→ Pagamento em {{ formatMonthLabel(paymentMonth) }}</span></h2>
              <span class="distribution-meta">
                Dividendos: {{ formatCurrency(dividendPool) }}
                &nbsp;+&nbsp; Rede: {{ formatCurrency(totalNetworkEarnings) }}
                &nbsp;= <strong>Total: {{ formatCurrency(dividendPool + totalNetworkEarnings) }}</strong>
                &nbsp;· {{ distributionPreview.length }} cotistas
              </span>
            </div>
            <DsButton variant="primary" @click="generatePayoutsFromProfit">
              <font-awesome-icon icon="circle-check" /> Aprovar Lote e Gerar Faturas
            </DsButton>
          </template>

          <DsAlert v-if="generationSuccess" type="success" class="distribution-success">
            <font-awesome-icon icon="champagne-glasses" /> Lote aprovado! As faturas foram geradas e adicionadas à fila de execução abaixo.
          </DsAlert>

          <DsTable :columns="distributionColumns" :data="distributionPreview" :loading="false">
            <template #cell-user="{ row }">
              <div class="user-cell">
                <div class="user-cell__avatar">{{ getInitials(String(row.user ?? '')) }}</div>
                <span class="user-cell__name">{{ row.user }}</span>
              </div>
            </template>
            <template #cell-amount="{ row }">
              <div class="amount-breakdown-cell">
                <strong class="amount-cell">{{ formatCurrency(Number(row.amount)) }}</strong>
                <div class="amount-breakdown-cell__detail">
                  <span>
                    <font-awesome-icon icon="coins" />
                    Dividendo: {{ formatCurrency(Number(row.quotaAmount)) }}
                  </span>
                  <span>
                    <font-awesome-icon icon="sitemap" />
                    Rede: {{ formatCurrency(Number(row.networkAmount)) }}
                  </span>
                </div>
              </div>
            </template>
            <template #cell-pix="{ row }">
              <div class="pix-cell">
                <font-awesome-icon icon="key" class="pix-cell__icon" />
                <span class="pix-cell__key">{{ row.pix }}</span>
                <DsCopyButton :text="String(row.pix ?? '')" />
              </div>
            </template>
          </DsTable>
        </DsCard>
      </section>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         ETAPA 3 — EXECUÇÃO DE PAGAMENTOS
         Aparece quando há pagamentos gerados (novos ou históricos).
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide-down">
      <div v-if="showExecution" class="execution-wrapper">

        <!-- KPIs -->
        <section class="admin-payouts-view__stats">
          <DsStatCard label="Total Pendente"   :value="formatCurrency(stats.pending)"      icon="hourglass"    icon-color="#d97706" />
          <DsStatCard label="Processando"      :value="formatCurrency(stats.processing)"   icon="rotate"      icon-color="#0284c7" />
          <DsStatCard label="Pago Este Mês"    :value="formatCurrency(stats.paidThisMonth)" icon="circle-check" icon-color="#16a34a" />
          <DsStatCard label="Total Histórico"  :value="formatCurrency(stats.totalPaid)"    icon="dollar-sign" icon-color="#16a34a" />
        </section>

        <!-- Controles da tabela de execução -->
        <section class="admin-payouts-view__execution-header">
          <div class="execution-header__title">
            <h2><font-awesome-icon icon="bolt" /> Etapa 3 — Execução de Pagamentos</h2>
            <p class="execution-header__subtitle">
              Gerencie individualmente cada fatura gerada para o lote selecionado.
            </p>
          </div>
          <div class="execution-header__actions">
            <DsButton variant="outline" @click="exportPayouts">
              <font-awesome-icon icon="download" /> Exportar Lista
            </DsButton>
            <DsButton
              variant="primary"
              :disabled="selectedPayouts.length === 0"
              @click="processSelected"
            >
              Processar Selecionados ({{ selectedPayouts.length }})
            </DsButton>
            <DsButton
              variant="outline"
              :disabled="processingPayoutsCount === 0"
              @click="confirmAllProcessing"
            >
              <font-awesome-icon icon="circle-check" /> Confirmar todos ({{ processingPayoutsCount }})
            </DsButton>
          </div>
        </section>

        <!-- Filtros -->
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

        <!-- Tabela de execução -->
        <section class="admin-payouts-view__table">
          <DsCard>
            <DsTable
              :columns="columns"
              :data="filteredPayouts"
              :loading="isLoading"
              selectable
              @selection-change="onSelectionChange"
            >
              <template #cell-user="{ row }">
                <div class="user-cell">
                  <div class="user-cell__avatar">{{ getInitials(String(row.userName ?? '')) }}</div>
                  <div class="user-cell__info">
                    <strong>{{ row.userName }}</strong>
                    <span v-if="row.pixKey" class="user-cell__pix">{{ row.pixKey }}</span>
                    <span v-else class="user-cell__pix user-cell__pix--missing">
                      <font-awesome-icon icon="triangle-exclamation" /> Sem chave PIX
                    </span>
                  </div>
                </div>
              </template>
              <template #cell-amount="{ row }">
                <strong class="amount-cell amount-cell--right">{{ formatCurrency(Number(row.amount)) }}</strong>
              </template>
              <template #cell-referenceMonth="{ row }">
                <span class="competencia-cell">{{ formatMonthLabel(String(row.referenceMonth ?? '')) }}</span>
              </template>
              <template #cell-paymentMonth="{ row }">
                <span class="payment-month-cell">{{ formatMonthLabel(String(row.paymentMonth ?? '')) }}</span>
              </template>
              <template #cell-status="{ row }">
                <DsBadge :variant="getStatusVariant(String(row.status ?? ''))">
                  {{ getStatusLabel(String(row.status ?? '')) }}
                </DsBadge>
              </template>
              <template #cell-actions="{ row }">
                <div class="actions-cell">
                  <DsButton
                    v-if="row.status === 'completed'"
                    variant="ghost"
                    size="sm"
                    @click="downloadReceiptRow(row)"
                  >
                    <font-awesome-icon icon="file-lines" /> Comprovante
                  </DsButton>
                  <DsButton
                    v-if="row.status === 'failed'"
                    variant="outline"
                    size="sm"
                    @click="markAsPaidRow(row)"
                  >
                    <font-awesome-icon icon="check" /> Marcar como Pago
                  </DsButton>
                  <DsButton
                    v-if="row.status === 'pending'"
                    variant="primary"
                    size="sm"
                    @click="processPayoutRow(row)"
                  >
                    Processar
                  </DsButton>
                  <DsButton
                    v-if="row.status === 'processing'"
                    variant="primary"
                    size="sm"
                    @click="confirmPayoutRow(row)"
                  >
                    Confirmar
                  </DsButton>
                </div>
              </template>
            </DsTable>

            <DsEmptyState
              v-if="filteredPayouts.length === 0 && !isLoading"
              icon="money-bill-wave"
              title="Nenhum pagamento encontrado"
              description="Tente ajustar os filtros de busca"
            />
          </DsCard>
        </section>

      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         MODAL DE DETALHES
    ══════════════════════════════════════════════════════════ -->
    <DsModal v-model="showDetailsModal" title="Detalhes do Pagamento">
      <div v-if="selectedPayout" class="payout-details">
        <div class="detail-row">
          <span>Usuário:</span>
          <strong>{{ selectedPayout.userName }}</strong>
        </div>
        <div class="detail-row">
          <span>Competência:</span>
          <strong>{{ formatMonthLabel(selectedPayout.referenceMonth) }}</strong>
        </div>
        <div v-if="selectedPayout.paymentMonth" class="detail-row">
          <span>Pagamento em:</span>
          <strong>{{ formatMonthLabel(selectedPayout.paymentMonth) }}</strong>
        </div>

        <!-- Breakdown de Valores -->
        <div class="detail-section">
          <h4 class="detail-section__title">
            <font-awesome-icon icon="receipt" /> Composição do Valor
          </h4>

          <div class="detail-row">
            <span><font-awesome-icon icon="coins" /> Dividendos (Cotas)</span>
            <strong>{{ formatCurrency(Number(selectedPayout.quotaAmount ?? 0)) }}</strong>
          </div>

          <div class="detail-row detail-row--sub">
            <span><font-awesome-icon icon="user-plus" /> Bônus 1ª Compra</span>
            <strong>{{ formatCurrency(Number(selectedPayout.firstPurchaseAmount ?? 0)) }}</strong>
          </div>
          <div class="detail-row detail-row--sub">
            <span><font-awesome-icon icon="rotate" /> Bônus Recompra</span>
            <strong>{{ formatCurrency(Number(selectedPayout.repurchaseAmount ?? 0)) }}</strong>
          </div>
          <div class="detail-row detail-row--sub">
            <span><font-awesome-icon icon="users" /> Bônus Equipe</span>
            <strong>{{ formatCurrency(Number(selectedPayout.teamAmount ?? 0)) }}</strong>
          </div>
          <div class="detail-row detail-row--sub">
            <span><font-awesome-icon icon="crown" /> Bônus Liderança</span>
            <strong>{{ formatCurrency(Number(selectedPayout.leadershipAmount ?? 0)) }}</strong>
          </div>

          <div class="detail-row detail-row--total">
            <span>Total Rede (mês)</span>
            <strong>{{ formatCurrency(Number(selectedPayout.networkAmount ?? 0)) }}</strong>
          </div>
        </div>

        <div class="detail-row detail-row--highlight">
          <span>Total a Receber</span>
          <strong class="amount-cell">{{ formatCurrency(selectedPayout.amount) }}</strong>
        </div>

        <div v-if="selectedPayout.lifetimeEarnings" class="detail-row detail-row--muted">
          <span>Ganhos Acumulados (Lifetime)</span>
          <strong>{{ formatCurrency(Number(selectedPayout.lifetimeEarnings)) }}</strong>
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
        <div v-if="selectedPayout.transactionId" class="detail-row">
          <span>ID Transação:</span>
          <strong>{{ selectedPayout.transactionId }}</strong>
        </div>
        <div v-if="selectedPayout.failureReason" class="detail-row detail-row--error">
          <span>Motivo da Falha:</span>
          <strong>{{ selectedPayout.failureReason }}</strong>
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
import * as XLSX from 'xlsx';
import {
  DsCard,
  DsStatCard,
  DsTable,
  DsBadge,
  DsButton,
  DsCopyButton,
  DsInput,
  DsAlert,
  DsDropdown,
  DsMonthPicker,
  DsModal,
  DsEmptyState,
} from '@/design-system';
import { adminService } from '@/shared/services/admin.service';

interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  quotaAmount?: number;
  networkAmount?: number;
  firstPurchaseAmount?: number;
  repurchaseAmount?: number;
  teamAmount?: number;
  leadershipAmount?: number;
  lifetimeEarnings?: number;
  pixKey: string;
  pixKeyType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  referenceMonth: string;
  paymentMonth: string;
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  transactionId: string | null;
}

// ─── State ────────────────────────────────────────────────────
const isLoading    = ref(false);
const payouts      = ref<PayoutRequest[]>([]);
const selectedPayouts = ref<string[]>([]);
const selectedPayout  = ref<PayoutRequest | null>(null);
const showDetailsModal = ref(false);

// ─── Etapa 1: Gatilho ─────────────────────────────────────────
const netProfit   = ref<number>(0);
const profitMonth = ref<string>(new Date().toISOString().slice(0, 7));

/** Adiciona N meses a uma string YYYY-MM e devolve outra YYYY-MM */
function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y!, (m! - 1) + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Dividendos de hotéis são pagos 2 meses após a competência */
const paymentMonth = computed(() => addMonths(profitMonth.value, 2));

// ─── Etapa 2: Distribuição ────────────────────────────────────
const showDistribution = ref(false);
const generationSuccess = ref(false);

// ─── Etapa 3: Execução ────────────────────────────────────────
/** Torna verdadeiro assim que o primeiro lote é aprovado na sessão */
const batchApproved = ref(false);

const filters = ref({
  search: '',
  status: '',
  month: '',
});

const stats = ref({
  pending: 0,
  processing: 0,
  paidThisMonth: 0,
  totalPaid: 0,
});

// ─── Opções e Colunas ─────────────────────────────────────────
const statusOptions = [
  { label: 'Todos',        value: '' },
  { label: 'Pendente',     value: 'pending' },
  { label: 'Processando',  value: 'processing' },
  { label: 'Pago',         value: 'completed' },
  { label: 'Falha',        value: 'failed' },
  { label: 'Cancelado',    value: 'cancelled' },
];

/** Tabela de execução: "Competência" + "Pagamento em" */
const columns = [
  { key: 'user',           label: 'Cotista' },
  { key: 'amount',         label: 'Valor',        align: 'right' as const, width: '140px' },
  { key: 'referenceMonth', label: 'Competência',  width: '120px' },
  { key: 'paymentMonth',   label: 'Pagamento em', width: '130px' },
  { key: 'status',         label: 'Status',       width: '130px' },
  { key: 'actions',        label: 'Ações',        width: '200px' },
];

const distributionColumns = [
  { key: 'user',   label: 'Cotista' },
  { key: 'quotas', label: 'Cotas',           align: 'right' as const, width: '80px'  },
  { key: 'share',  label: '% do Pool',       align: 'right' as const, width: '110px' },
  { key: 'amount', label: 'Total a Receber', align: 'right' as const, width: '210px' },
  { key: 'pix',    label: 'Chave PIX',                                width: '230px' },
];

// ─── Computeds ────────────────────────────────────────────────

/** Verifica se o mês selecionado já tem pagamentos gerados (prevenção de duplicata) */
const isMonthAlreadyProcessed = computed(() =>
  payouts.value.some(p => p.referenceMonth === profitMonth.value)
);

/** Etapa 3 é visível quando há pagamentos carregados OU quando o lote foi aprovado */
const showExecution = computed(() =>
  batchApproved.value || payouts.value.length > 0
);

const filteredPayouts = computed(() => {
  let result = payouts.value;

  if (filters.value.search) {
    const q = filters.value.search.toLowerCase();
    result = result.filter(
      p => p.userName.toLowerCase().includes(q) || p.pixKey.toLowerCase().includes(q)
    );
  }

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status);
  }

  if (filters.value.month) {
    result = result.filter(p => p.referenceMonth === filters.value.month);
  }

  return result;
});

// ─── Profit Distribution Computeds ───────────────────────────
const dividendPoolPercent = ref(20);

const dividendPool = computed(() =>
  Math.round(netProfit.value * (dividendPoolPercent.value / 100) * 100) / 100
);

const totalActiveQuotas = ref(0);
const distributionPreview = ref<any[]>([]);

const totalNetworkEarnings = computed(() =>
  distributionPreview.value.reduce((s: number, r: any) => s + (r.networkAmount || 0), 0)
);

/** Quantidade de pagamentos atualmente em status 'processing' */
const processingPayoutsCount = computed(
  () => payouts.value.filter(p => p.status === 'processing').length
);

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatMonthLabel(ym: string): string {
  if (!ym) return '';
  const [year, month] = ym.split('-').map(Number);
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[(month ?? 1) - 1]}/${year}`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'info' | 'primary' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info' | 'primary'> = {
    pending:    'warning',
    processing: 'info',
    completed:  'success',
    failed:     'default',
    cancelled:  'default',
  };
  return map[status] ?? 'default';
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:    'Pendente',
    processing: 'Processando',
    completed:  'Pago',
    failed:     'Falhou',
    cancelled:  'Cancelado',
  };
  return map[status] ?? status;
}

// ─── Ações Etapa 3 ────────────────────────────────────────────

function onSelectionChange(rows: Record<string, unknown>[]) {
  selectedPayouts.value = rows.map(r => String(r.id ?? ''));
}

function clearFilters() {
  filters.value = { search: '', status: '', month: '' };
}

function exportPayouts() {
  if (filteredPayouts.value.length === 0) {
    return;
  }

  const pixTypeLabel: Record<string, string> = {
    cpf:    'CPF',
    cnpj:   'CNPJ',
    email:  'E-mail',
    phone:  'Telefone',
    random: 'Chave aleatória',
  };

  const rows = filteredPayouts.value.map((p) => ({
    'Cotista':         p.userName ?? '',
    'Chave PIX':       p.pixKey ?? '',
    'Tipo PIX':        pixTypeLabel[String(p.pixKeyType ?? '').toLowerCase()] ?? (p.pixKeyType ?? ''),
    'Competência':     formatMonthLabel(p.referenceMonth),
    'Pagamento em':    formatMonthLabel(p.paymentMonth),
    'Dividendos (R$)': Number(p.quotaAmount ?? 0),
    'Rede (R$)':       Number(p.networkAmount ?? 0),
    'Total (R$)':      Number(p.amount ?? 0),
    'Status':          getStatusLabel(p.status),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Pagamentos');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `pagamentos-${stamp}.xlsx`);
}

async function processSelected() {
  if (selectedPayouts.value.length === 0) return;
  try {
    await adminService.bulkPayoutAction({ payoutIds: selectedPayouts.value, action: 'processing' });
    await loadPayouts();
  } catch { /* fail silently */ }
}

/** Confirma TODOS os pagamentos com status 'processing' de uma vez */
async function confirmAllProcessing() {
  const processingIds = payouts.value
    .filter(p => p.status === 'processing')
    .map(p => p.id);
  if (processingIds.length === 0) return;
  try {
    await adminService.bulkPayoutAction({ payoutIds: processingIds, action: 'completed' });
    await loadPayouts();
  } catch { /* fail silently */ }
}

async function processPayout(payout: PayoutRequest) {
  try {
    await adminService.processPayout(payout.id);
    await loadPayouts();
  } catch { /* fail silently */ }
}

async function confirmPayout(payout: PayoutRequest) {
  try {
    await adminService.confirmPayout(payout.id, { action: 'completed' });
    await loadPayouts();
  } catch { /* fail silently */ }
}

async function markAsPaid(payout: PayoutRequest) {
  try {
    await adminService.confirmPayout(payout.id, { action: 'completed', transactionId: `MANUAL-${Date.now()}` });
    await loadPayouts();
  } catch { /* fail silently */ }
}

function downloadReceipt(payout: PayoutRequest) {
  alert(`Comprovante de ${formatCurrency(payout.amount)} · ID: ${payout.transactionId ?? payout.id}`);
}

// ─── Ações Etapa 1 & 2 ────────────────────────────────────────

async function calculateDistribution() {
  if (netProfit.value <= 0) return;
  try {
    const res = await adminService.calculateDistribution({
      profitMonth: profitMonth.value,
      netProfit: netProfit.value,
    });
    if (res.data) {
      // Map backend field names to table column keys
      distributionPreview.value = (res.data.distributions || []).map((d: any) => ({
        user: d.userName,
        quotas: d.quotaBalance,
        share: `${d.percentageShare}%`,
        amount: d.totalAmount,
        quotaAmount: d.quotaAmount,
        networkAmount: d.networkAmount,
        pix: d.pixKey,
      }));
      totalActiveQuotas.value = res.data.totalQuotasInSystem || 0;
      if (res.data.dividendPoolPercent) dividendPoolPercent.value = res.data.dividendPoolPercent;
    }
    showDistribution.value = true;
  } catch {
    showDistribution.value = true;
  }
}

async function generatePayoutsFromProfit() {
  try {
    const res = await adminService.generateBatch({
      profitMonth: profitMonth.value,
      netProfit: netProfit.value,
    });
    if (res.data) {
      // generateBatch returns batch metadata; reload full payout list
      await loadPayouts();
    }
    // Filtra automaticamente para o mês gerado, mostrando os novos pagamentos na etapa 3
    filters.value.month = profitMonth.value;
    batchApproved.value = true;
    generationSuccess.value = true;
    setTimeout(() => { generationSuccess.value = false; }, 4000);
    recalcStats();
  } catch {
    /* handle error */
  }
}

// ─── Stats ────────────────────────────────────────────────────

function recalcStats() {
  stats.value = {
    pending:      payouts.value.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
    processing:   payouts.value.filter(p => p.status === 'processing').reduce((s, p) => s + Number(p.amount), 0),
    paidThisMonth: payouts.value.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
    totalPaid:    payouts.value.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
  };
}

// ─── Wrappers para slots do DsTable (row tipado como Record) ──────
function processPayoutRow(row: Record<string, unknown>)  { processPayout(row as unknown as PayoutRequest); }
function confirmPayoutRow(row: Record<string, unknown>)  { confirmPayout(row as unknown as PayoutRequest); }
function markAsPaidRow(row: Record<string, unknown>)     { markAsPaid(row as unknown as PayoutRequest); }
function downloadReceiptRow(row: Record<string, unknown>) { downloadReceipt(row as unknown as PayoutRequest); }

// ─── Load Payouts (reutilizável) ──────────────────────────────
async function loadPayouts() {
  try {
    // Sem filtro de mês: carrega todos os pagamentos (histórico completo)
    const res = await adminService.getPayouts();
    if (res.data && Array.isArray(res.data)) {
      payouts.value = res.data;
      recalcStats();
    }
  } catch { /* fail silently */ }
}

// ─── Mount ────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    const [payoutsRes, configRes] = await Promise.all([
      adminService.getPayouts(),
      adminService.getFinancialConfig().catch(() => ({ data: null })),
    ]);
    if (payoutsRes.data && Array.isArray(payoutsRes.data)) {
      payouts.value = payoutsRes.data;
    }
    if (configRes.data?.dividendPoolPercent) {
      dividendPoolPercent.value = configRes.data.dividendPoolPercent;
    }
    recalcStats();
  } catch {
    /* fail silently */
  } finally {
    isLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ─── Layout raiz ──────────────────────────────────────────────
.admin-payouts-view {
  padding: $spacing-6;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  @media (max-width: 768px) {
    padding: $spacing-4;
    gap: $spacing-4;
  }

  &__header {
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: $spacing-1;
      color: var(--text-primary);
    }
  }

  &__subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 0.95rem;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-4;

    @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 576px)  { grid-template-columns: 1fr; }
  }

}


// ─── Etapa 1: Trigger Card ────────────────────────────────────
.trigger-card {
  border: 2px solid rgba(var(--primary-500-rgb), 0.2);
  background: linear-gradient(135deg, rgba(var(--primary-500-rgb), 0.03) 0%, rgba(var(--secondary-500-rgb), 0.03) 100%);

  &__title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: $spacing-1;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
    max-width: 640px;
  }

  &__lock-alert {
    margin-bottom: $spacing-4;
  }

  &__cta {
    align-self: flex-start;
    min-width: 240px;
  }
}

// ─── Formulário ───────────────────────────────────────────────
.profit-entry-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__fields {
    display: flex;
    gap: $spacing-6;
    flex-wrap: wrap;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    min-width: 240px;
    max-width: 340px;
    flex: 1;

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
  }

  &__preview {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    flex-wrap: wrap;
    padding: $spacing-3 $spacing-4;
    background: rgba(var(--primary-500-rgb), 0.06);
    border: 1px solid rgba(var(--primary-500-rgb), 0.18);
    border-radius: $radius-lg;
    font-size: 0.875rem;
    color: var(--text-secondary);
    align-self: flex-start;
  }
}

.profit-preview {
  &__item {
    strong { font-weight: 700; color: var(--text-primary); }
    &--highlight strong {
      color: var(--color-success-dark);
      font-size: 1rem;
    }
  }
  &__separator {
    color: var(--text-tertiary);
    font-size: 1rem;
  }
}

// ─── Campo "Mês de Pagamento" ──────────────────────────────────
.profit-entry-form__field--payment-month {
  justify-content: flex-start;
}

.payment-month-display {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: rgba(var(--primary-500-rgb), 0.06);
  border: 1px solid rgba(var(--primary-500-rgb), 0.2);
  border-radius: $radius-md;
  min-height: 40px;

  &__ref {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  &__arrow {
    color: var(--primary-500);
    font-size: 0.8rem;
  }

  &__pay {
    font-size: 1rem;
    font-weight: 700;
    color: var(--primary-700);
  }

  &__note {
    display: block;
    font-size: 0.78rem;
    color: var(--text-tertiary);
    margin-top: $spacing-1;
  }
}

// ─── Badge "Pagamento em" na Etapa 2 ──────────────────────────
.distribution-payment-arrow {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-600);
  margin-left: $spacing-1;
}

// ─── Célula da coluna "Pagamento em" ──────────────────────────
.payment-month-cell {
  font-weight: 600;
  color: var(--primary-700);
  font-size: 0.875rem;
}

// ─── Etapa 2: Distribuição ────────────────────────────────────
.distribution-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.distribution-success {
  margin-bottom: $spacing-4;
}

// ─── Etapa 3: Execução ────────────────────────────────────────
.admin-payouts-view__execution-header {
  @include flex-between;
  flex-wrap: wrap;
  gap: $spacing-4;
}

.execution-header {
  &__title {
    h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: $spacing-1;
    }
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  &__actions {
    display: flex;
    gap: $spacing-3;
    flex-wrap: wrap;
  }
}

// ─── Filtros ──────────────────────────────────────────────────
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

// ─── Células da tabela ────────────────────────────────────────
.user-cell {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
    color: white;
    @include flex-center;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__info {
    @include flex-column;
    gap: 2px;
    strong { font-size: 0.875rem; }
    span { font-size: 0.75rem; color: var(--text-tertiary); }
  }

  &__pix {
    font-size: 0.75rem;
    color: var(--text-tertiary);

    &--missing {
      color: #d97706;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.amount-cell {
  color: var(--color-success-dark);
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  // Alinhamento a direita para comparar grandezas financeiras
  &--right {
    display: block;
    text-align: right;
    width: 100%;
  }
}

.amount-breakdown-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;

  .amount-cell {
    font-size: 1rem;
  }

  &__detail {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;

    span {
      font-size: 0.7rem;
      color: var(--text-tertiary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 3px;

      svg { opacity: 0.6; font-size: 0.65rem; }
    }
  }
}

.competencia-cell {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.actions-cell {
  display: flex;
  gap: $spacing-2;
  flex-wrap: wrap;
}

// ─── Célula PIX (tabela de distribuição) ─────────────────────
.pix-cell {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  &__icon {
    color: var(--primary-400);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  &__key {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 130px;
  }
}

// ─── Modal de Detalhes ────────────────────────────────────────
.payout-details {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.detail-row {
  @include flex-between;
  padding: $spacing-2 0;
  border-bottom: 1px solid var(--neutral-200);

  span { color: var(--text-secondary); font-size: 0.875rem; }
  strong { color: var(--text-primary); }

  &--error strong { color: var(--color-error); }

  &--sub {
    padding-left: $spacing-4;
    span { font-size: 0.8125rem; color: var(--text-tertiary, #999); }
    strong { font-size: 0.875rem; }
  }

  &--total {
    border-top: 1px dashed var(--neutral-300);
    span { font-weight: 600; color: var(--text-primary); }
    strong { color: var(--color-primary, #0e7490); }
  }

  &--highlight {
    background: var(--neutral-50, #f8fafc);
    border-radius: 8px;
    padding: $spacing-3;
    margin-top: $spacing-1;
    border-bottom: none;
    span { font-weight: 700; font-size: 0.9375rem; }
    strong { font-size: 1.125rem; }
  }

  &--muted {
    span { font-style: italic; color: var(--text-tertiary, #999); font-size: 0.8125rem; }
    strong { color: var(--text-tertiary, #999); font-size: 0.8125rem; }
  }
}

.detail-section {
  margin-top: $spacing-2;

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: $spacing-1;
    padding-bottom: $spacing-1;
    border-bottom: 2px solid var(--neutral-200);
  }
}

// ─── Wrapper da Etapa 3 ──────────────────────────────────────
// Único filho direto do <Transition>; organiza as seções internas
.execution-wrapper {
  display: flex;
  flex-direction: column;
  gap: $spacing-6;

  @media (max-width: 768px) { gap: $spacing-4; }
}

// ─── Animações de Divulgação Progressiva ──────────────────────
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
