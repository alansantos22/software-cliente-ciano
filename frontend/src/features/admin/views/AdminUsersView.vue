<template>
  <div class="admin-users">
    <header class="admin-users__header">
      <div>
        <RouterLink to="/admin" class="admin-users__back">← Voltar ao Painel</RouterLink>
        <h1 class="admin-users__title">CRM de Usuários</h1>
        <p class="admin-users__subtitle">Todos os usuários cadastrados na plataforma</p>
      </div>
    </header>

    <!-- Filters -->
    <div class="admin-users__filters">
      <input
        v-model="search"
        type="text"
        class="admin-users__search"
        placeholder="Buscar por nome ou e-mail..."
        aria-label="Buscar usuário"
      />
      <div class="admin-users__filter-pills">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          :class="['filter-pill', { 'filter-pill--active': statusFilter === opt.value }]"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <span class="admin-users__count">{{ filteredUsers.length }} usuário(s)</span>
    </div>

    <!-- Table -->
    <div class="admin-users__table-wrap">
      <div v-if="loading" class="admin-users__loading">Carregando usuários...</div>
      <AdminCrmTable
        v-else
        :users="filteredUsers"
        :quota-price="quotaPrice"
        @action="handleAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminCrmTable from '../components/AdminCrmTable.vue';
import { adminService } from '@/shared/services/admin.service';

const router = useRouter();

const allUsers = ref<any[]>([]);
const quotaPrice = ref(2500);
const loading = ref(true);
const search = ref('');
const statusFilter = ref<'all' | 'active' | 'risk' | 'inactive'>('all');

const statusOptions = [
  { value: 'all',      label: 'Todos' },
  { value: 'active',   label: 'Ativos' },
  { value: 'risk',     label: 'Em risco' },
  { value: 'inactive', label: 'Inativos' },
] as const;

function getStatus(user: any): 'active' | 'risk' | 'inactive' {
  if (!user.isActive) return 'inactive';
  if (!user.lastPurchaseDate) return 'inactive';
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (new Date(user.lastPurchaseDate) < sixMonthsAgo) return 'inactive';
  const expiry = new Date(user.lastPurchaseDate);
  expiry.setMonth(expiry.getMonth() + 6);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 30) return 'risk';
  return 'active';
}

const filteredUsers = computed(() => {
  let list = allUsers.value;

  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }

  if (statusFilter.value !== 'all') {
    list = list.filter(u => getStatus(u) === statusFilter.value);
  }

  return list;
});

function handleAction(type: 'extrato' | 'bloquear' | 'mensagem', user: any) {
  if (type === 'extrato') {
    router.push(`/admin/users/${user.id}`);
  }
}

onMounted(async () => {
  try {
    const [crmRes, priceRes] = await Promise.all([
      adminService.getCrmUsers(),
      adminService.getPriceEngine().catch(() => ({ data: null })),
    ]);
    if (crmRes.data && Array.isArray(crmRes.data)) {
      allUsers.value = crmRes.data;
    }
    if (priceRes.data?.quotaPrice) {
      quotaPrice.value = Number(priceRes.data.quotaPrice) || 2500;
    }
  } catch {
    /* fail silently */
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

.admin-users {
  padding: $spacing-6;
  max-width: 1440px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }
}

.admin-users__header {
  margin-bottom: $spacing-6;
}

.admin-users__back {
  display: inline-block;
  font-size: 0.85rem;
  color: var(--primary-600);
  text-decoration: none;
  margin-bottom: $spacing-2;

  &:hover { text-decoration: underline; }
}

.admin-users__title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 $spacing-1;
  color: var(--text-primary);
}

.admin-users__subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.admin-users__filters {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  margin-bottom: $spacing-4;
  flex-wrap: wrap;
}

.admin-users__search {
  padding: $spacing-2 $spacing-3;
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  font-size: 0.875rem;
  color: var(--text-primary);
  background: var(--surface-card);
  min-width: 240px;
  outline: none;

  &:focus {
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.12);
  }
}

.admin-users__filter-pills {
  display: flex;
  gap: $spacing-2;
  flex-wrap: wrap;
}

.filter-pill {
  padding: $spacing-1 $spacing-3;
  border: 1px solid var(--border-default);
  border-radius: $radius-full;
  font-size: 0.8rem;
  font-weight: 500;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--primary-400);
    color: var(--primary-600);
  }

  &--active {
    background: var(--primary-600);
    border-color: var(--primary-600);
    color: white;
  }
}

.admin-users__count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.admin-users__table-wrap {
  @include card;
}

.admin-users__loading {
  text-align: center;
  padding: $spacing-10;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}
</style>
