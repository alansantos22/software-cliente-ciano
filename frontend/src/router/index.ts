import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/shared/stores';
import AppLayout from '@/layouts/AppLayout.vue';

const routes: RouteRecordRaw[] = [
  // ========== ROOT ==========
  {
    path: '/',
    redirect: '/login',
  },

  // ========== PUBLIC ROUTES (sem layout) ==========
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: { guestOnly: true, title: 'Login' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/features/auth/views/ForgotPasswordView.vue'),
    meta: { guestOnly: true, title: 'Recuperar Senha' },
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: () => import('@/features/auth/views/ResetPasswordView.vue'),
    meta: { guestOnly: true, title: 'Redefinir Senha' },
  },
  {
    path: '/invite/:referralCode',
    name: 'invite',
    component: () => import('@/features/landing/views/LandingView.vue'),
    meta: { title: 'Convite - Ciano' },
  },

  // ========== PROTECTED ROUTES (com AppLayout) ==========
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/features/dashboard/views/DashboardView.vue'),
        meta: { requiresAuth: true, title: 'Dashboard' },
      },
      {
        path: 'network',
        name: 'network',
        component: () => import('@/features/network/views/NetworkView.vue'),
        meta: { requiresAuth: true, title: 'Minha Rede' },
      },
      {
        path: 'quotas',
        name: 'quotas',
        component: () => import('@/features/quotas/views/QuotaInfoView.vue'),
        meta: { requiresAuth: true, title: 'Cotas' },
      },
      {
        path: 'earnings',
        name: 'earnings',
        component: () => import('@/features/earnings/views/EarningsView.vue'),
        meta: { requiresAuth: true, title: 'Histórico' },
      },
      {
        path: 'checkout',
        name: 'checkout',
        component: () => import('@/features/checkout/views/CheckoutView.vue'),
        meta: { requiresAuth: true, title: 'Comprar Cotas' },
      },
      {
        path: 'checkout/confirmation/:transactionId',
        name: 'checkout-confirmation',
        component: () => import('@/features/checkout/views/CheckoutConfirmationView.vue'),
        meta: { requiresAuth: true, title: 'Confirmação' },
      },
      {
        path: 'register-user',
        name: 'register-user',
        component: () => import('@/features/onboarding/views/RegisterNewUserView.vue'),
        meta: { requiresAuth: true, title: 'Cadastrar Membro' },
      },
      // Admin
      {
        path: 'admin',
        name: 'admin-dashboard',
        component: () => import('@/features/admin/views/AdminDashboardView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin' },
      },
      {
        path: 'admin/payouts',
        name: 'admin-payouts',
        component: () => import('@/features/admin/views/AdminPayoutsView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Pagamentos' },
      },
      {
        path: 'admin/financial',
        name: 'admin-financial',
        component: () => import('@/features/admin/views/AdminFinancialConfigView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Config Financeira' },
      },
    ],
  },

  // ========== 404 ==========
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/shared/components/NotFound.vue'),
    meta: { title: 'Página não encontrada' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// Global navigation guards
router.beforeEach((to, _from, next) => {
  // Update document title
  document.title = to.meta.title ? `${to.meta.title} | Ciano` : 'Ciano - Sistema de Cotas';

  const authStore = useAuthStore();

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  // Check if route is guest only
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'dashboard' });
    return;
  }

  next();
});

export default router;
