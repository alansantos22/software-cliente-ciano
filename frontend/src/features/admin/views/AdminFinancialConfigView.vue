<template>
  <div class="governance-panel">

    <!-- Header -->
    <header class="governance-panel__header">
      <div>
        <h1 class="governance-panel__title">
          <font-awesome-icon icon="gear" />
          Sala de Máquinas
        </h1>
        <p class="governance-panel__subtitle">
          Parâmetros operacionais do Grupo Ciano · Alterações entram em vigor no próximo ciclo
        </p>
      </div>
      <div class="governance-panel__actions">
        <DsButton variant="outline" @click="resetDefaults">
          <font-awesome-icon icon="rotate" />
          Restaurar Padrões
        </DsButton>
        <DsButton variant="primary" :loading="isSaving" @click="openSaveModal">
          <font-awesome-icon icon="shield-halved" />
          Revisar e Salvar
        </DsButton>
      </div>
    </header>

    <DsAlert v-if="saveSuccess" type="success" dismissible class="governance-panel__alert" @dismiss="saveSuccess = false">
      Configurações salvas com sucesso! As alterações entrarão em vigor no próximo ciclo.
    </DsAlert>

    <!-- Body: Sidebar + Content -->
    <div class="governance-panel__body">

      <!-- Vertical Tabs Nav -->
      <nav class="gov-tabs" aria-label="Seções de configuração">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['gov-tab', { 'gov-tab--active': activeTab === tab.id }]"
          type="button"
          @click="activeTab = tab.id"
        >
          <span class="gov-tab__icon"><font-awesome-icon :icon="tab.icon" /></span>
          <span class="gov-tab__label">{{ tab.label }}</span>
          <span
            v-if="tabHasChanges(tab.id)"
            class="gov-tab__dot"
            title="Alterações não salvas"
          />
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="gov-content">
        <Transition name="tab-fade" mode="out-in">

          <!-- TAB 1: Parâmetros Globais -->
          <div v-if="activeTab === 'global'" key="global" class="gov-tab-pane">

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="chart-line" />
                  Configurações de Cotas
                </h2>
              </template>
              <div class="config-grid">

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Valor da Cota</label>
                    <DsTooltip content="Valor unitário de cada cota. Alterações afetam os preços exibidos para novos compradores a partir do próximo ciclo." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.quotaValue" type="number" min="0" step="10">
                    <template #prefix>R$</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Mínimo de Cotas por Compra</label>
                    <DsTooltip content="Quantidade mínima obrigatória de cotas em cada transação de compra." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.minQuotas" type="number" min="1">
                    <template #suffix>cota(s)</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Máximo de Cotas por Usuário</label>
                    <DsTooltip content="Limite acumulado máximo de cotas que um único usuário pode deter no sistema." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.maxQuotasPerUser" type="number" min="1">
                    <template #suffix>cotas</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Total de Cotas Disponíveis</label>
                    <DsTooltip content="Estoque total de cotas disponíveis para emissão e venda neste ciclo." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.totalQuotasAvailable" type="number" min="0">
                    <template #suffix>cotas</template>
                  </DsInput>
                </div>

              </div>
            </DsCard>

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="calendar-days" />
                  Ciclo Mensal
                </h2>
              </template>
              <div class="config-grid">

                <div class="config-item config-item--full">
                  <div class="config-item__label-row">
                    <label>Modo de Fechamento do Ciclo</label>
                    <DsTooltip content="Define quando o ciclo mensal encerra para contabilizar rendimentos e comissões." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
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
                        style="max-width: 120px"
                      >
                        <template #suffix>do mês</template>
                      </DsInput>
                      <span class="closing-day-input__note">
                        Se o mês tiver menos dias, será usado o último dia disponível automaticamente.
                      </span>
                    </div>
                    <div class="closing-day-preview">
                      <span class="closing-day-preview__label">Preview com o mês atual:</span>
                      <strong class="closing-day-preview__value">{{ closingDayPreview }}</strong>
                    </div>
                  </div>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Dia de Pagamento</label>
                    <DsTooltip content="Dia do mês em que os rendimentos são processados e liberados para saque pelos usuários." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.paymentDay" type="number" min="1" max="28">
                    <template #suffix>do mês</template>
                  </DsInput>
                </div>

              </div>

              <DsAlert type="info" class="gov-card__cycle-note">
                <font-awesome-icon icon="circle-info" />
                <strong>Válido apenas para o próximo ciclo:</strong> alterações nas datas de fechamento e pagamento entram em vigor somente no mês seguinte à alteração — assim como a data de vencimento de um cartão de crédito, o ciclo em andamento permanece inalterado.
              </DsAlert>
            </DsCard>

            <!-- Card: Métricas da Página de Cotas -->
            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="pen-to-square" />
                  Números em Destaque (Página de Cotas)
                </h2>
                <p class="gov-card__desc">
                  Estes são os números exibidos na apresentação principal da página de cotas. Altere sempre que o grupo crescer.
                </p>
              </template>
              <div class="config-grid">
                <div
                  v-for="(metric, idx) in presentationStore.heroMetrics"
                  :key="idx"
                  class="config-item"
                >
                  <div class="config-item__label-row">
                    <label>Legenda {{ idx + 1 }}</label>
                    <DsTooltip :content="`Texto exibido abaixo do número em destaque ${idx + 1}.`" position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput
                    :model-value="metric.value"
                    @update:model-value="(v) => presentationStore.updateMetric(idx, 'value', String(v))"
                    type="text"
                    placeholder="Ex: R$ 600K"
                  />
                  <DsInput
                    :model-value="metric.label"
                    @update:model-value="(v) => presentationStore.updateMetric(idx, 'label', String(v))"
                    type="text"
                    placeholder="Ex: faturamento anual"
                    style="margin-top: 6px"
                  />
                </div>
              </div>
            </DsCard>
          </div>
          <!-- TAB 2: Motor de Comissões -->
          <div v-else-if="activeTab === 'commissions'" key="commissions" class="gov-tab-pane">

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="dollar-sign" />
                  Comissões de Indicação e Recompra
                </h2>
              </template>
              <div class="config-grid">

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Bônus Primeira Compra</label>
                    <DsTooltip content="Percentual pago ao indicador quando o indicado realiza sua primeira compra de cotas." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.firstPurchaseBonus" type="number" min="0" max="100" step="0.5">
                    <template #suffix>%</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Bônus Recompra Nível 1</label>
                    <DsTooltip content="Percentual sobre recompras de cotas realizadas pelo 1º nível da rede (indicados diretos)." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.repurchaseBonusL1" type="number" min="0" max="100" step="0.5">
                    <template #suffix>%</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Bônus Recompra Níveis 2–6</label>
                    <DsTooltip content="Percentual sobre recompras dos níveis 2 a 6 da rede (rede profunda)." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.repurchaseBonusL2to6" type="number" min="0" max="100" step="0.5">
                    <template #suffix>%</template>
                  </DsInput>
                </div>

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Bônus de Equipe</label>
                    <DsTooltip content="Percentual calculado sobre o volume total de movimentação da equipe ativa no ciclo." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.teamBonus" type="number" min="0" max="100" step="0.5">
                    <template #suffix>%</template>
                  </DsInput>
                </div>

              </div>
            </DsCard>

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="chart-pie" />
                  Pool de Dividendos e Bônus de Liderança
                </h2>
              </template>
              <div class="config-grid">

                <div class="config-item">
                  <div class="config-item__label-row">
                    <label>Pool de Dividendos</label>
                    <DsTooltip content="Percentual do lucro líquido separado e distribuído como dividendos para todos os sócios ativos." position="right">
                      <span class="info-icon">ⓘ</span>
                    </DsTooltip>
                  </div>
                  <DsInput v-model.number="config.dividendPool" type="number" min="0" max="100" step="0.1">
                    <template #suffix>%</template>
                  </DsInput>
                </div>

              </div>
            </DsCard>

          </div>
          <!-- TAB 3: Plano de Carreira -->
          <div v-else-if="activeTab === 'career'" key="career" class="gov-tab-pane">

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="wand-magic-sparkles" />
                  Construtor de Requisitos
                </h2>
                <p class="gov-card__desc">
                  Define as condições estruturadas para atingir cada título. As regras abaixo alimentam diretamente o motor de progressão.
                </p>
              </template>
              <div class="rule-builder">
                <div
                  v-for="(level, index) in config.careerLevels"
                  :key="level.title"
                  class="rule-row"
                >
                  <div class="rule-row__badge" :style="{ borderColor: careerData[index].color }">
                    <font-awesome-icon :icon="careerData[index].icon" :style="{ color: careerData[index].color }" />
                    <strong :style="{ color: careerData[index].color }">{{ level.title }}</strong>
                  </div>
                  <div class="rule-row__builder">
                    <span class="rule-row__connector">Ter</span>
                    <input
                      v-model.number="level.req.quantity"
                      type="number"
                      min="1"
                      max="20"
                      class="rule-input"
                      aria-label="Quantidade"
                    />
                    <select v-model="level.req.type" class="rule-select">
                      <option value="pessoas_ativas">Pessoas Ativas</option>
                      <option value="indicado">Indicado(s) Direto(s)</option>
                      <option value="linhas">Indicado(s) em Linhas Diferentes</option>
                    </select>
                    <template v-if="level.req.type !== 'pessoas_ativas'">
                      <span class="rule-row__connector">no nível</span>
                      <select v-model="level.req.level" class="rule-select rule-select--level">
                        <option value="qualquer">Qualquer</option>
                        <option value="bronze">Bronze</option>
                        <option value="prata">Prata</option>
                        <option value="ouro">Ouro</option>
                      </select>
                    </template>
                  </div>
                  <div class="rule-row__preview">
                    <font-awesome-icon icon="eye" class="rule-row__preview-icon" />
                    <em>{{ requirementText(level.req) }}</em>
                  </div>
                </div>
              </div>
            </DsCard>

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="trophy" />
                  Benefícios por Título
                </h2>
                <p class="gov-card__desc">
                  Níveis de rede que cada título desbloqueia para recompra e equipe, e percentual de liderança.
                </p>
              </template>
              <div class="career-table">
                <DsTable :columns="careerColumns" :data="careerData">
                  <template #cell-title="{ row }">
                    <div class="title-cell">
                      <font-awesome-icon :icon="row.icon" :style="{ color: row.color }" />
                      <strong :style="{ color: row.color }">{{ row.title }}</strong>
                    </div>
                  </template>
                  <template #cell-repurchaseLevels="{ index }">
                    <DsInput v-model.number="config.careerLevels[index].repurchaseLevels" type="number" min="0">
                      <template #suffix>nív.</template>
                    </DsInput>
                  </template>
                  <template #cell-teamLevels="{ index }">
                    <DsInput v-model.number="config.careerLevels[index].teamLevels" type="number" min="0">
                      <template #suffix>nív.</template>
                    </DsInput>
                  </template>
                  <template #cell-leadershipPercent="{ index }">
                    <DsInput v-model.number="config.careerLevels[index].leadershipPercent" type="number" min="0" max="100" step="0.5">
                      <template #suffix>%</template>
                    </DsInput>
                  </template>
                </DsTable>
              </div>
            </DsCard>

            <DsCard class="gov-card">
              <template #header>
                <h2 class="gov-card__title">
                  <font-awesome-icon icon="bullseye" />
                  Movimentação Mínima por Título
                </h2>
                <p class="gov-card__desc">
                  Para bater um título no mês, a rede do usuário precisa movimentar um valor mínimo até o nível configurado.
                </p>
              </template>
              <div class="movement-rules">
                <div
                  v-for="(level, index) in config.careerLevels"
                  :key="level.title"
                  class="movement-rule-row"
                >
                  <div class="movement-rule-row__title">
                    <font-awesome-icon :icon="careerData[index]?.icon" :style="{ color: careerData[index]?.color }" />
                    <strong :style="{ color: careerData[index]?.color }">{{ level.title }}</strong>
                  </div>
                  <div class="movement-rule-row__fields">
                    <div class="movement-rule-field">
                      <div class="config-item__label-row">
                        <label>Movimentação mínima da rede</label>
                        <DsTooltip content="Volume mínimo em R$ que a rede precisa movimentar para validar o título neste ciclo." position="top">
                          <span class="info-icon">ⓘ</span>
                        </DsTooltip>
                      </div>
                      <DsInput v-model.number="level.minNetworkMovement" type="number" min="0" step="100" placeholder="0 = sem exigência">
                        <template #prefix>R$</template>
                      </DsInput>
                    </div>
                    <div class="movement-rule-field">
                      <div class="config-item__label-row">
                        <label>Profundidade da rede considerada</label>
                        <DsTooltip content="Quantos níveis de downline são somados para calcular a movimentação mínima exigida." position="top">
                          <span class="info-icon">ⓘ</span>
                        </DsTooltip>
                      </div>
                      <DsInput v-model.number="level.networkLevelsDepth" type="number" min="1" max="10" placeholder="Ex: 3">
                        <template #suffix>níveis</template>
                      </DsInput>
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

          </div>
        </Transition>
      </div>
    </div>

    <!-- Audit Footer -->
    <footer class="audit-footer">
      <font-awesome-icon icon="clock" class="audit-footer__icon" />
      Última modificação feita por
      <strong>{{ auditInfo.user }}</strong>
      em {{ auditInfo.date }}
    </footer>
    <!-- Modal de Confirmação -->
    <DsModal
      v-model="showConfirmModal"
      size="lg"
      :close-on-overlay="false"
    >
      <template #header>
        <h2 class="confirm-modal__title">
          <font-awesome-icon icon="shield-halved" style="color: #0097a7" />
          Revisar Alterações
        </h2>
      </template>

      <div class="confirm-modal">
        <div v-if="pendingDiff.length === 0" class="confirm-modal__no-changes">
          <font-awesome-icon icon="circle-check" class="confirm-modal__no-changes-icon" />
          <p>Nenhuma alteração detectada. As configurações estão idênticas ao último estado salvo.</p>
        </div>

        <template v-else>
          <p class="confirm-modal__warning">
            <font-awesome-icon icon="triangle-exclamation" class="confirm-modal__warn-icon" />
            Você está alterando <strong>{{ pendingDiff.length }} parâmetro(s)</strong> do sistema:
          </p>

          <div class="diff-list">
            <div v-for="change in pendingDiff" :key="change.key" class="diff-row">
              <span class="diff-row__field">{{ change.label }}</span>
              <span class="diff-row__old"><s>{{ change.oldFormatted }}</s></span>
              <font-awesome-icon icon="arrow-right" class="diff-row__arrow" />
              <span class="diff-row__new">{{ change.newFormatted }}</span>
            </div>
          </div>

          <div class="confirm-modal__pin-section">
            <label for="pin-confirm" class="confirm-modal__pin-label">
              <font-awesome-icon icon="lock" />
              Digite seu PIN de administrador para confirmar:
            </label>
            <input
              id="pin-confirm"
              v-model="pinInput"
              type="password"
              maxlength="4"
              class="pin-input"
              placeholder="····"
              autocomplete="off"
              @keyup.enter="confirmSave"
            />
            <p v-if="pinError" class="confirm-modal__pin-error">
              <font-awesome-icon icon="circle-xmark" />
              {{ pinError }}
            </p>
            <p class="confirm-modal__pin-hint">Demo: use o PIN <code>1234</code></p>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="confirm-modal__footer">
          <DsButton variant="outline" @click="showConfirmModal = false">Cancelar</DsButton>
          <DsButton
            v-if="pendingDiff.length > 0"
            variant="primary"
            :loading="isSaving"
            @click="confirmSave"
          >
            <font-awesome-icon icon="shield-halved" />
            Confirmar e Salvar
          </DsButton>
        </div>
      </template>
    </DsModal>

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
  DsModal,
  DsTooltip,
} from '@/design-system';
import { adminService } from '@/shared/services/admin.service';
import { useQuotaPresentationStore } from '@/shared/stores';

const presentationStore = useQuotaPresentationStore();

// Types
type TabId = 'global' | 'commissions' | 'career';
type FieldFormat = 'currency' | 'percent' | 'number' | 'day' | 'text';

interface RequirementRule {
  quantity: number;
  type: 'pessoas_ativas' | 'indicado' | 'linhas';
  level: 'qualquer' | 'bronze' | 'prata' | 'ouro';
}

interface DiffEntry {
  key: string;
  label: string;
  oldFormatted: string;
  newFormatted: string;
  tab: TabId;
}

// State
const isSaving         = ref(false);
const saveSuccess      = ref(false);
const activeTab        = ref<TabId>('global');
const showConfirmModal = ref(false);
const pinInput         = ref('');
const pinError         = ref('');

const auditInfo = reactive({
  user: 'Administrador Master',
  date: '02/03/2026 às 14:30',
});

const tabs = [
  { id: 'global'      as TabId, icon: 'gear',         label: 'Parâmetros Globais'  },
  { id: 'commissions' as TabId, icon: 'dollar-sign',   label: 'Motor de Comissões'  },
  { id: 'career'      as TabId, icon: 'trophy',        label: 'Plano de Carreira'   },
];

// Config
const config = reactive({
  firstPurchaseBonus:   10,
  repurchaseBonusL1:    5,
  repurchaseBonusL2to6: 2,
  teamBonus:            2,
  dividendPool:            20,
  leadershipBonusOuro:     1,
  leadershipBonusDiamante: 2,
  closingDay:     25,
  closingDayMode: 'fixed' as 'fixed' | 'last_day' | 'first_next_month',
  paymentDay:     5,
  careerLevels: [
    { title: 'Bronze',   req: { quantity: 2, type: 'pessoas_ativas' as const, level: 'qualquer' as const }, repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0, minNetworkMovement: 0,    networkLevelsDepth: 2 },
    { title: 'Prata',    req: { quantity: 1, type: 'indicado'       as const, level: 'bronze'   as const }, repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0, minNetworkMovement: 5000, networkLevelsDepth: 3 },
    { title: 'Ouro',     req: { quantity: 2, type: 'linhas'         as const, level: 'bronze'   as const }, repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1, minNetworkMovement: 0,    networkLevelsDepth: 4 },
    { title: 'Diamante', req: { quantity: 3, type: 'linhas'         as const, level: 'bronze'   as const }, repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2, minNetworkMovement: 0,    networkLevelsDepth: 5 },
  ],
  quotaValue:           2500,
  minQuotas:            1,
  maxQuotasPerUser:     1000,
  totalQuotasAvailable: 100000,
});

let savedConfig = JSON.parse(JSON.stringify(config));

// Career Table
const careerColumns = [
  { key: 'title',            label: 'Título',          width: '130px' },
  { key: 'repurchaseLevels', label: 'Níveis Recompra', width: '140px' },
  { key: 'teamLevels',       label: 'Níveis Equipe',   width: '140px' },
  { key: 'leadershipPercent',label: 'Liderança',       width: '140px' },
];

const careerData = [
  { title: 'Bronze',   icon: 'medal', color: '#CD7F32' },
  { title: 'Prata',    icon: 'medal', color: '#C0C0C0' },
  { title: 'Ouro',     icon: 'medal', color: '#FFD700' },
  { title: 'Diamante', icon: 'gem',   color: '#00BCD4' },
];

// Field registry for diff
const fieldRegistry: Record<string, { label: string; format: FieldFormat; tab: TabId }> = {
  quotaValue:              { label: 'Valor da Cota',               format: 'currency', tab: 'global' },
  minQuotas:               { label: 'Mínimo de Cotas',             format: 'number',   tab: 'global' },
  maxQuotasPerUser:        { label: 'Máximo de Cotas por Usuário', format: 'number',   tab: 'global' },
  totalQuotasAvailable:    { label: 'Total de Cotas Disponíveis',  format: 'number',   tab: 'global' },
  closingDay:              { label: 'Dia de Fechamento',           format: 'day',      tab: 'global' },
  closingDayMode:          { label: 'Modo de Fechamento',          format: 'text',     tab: 'global' },
  paymentDay:              { label: 'Dia de Pagamento',            format: 'day',      tab: 'global' },
  firstPurchaseBonus:      { label: 'Bônus Primeira Compra',       format: 'percent',  tab: 'commissions' },
  repurchaseBonusL1:       { label: 'Bônus Recompra Nível 1',      format: 'percent',  tab: 'commissions' },
  repurchaseBonusL2to6:    { label: 'Bônus Recompra Níveis 2-6',   format: 'percent',  tab: 'commissions' },
  teamBonus:               { label: 'Bônus de Equipe',             format: 'percent',  tab: 'commissions' },
  dividendPool:            { label: 'Pool de Dividendos',          format: 'percent',  tab: 'commissions' },
};

// Helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatFieldValue(value: unknown, format: FieldFormat): string {
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'percent')  return `${Number(value).toFixed(2)}%`;
  if (format === 'day')      return `Dia ${value}`;
  return String(value);
}

function requirementText(req: RequirementRule): string {
  const typeLabels: Record<RequirementRule['type'], string> = {
    pessoas_ativas: 'Pessoa(s) Ativa(s)',
    indicado:       'Indicado(s) Direto(s)',
    linhas:         'Indicado(s) em Linhas Diferentes',
  };
  const levelLabels: Record<RequirementRule['level'], string> = {
    qualquer: '', bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro',
  };
  const levelSuffix = req.type !== 'pessoas_ativas' && req.level !== 'qualquer'
    ? ` ${levelLabels[req.level]}` : '';
  return `${req.quantity} ${typeLabels[req.type]}${levelSuffix}`;
}

// Computed
const closingDayPreview = computed(() => {
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  if (config.closingDayMode === 'last_day') {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${String(lastDay).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year} às 23:59 (último dia do mês)`;
  }
  if (config.closingDayMode === 'first_next_month') {
    const nextMonth = month+2>12?1:month+2; const nextYear = month+2>12?year+1:year;
    return `01/${String(nextMonth).padStart(2,'0')}/${nextYear} às 23:59 (1º dia do próximo mês)`;
  }
  const daysInMonth = new Date(year,month+1,0).getDate();
  const effectiveDay = Math.min(config.closingDay, daysInMonth);
  return `${String(effectiveDay).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year} às 23:59`;
});

const pendingDiff = computed<DiffEntry[]>(() => {
  const diffs: DiffEntry[] = [];
  for (const key of Object.keys(fieldRegistry)) {
    const saved = (savedConfig as Record<string,unknown>)[key];
    const current = (config as unknown as Record<string,unknown>)[key];
    if (saved !== current) {
      const { label, format, tab } = fieldRegistry[key];
      diffs.push({ key, label, oldFormatted: formatFieldValue(saved,format), newFormatted: formatFieldValue(current,format), tab });
    }
  }
  config.careerLevels.forEach((level, i) => {
    const saved = savedConfig.careerLevels[i];
    if (JSON.stringify(level.req) !== JSON.stringify(saved.req)) {
      diffs.push({ key: `career_req_${i}`, label: `Requisito ${level.title}`, oldFormatted: requirementText(saved.req), newFormatted: requirementText(level.req), tab: 'career' });
    }
    const cf: Array<[string, string, FieldFormat]> = [
      ['repurchaseLevels','Níveis Recompra','number'],['teamLevels','Níveis Equipe','number'],
      ['leadershipPercent','Liderança','percent'],['minNetworkMovement','Movimentação Mínima','currency'],
      ['networkLevelsDepth','Profundidade da Rede','number'],
    ];
    cf.forEach(([field,label,fmt]) => {
      const sv = (saved as Record<string,unknown>)[field];
      const cv = (level as unknown as Record<string,unknown>)[field];
      if (sv !== cv) diffs.push({ key:`career_${i}_${field}`, label:`${level.title} – ${label}`, oldFormatted:formatFieldValue(sv,fmt), newFormatted:formatFieldValue(cv,fmt), tab:'career' });
    });
  });
  return diffs;
});

function tabHasChanges(tabId: TabId): boolean {
  return pendingDiff.value.some(d => d.tab === tabId);
}

// Actions
function openSaveModal() {
  pinInput.value = ''; pinError.value = ''; showConfirmModal.value = true;
}

async function confirmSave() {
  if (pendingDiff.value.length === 0) { showConfirmModal.value = false; return; }
  if (pinInput.value.length !== 4) { pinError.value = 'PIN deve ter exatamente 4 dígitos.'; return; }
  if (pinInput.value !== '1234') { pinError.value = 'PIN incorreto. Verifique e tente novamente.'; return; }
  pinError.value = ''; isSaving.value = true;
  try {
    await adminService.updatePriceEngine(config);
  } catch { /* will use local state anyway */ }
  isSaving.value = false;
  savedConfig = JSON.parse(JSON.stringify(config));
  const now = new Date();
  auditInfo.date = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  showConfirmModal.value = false; saveSuccess.value = true;
}

function resetDefaults() {
  if (!confirm('Tem certeza que deseja restaurar as configurações padrão?')) return;
  config.firstPurchaseBonus=10; config.repurchaseBonusL1=5; config.repurchaseBonusL2to6=2;
  config.teamBonus=2; config.dividendPool=20; config.leadershipBonusOuro=1;
  config.leadershipBonusDiamante=2; config.closingDay=25; config.closingDayMode='fixed';
  config.paymentDay=5; config.quotaValue=2500; config.minQuotas=1;
  config.maxQuotasPerUser=1000; config.totalQuotasAvailable=100000;
  config.careerLevels = [
    { title:'Bronze',  req:{quantity:2,type:'pessoas_ativas',level:'qualquer'}, repurchaseLevels:1,teamLevels:2,leadershipPercent:0,minNetworkMovement:0,   networkLevelsDepth:2 },
    { title:'Prata',   req:{quantity:1,type:'indicado',      level:'bronze'  }, repurchaseLevels:2,teamLevels:3,leadershipPercent:0,minNetworkMovement:5000,networkLevelsDepth:3 },
    { title:'Ouro',    req:{quantity:2,type:'linhas',        level:'bronze'  }, repurchaseLevels:4,teamLevels:4,leadershipPercent:1,minNetworkMovement:0,   networkLevelsDepth:4 },
    { title:'Diamante',req:{quantity:3,type:'linhas',        level:'bronze'  }, repurchaseLevels:6,teamLevels:5,leadershipPercent:2,minNetworkMovement:0,   networkLevelsDepth:5 },
  ];
}

onMounted(async () => {
  try {
    const res = await adminService.getFinancialConfig();
    if (res.data) Object.assign(config, res.data);
  } catch { /* use defaults */ }
});
</script>
<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// Root
.governance-panel {
  padding: $spacing-6;
  max-width: 1300px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-5;

  @media (max-width: 768px) { padding: $spacing-4; gap: $spacing-4; }

  &__header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: $spacing-4;
  }

  &__title {
    font-size: 1.75rem; font-weight: 700; color: var(--text-primary);
    margin: 0 0 $spacing-1; display: flex; align-items: center; gap: $spacing-2;
    svg { color: var(--primary-600); }
  }

  &__subtitle { color: var(--text-secondary); margin: 0; font-size: 0.9rem; }
  &__actions { display: flex; gap: $spacing-3; flex-wrap: wrap; }
  &__alert { margin: 0; }

  &__body {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: $spacing-5;
    align-items: start;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
  }
}

// Vertical Tab Navigation
.gov-tabs {
  display: flex; flex-direction: column; gap: $spacing-1;
  position: sticky; top: $spacing-6;
  @media (max-width: 900px) {
    flex-direction: row; position: static;
    overflow-x: auto; padding-bottom: $spacing-1;
  }
}

.gov-tab {
  display: flex; align-items: center; gap: $spacing-2;
  padding: $spacing-3 $spacing-4; border: none; border-radius: 10px;
  background: transparent; cursor: pointer; text-align: left;
  font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);
  transition: background 0.15s, color 0.15s; position: relative; white-space: nowrap;

  &:hover:not(.gov-tab--active) { background: var(--bg-tertiary); color: var(--text-primary); }
  &--active { background: rgba(var(--primary-500-rgb), 0.1); color: var(--primary-700); font-weight: 600; }

  &__icon { font-size: 1rem; flex-shrink: 0; }
  &__label { flex: 1; }
  &__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
}

// Tab Content
.gov-content { min-width: 0; }
.gov-tab-pane { display: flex; flex-direction: column; gap: $spacing-5; }

.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.tab-fade-enter-from { opacity: 0; transform: translateX(8px); }
.tab-fade-leave-to   { opacity: 0; transform: translateX(-8px); }

// Card titles
.gov-card {
  &__title {
    font-size: 1.05rem; font-weight: 600; margin: 0 0 $spacing-1;
    display: flex; align-items: center; gap: $spacing-2; color: var(--text-primary);
    svg { color: var(--primary-600); }
  }
  &__desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0; font-weight: 400; }
}

// Config Grid & Items
.config-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: $spacing-5;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
}

.config-item {
  display: flex; flex-direction: column; gap: $spacing-2;
  &--full { grid-column: 1 / -1; }

  &__label-row {
    display: flex; align-items: center; gap: $spacing-1;
    label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); line-height: 1.4; }
  }
}

.info-icon {
  font-size: 0.8rem; color: var(--text-tertiary); cursor: default;
  line-height: 1; transition: color 0.15s;
  &:hover { color: var(--primary-500); }
}

// Closing Day
.closing-day-control { display: flex; flex-direction: column; gap: $spacing-3; }
.closing-day-modes   { display: flex; flex-wrap: wrap; gap: $spacing-2; }

.radio-item {
  display: flex; align-items: center; gap: $spacing-2; cursor: pointer;
  padding: $spacing-2 $spacing-3; border-radius: 8px; border: 1px solid var(--border-light);
  font-size: 0.875rem; transition: all 0.15s; user-select: none;
  input[type="radio"] { width: 15px; height: 15px; accent-color: var(--primary-600); flex-shrink: 0; }
  &--active { background: rgba(var(--primary-500-rgb), 0.07); border-color: var(--primary-400); color: var(--primary-700); }
}

.closing-day-input {
  display: flex; align-items: flex-start; gap: $spacing-3; flex-wrap: wrap;
  &__note { font-size: 0.75rem; color: var(--text-tertiary); max-width: 360px; padding-top: 10px; line-height: 1.5; }
}

.closing-day-preview {
  display: inline-flex; align-items: center; gap: $spacing-2;
  background: var(--bg-tertiary); border: 1px solid var(--border-light);
  border-radius: 8px; padding: $spacing-2 $spacing-3; font-size: 0.875rem; width: fit-content;
  &__label { color: var(--text-secondary); }
  &__value { color: var(--primary-700); }
}

// Career
.career-table { overflow-x: auto; }
.title-cell { display: flex; align-items: center; gap: $spacing-2; }

// Rule Builder
.rule-builder { display: flex; flex-direction: column; gap: $spacing-4; }

.rule-row {
  display: grid; grid-template-columns: 120px 1fr;
  grid-template-rows: auto auto; gap: $spacing-2 $spacing-4;
  padding: $spacing-4; border: 1px solid var(--border-light);
  border-radius: 10px; background: var(--bg-secondary); align-items: center;
  @media (max-width: 700px) { grid-template-columns: 1fr; }

  &__badge {
    display: flex; align-items: center; gap: $spacing-2;
    padding: $spacing-2 $spacing-3; border-radius: 8px; border: 1.5px solid;
    background: rgba(white, 0.5); font-size: 0.9rem; width: fit-content;
  }

  &__builder { display: flex; align-items: center; flex-wrap: wrap; gap: $spacing-2; }

  &__connector {
    font-size: 0.8rem; font-weight: 600; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
  }

  &__preview {
    grid-column: 1 / -1; display: flex; align-items: center; gap: $spacing-2;
    font-size: 0.82rem; color: var(--text-secondary);
    background: rgba(var(--primary-500-rgb), 0.06); border: 1px dashed rgba(var(--primary-500-rgb), 0.3);
    border-radius: 6px; padding: $spacing-2 $spacing-3; width: fit-content;
    em { font-style: normal; color: var(--primary-700); }
  }

  &__preview-icon { color: var(--primary-400); font-size: 0.75rem; }
}

.rule-input {
  width: 64px; height: 36px; padding: 0 $spacing-2;
  border: 1px solid var(--border-default); border-radius: 6px;
  font-size: 0.9rem; font-family: inherit; color: var(--text-primary);
  text-align: center; background: white; transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 2px rgba(var(--primary-500-rgb), 0.2); }
}

.rule-select {
  height: 36px; padding: 0 $spacing-3; border: 1px solid var(--border-default);
  border-radius: 6px; font-size: 0.875rem; font-family: inherit; color: var(--text-primary);
  background: white; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 2px rgba(var(--primary-500-rgb), 0.2); }
  &--level { min-width: 130px; }
}

// Movement Rules
.movement-rules { display: flex; flex-direction: column; gap: $spacing-4; }

.movement-rule-row {
  padding: $spacing-4; border: 1px solid var(--border-light);
  border-radius: 10px; background: var(--bg-secondary);

  &__title {
    display: flex; align-items: center; gap: $spacing-2;
    margin-bottom: $spacing-3; font-size: 0.95rem;
  }

  &__fields {
    display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-4;
    margin-bottom: $spacing-3;
    @media (max-width: 600px) { grid-template-columns: 1fr; }
  }

  &__summary {
    font-size: 0.875rem; color: var(--text-secondary);
    background: rgba(var(--primary-500-rgb), 0.07); border-left: 3px solid var(--primary-400);
    padding: $spacing-2 $spacing-3; border-radius: 0 6px 6px 0;
    strong { color: var(--primary-700); }
    &--none { background: var(--bg-tertiary); border-left-color: var(--border-default); color: var(--text-tertiary); }
  }
}

.movement-rule-field {
  display: flex; flex-direction: column; gap: $spacing-2;
  label { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); }
}

// Audit Footer
.audit-footer {
  display: flex; align-items: center; gap: $spacing-2;
  font-size: 0.8rem; color: var(--text-tertiary);
  border-top: 1px solid var(--border-light); padding-top: $spacing-4;
  &__icon { color: var(--text-tertiary); }
  strong  { color: var(--text-secondary); }
}

// Confirm Modal
.confirm-modal {
  display: flex; flex-direction: column; gap: $spacing-4;

  &__title {
    font-size: 1.1rem; font-weight: 600; display: flex;
    align-items: center; gap: $spacing-2; margin: 0;
  }

  &__no-changes {
    display: flex; flex-direction: column; align-items: center;
    gap: $spacing-3; padding: $spacing-6 0; text-align: center; color: var(--text-secondary);
    &-icon { font-size: 2.5rem; color: var(--color-success); }
    p { margin: 0; }
  }

  &__warning {
    display: flex; align-items: center; gap: $spacing-2;
    font-size: 0.9rem; color: var(--text-secondary); margin: 0;
  }
  &__warn-icon { color: var(--color-warning); flex-shrink: 0; }

  &__pin-section {
    display: flex; flex-direction: column; gap: $spacing-2;
    padding: $spacing-4; background: rgba(var(--primary-500-rgb), 0.05);
    border: 1px solid rgba(var(--primary-500-rgb), 0.2); border-radius: 10px;
  }

  &__pin-label {
    font-size: 0.875rem; font-weight: 500; color: var(--text-primary);
    display: flex; align-items: center; gap: $spacing-2;
  }

  &__pin-error {
    display: flex; align-items: center; gap: $spacing-2;
    font-size: 0.82rem; color: var(--color-error); margin: 0;
  }

  &__pin-hint {
    font-size: 0.78rem; color: var(--text-tertiary); margin: 0;
    code { background: var(--bg-tertiary); padding: 1px 5px; border-radius: 4px; font-family: monospace; color: var(--primary-700); }
  }

  &__footer { display: flex; justify-content: flex-end; gap: $spacing-3; }
}

// Diff List
.diff-list {
  display: flex; flex-direction: column; gap: $spacing-2;
  max-height: 280px; overflow-y: auto; padding: $spacing-3;
  background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 8px;
}

.diff-row {
  display: flex; align-items: center; gap: $spacing-3;
  font-size: 0.875rem; flex-wrap: wrap;
  &__field { font-weight: 500; color: var(--text-primary); min-width: 180px; flex-shrink: 0; }
  &__old   { color: var(--color-error); font-size: 0.85rem; s { text-decoration-color: rgba(var(--error-rgb), 0.6); } }
  &__arrow { color: var(--text-tertiary); font-size: 0.7rem; flex-shrink: 0; }
  &__new   { color: var(--color-success-dark); font-weight: 600; font-size: 0.85rem; }
}

// PIN Input
.pin-input {
  width: 120px; height: 44px; padding: 0 $spacing-3;
  border: 1.5px solid var(--border-default); border-radius: 8px;
  font-size: 1.4rem; font-family: monospace; letter-spacing: 0.4em;
  text-align: center; color: var(--text-primary); background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.18); }
}
</style>