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

        <!-- Modo de testes — destrava meses não fechados -->
        <div class="trigger-card__test-mode">
          <label class="test-mode-toggle">
            <input type="checkbox" v-model="testMode" />
            <span class="test-mode-toggle__slider"></span>
            <span class="test-mode-toggle__label">
              <font-awesome-icon icon="flask" />
              Modo de testes — permite gerar lote de meses ainda não fechados
            </span>
          </label>
        </div>

        <!-- Alerta: mês ainda não fechou (mês corrente ou futuro) -->
        <DsAlert v-if="isMonthInFuture && !isMonthAlreadyProcessed" :type="testMode ? 'info' : 'warning'" class="trigger-card__lock-alert">
          <font-awesome-icon icon="triangle-exclamation" />
          <strong>{{ formatMonthLabel(profitMonth) }}</strong> ainda não fechou — o lucro do
          mês ainda está em movimento.
          <template v-if="!testMode">Selecione um mês anterior para gerar o lote.</template>
          <template v-else>Modo de testes ativo: o lote será gerado mesmo assim.</template>
        </DsAlert>

        <!-- Alerta: mês já processado -->
        <DsAlert v-if="isMonthAlreadyProcessed" type="warning" class="trigger-card__lock-alert">
          <div class="trigger-card__lock-alert-row">
            <div>
              <font-awesome-icon icon="triangle-exclamation" />
              A distribuição de <strong>{{ formatMonthLabel(profitMonth) }}</strong> já foi
              processada. Apenas operações de pagamento na lista abaixo estão liberadas.
            </div>
            <DsButton variant="ghost" size="sm" @click="cancelBatch">
              <font-awesome-icon icon="ban" /> Cancelar lote (testes)
            </DsButton>
          </div>
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
                :disabled="isMonthAlreadyProcessed || isMonthNotClosed"
              />
            </div>


            <div class="profit-entry-form__field profit-entry-form__field--payment-month">
              <label>Datas de Pagamento</label>
              <div class="payment-month-display payment-month-display--split">
                <div class="payment-month-display__row">
                  <span class="payment-month-display__type">Bônus de rede</span>
                  <font-awesome-icon icon="arrow-right" class="payment-month-display__arrow" />
                  <span class="payment-month-display__pay">{{ formatMonthLabel(bonusPaymentMonth) }}</span>
                </div>
                <div class="payment-month-display__row">
                  <span class="payment-month-display__type">Dividendos</span>
                  <font-awesome-icon icon="arrow-right" class="payment-month-display__arrow" />
                  <span class="payment-month-display__pay">{{ formatMonthLabel(dividendPaymentMonth) }}</span>
                </div>
              </div>
              <span class="payment-month-display__note">Bônus pagam mês seguinte · Dividendos pagam 2 meses depois</span>
            </div>
          </div>

          <div v-if="!isMonthAlreadyProcessed && !isMonthNotClosed" class="profit-entry-form__preview">
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
            v-if="!isMonthAlreadyProcessed && !isMonthNotClosed"
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
              <h2><font-awesome-icon icon="dollar-sign" /> Etapa 2 — Prévia da Distribuição &mdash; {{ formatMonthLabel(profitMonth) }} <span class="distribution-payment-arrow">→ Bônus: {{ formatMonthLabel(bonusPaymentMonth) }} · Dividendos: {{ formatMonthLabel(dividendPaymentMonth) }}</span></h2>
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
              v-if="paymentTab === 'closing'"
              variant="primary"
              :disabled="selectedPayouts.length === 0"
              @click="processSelected"
            >
              Processar Selecionados ({{ selectedPayouts.length }})
            </DsButton>
            <DsButton
              v-if="paymentTab === 'closing'"
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

        <!-- Abas: A pagar no mês | Fechamento do mês -->
        <section class="admin-payouts-view__tabs">
          <div class="payout-tabs">
            <button
              type="button"
              class="payout-tab"
              :class="{ 'payout-tab--active': paymentTab === 'due' }"
              @click="paymentTab = 'due'"
            >
              <font-awesome-icon icon="money-bill-wave" /> A pagar em {{ formatMonthLabel(dueMonth) }}
            </button>
            <button
              type="button"
              class="payout-tab"
              :class="{ 'payout-tab--active': paymentTab === 'closing' }"
              @click="paymentTab = 'closing'"
            >
              <font-awesome-icon icon="file-lines" /> Fechamento do mês (histórico)
            </button>
          </div>
          <p class="payout-tabs__hint">
            <template v-if="paymentTab === 'due'">
              Mostra só o que vence no mês selecionado — bônus e dividendos vão cada um para o seu mês de pagamento. O seletor de mês acima filtra por <strong>vencimento</strong>.
            </template>
            <template v-else>
              Visão completa do lote por <strong>competência</strong> (bônus + dividendos somados), como um histórico do fechamento.
            </template>
          </p>
        </section>

        <!-- ══ ABA: A pagar no mês (parcelas por vencimento) ══ -->
        <section v-if="paymentTab === 'due'" class="admin-payouts-view__table">
          <DsCard>
            <DsTable
              :columns="dueColumns"
              :data="installmentRows"
              :loading="isLoading"
              row-key="rowKey"
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
              <template #cell-kind="{ row }">
                <DsBadge :variant="row.kind === 'bonus' ? 'info' : 'primary'">
                  <font-awesome-icon :icon="row.kind === 'bonus' ? 'sitemap' : 'coins'" />
                  {{ row.kind === 'bonus' ? 'Bônus' : 'Dividendos' }}
                </DsBadge>
              </template>
              <template #cell-amount="{ row }">
                <strong class="amount-cell">{{ formatCurrency(Number(row.amount)) }}</strong>
              </template>
              <template #cell-referenceMonth="{ row }">
                <span class="competencia-cell">{{ formatMonthLabel(String(row.referenceMonth ?? '')) }}</span>
              </template>
              <template #cell-status="{ row }">
                <DsBadge v-if="row.paid" variant="success">Pago</DsBadge>
                <DsBadge v-else-if="canPay(row, row.kind)" variant="info">A pagar</DsBadge>
                <DsBadge v-else variant="warning">Aguardando mês</DsBadge>
              </template>
              <template #cell-actions="{ row }">
                <div class="actions-cell">
                  <DsButton
                    v-if="row.paid"
                    variant="ghost"
                    size="sm"
                    @click="downloadReceiptRow(row)"
                  >
                    <font-awesome-icon icon="file-lines" /> Comprovante
                  </DsButton>
                  <DsButton
                    v-else-if="canPay(row, row.kind)"
                    :variant="row.kind === 'bonus' ? 'primary' : 'outline'"
                    size="sm"
                    @click="payInstallmentRow(row)"
                  >
                    <font-awesome-icon :icon="row.kind === 'bonus' ? 'users' : 'coins'" />
                    {{ row.kind === 'bonus' ? 'Pagar Bônus' : 'Pagar Dividendos' }}
                  </DsButton>
                  <DsButton
                    v-else
                    variant="ghost"
                    size="sm"
                    :disabled="true"
                    :title="`Disponível a partir de ${formatMonthLabel(String(row.dueMonth ?? ''))}`"
                  >
                    <font-awesome-icon icon="lock" /> Libera {{ formatMonthLabel(String(row.dueMonth ?? '')) }}
                  </DsButton>
                </div>
              </template>
            </DsTable>

            <DsEmptyState
              v-if="installmentRows.length === 0 && !isLoading"
              icon="money-bill-wave"
              :title="`Nada a pagar em ${formatMonthLabel(dueMonth)}`"
              description="Nenhuma parcela de bônus ou dividendos vence neste mês."
            />
          </DsCard>
        </section>

        <!-- ══ ABA: Fechamento do mês (lote por competência) ══ -->
        <section v-else class="admin-payouts-view__table">
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
                <div class="amount-breakdown-cell amount-breakdown-cell--right">
                  <strong class="amount-cell">{{ formatCurrency(Number(row.amount)) }}</strong>
                  <div class="amount-breakdown-cell__detail">
                    <span :class="{ 'amount-breakdown-cell__paid': row.bonusPaidAt }">
                      <font-awesome-icon icon="sitemap" />
                      Rede: {{ formatCurrency(Number(row.networkAmount ?? 0)) }}
                    </span>
                    <span :class="{ 'amount-breakdown-cell__paid': row.dividendPaidAt }">
                      <font-awesome-icon icon="coins" />
                      Div: {{ formatCurrency(Number(row.quotaAmount ?? 0)) }}
                    </span>
                  </div>
                </div>
              </template>
              <template #cell-referenceMonth="{ row }">
                <span class="competencia-cell">{{ formatMonthLabel(String(row.referenceMonth ?? '')) }}</span>
              </template>
              <template #cell-paymentMonth="{ row }">
                <div class="payment-month-cell payment-month-cell--split">
                  <span><small>Bônus:</small> {{ formatMonthLabel(String(row.bonusPaymentMonth ?? row.paymentMonth ?? '')) }}</span>
                  <span><small>Dividendos:</small> {{ formatMonthLabel(String(row.dividendPaymentMonth ?? row.paymentMonth ?? '')) }}</span>
                </div>
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
                  <template v-if="row.status === 'processing' || (row.status === 'pending' && row.processedAt)">
                    <!-- Bônus: libera só a partir do mês de vencimento (ref+1) -->
                    <template v-if="Number(row.networkAmount ?? 0) > 0 && !row.bonusPaidAt">
                      <DsButton
                        v-if="canPay(row, 'bonus')"
                        variant="primary"
                        size="sm"
                        @click="payBonusRow(row)"
                      >
                        <font-awesome-icon icon="users" /> Pagar Bônus
                      </DsButton>
                      <DsButton
                        v-else
                        variant="ghost"
                        size="sm"
                        :disabled="true"
                        :title="`Disponível a partir de ${formatMonthLabel(dueMonthFor(row, 'bonus'))}`"
                      >
                        <font-awesome-icon icon="lock" /> Bônus libera {{ formatMonthLabel(dueMonthFor(row, 'bonus')) }}
                      </DsButton>
                    </template>
                    <!-- Dividendos: libera só a partir do mês de vencimento (ref+2) -->
                    <template v-if="Number(row.quotaAmount ?? 0) > 0 && !row.dividendPaidAt">
                      <DsButton
                        v-if="canPay(row, 'dividend')"
                        variant="outline"
                        size="sm"
                        @click="payDividendRow(row)"
                      >
                        <font-awesome-icon icon="coins" /> Pagar Dividendos
                      </DsButton>
                      <DsButton
                        v-else
                        variant="ghost"
                        size="sm"
                        :disabled="true"
                        :title="`Disponível a partir de ${formatMonthLabel(dueMonthFor(row, 'dividend'))}`"
                      >
                        <font-awesome-icon icon="lock" /> Dividendos libera {{ formatMonthLabel(dueMonthFor(row, 'dividend')) }}
                      </DsButton>
                    </template>
                  </template>
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
        <div v-if="selectedPayout.bonusPaymentMonth || selectedPayout.paymentMonth" class="detail-row">
          <span>Bônus em:</span>
          <strong>{{ formatMonthLabel(selectedPayout.bonusPaymentMonth || selectedPayout.paymentMonth) }}</strong>
        </div>
        <div v-if="selectedPayout.dividendPaymentMonth || selectedPayout.paymentMonth" class="detail-row">
          <span>Dividendos em:</span>
          <strong>{{ formatMonthLabel(selectedPayout.dividendPaymentMonth || selectedPayout.paymentMonth) }}</strong>
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

    <!-- ══════════════════════════════════════════════════════════
         MODAL DE CONFIRMAÇÃO DE PAGAMENTO (bônus / dividendos)
    ══════════════════════════════════════════════════════════ -->
    <DsModal
      v-model="showPayConfirm"
      :title="payConfirmKind === 'bonus' ? 'Confirmar pagamento de Bônus' : 'Confirmar pagamento de Dividendos'"
    >
      <div v-if="payConfirmRow" class="payout-details">
        <DsAlert v-if="payConfirmEarly" type="warning" style="margin-bottom: 1rem;">
          <strong>Pagamento adiantado.</strong>
          Esta parcela só vence em
          <strong>{{ formatMonthLabel(dueMonthFor(payConfirmRow, payConfirmKind)) }}</strong>
          e hoje é <strong>{{ formatMonthLabel(currentMonthYM) }}</strong>.
          Você está pagando antes do previsto (Modo de testes).
        </DsAlert>

        <div class="detail-row">
          <span>Cotista:</span>
          <strong>{{ payConfirmRow.userName }}</strong>
        </div>
        <div class="detail-row">
          <span>Parcela:</span>
          <strong>{{ payConfirmKind === 'bonus' ? 'Bônus de rede' : 'Dividendos (cotas)' }}</strong>
        </div>
        <div class="detail-row">
          <span>Competência:</span>
          <strong>{{ formatMonthLabel(payConfirmRow.referenceMonth) }}</strong>
        </div>
        <div class="detail-row">
          <span>Previsto para:</span>
          <strong>{{ formatMonthLabel(dueMonthFor(payConfirmRow, payConfirmKind)) }}</strong>
        </div>
        <div class="detail-row detail-row--highlight">
          <span>Valor a pagar:</span>
          <strong class="amount-cell">
            {{ formatCurrency(Number(payConfirmKind === 'bonus' ? payConfirmRow.networkAmount ?? 0 : payConfirmRow.quotaAmount ?? 0)) }}
          </strong>
        </div>
        <div class="detail-row">
          <span>Chave PIX:</span>
          <strong>{{ payConfirmRow.pixKey || '—' }}</strong>
        </div>
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="showPayConfirm = false">Cancelar</DsButton>
        <DsButton
          :variant="payConfirmEarly ? 'danger' : 'primary'"
          @click="confirmPay()"
        >
          {{ payConfirmEarly ? 'Pagar mesmo assim' : 'Confirmar pagamento' }}
        </DsButton>
      </template>
    </DsModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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
  bonusPaymentMonth: string | null;
  dividendPaymentMonth: string | null;
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  bonusPaidAt: string | null;
  dividendPaidAt: string | null;
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

/**
 * Regra do cliente (2026-05): cada lote rende DOIS pagamentos.
 *   • bonusPaymentMonth    → bônus de rede (ref+1)
 *   • dividendPaymentMonth → dividendos (ref+2)
 */
const bonusPaymentMonth    = computed(() => addMonths(profitMonth.value, 1));
const dividendPaymentMonth = computed(() => addMonths(profitMonth.value, 2));

/** Mês corrente em YYYY-MM — usado para bloquear processamento de mês não fechado. */
const currentMonthYM = computed(() => new Date().toISOString().slice(0, 7));

/**
 * Modo de testes: quando ligado, o seletor de mês aceita o mês corrente e
 * futuros, e o backend recebe `allowFutureMonth: true` para gerar o lote
 * mesmo assim. Persistido em localStorage para não atrapalhar o uso normal
 * em sessões seguintes — o admin liga só quando vai testar.
 */
const testMode = ref<boolean>(localStorage.getItem('payouts:testMode') === '1');
watch(testMode, (on: boolean) => {
  localStorage.setItem('payouts:testMode', on ? '1' : '0');
});

/** Cheque puro: o mês selecionado é corrente ou futuro (ignora `testMode`). */
const isMonthInFuture = computed(() => profitMonth.value >= currentMonthYM.value);

/** Bloqueio efetivo: o mês está fechado OU o modo de testes destrava. */
const isMonthNotClosed = computed(() => isMonthInFuture.value && !testMode.value);

// ─── Etapa 2: Distribuição ────────────────────────────────────
const showDistribution = ref(false);
const generationSuccess = ref(false);

// ─── Etapa 3: Execução ────────────────────────────────────────
/** Torna verdadeiro assim que o primeiro lote é aprovado na sessão */
const batchApproved = ref(false);

const filters = ref({
  search: '',
  status: '',
  // Por padrão filtra pelo mês atual para evitar mostrar todo o histórico
  // ao abrir a tela.
  month: new Date().toISOString().slice(0, 7),
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
  { key: 'amount',         label: 'Valor',        align: 'right' as const, width: '200px' },
  { key: 'referenceMonth', label: 'Competência',  width: '120px' },
  { key: 'paymentMonth',   label: 'Pagamento em', width: '180px' },
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
    'Competência':         formatMonthLabel(p.referenceMonth),
    'Bônus pagam em':      formatMonthLabel(p.bonusPaymentMonth ?? p.paymentMonth),
    'Dividendos pagam em': formatMonthLabel(p.dividendPaymentMonth ?? p.paymentMonth),
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

async function payBonus(payout: PayoutRequest, allowEarly = false) {
  try {
    await adminService.payBonus(payout.id, allowEarly);
    await loadPayouts();
  } catch { /* fail silently */ }
}

async function payDividend(payout: PayoutRequest, allowEarly = false) {
  try {
    await adminService.payDividend(payout.id, allowEarly);
    await loadPayouts();
  } catch { /* fail silently */ }
}

async function markAsPaid(payout: PayoutRequest) {
  try {
    await adminService.confirmPayout(payout.id, {
      action: 'completed',
      transactionId: `MANUAL-${Date.now()}`,
      allowEarly: testMode.value, // modo de testes destrava marcação antecipada
    });
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

/**
 * Cancela o lote do mês selecionado: apaga payout_requests + bônus
 * derivados e limpa processed_at dos bônus persistentes. Usado primariamente
 * em testes para "voltar a foto" e poder regenerar o lote.
 */
async function cancelBatch() {
  const monthLabel = formatMonthLabel(profitMonth.value);
  const confirmed = window.confirm(
    `Cancelar o lote de ${monthLabel}?\n\n` +
      `Isso apaga os pagamentos gerados e os bônus derivados (dividendo, equipe, liderança).\n` +
      `Os bônus de primeira compra e recompra do mês ficam disponíveis para um novo lote.\n\n` +
      `⚠ ATENÇÃO: se algum pagamento já foi enviado por PIX, o estorno NÃO é feito automaticamente.`,
  );
  if (!confirmed) return;
  try {
    const res = await adminService.voidBatch(profitMonth.value);
    if (res.data?.error) {
      window.alert(`Não foi possível cancelar o lote: ${res.data.error}`);
      return;
    }
    showDistribution.value = false;
    distributionPreview.value = [];
    netProfit.value = 0;
    generationSuccess.value = false;
    batchApproved.value = false;
    await loadPayouts();
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || 'erro desconhecido';
    window.alert(`Falha ao cancelar o lote: ${msg}`);
  }
}

async function generatePayoutsFromProfit() {
  try {
    const res = await adminService.generateBatch({
      profitMonth: profitMonth.value,
      netProfit: netProfit.value,
      allowFutureMonth: testMode.value,
    });
    if (res.data) {
      // generateBatch returns batch metadata; reload full payout list
      await loadPayouts();
    }
    // Filtra automaticamente para o mês gerado e abre a aba de Fechamento —
    // a aba "A pagar" estaria vazia (nada vence no próprio mês de competência).
    filters.value.month = profitMonth.value;
    paymentTab.value = 'closing';
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
  // Mensal: usamos o mês-base do filtro (default = mês atual). Para o
  // "pago no mês" consideramos a data de execução (completedAt) caso
  // exista; senão caimos no paymentMonth informado pelo lote.
  const baseMonth = filters.value.month || new Date().toISOString().slice(0, 7);
  const matchesBaseMonth = (p: PayoutRequest) => {
    if (p.completedAt) {
      const d = new Date(p.completedAt);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === baseMonth;
    }
    return p.paymentMonth === baseMonth;
  };

  stats.value = {
    pending:       payouts.value.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
    processing:    payouts.value.filter(p => p.status === 'processing').reduce((s, p) => s + Number(p.amount), 0),
    paidThisMonth: payouts.value.filter(p => p.status === 'completed' && matchesBaseMonth(p)).reduce((s, p) => s + Number(p.amount), 0),
    totalPaid:     payouts.value.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
  };
}

// ─── Trava de pagamento por mês de vencimento ────────────────────
// Cada parcela só pode ser paga a partir do seu mês de vencimento (bônus
// ref+1, dividendos ref+2), evitando o clique antecipado acidental. O backend
// faz a mesma validação (fonte da verdade); aqui é só a camada visual.

type Installment = 'bonus' | 'dividend';

/** Mês de vencimento (YYYY-MM) da parcela, com fallback no paymentMonth legado. */
function dueMonthFor(row: Record<string, unknown>, kind: Installment): string {
  const split = kind === 'bonus' ? row.bonusPaymentMonth : row.dividendPaymentMonth;
  return String(split ?? row.paymentMonth ?? '');
}

/** A parcela já venceu (chegou seu mês de pagamento)? Sem mês definido, não trava. */
function isInstallmentDue(row: Record<string, unknown>, kind: Installment): boolean {
  const due = dueMonthFor(row, kind);
  return !due || currentMonthYM.value >= due;
}

/** Pode pagar agora? Vencida OU modo de testes (que destrava pagamento antecipado). */
function canPay(row: Record<string, unknown>, kind: Installment): boolean {
  return testMode.value || isInstallmentDue(row, kind);
}

// ─── Abas da execução: "A pagar no mês" × "Fechamento do mês" ─────
// "due"     → parcelas (bônus/dividendos) que VENCEM no mês selecionado, item
//             a item, para o admin pagar exatamente o que deve naquele mês.
// "closing" → o lote completo por competência (bônus + dividendos somados),
//             como histórico do fechamento.
const paymentTab = ref<'due' | 'closing'>('due');

/** Mês de vencimento em foco na aba "A pagar". Default = mês atual. */
const dueMonth = computed(() => filters.value.month || currentMonthYM.value);

const dueColumns = [
  { key: 'user',           label: 'Cotista' },
  { key: 'kind',           label: 'Tipo',        width: '150px' },
  { key: 'amount',         label: 'A pagar',     align: 'right' as const, width: '160px' },
  { key: 'referenceMonth', label: 'Competência', width: '120px' },
  { key: 'status',         label: 'Status',      width: '140px' },
  { key: 'actions',        label: 'Ações',       width: '200px' },
];

interface InstallmentRow extends Record<string, unknown> {
  rowKey: string;
  id: string;
  userName: string;
  pixKey: string;
  kind: Installment;
  amount: number;
  referenceMonth: string;
  dueMonth: string;
  paid: boolean;
  // Campos originais necessários para canPay()/openPayConfirm().
  bonusPaymentMonth: string | null;
  dividendPaymentMonth: string | null;
  paymentMonth: string;
  networkAmount: number;
  quotaAmount: number;
  bonusPaidAt: string | null;
  dividendPaidAt: string | null;
  status: string;
}

/**
 * Achata os PayoutRequest em parcelas (bônus e/ou dividendos) que vencem no
 * mês em foco (`dueMonth`). Cada cotista pode render até duas linhas — uma por
 * parcela — cada qual com seu valor, mês de vencimento e botão de pagamento.
 */
const installmentRows = computed<InstallmentRow[]>(() => {
  const month = dueMonth.value;
  const q = filters.value.search.trim().toLowerCase();
  const out: InstallmentRow[] = [];

  for (const p of payouts.value) {
    if (q && !(p.userName.toLowerCase().includes(q) || (p.pixKey ?? '').toLowerCase().includes(q))) {
      continue;
    }

    const bonusDue = String(p.bonusPaymentMonth ?? p.paymentMonth ?? '');
    const divDue   = String(p.dividendPaymentMonth ?? p.paymentMonth ?? '');
    const base = {
      id: p.id,
      userName: p.userName,
      pixKey: p.pixKey,
      referenceMonth: p.referenceMonth,
      bonusPaymentMonth: p.bonusPaymentMonth,
      dividendPaymentMonth: p.dividendPaymentMonth,
      paymentMonth: p.paymentMonth,
      networkAmount: Number(p.networkAmount ?? 0),
      quotaAmount: Number(p.quotaAmount ?? 0),
      bonusPaidAt: p.bonusPaidAt,
      dividendPaidAt: p.dividendPaidAt,
      status: p.status,
    };

    if (Number(p.networkAmount ?? 0) > 0 && bonusDue === month) {
      out.push({ ...base, rowKey: `${p.id}:bonus`, kind: 'bonus', amount: Number(p.networkAmount ?? 0), dueMonth: bonusDue, paid: !!p.bonusPaidAt });
    }
    if (Number(p.quotaAmount ?? 0) > 0 && divDue === month) {
      out.push({ ...base, rowKey: `${p.id}:dividend`, kind: 'dividend', amount: Number(p.quotaAmount ?? 0), dueMonth: divDue, paid: !!p.dividendPaidAt });
    }
  }

  return out;
});

// ─── Modal de confirmação de pagamento ───────────────────────────
const showPayConfirm  = ref(false);
const payConfirmKind  = ref<Installment>('bonus');
const payConfirmRow   = ref<PayoutRequest | null>(null);
const payConfirmEarly = ref(false);

function openPayConfirm(row: Record<string, unknown>, kind: Installment) {
  payConfirmRow.value   = row as unknown as PayoutRequest;
  payConfirmKind.value  = kind;
  payConfirmEarly.value = !isInstallmentDue(row, kind); // só ocorre em modo de testes
  showPayConfirm.value  = true;
}

async function confirmPay() {
  const row = payConfirmRow.value;
  if (!row) return;
  // allowEarly só é necessário quando se está pagando adiantado (modo de testes).
  if (payConfirmKind.value === 'bonus') await payBonus(row, payConfirmEarly.value);
  else await payDividend(row, payConfirmEarly.value);
  showPayConfirm.value = false;
  payConfirmRow.value = null;
}

// ─── Wrappers para slots do DsTable (row tipado como Record) ──────
function processPayoutRow(row: Record<string, unknown>)  { processPayout(row as unknown as PayoutRequest); }
function payBonusRow(row: Record<string, unknown>)       { openPayConfirm(row, 'bonus'); }
function payDividendRow(row: Record<string, unknown>)    { openPayConfirm(row, 'dividend'); }
/** Aba "A pagar": a linha já sabe se é bônus ou dividendo (campo `kind`). */
function payInstallmentRow(row: Record<string, unknown>) { openPayConfirm(row, row.kind as Installment); }
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


// ─── Modo de testes (toggle) ──────────────────────────────────
.trigger-card__test-mode {
  margin-bottom: $spacing-3;
  padding: $spacing-2 $spacing-3;
  border-radius: $radius-md;
  background: rgba(217, 119, 6, 0.06);
  border: 1px dashed rgba(217, 119, 6, 0.35);
}

.test-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &__slider {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    background: var(--neutral-300, #d1d5db);
    transition: background 0.15s;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      transition: transform 0.15s;
    }
  }

  input:checked + &__slider {
    background: #d97706;
    &::after { transform: translateX(16px); }
  }

  &__label {
    font-size: 0.8125rem;
    color: #92400e;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
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

  &--split {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-1;
    padding: $spacing-2 $spacing-3;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    justify-content: space-between;
  }

  &__type {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

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
    font-size: 0.95rem;
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

  &--split {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.78rem;
    line-height: 1.2;

    small {
      color: var(--text-tertiary);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.04em;
      margin-right: 4px;
    }
  }
}

// ─── Linha do alerta de "lote já processado" com botão à direita ──
.trigger-card__lock-alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-3;
  flex-wrap: wrap;
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

  &--right {
    width: 100%;
  }

  .amount-cell {
    font-size: 1rem;
  }

  &__detail {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;

    span {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;

      svg { opacity: 0.6; font-size: 0.7rem; }
    }
  }

  // Estilo aplicado quando a parcela já foi paga (bonusPaidAt/dividendPaidAt
  // tem data) — risca o valor e dá um tom verde discreto, sinalizando que
  // aquela metade do lote não entra mais nas ações pendentes.
  &__paid {
    color: var(--color-success-dark, #15803d) !important;
    text-decoration: line-through;
    text-decoration-color: rgba(21, 128, 61, 0.5);
  }
}

// ─── Abas da execução (A pagar × Fechamento) ──────────────────
.admin-payouts-view__tabs {
  margin-bottom: $spacing-3;
}

.payout-tabs {
  display: flex;
  gap: $spacing-2;
  border-bottom: 1px solid var(--neutral-300, #e5e7eb);
}

.payout-tab {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: var(--text-primary);
  }

  &--active {
    color: rgb(var(--primary-500-rgb));
    border-bottom-color: rgb(var(--primary-500-rgb));
  }
}

.payout-tabs__hint {
  margin: $spacing-2 0 0;
  font-size: 0.8rem;
  color: var(--text-tertiary);

  strong { color: var(--text-secondary); }
}

.competencia-cell {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.actions-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: $spacing-2;

  // Cada ação ocupa a largura toda da célula e fica empilhada — assim os
  // rótulos ficam alinhados e nunca quebram no meio da palavra.
  :deep(.ds-button) {
    width: 100%;
    white-space: nowrap;
  }

  // O slot padrão carrega ícone + texto juntos; impedimos que esse span
  // encolha e force a quebra do rótulo em duas linhas.
  :deep(.ds-button__text) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
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
