<template>
  <div class="mgr-trash">

    <!-- Cabeçalho da seção -->
    <div class="mgr-trash__header" @click="emit('toggleCollapse')">
      <div class="mgr-trash__header-left">
        <font-awesome-icon icon="trash-can" class="mgr-trash__header-icon" />
        <span class="mgr-trash__header-title">Lixeira</span>
        <span v-if="items.length > 0" class="mgr-trash__badge">{{ items.length }}</span>
      </div>
      <div class="mgr-trash__header-right">
        <span class="mgr-trash__header-hint">
          Cadastros excluídos são removidos permanentemente após 30 dias
        </span>
        <font-awesome-icon :icon="collapsed ? 'chevron-down' : 'chevron-up'" />
      </div>
    </div>

    <!-- Conteúdo (recolhível) -->
    <transition name="trash-expand">
      <div v-if="!collapsed" class="mgr-trash__body">

        <!-- Estado vazio -->
        <div v-if="items.length === 0" class="mgr-trash__empty">
          <font-awesome-icon icon="box-open" />
          <span>Lixeira vazia</span>
        </div>

        <!-- Tabela de itens -->
        <div v-else class="mgr-trash__scroll">
          <table aria-label="Lixeira — cadastros excluídos">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Cotas</th>
                <th>Patrocinador</th>
                <th>Excluído em</th>
                <th class="mgr-trash__th--center">Prazo</th>
                <th class="mgr-trash__th--center">Restaurar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id" class="mgr-trash__row">

                <!-- Usuário -->
                <td class="mgr-trash__user-cell">
                  <div class="mgr-trash-avatar">{{ getInitials(item.name) }}</div>
                  <div class="mgr-trash-info">
                    <span class="mgr-trash-info__name">{{ item.name }}</span>
                    <span class="mgr-trash-info__email">{{ item.email }}</span>
                  </div>
                </td>

                <!-- Cotas -->
                <td>
                  <span class="mgr-trash__quotas">{{ item.purchasedQuotas }}</span>
                </td>

                <!-- Patrocinador -->
                <td class="mgr-trash__sponsor-cell">
                  {{ getSponsorName(item.sponsorId) }}
                </td>

                <!-- Data de exclusão -->
                <td class="mgr-trash__date-cell">
                  {{ formatDate(item.deletedAt) }}
                </td>

                <!-- Countdown -->
                <td class="mgr-trash__th--center">
                  <span :class="['mgr-trash__countdown', getCountdownClass(getDaysRemaining(item.deletedAt))]">
                    {{ getDaysRemaining(item.deletedAt) }}d
                  </span>
                </td>

                <!-- Ação restaurar -->
                <td class="mgr-trash__th--center">
                  <button class="mgr-trash__restore-btn" @click="emit('restore', item)">
                    <font-awesome-icon icon="rotate-left" />
                    Restaurar
                  </button>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { useAdminManagerStore, type TrashUser } from '@/shared/stores/adminManager.store';

defineProps<{
  items: TrashUser[];
  collapsed: boolean;
}>();

const emit = defineEmits<{
  restore: [user: TrashUser];
  toggleCollapse: [];
}>();

const store = useAdminManagerStore();

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function getSponsorName(sponsorId: string | null): string {
  return store.getSponsorName(sponsorId);
}

function getDaysRemaining(deletedAt: string): number {
  return store.getDaysRemaining(deletedAt);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getCountdownClass(days: number): string {
  if (days <= 3) return 'mgr-trash__countdown--critical';
  if (days <= 7) return 'mgr-trash__countdown--warning';
  return 'mgr-trash__countdown--safe';
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/mixins' as *;

.mgr-trash {
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: var(--bg-primary);
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    gap: 1rem;

    &:hover {
      background: var(--bg-secondary);
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  &__header-icon {
    color: $error;
    font-size: 1rem;
  }

  &__header-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: $error;
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 999px;
    min-width: 20px;
    height: 20px;
    padding: 0 0.35rem;
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  &__header-hint {
    @media (max-width: 600px) { display: none; }
  }

  &__body {
    border-top: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;

    .svg-inline--fa {
      font-size: 1.5rem;
      opacity: 0.4;
    }
  }

  &__scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
  }

  &__th--center {
    text-align: center;
  }

  &__row {
    border-bottom: 1px solid var(--border-color);
    opacity: 0.85;

    td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
    }
  }

  &__user-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  &__sponsor-cell,
  &__date-cell {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  &__quotas {
    font-weight: 600;
    color: var(--text-primary);
  }

  // Countdown badge
  &__countdown {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;

    &--safe     { background: rgba($success, 0.12);  color: $success-dark; }
    &--warning  { background: rgba($warning, 0.15);  color: $warning-dark; }
    &--critical { background: rgba($error, 0.12);    color: $error-dark;   }
  }

  // Botão restaurar
  &__restore-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: 1px solid $primary-500;
    border-radius: 0.375rem;
    padding: 0.3rem 0.75rem;
    font-size: 0.8125rem;
    color: $primary-600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: $primary-500;
      color: #fff;
    }
  }
}

// ── Avatar ──────────────────────────────────────────────────
.mgr-trash-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba($neutral-500, 0.2);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  @include flex-center;
  flex-shrink: 0;
}

.mgr-trash-info {
  display: flex;
  flex-direction: column;

  &__name {
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: line-through;
    opacity: 0.7;
  }

  &__email {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
}

// ── Trash expand transition ───────────────────────────────────
.trash-expand-enter-active,
.trash-expand-leave-active {
  transition: opacity 0.2s, max-height 0.25s ease;
  overflow: hidden;
  max-height: 600px;
}
.trash-expand-enter-from,
.trash-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
