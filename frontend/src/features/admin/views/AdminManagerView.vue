<template>
  <div class="mgr-view">

    <!-- ══════════════════════════════════════════════════════
         SETUP MODAL — Primeira vez (senha não cadastrada)
    ══════════════════════════════════════════════════════ -->
    <ManagerPasswordSetupModal v-if="!store.hasPassword" />

    <!-- ══════════════════════════════════════════════════════
         CONTEÚDO PRINCIPAL
    ══════════════════════════════════════════════════════ -->
    <template v-else>

      <!-- Cabeçalho da área -->
      <header class="mgr-view__header">
        <div class="mgr-view__header-left">
          <div class="mgr-view__lock-badge">
            <font-awesome-icon icon="shield-halved" />
          </div>
          <div>
            <h1 class="mgr-view__title">Gestão Protegida</h1>
            <p class="mgr-view__subtitle">
              Operações críticas protegidas por senha gerente ·
              <span class="mgr-view__subtitle-highlight">
                Cada ação requer confirmação individual
              </span>
            </p>
          </div>
        </div>
        <div class="mgr-view__stats">
          <div class="mgr-view__stat">
            <span class="mgr-view__stat-value">{{ store.users.length }}</span>
            <span class="mgr-view__stat-label">Usuários ativos</span>
          </div>
          <div class="mgr-view__stat mgr-view__stat--trash" v-if="store.trashUsers.length > 0">
            <span class="mgr-view__stat-value">{{ store.trashUsers.length }}</span>
            <span class="mgr-view__stat-label">Na lixeira</span>
          </div>
        </div>
      </header>

      <!-- Toast de sucesso ──────────────────────────────── -->
      <transition name="slide-down">
        <div v-if="successMessage" class="mgr-view__success-toast">
          <font-awesome-icon icon="circle-check" />
          {{ successMessage }}
        </div>
      </transition>

      <!-- ══════════════════════════════════════════════════
           SEÇÃO: Usuários
      ══════════════════════════════════════════════════ -->
      <section class="mgr-view__section">
        <div class="mgr-view__section-header">
          <h2 class="mgr-view__section-title">
            <font-awesome-icon icon="users" />
            Usuários
          </h2>
          <!-- Busca -->
          <div class="mgr-view__search">
            <font-awesome-icon icon="magnifying-glass" class="mgr-view__search-icon" />
            <input
              v-model="search"
              type="text"
              class="mgr-view__search-input"
              placeholder="Buscar por nome ou e-mail…"
              autocomplete="off"
            />
          </div>
        </div>

        <ManagerUserTable
          :users="filteredUsers"
          @action="handleTableAction"
        />
      </section>

      <!-- ══════════════════════════════════════════════════
           SEÇÃO: Lixeira
      ══════════════════════════════════════════════════ -->
      <section class="mgr-view__section">
        <ManagerTrashPanel
          :items="store.trashUsers"
          :collapsed="trashCollapsed"
          @toggle-collapse="trashCollapsed = !trashCollapsed"
          @restore="handleRestoreUser"
        />
      </section>

    </template>

    <!-- ══════════════════════════════════════════════════════
         MODAL DE CONFIRMAÇÃO — Reutilizado por todas as ações
    ══════════════════════════════════════════════════════ -->
    <ManagerActionConfirmModal
      v-if="pendingAction"
      v-model="showConfirm"
      :title="pendingAction.title"
      :description="pendingAction.description"
      :confirm-label="pendingAction.confirmLabel"
      :variant="pendingAction.variant"
      :loading="actionLoading"
      :error="actionError"
      @confirm="handleConfirm"
      @cancel="closeAction"
    >
      <template #extra>

        <!-- Adicionar / Retirar Cotas -->
        <div
          v-if="pendingAction.type === 'add' || pendingAction.type === 'remove'"
          class="mgr-extra"
        >
          <label class="mgr-extra__label">
            Quantidade de Cotas
            <span v-if="pendingAction.type === 'remove'" class="mgr-extra__hint">
              (disponível: {{ pendingAction.user.purchasedQuotas }})
            </span>
          </label>
          <input
            v-model.number="extraQty"
            type="number"
            min="1"
            :max="pendingAction.type === 'remove' ? pendingAction.user.purchasedQuotas : undefined"
            class="mgr-extra__input"
          />
        </div>

        <!-- Alterar Patrocinador -->
        <div v-if="pendingAction.type === 'sponsor'" class="mgr-extra">
          <label class="mgr-extra__label">Novo Patrocinador</label>
          <select v-model="extraSponsorId" class="mgr-extra__select">
            <option value="">Selecionar patrocinador…</option>
            <option
              v-for="opt in sponsorOptions"
              :key="opt.id"
              :value="opt.id"
            >
              {{ opt.name }} ({{ opt.referralCode }})
            </option>
          </select>
        </div>

      </template>
    </ManagerActionConfirmModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAdminManagerStore, type TrashUser } from '@/shared/stores/adminManager.store';
import type { MockUser } from '@/mocks';
import ManagerPasswordSetupModal from '../components/ManagerPasswordSetupModal.vue';
import ManagerActionConfirmModal from '../components/ManagerActionConfirmModal.vue';
import ManagerUserTable from '../components/ManagerUserTable.vue';
import ManagerTrashPanel from '../components/ManagerTrashPanel.vue';

// ── Tipos ──────────────────────────────────────────────────────
type ActionType = 'add' | 'remove' | 'sponsor' | 'delete' | 'restore';

interface PendingAction {
  type: ActionType;
  user: MockUser | TrashUser;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'danger';
}

// ── Store ────────────────────────────────────────────────────
const store = useAdminManagerStore();

// ── UI State ─────────────────────────────────────────────────
const search = ref('');
const trashCollapsed = ref(true);

// ── Action state ─────────────────────────────────────────────
const showConfirm = ref(false);
const pendingAction = ref<PendingAction | null>(null);
const actionLoading = ref(false);
const actionError = ref('');
const successMessage = ref('');

// Extra inputs
const extraQty = ref(1);
const extraSponsorId = ref('');

// ── Computed ──────────────────────────────────────────────────
const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return store.users;
  return store.users.filter(
    u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
  );
});

const sponsorOptions = computed(() => {
  if (!pendingAction.value || pendingAction.value.type !== 'sponsor') return [];
  return store.getSponsorOptions(pendingAction.value.user.id);
});

// ── Action helpers ────────────────────────────────────────────
function openAction(action: PendingAction) {
  pendingAction.value = action;
  actionError.value = '';
  extraQty.value = 1;
  extraSponsorId.value = '';
  showConfirm.value = true;
}

function closeAction() {
  showConfirm.value = false;
  // Limpa após a animação de fechamento
  setTimeout(() => {
    pendingAction.value = null;
    actionError.value = '';
  }, 250);
}

function showSuccess(msg: string) {
  successMessage.value = msg;
  setTimeout(() => { successMessage.value = ''; }, 3500);
}

// ── Eventos da tabela ─────────────────────────────────────────
function handleTableAction(type: 'add' | 'remove' | 'sponsor' | 'delete', user: MockUser) {
  const actions: Record<typeof type, PendingAction> = {
    add: {
      type: 'add',
      user,
      title: 'Adicionar Cotas',
      description: `Informe quantas cotas deseja adicionar para ${user.name}. Esta operação afeta o saldo e o nível do usuário.`,
      confirmLabel: 'Adicionar Cotas',
      variant: 'default',
    },
    remove: {
      type: 'remove',
      user,
      title: 'Retirar Cotas',
      description: `Informe quantas cotas deseja retirar de ${user.name}. O nível pode ser reduzido se as cotas mínimas não forem mantidas.`,
      confirmLabel: 'Retirar Cotas',
      variant: 'danger',
    },
    sponsor: {
      type: 'sponsor',
      user,
      title: 'Alterar Patrocinador',
      description: `Você está alterando o upline de ${user.name}. Todos os usuários abaixo dele na rede seguirão a nova estrutura.`,
      confirmLabel: 'Alterar Patrocinador',
      variant: 'danger',
    },
    delete: {
      type: 'delete',
      user,
      title: 'Excluir Cadastro',
      description: `O cadastro de ${user.name} será movido para a lixeira e excluído permanentemente em 30 dias. Você pode restaurá-lo durante esse período.`,
      confirmLabel: 'Mover para Lixeira',
      variant: 'danger',
    },
  };
  openAction(actions[type]);
}

// ── Restaurar da lixeira ──────────────────────────────────────
function handleRestoreUser(user: TrashUser) {
  openAction({
    type: 'restore',
    user,
    title: 'Restaurar Cadastro',
    description: `O cadastro de ${user.name} será restaurado com todos os dados originais.`,
    confirmLabel: 'Restaurar Cadastro',
    variant: 'default',
  });
}

// ── Executar ação confirmada ──────────────────────────────────
async function handleConfirm(password: string) {
  if (!pendingAction.value) return;

  actionLoading.value = true;
  actionError.value = '';

  const { type, user } = pendingAction.value;
  let result: { ok: boolean; error?: string } = { ok: false };

  switch (type) {
    case 'add':
      if (extraQty.value < 1) {
        actionError.value = 'Informe uma quantidade válida (mínimo 1).';
        actionLoading.value = false;
        return;
      }
      result = await store.addQuotas(user.id, extraQty.value, password);
      break;

    case 'remove':
      if (extraQty.value < 1) {
        actionError.value = 'Informe uma quantidade válida (mínimo 1).';
        actionLoading.value = false;
        return;
      }
      result = await store.removeQuotas(user.id, extraQty.value, password);
      break;

    case 'sponsor':
      result = await store.changeSponsor(user.id, extraSponsorId.value, password);
      break;

    case 'delete':
      result = await store.deleteUser(user.id, password);
      break;

    case 'restore':
      result = await store.restoreUser(user.id, password);
      break;
  }

  actionLoading.value = false;

  if (result.ok) {
    closeAction();
    const successMessages: Record<ActionType, string> = {
      add: `${extraQty.value} cota(s) adicionada(s) com sucesso.`,
      remove: `${extraQty.value} cota(s) retirada(s) com sucesso.`,
      sponsor: 'Patrocinador alterado com sucesso.',
      delete: `Cadastro de ${user.name} movido para a lixeira.`,
      restore: `Cadastro de ${user.name} restaurado com sucesso.`,
    };
    showSuccess(successMessages[type]);
  } else {
    actionError.value = result.error ?? 'Erro ao executar a ação.';
  }
}

// Fecha o modal quando showConfirm muda para false (ex: via v-model)
watch(showConfirm, (v) => {
  if (!v) closeAction();
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/mixins' as *;
@use '@/assets/scss/spacing' as *;

.mgr-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  // ── Header ─────────────────────────────────────────────────
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__lock-badge {
    width: 52px;
    height: 52px;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, $primary-600, $primary-800);
    @include flex-center;
    font-size: 1.375rem;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba($primary-800, 0.3);
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.2rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  &__subtitle-highlight {
    color: $primary-500;
    font-weight: 500;
  }

  &__stats {
    display: flex;
    gap: 1.25rem;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    &-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    &-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &--trash &-value { color: $error; }
  }

  // ── Toast ──────────────────────────────────────────────────
  &__success-toast {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: rgba($success, 0.12);
    border: 1px solid rgba($success, 0.3);
    border-radius: 0.5rem;
    padding: 0.75rem 1.25rem;
    color: $success-dark;
    font-weight: 500;
    font-size: 0.9rem;

    .svg-inline--fa {
      font-size: 1rem;
    }
  }

  // ── Sections ───────────────────────────────────────────────
  &__section {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    overflow: visible;

    // Lixeira não tem padding separado
    &:has(.mgr-trash) {
      background: none;
      border: none;
      padding: 0;
    }
  }

  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
  }

  &__section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;

    .svg-inline--fa {
      color: $primary-500;
    }
  }

  // ── Busca ──────────────────────────────────────────────────
  &__search {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    pointer-events: none;
  }

  &__search-input {
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 0.5rem 0.875rem 0.5rem 2.25rem;
    font-size: 0.875rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    width: 260px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &::placeholder { color: var(--text-secondary); }

    &:focus {
      border-color: $primary-500;
      box-shadow: 0 0 0 3px rgba($primary-500, 0.15);
    }

    @media (max-width: 576px) {
      width: 180px;
    }
  }
}

// ── Extra form (slot #extra) ─────────────────────────────────
.mgr-extra {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  &__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__hint {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  &__input,
  &__select {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus {
      border-color: $primary-500;
      box-shadow: 0 0 0 3px rgba($primary-500, 0.15);
    }
  }
}

// ── Toast transition ──────────────────────────────────────────
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
