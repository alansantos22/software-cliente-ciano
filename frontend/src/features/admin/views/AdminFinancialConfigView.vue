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

          <div class="config-item">
            <label>Dia de Fechamento</label>
            <DsInput
              v-model.number="config.closingDay"
              type="number"
              min="1"
              max="28"
            />
            <span class="config-item__help">Dia do mês para fechamento dos rendimentos</span>
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

    <!-- Payment Settings -->
    <section class="config-section">
      <DsCard>
        <template #header>
          <h2>💳 Pagamentos</h2>
        </template>

        <div class="config-grid">
          <div class="config-item">
            <label>Valor Mínimo para Saque (R$)</label>
            <DsInput
              v-model.number="config.minWithdrawal"
              type="number"
              min="0"
            />
            <span class="config-item__help">Valor mínimo para solicitar saque</span>
          </div>

          <div class="config-item">
            <label>Taxa de Saque (%)</label>
            <DsInput
              v-model.number="config.withdrawalFee"
              type="number"
              min="0"
              max="100"
              step="0.1"
            />
            <span class="config-item__help">Taxa cobrada sobre saques</span>
          </div>

          <div class="config-item config-item--full">
            <label>Métodos de Pagamento Aceitos</label>
            <div class="payment-methods">
              <label class="checkbox-item">
                <input v-model="config.paymentMethods" type="checkbox" value="pix" />
                <span>PIX</span>
              </label>
              <label class="checkbox-item">
                <input v-model="config.paymentMethods" type="checkbox" value="boleto" />
                <span>Boleto</span>
              </label>
              <label class="checkbox-item">
                <input v-model="config.paymentMethods" type="checkbox" value="credit" />
                <span>Cartão de Crédito</span>
              </label>
            </div>
          </div>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
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
  paymentDay: 5,

  // Career Levels (network-based)
  careerLevels: [
    { title: 'Bronze', requirement: '2 pessoas ativas', repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0 },
    { title: 'Prata', requirement: '1 indicado Bronze', repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0 },
    { title: 'Ouro', requirement: '2 Bronzes linhas diferentes', repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1 },
    { title: 'Diamante', requirement: '3 Bronzes linhas diferentes', repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2 },
  ],

  // Quotas
  quotaValue: 2500,
  minQuotas: 1,
  maxQuotasPerUser: 1000,
  totalQuotasAvailable: 100000,

  // Payments
  minWithdrawal: 100,
  withdrawalFee: 0,
  paymentMethods: ['pix', 'boleto', 'credit'] as string[],
});

const careerColumns = [
  { key: 'title', label: 'Título', width: '150px' },
  { key: 'requirement', label: 'Requisito', width: '250px' },
  { key: 'repurchaseLevels', label: 'Níveis Recompra', width: '150px' },
  { key: 'teamLevels', label: 'Níveis Equipe', width: '150px' },
  { key: 'leadershipPercent', label: 'Liderança (%)', width: '150px' },
];

const careerData = [
  { title: 'Bronze', icon: '🥉', color: '#CD7F32' },
  { title: 'Prata', icon: '🥈', color: '#C0C0C0' },
  { title: 'Ouro', icon: '🥇', color: '#FFD700' },
  { title: 'Diamante', icon: '💎', color: '#00BCD4' },
];

// Methods
async function saveConfig() {
  isSaving.value = true;
  await mockDelay(1000);
  isSaving.value = false;
  saveSuccess.value = true;
}

function resetDefaults() {
  if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
    // Reset to hardcoded defaults
    config.firstPurchaseBonus = 10;
    config.repurchaseBonusL1 = 5;
    config.repurchaseBonusL2to6 = 2;
    config.teamBonus = 2;
    config.dividendPool = 20;
    config.leadershipBonusOuro = 1;
    config.leadershipBonusDiamante = 2;
    config.quotaValue = 2500;
    config.minQuotas = 1;
    config.maxQuotasPerUser = 1000;
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

.payment-methods {
  display: flex;
  gap: $spacing-4;
  flex-wrap: wrap;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;

  input {
    accent-color: $primary-500;
  }
}
</style>
