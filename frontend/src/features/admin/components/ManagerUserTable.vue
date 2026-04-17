<template>
  <div class="mgr-user-table">
    <div class="mgr-user-table__scroll">
      <table aria-label="Usuários — Gestão Protegida">
        <thead>
          <tr>
            <th>Usuário</th>
            <th title="Cotas compradas pelo usuário">Compradas</th>
            <th title="Cotas concedidas pelo admin">Admin</th>
            <th title="Cotas recebidas via split">Split</th>
            <th title="Saldo total (compradas + admin + split)">Total</th>
            <th>Patrocinador</th>
            <th>Nível</th>
            <th class="mgr-user-table__th--center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="mgr-user-table__row">

            <!-- Usuário -->
            <td class="mgr-user-table__user-cell">
              <div class="mgr-avatar">{{ getInitials(user.name) }}</div>
              <div class="mgr-info">
                <span class="mgr-info__name">{{ user.name }}</span>
                <span class="mgr-info__email">{{ user.email }}</span>
              </div>
            </td>

            <!-- Cotas compradas -->
            <td>
              <span class="mgr-quotas">{{ user.purchasedQuotas }}</span>
            </td>

            <!-- Cotas admin -->
            <td>
              <span
                :class="['mgr-admin-quotas', { 'mgr-admin-quotas--zero': !(user.adminGrantedQuotas ?? 0) }]"
                :title="(user.adminGrantedQuotas ?? 0) > 0 ? 'Cotas concedidas pelo admin' : 'Nenhuma cota admin'"
              >
                {{ (user.adminGrantedQuotas ?? 0) > 0 ? `+${user.adminGrantedQuotas}` : '—' }}
              </span>
            </td>

            <!-- Split -->
            <td>
              <span class="mgr-split">{{ user.splitQuotas > 0 ? `+${user.splitQuotas}` : '—' }}</span>
            </td>

            <!-- Total -->
            <td>
              <span class="mgr-quotas mgr-quotas--total">{{ user.quotaBalance }}</span>
            </td>

            <!-- Patrocinador -->
            <td class="mgr-user-table__sponsor-cell">
              <span>{{ getSponsorName(user.sponsorId) }}</span>
            </td>

            <!-- Nível -->
            <td>
              <span :class="['mgr-level', `mgr-level--${user.partnerLevel}`]">
                {{ getLevelLabel(user.partnerLevel) }}
              </span>
            </td>

            <!-- Ações -->
            <td class="mgr-user-table__actions-cell">
              <div class="mgr-action-menu">
                <button
                  class="mgr-action-menu__trigger"
                  :ref="el => setRef(el, user.id)"
                  :aria-label="`Ações para ${user.name}`"
                  @click.stop="toggleMenu(user.id)"
                >
                  <font-awesome-icon icon="ellipsis-vertical" />
                </button>
              </div>

              <Teleport to="body">
                <transition name="menu-drop">
                  <div
                    v-if="openMenuId === user.id"
                    class="mgr-action-menu__dropdown"
                    :style="dropdownStyle"
                    @click.stop
                  >
                    <button class="mgr-action-menu__item" @click="action('add', user)">
                      <font-awesome-icon icon="plus" />
                      Adicionar Cotas
                    </button>
                    <button class="mgr-action-menu__item" @click="action('remove', user)">
                      <font-awesome-icon icon="minus" />
                      Retirar Cotas
                    </button>
                    <button class="mgr-action-menu__item mgr-action-menu__item--simulate" @click="action('simulate', user)">
                      <font-awesome-icon icon="qrcode" />
                      Simular Compra (PIX)
                    </button>
                    <button class="mgr-action-menu__item" @click="action('sponsor', user)">
                      <font-awesome-icon icon="arrows-rotate" />
                      Alterar Patrocinador
                    </button>
                    <button
                      :class="['mgr-action-menu__item', user.isActive ? 'mgr-action-menu__item--warning' : 'mgr-action-menu__item--success']"
                      @click="action('activate', user)"
                    >
                      <font-awesome-icon :icon="user.isActive ? 'user-slash' : 'user-check'" />
                      {{ user.isActive ? 'Desativar Conta' : 'Ativar Conta' }}
                    </button>
                    <div class="mgr-action-menu__divider" />
                    <button class="mgr-action-menu__item mgr-action-menu__item--danger" @click="action('delete', user)">
                      <font-awesome-icon icon="trash" />
                      Excluir Cadastro
                    </button>
                  </div>
                </transition>
              </Teleport>
            </td>

          </tr>

          <tr v-if="users.length === 0">
            <td colspan="8" class="mgr-user-table__empty">Nenhum usuário encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAdminManagerStore } from '@/shared/stores/adminManager.store';

export type ManagerAction = 'add' | 'remove' | 'activate' | 'sponsor' | 'delete' | 'simulate';

type PartnerLevel = 'socio' | 'platinum' | 'vip' | 'imperial';

const props = defineProps<{
  users: any[];
}>();

const emit = defineEmits<{
  action: [type: ManagerAction, user: any];
}>();

const store = useAdminManagerStore();

const levelLabel: Record<PartnerLevel, string> = {
  socio: 'Sócio',
  platinum: 'Platinum',
  vip: 'VIP',
  imperial: 'Imperial',
};

// ── Menu dropdown ────────────────────────────────────────────
const openMenuId = ref<string | null>(null);
const triggerRefs = new Map<string, HTMLElement | null>();
const dropdownStyle = ref<Record<string, string>>({});

function setRef(el: unknown, id: string) {
  triggerRefs.set(id, el as HTMLElement | null);
}

function toggleMenu(id: string) {
  if (openMenuId.value === id) {
    openMenuId.value = null;
    return;
  }
  const btn = triggerRefs.get(id);
  if (btn) {
    const rect = (btn as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 220; // approximate dropdown height
    const openAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    dropdownStyle.value = {
      position: 'fixed',
      ...(openAbove
        ? { bottom: `${window.innerHeight - rect.top + 4}px` }
        : { top: `${rect.bottom + 4}px` }),
      right: `${window.innerWidth - rect.right}px`,
      zIndex: '9999',
    };
  }
  openMenuId.value = id;
}

function handleDocClick() {
  if (openMenuId.value) openMenuId.value = null;
}

onMounted(() => document.addEventListener('click', handleDocClick));
onUnmounted(() => document.removeEventListener('click', handleDocClick));

// ── Actions ──────────────────────────────────────────────────
function action(type: ManagerAction, user: any) {
  openMenuId.value = null;
  emit('action', type, user);
}

// ── Helpers ──────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function getLevelLabel(level: string): string {
  return levelLabel[level as PartnerLevel] ?? level;
}

function getSponsorName(sponsorId: string | null): string {
  return store.getSponsorName(sponsorId);
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/mixins' as *;

.mgr-user-table {
  &__scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead tr {
    border-bottom: 2px solid var(--border-color);
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  &__th--center {
    text-align: center;
  }

  &__row {
    border-bottom: 1px solid var(--border-color);
    transition: background 0.15s;

    &:hover {
      background: var(--bg-secondary);
    }

    td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
    }
  }

  &__user-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__sponsor-cell {
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  &__actions-cell {
    text-align: center;
  }

  &__empty {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
    font-style: italic;
  }
}

// ── Avatar ────────────────────────────────────────────────────
.mgr-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary-600, $primary-800);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  @include flex-center;
  flex-shrink: 0;
}

.mgr-info {
  display: flex;
  flex-direction: column;

  &__name {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  &__email {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
}

// ── Cotas / Split ─────────────────────────────────────────────
.mgr-quotas {
  font-weight: 700;
  color: var(--text-primary);
  &--total {
    color: $primary-600;
  }
}

.mgr-admin-quotas {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #d97706;

  &--zero {
    color: var(--text-muted, #9ca3af);
    font-weight: 400;
  }}

.mgr-split {
  font-size: 0.8125rem;
  color: $primary-500;
}

// ── Nível ─────────────────────────────────────────────────────
.mgr-level {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;

  &--socio    { background: rgba($primary-500, 0.12);  color: $primary-700; }
  &--platinum { background: rgba(#e5e4e2, 0.25);       color: var(--text-secondary); }
  &--vip      { background: rgba($accent-500, 0.15);   color: $accent-700; }
  &--imperial { background: rgba($secondary-500, 0.15); color: $secondary-700; }
}

// ── Action menu ───────────────────────────────────────────────
.mgr-action-menu {
  position: relative;
  display: inline-block;

  &__trigger {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    padding: 0.35rem 0.65rem;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }

  &__dropdown {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    min-width: 180px;
    padding: 0.25rem;
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    color: var(--text-primary);
    background: none;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;

    &:hover {
      background: var(--bg-secondary);
    }

    &--danger {
      color: $error;
      &:hover { background: rgba($error, 0.08); }
    }

    &--warning {
      color: var(--color-warning);
      &:hover { background: rgba(var(--warning-rgb), 0.08); }
    }

    &--success {
      color: var(--color-success);
      &:hover { background: rgba(var(--success-rgb), 0.08); }
    }

    &--simulate {
      color: $primary-600;
      font-weight: 500;
      &:hover { background: rgba($primary-500, 0.08); }
    }
  }

  &__divider {
    height: 1px;
    background: var(--border-color);
    margin: 0.25rem 0.5rem;
  }
}

// ── Menu transition ───────────────────────────────────────────
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
