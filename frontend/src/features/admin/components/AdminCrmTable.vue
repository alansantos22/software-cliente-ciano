<template>
  <div class="crm-table">
    <div class="crm-table__scroll">
      <table class="crm-table__table" aria-label="Tabela de usuários CRM">
        <thead>
          <tr>
            <th>Usuário</th>
            <th title="Verde = Ativo, Amarelo = Em risco, Vermelho = Inativo">Farol</th>
            <th title="Lifetime Value — Total investido no sistema">LTV</th>
            <th>Cotas</th>
            <th>Título</th>
            <th>Nível</th>
            <th class="crm-table__th--center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="crm-table__row">
            <!-- Usuário -->
            <td class="crm-table__user-cell">
              <div class="crm-avatar">{{ getInitials(user.name) }}</div>
              <div class="crm-info">
                <span class="crm-info__name">
                  {{ user.name }}
                  <span v-if="isWhale(user)" class="crm-info__whale" title="Investidor Baleia (LTV &gt; R$ 100k)">
                    🐋
                  </span>
                </span>
                <span class="crm-info__email">{{ user.email }}</span>
              </div>
            </td>

            <!-- Farol de Atividade -->
            <td class="crm-table__beacon-cell">
              <span
                :class="['crm-beacon', `crm-beacon--${getActivityStatus(user)}`]"
                :title="getActivityTooltip(user)"
              />
              <span class="crm-beacon__label">{{ getActivityLabel(user) }}</span>
            </td>

            <!-- LTV -->
            <td class="crm-table__ltv-cell">
              <span class="crm-ltv">{{ formatLtv(user) }}</span>
            </td>

            <!-- Cotas -->
            <td class="crm-table__quotas-cell">
              <div class="crm-quotas">
                <span class="crm-quotas__bought">{{ user.purchasedQuotas }}</span>
                <span class="crm-quotas__split" v-if="user.splitQuotas > 0" title="Cotas de Split">
                  +{{ user.splitQuotas }} split
                </span>
              </div>
            </td>

            <!-- Título -->
            <td class="crm-table__title-cell">
              <span
                v-if="user.title !== 'none'"
                :class="['crm-title', `crm-title--${user.title}`]"
              >
                {{ getTitleLabel(user.title) }}
              </span>
              <span v-else class="crm-title crm-title--none">—</span>
            </td>

            <!-- Nível -->
            <td class="crm-table__level-cell">
              <span :class="['crm-level', `crm-level--${user.partnerLevel}`]">
                {{ getLevelLabel(user.partnerLevel) }}
              </span>
            </td>

            <!-- Ações -->
            <td class="crm-table__actions-cell">
              <div class="crm-action-menu" :ref="el => setMenuRef(el, user.id)">
                <button
                  class="crm-action-menu__trigger"
                  :aria-label="`Ações para ${user.name}`"
                  @click.stop="toggleMenu(user.id)"
                >
                  ⋮
                </button>
                <transition name="menu-drop">
                  <div v-if="openMenuId === user.id" class="crm-action-menu__dropdown">
                    <button class="crm-action-menu__item" @click="handleAction('extrato', user)">
                      📄 Ver Extrato
                    </button>
                    <button
                      class="crm-action-menu__item crm-action-menu__item--danger"
                      @click="handleAction('bloquear', user)"
                    >
                      🚫 Bloquear Conta
                    </button>
                    <button class="crm-action-menu__item" @click="handleAction('mensagem', user)">
                      💬 Enviar Mensagem
                    </button>
                  </div>
                </transition>
              </div>
            </td>
          </tr>

          <tr v-if="users.length === 0">
            <td colspan="7" class="crm-table__empty">Nenhum usuário encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { MockUser, PartnerLevel, UserTitle } from '@/mocks';

interface Props {
  users: MockUser[];
  quotaPrice?: number;
}

const props = withDefaults(defineProps<Props>(), {
  quotaPrice: 2500,
});

const emit = defineEmits<{
  action: [type: 'extrato' | 'bloquear' | 'mensagem', user: MockUser];
}>();

// Menu state
const openMenuId = ref<string | null>(null);
const menuRefs = new Map<string, Element | null>();

function setMenuRef(el: unknown, id: string) {
  menuRefs.set(id, el as Element | null);
}

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function handleAction(type: 'extrato' | 'bloquear' | 'mensagem', user: MockUser) {
  openMenuId.value = null;
  emit('action', type, user);
}

// Close on outside click
function handleDocClick(e: MouseEvent) {
  if (!openMenuId.value) return;
  const ref = menuRefs.get(openMenuId.value);
  if (ref && !ref.contains(e.target as Node)) {
    openMenuId.value = null;
  }
}

onMounted(() => document.addEventListener('click', handleDocClick));
onUnmounted(() => document.removeEventListener('click', handleDocClick));

// Helpers
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function isWhale(user: MockUser): boolean {
  return user.purchasedQuotas * props.quotaPrice >= 100_000;
}

/** Retorna true se a última compra foi há mais de 6 meses (ou nunca houve compra). */
function isAccountExpired(user: MockUser): boolean {
  if (!user.lastPurchaseDate) return true;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(user.lastPurchaseDate) < sixMonthsAgo;
}

/** Data em que a conta expira (lastPurchaseDate + 6 meses). */
function getExpiryDate(user: MockUser): string {
  if (!user.lastPurchaseDate) return '—';
  const d = new Date(user.lastPurchaseDate);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString('pt-BR');
}

type ActivityStatus = 'green' | 'yellow' | 'red';

function getActivityStatus(user: MockUser): ActivityStatus {
  if (!user.isActive || isAccountExpired(user)) return 'red';
  const expiryDate = new Date(user.lastPurchaseDate!);
  expiryDate.setMonth(expiryDate.getMonth() + 6);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
  if (daysUntilExpiry <= 30) return 'yellow';
  if (user.partnerLevel === 'imperial' || user.partnerLevel === 'vip') return 'green';
  if (user.partnerLevel === 'platinum') return 'yellow';
  return 'yellow';
}

function getActivityLabel(user: MockUser): string {
  if (!user.isActive) return 'Inativo';
  if (isAccountExpired(user)) return 'Expirado';
  const s = getActivityStatus(user);
  if (s === 'green') return 'Ativo';
  if (s === 'yellow') return 'Em risco';
  return 'Inativo';
}

function getActivityTooltip(user: MockUser): string {
  if (!user.isActive) return 'Inativo — conta bloqueada ou dormente';
  if (isAccountExpired(user)) return `Expirado — sem compras nos últimos 6 meses (expirou em ${getExpiryDate(user)})`;
  const s = getActivityStatus(user);
  if (s === 'green') return `Ativo — renova em ${getExpiryDate(user)}`;
  if (s === 'yellow') return `Em risco — expira em ${getExpiryDate(user)}, monitorar renovação`;
  return 'Inativo — conta bloqueada ou dormente';
}

function formatLtv(user: MockUser): string {
  const ltv = user.purchasedQuotas * props.quotaPrice;
  if (ltv >= 1_000_000) return `R$ ${(ltv / 1_000_000).toFixed(1)}M`;
  if (ltv >= 1_000) return `R$ ${(ltv / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ltv);
}

const levelLabels: Record<PartnerLevel, string> = {
  socio: 'Sócio',
  platinum: 'Platinum',
  vip: 'VIP',
  imperial: 'Imperial',
};

function getLevelLabel(level: PartnerLevel): string {
  return levelLabels[level] ?? level;
}

const titleLabels: Record<UserTitle, string> = {
  none:    '—',
  bronze:  'Bronze',
  silver:  'Prata',
  gold:    'Ouro',
  diamond: 'Diamante',
};

function getTitleLabel(title: UserTitle): string {
  return titleLabels[title] ?? title;
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.crm-table {
  &__scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    th {
      padding: $spacing-3 $spacing-4;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: $text-tertiary;
      border-bottom: 2px solid $border-light;
      white-space: nowrap;
    }
  }

  &__th--center { text-align: center; }

  &__row {
    transition: background 0.15s;

    &:hover { background: $neutral-50; }

    td {
      padding: $spacing-3 $spacing-4;
      border-bottom: 1px solid $border-light;
      vertical-align: middle;
    }
  }

  &__empty {
    text-align: center;
    color: $text-tertiary;
    padding: $spacing-8 !important;
  }

  // Cell specific
  &__ltv-cell   { font-variant-numeric: tabular-nums; }
  &__quotas-cell { white-space: nowrap; }
  &__actions-cell { text-align: center; }
  &__beacon-cell  { white-space: nowrap; }
}

// Avatar
.crm-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary-500, $secondary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

// User cell
.crm-table__user-cell {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  min-width: 200px;
}

.crm-info {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-weight: 600;
    font-size: 0.875rem;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: $spacing-1;
  }

  &__email {
    font-size: 0.75rem;
    color: $text-tertiary;
  }

  &__whale {
    font-size: 0.9rem;
  }
}

// Beacon
.crm-beacon {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;
  margin-right: $spacing-2;
  flex-shrink: 0;

  &--green  { background: $success; box-shadow: 0 0 0 3px rgba($success, 0.2); }
  &--yellow { background: $warning; box-shadow: 0 0 0 3px rgba($warning, 0.2); }
  &--red    { background: $error;   box-shadow: 0 0 0 3px rgba($error, 0.2);   }

  &__label {
    font-size: 0.78rem;
    color: $text-secondary;
  }
}

// LTV
.crm-ltv {
  font-weight: 700;
  font-size: 0.9rem;
  color: $text-primary;
}

// Quotas
.crm-quotas {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__bought {
    font-weight: 700;
    font-size: 0.9rem;
    color: $text-primary;
  }

  &__split {
    font-size: 0.72rem;
    color: $primary-600;
  }
}

// Level badge
.crm-level {
  display: inline-block;
  padding: 3px 10px;
  border-radius: $radius-full;
  font-size: 0.75rem;
  font-weight: 700;

  &--socio    { background: rgba($primary-500, 0.1);  color: $primary-700;    border: 1px solid rgba($primary-500, 0.3); }
  &--platinum { background: rgba($neutral-400, 0.15); color: $neutral-700;    border: 1px solid rgba($neutral-400, 0.4); }
  &--vip      { background: rgba($accent-500, 0.12);  color: $accent-800;     border: 1px solid rgba($accent-500, 0.35); }
  &--imperial { background: rgba($primary-500, 0.15); color: $primary-800;    border: 1px solid $primary-400;
                box-shadow: 0 0 6px rgba($primary-500, 0.2); }
}

// Title badge
.crm-title {
  display: inline-block;
  padding: 3px 10px;
  border-radius: $radius-full;
  font-size: 0.75rem;
  font-weight: 700;

  &--none    { color: $text-tertiary; background: none; padding: 0; }
  &--bronze  { background: rgba(#cd7f32, 0.12); color: #7a4a1a; border: 1px solid rgba(#cd7f32, 0.4); }
  &--silver  { background: rgba(#a8a9ad, 0.15); color: #4a4a4a; border: 1px solid rgba(#a8a9ad, 0.4); }
  &--gold    { background: rgba(#FFD700, 0.15); color: #7a6000; border: 1px solid rgba(#FFD700, 0.5); }
  &--diamond { background: rgba(#00BCD4, 0.12); color: #005f70; border: 1px solid rgba(#00BCD4, 0.4); }
}

// Action menu
.crm-action-menu {
  position: relative;
  display: inline-block;

  &__trigger {
    background: none;
    border: 1px solid $border-default;
    border-radius: $radius-sm;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    color: $text-secondary;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;

    &:hover {
      background: $neutral-100;
      border-color: $neutral-400;
      color: $text-primary;
    }
  }

  &__dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: white;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    box-shadow: $shadow-xl;
    min-width: 180px;
    z-index: 100;
    overflow: hidden;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    width: 100%;
    padding: $spacing-2 $spacing-4;
    background: none;
    border: none;
    text-align: left;
    font-size: 0.875rem;
    color: $text-primary;
    cursor: pointer;
    transition: background 0.12s;

    &:hover { background: $neutral-50; }

    &--danger {
      color: $error;
      &:hover { background: rgba($error, 0.06); }
    }
  }
}

// Dropdown transition
.menu-drop-enter-active,
.menu-drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.menu-drop-enter-from,
.menu-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
