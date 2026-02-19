<template>
  <div class="app-layout">
    <!-- Mobile Overlay -->
    <div
      v-if="mobileMenuOpen"
      class="sidebar-overlay"
      @click="mobileMenuOpen = false"
    />

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'sidebar--collapsed': !sidebarOpen, 'sidebar--mobile-open': mobileMenuOpen }]">
      <div class="sidebar__header">
        <img src="@/assets/logo.svg" alt="Ciano" class="sidebar__logo" />
        <span v-if="sidebarOpen" class="sidebar__brand">Ciano</span>
      </div>

      <nav class="sidebar__nav">
        <div v-if="sidebarOpen && !isAdminRoute" class="sidebar__section-label">Principal</div>
        <RouterLink
          v-for="item in mainMenuItems"
          :key="item.path"
          :to="item.path"
          class="sidebar__link"
          :class="{ 'sidebar__link--active': isActive(item.path) }"
          @click="mobileMenuOpen = false"
        >
          <span class="sidebar__icon">
            <font-awesome-icon :icon="item.icon" />
          </span>
          <span v-if="sidebarOpen" class="sidebar__label">{{ item.label }}</span>
        </RouterLink>

        <template v-if="authStore.isAdmin && adminMenuItems.length">
          <div v-if="sidebarOpen" class="sidebar__section-label sidebar__section-label--admin">Administração</div>
          <div v-else class="sidebar__divider" />
          <RouterLink
            v-for="item in adminMenuItems"
            :key="item.path"
            :to="item.path"
            class="sidebar__link sidebar__link--admin"
            :class="{ 'sidebar__link--active': isActive(item.path) }"
            @click="mobileMenuOpen = false"
          >
            <span class="sidebar__icon">
              <font-awesome-icon :icon="item.icon" />
            </span>
            <span v-if="sidebarOpen" class="sidebar__label">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__toggle" @click="toggleSidebar" :title="sidebarOpen ? 'Recolher menu' : 'Expandir menu'">
          <font-awesome-icon :icon="sidebarOpen ? 'chevron-left' : 'chevron-right'" />
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div :class="['main', { 'main--expanded': !sidebarOpen }]">
      <!-- Top Bar -->
      <header class="topbar">
        <div class="topbar__left">
          <!-- Mobile menu button -->
          <button class="topbar__mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
            <font-awesome-icon icon="bars" />
          </button>

          <div class="topbar__breadcrumb">
            <span class="topbar__page-title">{{ pageTitle }}</span>
            <span v-if="pageSubtitle" class="topbar__page-subtitle">{{ pageSubtitle }}</span>
          </div>
        </div>

        <div class="topbar__right">
          <!-- Notifications -->
          <div class="notif-wrapper">
            <button class="topbar__icon-btn" @click="toggleNotifications" title="Notificações">
              <font-awesome-icon icon="bell" />
              <span v-if="unreadCount" class="topbar__badge">{{ unreadCount }}</span>
            </button>

            <div v-if="notificationOpen" class="notif-overlay" @click="notificationOpen = false" />

            <div v-if="notificationOpen" class="notif-panel">
              <div class="notif-panel__header">
                <span class="notif-panel__title">Notificações</span>
                <button class="notif-panel__mark-all" @click="markAllRead">Marcar todas como lidas</button>
              </div>
              <div class="notif-panel__list">
                <div
                  v-for="n in notifications"
                  :key="n.id"
                  class="notif-item"
                  :class="[`notif-item--${n.type}`, { 'notif-item--read': n.read }]"
                  @click="readNotification(n.id)"
                >
                  <span class="notif-item__icon">
                    <font-awesome-icon :icon="n.icon" />
                  </span>
                  <div class="notif-item__body">
                    <p class="notif-item__title">{{ n.title }}</p>
                    <p class="notif-item__desc">{{ n.desc }}</p>
                    <span class="notif-item__time">{{ n.time }}</span>
                  </div>
                  <span v-if="!n.read" class="notif-item__dot" />
                </div>
              </div>
            </div>
          </div>

          <!-- User Menu -->
          <DsDropdown align="right">
            <template #trigger>
              <button class="topbar__user-btn">
                <span class="topbar__avatar">{{ userInitials }}</span>
                <div class="topbar__user-info">
                  <span class="topbar__user-name">{{ user?.fullName }}</span>
                  <span class="topbar__user-role">{{ userRoleLabel }}</span>
                </div>
                <font-awesome-icon icon="chevron-down" class="topbar__chevron" />
              </button>
            </template>

            <a href="#" class="ds-dropdown-item" @click.prevent="goToProfile">
              <font-awesome-icon icon="user" class="ds-dropdown-item__icon" />
              Meu Perfil
            </a>
            <a href="#" class="ds-dropdown-item" @click.prevent="goToSettings">
              <font-awesome-icon icon="gear" class="ds-dropdown-item__icon" />
              Configurações
            </a>
            <hr class="ds-dropdown-divider" />
            <a href="#" class="ds-dropdown-item ds-dropdown-item--danger" @click.prevent="logout">
              <font-awesome-icon icon="right-from-bracket" class="ds-dropdown-item__icon" />
              Sair
            </a>
          </DsDropdown>
        </div>
      </header>

      <!-- Page Content -->
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useAppStore } from '@/shared/stores/app.store';
import { DsDropdown } from '@/design-system';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const mobileMenuOpen = ref(false);
const user = computed(() => authStore.user);
const sidebarOpen = computed(() => appStore.isSidebarOpen);

const isAdminRoute = computed(() => route.path.startsWith('/admin'));

const userInitials = computed(() => {
  const fullName = user.value?.fullName || 'U';
  return fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
});

const userRoleLabel = computed(() =>
  authStore.isAdmin ? 'Administrador' : 'Sócio'
);

interface Notification {
  id: number;
  type: 'payment' | 'network' | 'warning';
  icon: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

const notificationOpen = ref(false);

const notifications = ref<Notification[]>([
  {
    id: 1,
    type: 'payment',
    icon: 'money-bill-wave',
    title: 'Pagamento de Janeiro processado',
    desc: 'R$ 5.200,00 será creditado no dia 5 do mês.',
    time: 'Há 2 horas',
    read: false,
  },
  {
    id: 2,
    type: 'network',
    icon: 'users',
    title: 'Nova indicação na sua rede',
    desc: 'Carlos Alves acabou de entrar como seu indicado direto.',
    time: 'Há 1 dia',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    icon: 'triangle-exclamation',
    title: 'Conta vence em breve',
    desc: 'Sua conta vence em 8 dias. Renove para não perder seus benefícios.',
    time: 'Há 2 dias',
    read: false,
  },
]);

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

function toggleNotifications() {
  notificationOpen.value = !notificationOpen.value;
}

function markAllRead() {
  notifications.value.forEach(n => (n.read = true));
}

function readNotification(id: number) {
  const n = notifications.value.find(n => n.id === id);
  if (n) n.read = true;
}

const pageTitle = computed(() => {
  const meta = route.meta as { title?: string };
  return meta.title || 'Dashboard';
});

const pageSubtitle = computed(() => {
  const subtitles: Record<string, string> = {
    '/dashboard': 'Visão geral da sua conta',
    '/network': 'Visualize sua rede de indicados',
    '/quotas':   'Informações e pacotes disponíveis',
    '/earnings': 'Todas as suas movimentações financeiras',
    '/checkout': 'Adquira suas cotas',
    '/admin': 'Painel administrativo',
    '/admin/payouts': 'Gestão de pagamentos mensais',
    '/admin/financial': 'Configurações financeiras',
  };
  return subtitles[route.path] || '';
});

const mainMenuItems = [
  { path: '/dashboard', label: 'Dashboard',    icon: 'gauge' },
  { path: '/network',   label: 'Minha Rede',  icon: 'sitemap' },
  { path: '/quotas',    label: 'Cotas',       icon: 'coins' },
  { path: '/earnings',  label: 'Histórico',   icon: 'clock-rotate-left' },
  { path: '/checkout',  label: 'Comprar Cotas', icon: 'cart-shopping' },
];

const adminMenuItems = [
  { path: '/admin',          label: 'Visão Geral', icon: 'crown' },
  { path: '/admin/payouts',  label: 'Pagamentos', icon: 'credit-card' },
  { path: '/admin/financial',label: 'Financeiro', icon: 'chart-line' },
];

function isActive(path: string): boolean {
  if (path === '/admin') return route.path === '/admin';
  return route.path.startsWith(path);
}

function toggleSidebar() {
  appStore.toggleSidebar();
}

function goToProfile() {
  router.push('/profile');
}

function goToSettings() {
  router.push('/settings');
}

function logout() {
  authStore.clearAuth();
  router.push('/login');
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/colors' as *;
@use '@/assets/scss/spacing' as *;
@use '@/assets/scss/mixins' as *;

// ============================================================
// LAYOUT ROOT
// ============================================================
.app-layout {
  display: flex;
  min-height: 100vh;
  background: $bg-secondary;
}

// ============================================================
// MOBILE OVERLAY
// ============================================================
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 49;

  @media (max-width: 768px) {
    display: block;
  }
}

// ============================================================
// SIDEBAR
// ============================================================
.sidebar {
  width: 256px;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 50;
  overflow: hidden;

  &--collapsed {
    width: 68px;

    .sidebar__brand,
    .sidebar__label,
    .sidebar__section-label {
      display: none;
    }
  }

  // Mobile: off-screen by default, slide in when open
  @media (max-width: 768px) {
    transform: translateX(-100%);
    width: 256px !important;

    &--mobile-open {
      transform: translateX(0);
    }
  }

  // ---- Header ----
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-5 $spacing-4;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    min-height: 68px;
  }

  &__logo {
    width: 36px;
    height: 36px;
    object-fit: contain;
    flex-shrink: 0;
    filter: brightness(0) invert(1);
  }

  &__brand {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  // ---- Nav ----
  &__nav {
    flex: 1;
    padding: $spacing-3 $spacing-2;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  }

  &__section-label {
    padding: $spacing-3 $spacing-3 $spacing-1;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;

    &--admin {
      margin-top: $spacing-3;
      color: rgba(255, 190, 60, 0.5);
    }
  }

  &__divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: $spacing-3 $spacing-2;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: 10px $spacing-3;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #fff;
    }

    &--active {
      background: rgba($primary-500, 0.2);
      color: #fff;
      font-weight: 600;

      .sidebar__icon {
        color: $primary-400;
      }
    }

    &--admin.sidebar__link--active {
      background: rgba(255, 190, 60, 0.15);
      .sidebar__icon { color: #fbbf24; }
    }
  }

  &__icon {
    font-size: 1rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ---- Footer ----
  &__footer {
    padding: $spacing-3 $spacing-2;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 40px;
    background: rgba(255, 255, 255, 0.07);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.875rem;
    transition: all 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
  }
}

// ============================================================
// MAIN AREA
// ============================================================
.main {
  flex: 1;
  margin-left: 256px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.25s ease;

  &--expanded {
    margin-left: 68px;
  }

  @media (max-width: 768px) {
    margin-left: 0 !important;
  }
}

// ============================================================
// TOPBAR
// ============================================================
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  padding: 0 $spacing-6;
  background: $bg-primary;
  border-bottom: 1px solid $border-light;
  position: sticky;
  top: 0;
  z-index: 40;
  gap: $spacing-4;

  @media (max-width: 768px) {
    padding: 0 $spacing-4;
  }

  // ---- Left ----
  &__left {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    min-width: 0;
  }

  &__mobile-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: 1px solid $border-light;
    border-radius: 8px;
    cursor: pointer;
    color: $text-secondary;
    font-size: 1rem;
    flex-shrink: 0;
    transition: all 0.15s ease;

    &:hover { background: $neutral-100; }

    @media (max-width: 768px) { display: flex; }
  }

  &__breadcrumb {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  &__page-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__page-subtitle {
    font-size: 0.8125rem;
    color: $text-tertiary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 640px) { display: none; }
  }

  // ---- Right ----
  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    flex-shrink: 0;
  }

  &__icon-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: $text-secondary;
    font-size: 1rem;
    transition: all 0.15s ease;

    &:hover {
      background: $neutral-100;
      color: $text-primary;
    }
  }

  &__badge {
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: $error;
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 700;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid $bg-primary;
  }

  &__user-btn {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-2 $spacing-3;
    background: transparent;
    border: 1px solid $border-light;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: $neutral-50;
      border-color: $neutral-300;
    }
  }

  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, $primary-500, $primary-700);
    color: #fff;
    font-weight: 700;
    font-size: 0.8125rem;
    border-radius: 8px;
    flex-shrink: 0;
  }

  &__user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;

    @media (max-width: 640px) { display: none; }
  }

  &__user-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
  }

  &__user-role {
    font-size: 0.75rem;
    color: $text-tertiary;
    white-space: nowrap;
  }

  &__chevron {
    font-size: 0.75rem;
    color: $text-tertiary;

    @media (max-width: 640px) { display: none; }
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
.notif-wrapper {
  position: relative;
}

.notif-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  background: $bg-primary;
  border: 1px solid $border-light;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  z-index: 100;
  overflow: hidden;

  @media (max-width: 480px) {
    width: calc(100vw - $spacing-8);
    right: -$spacing-4;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-4 $spacing-5;
    border-bottom: 1px solid $border-light;
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $text-primary;
  }

  &__mark-all {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    color: $primary-500;
    padding: 0;
    font-weight: 500;

    &:hover { text-decoration: underline; }
  }

  &__list {
    display: flex;
    flex-direction: column;
  }
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-3;
  padding: $spacing-4 $spacing-5;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
  border-bottom: 1px solid $border-light;

  &:last-child { border-bottom: none; }

  &:hover { background: $neutral-50; }

  &--read {
    opacity: 0.6;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 0.875rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &--payment &__icon {
    background: rgba($success, 0.12);
    color: $success;
  }

  &--network &__icon {
    background: rgba($primary-500, 0.12);
    color: $primary-500;
  }

  &--warning &__icon {
    background: rgba($warning, 0.14);
    color: $warning;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    font-size: 0.8125rem;
    color: $text-secondary;
    margin: 0 0 4px;
    line-height: 1.4;
  }

  &__time {
    font-size: 0.75rem;
    color: $text-tertiary;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $primary-500;
    flex-shrink: 0;
    margin-top: 6px;
  }
}

// ============================================================
// DROPDOWN ITEMS (override global)
// ============================================================
:deep(.ds-dropdown-item__icon) {
  width: 14px;
  margin-right: $spacing-2;
  color: $text-tertiary;
}

:deep(.ds-dropdown-item) {
  display: flex;
  align-items: center;
}

:deep(.ds-dropdown-divider) {
  margin: 6px 0;
  border: none;
  border-top: 1px solid $border-light;
}

// ============================================================
// CONTENT
// ============================================================
.content {
  flex: 1;
  padding: $spacing-6;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: $spacing-4;
  }
}
</style>
