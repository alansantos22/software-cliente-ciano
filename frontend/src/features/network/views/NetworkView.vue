<template>
  <div class="network-view">
    <!-- Header -->
    <header class="network-view__header">
      <div>
        <h1>Minha Rede</h1>
        <p class="network-view__subtitle">Central de comando da sua equipe de vendas</p>
      </div>
      <div class="network-view__actions">
        <DsCopyButton
          :text="referralLink"
          label="Copiar Link de Indicação"
          success-label="Link Copiado!"
        />
      </div>
    </header>

    <!-- KPI grid: hero + 3 cards -->
    <section class="network-view__kpis">
      <NetworkHeroCard
        :value="12500.75"
        trend="+5% este mês"
      />
      <NetworkKpiCard
        label="Indicados Diretos"
        :value="String(directCount)"
        trend-text="+2 esta semana"
        :trend-up="true"
      >
        <template #icon><font-awesome-icon icon="user-plus" /></template>
      </NetworkKpiCard>
      <NetworkKpiCard
        label="Total na Rede"
        :value="String(flatNodes.length)"
        trend-text="+3 novos"
        :trend-up="true"
        :subtitle="`${networkStats.activeMembers} ativos · ${networkStats.inactiveMembers} inativo${networkStats.inactiveMembers !== 1 ? 's' : ''}`"
      >
        <template #icon><font-awesome-icon icon="globe" /></template>
      </NetworkKpiCard>
      <NetworkKpiCard
        label="Taxa de Atividade"
        :value="`${activityRate}%`"
        :variant="activityRate < 80 ? 'alert' : 'success'"
        :subtitle="`${networkStats.activeMembers} ativos / ${networkStats.inactiveMembers + expiringCount} em atenção`"
      >
        <template #icon><font-awesome-icon icon="chart-line" /></template>
      </NetworkKpiCard>
    </section>

    <!-- Title progression bar -->
    <section class="network-view__progress">
      <NetworkProgressBar
        :current-title="userTitle"
        :active-members="networkStats.activeMembers"
        :qualified-bronzes="networkStats.qualifiedBronzes ?? 0"
        :qualified-lines="networkStats.qualifiedLines ?? 0"
      />
    </section>

    <!-- Network list -->
    <section class="network-view__list">
      <DsCard>
        <template #header>
          <div class="list-header">
            <h2>Sua Rede</h2>
            <div class="list-header__controls">
              <NetworkFilters
                v-model="activeFilter"
                :counts="filterCounts"
              />
            </div>
          </div>
        </template>

        <!-- Tree view (no filter) -->
        <div v-if="activeFilter === 'all'" class="network-view__tree">
          <NetworkUserRow
            v-for="node in rootNodes"
            :key="node.id"
            :node="node"
            :depth="0"
          />
        </div>

        <!-- Flat filtered view -->
        <div v-else class="network-view__flat">
          <div v-if="filteredNodes.length === 0" class="network-view__empty">
            <font-awesome-icon icon="circle-check" class="network-view__empty-icon" />
            <p>Nenhum membro neste filtro.</p>
          </div>
          <NetworkUserRow
            v-for="node in filteredNodes"
            :key="node.id"
            :node="node"
            :depth="0"
          />
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/shared/stores/auth.store';
import { DsCard, DsCopyButton } from '@/design-system';
import {
  mockNetworkTree,
  calculateNetworkStats,
  mockDelay,
  type NetworkNode,
} from '@/mocks';

import NetworkHeroCard    from '../components/NetworkHeroCard.vue';
import NetworkKpiCard     from '../components/NetworkKpiCard.vue';
import NetworkProgressBar from '../components/NetworkProgressBar.vue';
import NetworkFilters, { type NetworkFilter } from '../components/NetworkFilters.vue';
import NetworkUserRow     from '../components/NetworkUserRow.vue';

const authStore = useAuthStore();
const TODAY = new Date('2026-02-18');

// ── State ─────────────────────────────────────────────────────────────────────
const rootNodes    = ref<NetworkNode[]>([]);
const activeFilter = ref<NetworkFilter>('all');

// ── Load data ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await mockDelay(300);
  rootNodes.value = mockNetworkTree.children ?? [];
});

// ── Referral link ─────────────────────────────────────────────────────────────
const referralLink = computed(
  () => `https://ciano.com.br/r/${authStore.user?.referralCode ?? 'ABC123'}`,
);

// ── Flat nodes (all, excluding root) ─────────────────────────────────────────
const flatNodes = computed<NetworkNode[]>(() => {
  const all: NetworkNode[] = [];
  const traverse = (nodes: NetworkNode[]) => {
    for (const n of nodes) {
      all.push(n);
      if (n.children.length) traverse(n.children);
    }
  };
  traverse(rootNodes.value);
  return all;
});

// ── Stats ─────────────────────────────────────────────────────────────────────
const networkStats = computed(() => calculateNetworkStats(mockNetworkTree));
const directCount  = computed(() => rootNodes.value.length);
const activityRate = computed(() => {
  const total = flatNodes.value.length;
  if (!total) return 0;
  return Math.round((networkStats.value.activeMembers / total) * 100);
});

// ── Expiry helpers ────────────────────────────────────────────────────────────
function daysUntilExpiry(node: NetworkNode): number {
  const exp = new Date(node.expiresAt);
  return Math.ceil((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpiring(node: NetworkNode): boolean {
  const days = daysUntilExpiry(node);
  return node.isActive && days <= 15 && days > 0;
}

// ── Filter counts ─────────────────────────────────────────────────────────────
const expiringCount = computed(() => flatNodes.value.filter(isExpiring).length);

const filterCounts = computed(() => ({
  all:      flatNodes.value.length,
  active:   flatNodes.value.filter(n => n.isActive && !isExpiring(n)).length,
  inactive: flatNodes.value.filter(n => !n.isActive).length,
  expiring: expiringCount.value,
}));

// ── Filtered flat list ────────────────────────────────────────────────────────
const filteredNodes = computed<NetworkNode[]>(() => {
  if (activeFilter.value === 'active')   return flatNodes.value.filter(n => n.isActive && !isExpiring(n));
  if (activeFilter.value === 'inactive') return flatNodes.value.filter(n => !n.isActive);
  if (activeFilter.value === 'expiring') return flatNodes.value.filter(isExpiring);
  return flatNodes.value;
});

// ── Current user title for progress bar ──────────────────────────────────────
// Showing 'gold' so the user sees a meaningful progression (demo: max is diamond)
const userTitle = computed(() => 'gold' as const);
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.network-view {
  padding: $spacing-6;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  &__header {
    @include flex-between;
    flex-wrap: wrap;
    gap: $spacing-4;
    margin-bottom: $spacing-6;

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: $spacing-1;
    }
  }

  &__subtitle {
    color: $text-secondary;
    margin: 0;
  }

  // ── KPI grid ────────────────────────────────────────────────────────────────
  &__kpis {
    display: grid;
    grid-template-columns: 1.4fr repeat(3, 1fr);
    gap: $spacing-4;
    margin-bottom: $spacing-5;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 576px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────
  &__progress {
    margin-bottom: $spacing-5;
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  &__list {
    margin-bottom: $spacing-6;
  }

  &__tree,
  &__flat {
    display: flex;
    flex-direction: column;
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  &__empty {
    @include flex-center;
    flex-direction: column;
    padding: $spacing-12;
    color: $text-tertiary;

    p { margin-top: $spacing-3; font-size: 0.9375rem; }
  }

  &__empty-icon {
    font-size: 2.5rem;
    color: $success-light;
  }
}

// ── List header ───────────────────────────────────────────────────────────────
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $spacing-3;
  width: 100%;

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }
}
</style>
