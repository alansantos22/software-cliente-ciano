<template>
  <div class="extract">
    <header class="extract__header">
      <div>
        <RouterLink to="/admin/users" class="extract__back">← Voltar ao CRM</RouterLink>
        <h1 class="extract__title">Extrato do usuário</h1>
        <p v-if="data" class="extract__subtitle">{{ data.user.name }} · {{ data.user.email }}</p>
      </div>
      <button
        type="button"
        class="extract__export"
        :disabled="!data"
        @click="exportToExcel"
      >
        <font-awesome-icon icon="file-excel" />
        Exportar Excel
      </button>
    </header>

    <div v-if="loading" class="extract__state">Carregando extrato...</div>
    <div v-else-if="error" class="extract__state extract__state--error">{{ error }}</div>

    <template v-else-if="data">
      <!-- Resumo -->
      <section class="extract__cards">
        <article class="extract__card">
          <span class="extract__card-label">Status</span>
          <strong :class="['extract__card-value', data.user.isActive ? 'is-ok' : 'is-bad']">
            {{ data.user.isActive ? 'Ativo' : 'Inativo' }}
          </strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Título</span>
          <strong class="extract__card-value">{{ data.user.title || '—' }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Cotas (saldo)</span>
          <strong class="extract__card-value">{{ data.user.quotaBalance }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Cotas compradas</span>
          <strong class="extract__card-value">{{ data.user.purchasedQuotas }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Total gasto em compras</span>
          <strong class="extract__card-value">{{ formatBRL(data.summary.totalSpent) }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Total recebido</span>
          <strong class="extract__card-value">{{ formatBRL(data.summary.totalReceived) }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Ganhos acumulados (lifetime)</span>
          <strong class="extract__card-value">{{ formatBRL(data.summary.totalEarnings) }}</strong>
        </article>
        <article class="extract__card">
          <span class="extract__card-label">Patrocinador</span>
          <strong class="extract__card-value">{{ data.user.sponsorName || '—' }}</strong>
        </article>
      </section>

      <!-- Compras -->
      <section class="extract__section">
        <header class="extract__section-head">
          <h2>Compras ({{ data.transactions.length }})</h2>
        </header>
        <div class="extract__table-wrap">
          <table class="extract__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Cotas</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Mês ref.</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in data.transactions" :key="t.id">
                <td>{{ formatDateTime(t.createdAt) }}</td>
                <td>{{ formatType(t.type) }}</td>
                <td>{{ t.quotasAffected }}</td>
                <td>{{ formatBRL(t.amount) }}</td>
                <td>
                  <span :class="['extract__pill', `extract__pill--${t.status?.toLowerCase()}`]">
                    {{ formatStatus(t.status) }}
                  </span>
                </td>
                <td>{{ t.referenceMonth || '—' }}</td>
                <td class="extract__cell-desc">{{ t.description || '—' }}</td>
              </tr>
              <tr v-if="data.transactions.length === 0">
                <td colspan="7" class="extract__empty">Sem compras registradas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Ganhos -->
      <section class="extract__section">
        <header class="extract__section-head">
          <h2>Ganhos ({{ data.earnings.length }})</h2>
        </header>
        <div class="extract__table-wrap">
          <table class="extract__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Nível</th>
                <th>Origem</th>
                <th>Valor</th>
                <th>Mês ref.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in data.earnings" :key="e.id">
                <td>{{ formatDateTime(e.createdAt) }}</td>
                <td>{{ formatBonusType(e.bonusType) }}</td>
                <td>{{ e.level || '—' }}</td>
                <td>{{ e.sourceUserName || '—' }}</td>
                <td>{{ formatBRL(e.amount) }}</td>
                <td>{{ e.referenceMonth || '—' }}</td>
                <td>
                  <span :class="['extract__pill', `extract__pill--${e.status?.toLowerCase()}`]">
                    {{ formatStatus(e.status) }}
                  </span>
                </td>
              </tr>
              <tr v-if="data.earnings.length === 0">
                <td colspan="7" class="extract__empty">Sem ganhos registrados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Pagamentos -->
      <section class="extract__section">
        <header class="extract__section-head">
          <h2>Pagamentos ({{ data.payouts.length }})</h2>
        </header>
        <div class="extract__table-wrap">
          <table class="extract__table">
            <thead>
              <tr>
                <th>Gerado em</th>
                <th>Mês ref.</th>
                <th>Pagamento em</th>
                <th>Cotas</th>
                <th>Rede</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in data.payouts" :key="p.id">
                <td>{{ formatDateTime(p.generatedAt) }}</td>
                <td>{{ p.referenceMonth || '—' }}</td>
                <td>{{ p.paymentMonth || '—' }}</td>
                <td>{{ formatBRL(p.quotaAmount) }}</td>
                <td>{{ formatBRL(p.networkAmount) }}</td>
                <td>{{ formatBRL(p.amount) }}</td>
                <td>
                  <span :class="['extract__pill', `extract__pill--${p.status?.toLowerCase()}`]">
                    {{ formatStatus(p.status) }}
                  </span>
                </td>
              </tr>
              <tr v-if="data.payouts.length === 0">
                <td colspan="7" class="extract__empty">Sem pagamentos registrados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import * as XLSX from 'xlsx';
import { adminService } from '@/shared/services/admin.service';

interface ExtractData {
  user: {
    id: string;
    name: string;
    email: string;
    title: string | null;
    partnerLevel: number | null;
    isActive: boolean;
    sponsorName: string | null;
    quotaBalance: number;
    purchasedQuotas: number;
    splitQuotas: number;
    totalEarnings: number;
    lastPurchaseDate: string | null;
    createdAt: string | null;
    pixKey: string | null;
    pixKeyType: string | null;
  };
  summary: {
    totalSpent: number;
    totalReceived: number;
    totalEarnings: number;
    transactionsCount: number;
    earningsCount: number;
    payoutsCount: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    quotasAffected: number;
    description: string;
    referenceMonth: string;
    createdAt: string;
    completedAt: string | null;
  }>;
  earnings: Array<{
    id: string;
    bonusType: string;
    amount: number;
    sourceUserName: string | null;
    description: string;
    level: number;
    referenceMonth: string;
    status: string;
    cutoffEligible: boolean;
    createdAt: string;
    paidAt: string | null;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    quotaAmount: number;
    networkAmount: number;
    status: string;
    referenceMonth: string;
    paymentMonth: string;
    generatedAt: string;
    completedAt: string | null;
  }>;
}

const route = useRoute();
const loading = ref(true);
const error = ref('');
const data = ref<ExtractData | null>(null);

const formatBRL = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatType = (type: string) => {
  const map: Record<string, string> = {
    purchase: 'Compra',
    PURCHASE: 'Compra',
    admin_grant: 'Concessão admin',
    refund: 'Estorno',
    split: 'Split',
  };
  return map[type] || map[type?.toUpperCase()] || type;
};

const formatBonusType = (type: string) => {
  const map: Record<string, string> = {
    first_purchase: '1ª compra',
    repurchase: 'Recompra',
    dividend: 'Dividendo',
    team: 'Equipe',
    leadership: 'Liderança',
  };
  return map[type?.toLowerCase()] || type;
};

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Em processamento',
    completed: 'Concluído',
    failed: 'Falhou',
    cancelled: 'Cancelado',
    paid: 'Pago',
  };
  return map[status?.toLowerCase()] || status;
};

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const userId = String(route.params.id);
    const res = await adminService.getUserExtract(userId);
    if (!res.data) {
      error.value = 'Usuário não encontrado.';
    } else {
      data.value = res.data as ExtractData;
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Falha ao carregar extrato.';
  } finally {
    loading.value = false;
  }
}

function exportToExcel() {
  if (!data.value) return;
  const d = data.value;
  const wb = XLSX.utils.book_new();

  const summarySheet = [
    { Campo: 'Nome', Valor: d.user.name },
    { Campo: 'E-mail', Valor: d.user.email },
    { Campo: 'Status', Valor: d.user.isActive ? 'Ativo' : 'Inativo' },
    { Campo: 'Título', Valor: d.user.title || '—' },
    { Campo: 'Patrocinador', Valor: d.user.sponsorName || '—' },
    { Campo: 'Cotas (saldo)', Valor: d.user.quotaBalance },
    { Campo: 'Cotas compradas', Valor: d.user.purchasedQuotas },
    { Campo: 'Total gasto', Valor: d.summary.totalSpent },
    { Campo: 'Total recebido', Valor: d.summary.totalReceived },
    { Campo: 'Ganhos lifetime', Valor: d.summary.totalEarnings },
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Resumo');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.transactions.map((t) => ({
        Data: formatDateTime(t.createdAt),
        Tipo: formatType(t.type),
        Cotas: t.quotasAffected,
        'Valor (R$)': t.amount,
        Status: formatStatus(t.status),
        'Mês ref.': t.referenceMonth,
        Descrição: t.description,
      })),
    ),
    'Compras',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.earnings.map((e) => ({
        Data: formatDateTime(e.createdAt),
        Tipo: formatBonusType(e.bonusType),
        Nível: e.level,
        Origem: e.sourceUserName,
        'Valor (R$)': e.amount,
        'Mês ref.': e.referenceMonth,
        Status: formatStatus(e.status),
      })),
    ),
    'Ganhos',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.payouts.map((p) => ({
        'Gerado em': formatDateTime(p.generatedAt),
        'Mês ref.': p.referenceMonth,
        'Pagamento em': p.paymentMonth,
        'Cotas (R$)': p.quotaAmount,
        'Rede (R$)': p.networkAmount,
        'Total (R$)': p.amount,
        Status: formatStatus(p.status),
      })),
    ),
    'Pagamentos',
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = (d.user.name || 'usuario').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  XLSX.writeFile(wb, `extrato-${slug}-${stamp}.xlsx`);
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.extract {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 32px 64px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  &__back {
    display: inline-block;
    margin-bottom: 8px;
    color: var(--color-primary, #0ea5e9);
    text-decoration: none;
    font-size: 0.9rem;

    &:hover {
      text-decoration: underline;
    }
  }

  &__title {
    margin: 0 0 4px;
    font-size: 1.6rem;
    color: var(--color-text, #0f172a);
  }

  &__subtitle {
    margin: 0;
    color: var(--color-text-muted, #64748b);
    font-size: 0.95rem;
  }

  &__export {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: none;
    border-radius: 999px;
    background: #16a34a;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) {
      background: #15803d;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__state {
    padding: 32px;
    text-align: center;
    color: var(--color-text-muted, #64748b);

    &--error {
      color: var(--color-error, #dc2626);
    }
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 32px;
  }

  &__card {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__card-label {
    font-size: 0.78rem;
    color: var(--color-text-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__card-value {
    font-size: 1.05rem;
    color: var(--color-text, #0f172a);

    &.is-ok {
      color: #16a34a;
    }

    &.is-bad {
      color: #dc2626;
    }
  }

  &__section {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 24px;
  }

  &__section-head {
    margin-bottom: 12px;

    h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--color-text, #0f172a);
    }
  }

  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border, #e2e8f0);
      white-space: nowrap;
    }

    th {
      font-weight: 600;
      color: var(--color-text-muted, #64748b);
      background: var(--color-surface-soft, #f8fafc);
    }
  }

  &__cell-desc {
    white-space: normal;
    max-width: 320px;
  }

  &__empty {
    text-align: center !important;
    color: var(--color-text-muted, #64748b);
    padding: 24px !important;
  }

  &__pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    background: #e2e8f0;
    color: #475569;

    &--completed,
    &--paid {
      background: #dcfce7;
      color: #166534;
    }

    &--pending {
      background: #fef3c7;
      color: #92400e;
    }

    &--processing {
      background: #dbeafe;
      color: #1d4ed8;
    }

    &--failed,
    &--cancelled {
      background: #fee2e2;
      color: #991b1b;
    }
  }
}
</style>
