<template>
  <div class="admin-financial-config-view">
    <!-- Header -->
    <header class="admin-financial-config-view__header">
      <div>
        <h1>Configurações Financeiras</h1>
        <p class="admin-financial-config-view__subtitle">Configure percentuais, comissões e parâmetros do sistema</p>
      </div>
      <div class="admin-financial-config-view__actions">
        <DsButton variant="outline" @click="resetDefaults">
          Restaurar Padrões
        </DsButton>
        <DsButton variant="primary" :loading="isSaving" @click="saveConfig">
          Salvar Configurações
        </DsButton>
      </div>
    </header>

    <DsAlert v-if="saveSuccess" type="success" dismissible @dismiss="saveSuccess = false">
      Configurações salvas com sucesso!
    </DsAlert>

    <!-- Commission Settings -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>💵 Comissões</h2>
        </template>

        <div class="config-grid">
          <div class="config-item">
            <label>Bônus Primeira Compra (%)</label>
            <DsInput
              v-model.number="config.firstPurchaseBonus"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual pago sobre a primeira compra de cotas do indicado</span>
          </div>

          <div class="config-item">
            <label>Bônus Recompra Nível 1 (%)</label>
            <DsInput
              v-model.number="config.repurchaseBonusL1"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual de recompra do 1º nível da rede</span>
          </div>

          <div class="config-item">
            <label>Bônus Recompra Níveis 2-6 (%)</label>
            <DsInput
              v-model.number="config.repurchaseBonusL2to6"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual de recompra dos níveis 2 a 6 da rede</span>
          </div>

          <div class="config-item">
            <label>Bônus de Equipe (%)</label>
            <DsInput
              v-model.number="config.teamBonus"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual sobre o total da equipe ativa</span>
          </div>
        </div>
      </DsCard>
    </section>

    <!-- Dividend & Leadership Settings -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>📊 Dividendos e Liderança</h2>
        </template>

        <div class="config-grid">
          <div class="config-item">
            <label>Pool de Dividendos (%)</label>
            <DsInput
              v-model.number="config.dividendPool"
              type="number"
              min="0"
              max="100"
              step="0.1"
            />
            <span class="config-item__help">Percentual do lucro líquido distribuído como dividendos</span>
          </div>

          <div class="config-item">
            <label>Bônus Liderança Ouro (%)</label>
            <DsInput
              v-model.number="config.leadershipBonusOuro"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual sobre 5 níveis qualificados para título Ouro</span>
          </div>

          <div class="config-item">
            <label>Bônus Liderança Diamante (%)</label>
            <DsInput
              v-model.number="config.leadershipBonusDiamante"
              type="number"
              min="0"
              max="100"
              step="0.5"
            />
            <span class="config-item__help">Percentual sobre 5 níveis qualificados para título Diamante</span>
          </div>

          <div class="config-item config-item--full">
            <label>Dia de Fechamento</label>
            <div class="closing-day-control">
              <div class="closing-day-modes">
                <label class="radio-item" :class="{ 'radio-item--active': config.closingDayMode === 'fixed' }">
                  <input v-model="config.closingDayMode" type="radio" value="fixed" />
                  <span>Dia fixo do mês</span>
                </label>
                <label class="radio-item" :class="{ 'radio-item--active': config.closingDayMode === 'last_day' }">
                  <input v-model="config.closingDayMode" type="radio" value="last_day" />
                  <span>Último dia do mês</span>
                </label>
                <label class="radio-item" :class="{ 'radio-item--active': config.closingDayMode === 'first_next_month' }">
                  <input v-model="config.closingDayMode" type="radio" value="first_next_month" />
                  <span>1º dia do próximo mês</span>
                </label>
              </div>
              <div v-if="config.closingDayMode === 'fixed'" class="closing-day-input">
                <DsInput
                  v-model.number="config.closingDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 25"
                />
                <span class="closing-day-input__note">Quando o mês tiver menos dias que o configurado, será usado o último dia disponível automaticamente.</span>
              </div>
              <div class="closing-day-preview">
                <span class="closing-day-preview__label">Exemplo com o mês atual:</span>
                <strong class="closing-day-preview__value">{{ closingDayPreview }}</strong>
              </div>
            </div>
            <span class="config-item__help">Define quando o ciclo mensal encerra para contabilizar rendimentos</span>
          </div>

          <div class="config-item">
            <label>Dia de Pagamento</label>
            <DsInput
              v-model.number="config.paymentDay"
              type="number"
              min="1"
              max="28"
            />
            <span class="config-item__help">Dia do mês para pagamento dos rendimentos</span>
          </div>
        </div>
      </DsCard>
    </section>

    <!-- Career Settings -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>🏆 Plano de Carreira</h2>
        </template>

        <div class="career-table">
          <DsTable :columns="careerColumns" :data="careerData">
            <template #title="{ row }">
              <div class="title-cell">
                <span>{{ row.icon }}</span>
                <strong :style="{ color: row.color }">{{ row.title }}</strong>
              </div>
            </template>
            <template #requirement="{ index }">
              {{ config.careerLevels[index]!.requirement }}
            </template>
            <template #repurchaseLevels="{ index }">
              <DsInput
                v-model.number="config.careerLevels[index]!.repurchaseLevels"
                type="number"
                min="0"
              />
            </template>
            <template #teamLevels="{ index }">
              <DsInput
                v-model.number="config.careerLevels[index]!.teamLevels"
                type="number"
                min="0"
              />
            </template>
            <template #leadershipPercent="{ index }">
              <DsInput
                v-model.number="config.careerLevels[index]!.leadershipPercent"
                type="number"
                min="0"
                max="100"
                step="0.5"
              />
            </template>
          </DsTable>
        </div>
      </DsCard>
    </section>

    <!-- Title Movement Rules -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>🎯 Movimentação Mínima por Título</h2>
          <p class="section-subtitle">Para bater um título no mês, a rede do usuário precisa movimentar um valor mínimo até o nível configurado.</p>
        </template>

        <div class="movement-rules">
          <div
            v-for="(level, index) in config.careerLevels"
            :key="level.title"
            class="movement-rule-row"
          >
            <div class="movement-rule-row__title">
              <span>{{ careerData[index]?.icon }}</span>
              <strong :style="{ color: careerData[index]?.color }">{{ level.title }}</strong>
            </div>

            <div class="movement-rule-row__fields">
              <div class="movement-rule-field">
                <label>Movimentação mínima da rede (R$)</label>
                <DsInput
                  v-model.number="level.minNetworkMovement"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0 = sem exigência"
                />
              </div>
              <div class="movement-rule-field">
                <label>Níveis de rede considerados</label>
                <DsInput
                  v-model.number="level.networkLevelsDepth"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div v-if="level.minNetworkMovement > 0" class="movement-rule-row__summary">
              Rede até o <strong>{{ level.networkLevelsDepth }}º nível</strong> precisa movimentar
              <strong>{{ formatCurrency(level.minNetworkMovement) }}</strong> no mês.
            </div>
            <div v-else class="movement-rule-row__summary movement-rule-row__summary--none">
              Sem exigência de movimentação para este título.
            </div>
          </div>
        </div>
      </DsCard>
    </section>

    <!-- Quota Settings -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>📈 Configurações de Cotas</h2>
        </template>

        <div class="config-grid">
          <div class="config-item">
            <label>Valor da Cota (R$)</label>
            <DsInput
              v-model.number="config.quotaValue"
              type="number"
              min="0"
              step="10"
            />
            <span class="config-item__help">Valor unitário de cada cota</span>
          </div>

          <div class="config-item">
            <label>Mínimo de Cotas</label>
            <DsInput
              v-model.number="config.minQuotas"
              type="number"
              min="1"
            />
            <span class="config-item__help">Quantidade mínima de cotas por compra</span>
          </div>

          <div class="config-item">
            <label>Máximo de Cotas por Usuário</label>
            <DsInput
              v-model.number="config.maxQuotasPerUser"
              type="number"
              min="1"
            />
            <span class="config-item__help">Limite máximo de cotas que um usuário pode ter</span>
          </div>

          <div class="config-item">
            <label>Total de Cotas Disponíveis</label>
            <DsInput
              v-model.number="config.totalQuotasAvailable"
              type="number"
              min="0"
            />
            <span class="config-item__help">Total de cotas disponíveis para venda</span>
          </div>
        </div>
      </DsCard>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  DsCard,
  DsButton,
  DsInput,
  DsTable,
  DsAlert,
} from '@/design-system';
import { mockDelay } from '@/mocks';

// State
const isSaving = ref(false);
const saveSuccess = ref(false);

const config = reactive({
  // Commissions
  firstPurchaseBonus: 10,
  repurchaseBonusL1: 5,
  repurchaseBonusL2to6: 2,
  teamBonus: 2,

  // Dividends & Leadership
  dividendPool: 20,
  leadershipBonusOuro: 1,
  leadershipBonusDiamante: 2,
  closingDay: 25,
  closingDayMode: 'fixed' as 'fixed' | 'last_day' | 'first_next_month',
  paymentDay: 5,

  // Career Levels (network-based)
  careerLevels: [
    { title: 'Bronze',   requirement: '2 pessoas ativas',          repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0, minNetworkMovement: 0,    networkLevelsDepth: 2 },
    { title: 'Prata',    requirement: '1 indicado Bronze',          repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0, minNetworkMovement: 5000, networkLevelsDepth: 3 },
    { title: 'Ouro',     requirement: '2 Bronzes linhas diferentes',repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1, minNetworkMovement: 0,    networkLevelsDepth: 4 },
    { title: 'Diamante', requirement: '3 Bronzes linhas diferentes',repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2, minNetworkMovement: 0,    networkLevelsDepth: 5 },
  ],

  // Quotas
  quotaValue: 2500,
  minQuotas: 1,
  maxQuotasPerUser: 1000,
  totalQuotasAvailable: 100000,
});

const careerColumns = [
  { key: 'title', label: 'Título', width: '150px' },
  { key: 'requirement', label: 'Requisito', width: '250px' },
  { key: 'repurchaseLevels', label: 'Níveis Recompra', width: '150px' },
  { key: 'teamLevels', label: 'Níveis Equipe', width: '150px' },
  { key: 'leadershipPercent', label: 'Liderança (%)', width: '150px' },
];

const careerData = [
  { title: 'Bronze',   icon: '🥉', color: '#CD7F32' },
  { title: 'Prata',   icon: '🥈', color: '#C0C0C0' },
  { title: 'Ouro',    icon: '🥇', color: '#FFD700' },
  { title: 'Diamante',icon: '💎', color: '#00BCD4' },
];

// Computed
const closingDayPreview = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (config.closingDayMode === 'last_day') {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${String(lastDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year} (último dia do mês)`;
  }

  if (config.closingDayMode === 'first_next_month') {
    const nextMonth = month + 2 > 12 ? 1 : month + 2;
    const nextYear = month + 2 > 12 ? year + 1 : year;
    return `01/${String(nextMonth).padStart(2, '0')}/${nextYear} (1º dia do próximo mês)`;
  }

  // fixed: clamp to last day of month if day > days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const effectiveDay = Math.min(config.closingDay, daysInMonth);
  return `${String(effectiveDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Methods
async function saveConfig() {
  isSaving.value = true;
  await mockDelay(1000);
  isSaving.value = false;
  saveSuccess.value = true;
}

function resetDefaults() {
  if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
    config.firstPurchaseBonus = 10;
    config.repurchaseBonusL1 = 5;
    config.repurchaseBonusL2to6 = 2;
    config.teamBonus = 2;
    config.dividendPool = 20;
    config.leadershipBonusOuro = 1;
    config.leadershipBonusDiamante = 2;
    config.closingDay = 25;
    config.closingDayMode = 'fixed';
    config.paymentDay = 5;
    config.quotaValue = 2500;
    config.minQuotas = 1;
    config.maxQuotasPerUser = 1000;
    config.totalQuotasAvailable = 100000;
    config.careerLevels.forEach(l => {
      l.minNetworkMovement = 0;
    });
  }
}

// Load config
onMounted(async () => {
  await mockDelay(300);
  // Config is already initialized with defaults
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.admin-financial-config-view {
  padding: $spacing-6;
  max-width: 1200px;
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
}

.config-section {
  margin-bottom: $spacing-6;

  h2 {
    font-size: 1.125rem;
    margin: 0;
  }
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.config-item {
  @include flex-column;
  gap: $spacing-2;

  &--full {
    grid-column: 1 / -1;
  }

  label {
    font-weight: 500;
    color: $text-primary;
  }

  &__help {
    font-size: 0.75rem;
    color: $text-tertiary;
  }
}

.career-table {
  overflow-x: auto;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.closing-day-control {
  @include flex-column;
  gap: $spacing-3;
}

.closing-day-modes {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  padding: $spacing-2 $spacing-3;
  border: 1px solid $border-default;
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;

  &--active {
    border-color: $primary-500;
    background: rgba($primary-500, 0.06);
  }

  input { accent-color: $primary-500; }
}

.closing-day-input {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  max-width: 280px;

  &__note {
    font-size: 0.75rem;
    color: $text-tertiary;
    line-height: 1.5;
  }
}

.closing-day-preview {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: rgba($primary-500, 0.05);
  border-radius: 6px;
  font-size: 0.875rem;
  color: $text-secondary;

  &__label { opacity: 0.75; }
  &__value { color: $primary-600; }
}

.section-subtitle {
  font-size: 0.8125rem;
  color: $text-tertiary;
  margin: $spacing-1 0 0;
}

.movement-rules {
  @include flex-column;
  gap: $spacing-4;
}

.movement-rule-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  grid-template-rows: auto auto;
  gap: $spacing-2 $spacing-6;
  padding: $spacing-4;
  background: $bg-tertiary;
  border-radius: 10px;
  border: 1px solid $border-default;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: 1rem;
    align-self: center;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-4;

    .movement-rule-field {
      @include flex-column;
      gap: $spacing-1;
      min-width: 200px;

      label {
        font-size: 0.75rem;
        font-weight: 500;
        color: $text-secondary;
      }
    }
  }

  &__summary {
    grid-column: 1 / -1;
    font-size: 0.8125rem;
    color: $text-secondary;
    padding: $spacing-2 $spacing-3;
    background: rgba($primary-500, 0.05);
    border-radius: 6px;

    &--none {
      color: $text-tertiary;
      background: transparent;
      padding: 0;
    }
  }
}
</style>
