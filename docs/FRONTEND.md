# 📦 Sistema de Cotas Ciano - Documentação do Frontend

> Documentação técnica completa do frontend Vue.js 3 para o Sistema de Cotas do Grupo de Pousadas Ciano.

**Última Atualização:** 2026-02-18  
**Versão:** 1.0.0  
**Status:** ETAPA 2 Concluída (Frontend com Mocks)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Design System](#design-system)
5. [Features e Views](#features-e-views)
6. [Sistema de Mocks](#sistema-de-mocks)
7. [Roteamento](#roteamento)
8. [State Management](#state-management)
9. [Estilização (SCSS)](#estilização-scss)
10. [Layouts](#layouts)
11. [Guia de Desenvolvimento](#guia-de-desenvolvimento)

---

## 🎯 Visão Geral

O frontend do Sistema de Cotas Ciano é uma aplicação Single Page Application (SPA) construída com Vue.js 3, projetada para gerenciar cotas de participação em um grupo de pousadas. O sistema implementa:

- **Área Pública:** Landing page, login, recuperação de senha
- **Área do Usuário:** Dashboard, rede de indicados, compra de cotas, perfil
- **Área Administrativa:** Gestão de pagamentos, configurações financeiras

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        App.vue                               │
├─────────────────────────────────────────────────────────────┤
│                     Vue Router                               │
├─────────────┬─────────────────────────┬─────────────────────┤
│ PublicLayout │      AppLayout         │   AdminLayout       │
│  (Login,    │   (Dashboard, Rede,    │  (Pagamentos,       │
│  Landing)   │    Checkout, etc.)     │   Financeiro)       │
├─────────────┴─────────────────────────┴─────────────────────┤
│                   Pinia Stores                               │
├─────────────────────────────────────────────────────────────┤
│                 Design System (Ds*)                          │
├─────────────────────────────────────────────────────────────┤
│              Mocks / Services / API                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Vue.js** | 3.5+ | Framework principal |
| **Vite** | 6.4+ | Build tool e dev server |
| **TypeScript** | 5.7+ | Tipagem estática |
| **Pinia** | 3.0+ | State management |
| **Vue Router** | 4.5+ | Roteamento SPA |
| **SASS/SCSS** | 1.88+ | Preprocessador CSS |
| **Axios** | 1.9+ | Cliente HTTP |
| **vue-i18n** | 10+ | Internacionalização |

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento (http://localhost:5173)

# Build
npm run build        # Build de produção (vue-tsc + vite build)
npm run preview      # Preview do build de produção

# Linting
npm run lint         # ESLint + type-check
```

---

## 📁 Estrutura de Pastas

```
frontend/src/
├── assets/
│   ├── images/
│   │   └── logo.svg                 # Logo Ciano (SVG)
│   └── scss/
│       ├── _colors.scss             # Paleta de cores (Ciano theme)
│       ├── _mixins.scss             # Mixins SCSS reutilizáveis
│       ├── _reset.scss              # Reset CSS
│       ├── _spacing.scss            # Sistema de espaçamento
│       ├── _typography.scss         # Tipografia
│       └── main.scss                # Entry point SCSS
│
├── config/
│   └── axios.ts                     # Configuração Axios + interceptors
│
├── design-system/                   # Componentes base (15 componentes)
│   ├── DsAccordion.vue
│   ├── DsAlert.vue
│   ├── DsBadge.vue
│   ├── DsButton.vue
│   ├── DsCard.vue
│   ├── DsCopyButton.vue
│   ├── DsDropdown.vue
│   ├── DsEmptyState.vue
│   ├── DsInput.vue
│   ├── DsModal.vue
│   ├── DsMonthPicker.vue
│   ├── DsStatCard.vue
│   ├── DsTable.vue
│   ├── DsTooltip.vue
│   ├── DsTreeList.vue
│   └── index.ts                     # Export centralizado
│
├── features/                        # Features por domínio
│   ├── admin/
│   │   └── views/
│   │       ├── AdminDashboardView.vue
│   │       ├── AdminFinancialConfigView.vue
│   │       └── AdminPayoutsView.vue
│   │
│   ├── auth/
│   │   └── views/
│   │       ├── ForgotPasswordView.vue
│   │       ├── LoginView.vue
│   │       └── ResetPasswordView.vue
│   │
│   ├── checkout/
│   │   └── views/
│   │       ├── CheckoutConfirmationView.vue
│   │       └── CheckoutView.vue
│   │
│   ├── dashboard/
│   │   └── views/
│   │       └── DashboardView.vue
│   │
│   ├── landing/
│   │   └── views/
│   │       └── LandingView.vue
│   │
│   ├── network/
│   │   └── views/
│   │       └── NetworkView.vue
│   │
│   ├── onboarding/
│   │   └── views/
│   │       └── RegisterNewUserView.vue
│   │
│   └── quotas/
│       └── views/
│           └── QuotaInfoView.vue
│
├── i18n/
│   ├── locales/
│   │   ├── en.json                  # Traduções inglês
│   │   └── pt-BR.json               # Traduções português
│   └── index.ts
│
├── layouts/
│   ├── AppLayout.vue                # Layout área autenticada
│   └── PublicLayout.vue             # Layout área pública
│
├── mocks/                           # Dados fake para desenvolvimento
│   ├── earnings.mock.ts
│   ├── financial.mock.ts
│   ├── index.ts
│   ├── network.mock.ts
│   ├── payouts.mock.ts
│   ├── quotas.mock.ts
│   └── users.mock.ts
│
├── router/
│   ├── guards/
│   │   ├── admin.guard.ts
│   │   ├── auth.guard.ts
│   │   └── guest.guard.ts
│   ├── routes/
│   │   ├── admin.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── checkout.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── public.routes.ts
│   └── index.ts
│
├── shared/
│   ├── components/
│   │   └── NotFound.vue
│   ├── stores/
│   │   ├── app.store.ts
│   │   └── auth.store.ts
│   └── types/
│       └── index.ts
│
├── App.vue
└── main.ts
```

---

## 🎨 Design System

O Design System Ciano (`Ds*`) é um conjunto de 15 componentes Vue reutilizáveis que garantem consistência visual em toda a aplicação.

### Componentes Disponíveis

#### DsButton
Botão com variantes e estados.

```vue
<DsButton variant="primary" size="md" :loading="false" :disabled="false">
  Texto do Botão
</DsButton>
```

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamanho |
| `loading` | `boolean` | `false` | Estado de loading |
| `disabled` | `boolean` | `false` | Desabilitado |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Tipo HTML |

#### DsInput
Campo de entrada com validação visual.

```vue
<DsInput
  v-model="email"
  type="email"
  label="E-mail"
  placeholder="seu@email.com"
  :error="emailError"
/>
```

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | Tipo do input |
| `label` | `string` | — | Label do campo |
| `placeholder` | `string` | — | Placeholder |
| `error` | `string` | — | Mensagem de erro |
| `disabled` | `boolean` | `false` | Desabilitado |

#### DsCard
Container com header, body e footer.

```vue
<DsCard variant="elevated">
  <template #header>Título</template>
  Conteúdo do card
  <template #footer>Rodapé</template>
</DsCard>
```

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `variant` | `'default' \| 'elevated' \| 'outlined'` | `'default'` | Estilo visual |

#### DsStatCard
Card de estatística para dashboards.

```vue
<DsStatCard
  label="Total de Vendas"
  :value="formatCurrency(15000)"
  icon="💰"
  subtitle="Este mês"
  :trend="12.5"
/>
```

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `label` | `string` | ✅ | Título da métrica |
| `value` | `string \| number` | ✅ | Valor principal |
| `icon` | `string` | — | Emoji ou ícone |
| `subtitle` | `string` | — | Texto secundário |
| `trend` | `number` | — | % de variação (+ verde, - vermelho) |

#### DsTable
Tabela com sorting, paginação e slots.

```vue
<DsTable :columns="columns" :data="items" :loading="isLoading">
  <template #status="{ row }">
    <DsBadge :variant="row.status === 'active' ? 'success' : 'default'">
      {{ row.status }}
    </DsBadge>
  </template>
</DsTable>
```

#### DsBadge
Badge para status e labels.

```vue
<DsBadge variant="success" size="sm">Ativo</DsBadge>
```

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `variant` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'info'` | `'default'` | Cor |
| `size` | `'sm' \| 'md'` | `'md'` | Tamanho |

#### DsModal
Modal com overlay e animação.

```vue
<DsModal v-model="showModal" title="Confirmar Ação" size="md">
  Conteúdo do modal
  <template #footer>
    <DsButton @click="showModal = false">Cancelar</DsButton>
    <DsButton variant="primary" @click="confirm">Confirmar</DsButton>
  </template>
</DsModal>
```

#### DsTreeList
Lista em árvore para estruturas hierárquicas.

```vue
<DsTreeList :nodes="networkTree" label-key="name">
  <template #item="{ item }">
    <span>{{ item.name }}</span>
    <DsBadge>{{ item.title }}</DsBadge>
  </template>
</DsTreeList>
```

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `nodes` | `TreeNode[]` | — | Array de nós |
| `nodeKey` | `string` | `'id'` | Chave única |
| `labelKey` | `string` | `'label'` | Chave do label |
| `childrenKey` | `string` | `'children'` | Chave dos filhos |

#### DsAccordion
Accordion expansível para FAQ.

```vue
<DsAccordion :items="faqItems" />
```

#### DsAlert
Alertas com tipos semânticos.

```vue
<DsAlert type="warning" dismissible>
  Este é um aviso importante!
</DsAlert>
```

#### DsDropdown
Menu dropdown com posicionamento.

```vue
<DsDropdown align="right">
  <template #trigger>
    <DsButton>Menu</DsButton>
  </template>
  <a class="ds-dropdown-item" @click="action1">Opção 1</a>
  <a class="ds-dropdown-item ds-dropdown-item--danger" @click="logout">Sair</a>
</DsDropdown>
```

#### DsCopyButton
Botão para copiar texto.

```vue
<DsCopyButton :text="referralLink" label="Copiar Link" success-label="Copiado!" />
```

#### DsMonthPicker
Seletor de mês/ano.

```vue
<DsMonthPicker v-model="selectedMonth" />
```

#### DsEmptyState
Estado vazio com ilustração.

```vue
<DsEmptyState
  icon="📭"
  title="Nenhum resultado"
  description="Não encontramos dados para exibir"
>
  <DsButton variant="primary">Adicionar</DsButton>
</DsEmptyState>
```

#### DsTooltip
Tooltip com posicionamento.

```vue
<DsTooltip content="Texto do tooltip" position="top">
  <span>Hover aqui</span>
</DsTooltip>
```

---

## 🖥️ Features e Views

### Auth (Autenticação)

#### LoginView.vue
- **Rota:** `/login`
- **Campos:** Email, Senha, "Lembrar-me"
- **Validações:** Email formato, senha mínimo 8 caracteres
- **Mock:** `mockAuthenticate(email, password)` → retorna user ou null
- **Credenciais de teste:**
  - Admin: `admin@ciano.com` / qualquer senha
  - Usuário: `joao.silva@email.com` / qualquer senha

#### ForgotPasswordView.vue
- **Rota:** `/forgot-password`
- **Função:** Solicita link de recuperação via email
- **Feedback:** Mensagem de sucesso simulada

#### ResetPasswordView.vue
- **Rota:** `/reset-password/:token`
- **Função:** Redefine senha com token
- **Validações:** Senhas iguais, mínimo 8 caracteres

### Dashboard

#### DashboardView.vue
- **Rota:** `/dashboard`
- **Seções:**
  - Header com boas-vindas e badge de título
  - Stats cards (Saldo, Ganhos, Rede Direta, Total Rede)
  - Resumo de ganhos por tipo com seletor de mês
  - Histórico de atividades recente
  - Quick links (Rede, Cotas, Copiar Link)

### Network (Rede)

#### NetworkView.vue
- **Rota:** `/network`
- **Funcionalidades:**
  - Visualização em árvore dos indicados
  - Stats da rede (diretos, total, níveis, ganhos)
  - Botão de copiar link de indicação
  - Modal de compartilhamento com QR Code placeholder

### Checkout

#### CheckoutView.vue
- **Rota:** `/checkout`
- **Fluxo 4 etapas:**
  1. **Seleção de pacote** — Básico (5 cotas), Padrão (15), Premium (50)
  2. **Quantidade personalizada** — Ajuste fino com +/-
  3. **Resumo** — Valor total, benefícios
  4. **Pagamento** — Instruções PIX (placeholder)

#### CheckoutConfirmationView.vue
- **Rota:** `/checkout/confirmation/:transactionId`
- **Conteúdo:** Parabéns, resumo da compra, próximos passos

### Quotas (Informações)

#### QuotaInfoView.vue
- **Rota:** `/quotas`
- **Seções:**
  - Como funciona (4 passos)
  - Pacotes disponíveis
  - Tipos de ganhos (6 tipos com ícones)
  - Plano de carreira (Bronze → Diamante)
  - FAQ (accordion)

### Admin

#### AdminDashboardView.vue
- **Rota:** `/admin`
- **Guard:** Apenas role `admin`
- **Stats:** Usuários, cotas, receita, pagamentos pendentes
- **Lista:** Pagamentos pendentes recentes

#### AdminPayoutsView.vue
- **Rota:** `/admin/payouts`
- **Funcionalidades:**
  - Seletor de mês
  - Filtros (status, busca)
  - Tabela de pagamentos com ações
  - Totais calculados
  - Modal de detalhes

#### AdminFinancialConfigView.vue
- **Rota:** `/admin/financial`
- **Configurações:**
  - Valores de cotas
  - Percentuais de comissão por nível
  - Dividendos
  - Bônus de carreira

### Landing

#### LandingView.vue
- **Rota:** `/` ou `/invite/:referralCode`
- **Seções:**
  - Hero com CTA
  - Sobre o Ciano
  - Benefícios
  - Plano de carreira
  - FAQ
  - Footer

### Onboarding

#### RegisterNewUserView.vue
- **Rota:** `/register-user`
- **Guard:** Usuário autenticado
- **Campos:** Nome, CPF, Email, Telefone, Cidade, Estado, PIX
- **Função:** Cadastra novo membro na rede do usuário

---

## 🎭 Sistema de Mocks

Os mocks simulam a API durante o desenvolvimento, permitindo trabalhar no frontend independente do backend.

### Estrutura dos Mocks

```typescript
// mocks/index.ts - Exports centralizados
export * from './users.mock';
export * from './quotas.mock';
export * from './earnings.mock';
export * from './network.mock';
export * from './payouts.mock';
export * from './financial.mock';

export const mockDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));
```

### users.mock.ts

```typescript
interface MockUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  cpf: string;
  role: 'admin' | 'user';
  title: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  partnerLevel: 'socio' | 'platinum' | 'vip' | 'imperial';
  sponsorId: string | null;
  referralCode: string;
  isActive: boolean;
  quotaBalance: number;
  totalEarnings: number;
  directCount: number;
  teamCount: number;
}

// 12 usuários com hierarquia multinível
export const mockUsers: MockUser[];

// Helpers
export function getMockUserById(id: string): MockUser | undefined;
export function getMockUserByEmail(email: string): MockUser | undefined;
export function mockAuthenticate(email: string, password: string): MockUser | null;
```

### earnings.mock.ts

```typescript
interface EarningEntry {
  id: string;
  userId: string;
  bonusType: 'direct' | 'indirect' | 'residual' | 'leadership' | 'performance' | 'fidelity';
  amount: number;
  sourceUserId: string | null;
  description: string;
  level: number;
  referenceMonth: string; // YYYY-MM
  status: 'pending' | 'paid' | 'cancelled';
}

interface UserEarningsOverview {
  userId: string;
  totalEarned: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  averageMonthly: number;
  lossProjection: number;
}

// Helpers
export function getUserOverview(userId: string): UserEarningsOverview | undefined;
export function getMonthlySummary(userId: string, month: string): MonthlyEarningSummary | undefined;
```

### network.mock.ts

```typescript
interface NetworkNode {
  id: string;
  name: string;
  title: UserTitle;
  level: number;
  quotaCount: number;
  isActive: boolean;
  children?: NetworkNode[];
}

export const mockNetworkTree: NetworkNode; // Árvore completa
```

### payouts.mock.ts

```typescript
interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  amount: number;
  referenceMonth: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
}

export function getPendingPayouts(): PayoutRequest[];
```

### quotas.mock.ts

```typescript
interface QuotaConfig {
  quotaPrice: number;
  minPurchase: number;
  maxPurchase: number;
  splitThreshold: number;
}

export const mockQuotaConfig: QuotaConfig;
```

### financial.mock.ts

```typescript
interface GlobalSettings {
  companyName: string;
  paymentDay: number;
  pixEnabled: boolean;
  commissionRates: {
    direct: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
}

export const mockGlobalSettings: GlobalSettings;
```

---

## 🛤️ Roteamento

### Estrutura de Rotas

```typescript
// router/index.ts
const routes = [
  // Públicas
  { path: '/', component: LandingView },
  { path: '/invite/:referralCode', component: LandingView },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/forgot-password', component: ForgotPasswordView },
  { path: '/reset-password/:token', component: ResetPasswordView },
  
  // Autenticadas
  { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/network', component: NetworkView, meta: { requiresAuth: true } },
  { path: '/quotas', component: QuotaInfoView, meta: { requiresAuth: true } },
  { path: '/checkout', component: CheckoutView, meta: { requiresAuth: true } },
  { path: '/checkout/confirmation/:transactionId', component: CheckoutConfirmationView },
  { path: '/register-user', component: RegisterNewUserView, meta: { requiresAuth: true } },
  
  // Admin
  { path: '/admin', component: AdminDashboardView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/payouts', component: AdminPayoutsView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/financial', component: AdminFinancialConfigView, meta: { requiresAuth: true, requiresAdmin: true } },
  
  // 404
  { path: '/:pathMatch(.*)*', component: NotFound },
];
```

### Guards

```typescript
// guards/auth.guard.ts
export function authGuard(to, from, next) {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
}

// guards/admin.guard.ts
export function adminGuard(to, from, next) {
  const authStore = useAuthStore();
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/dashboard');
  } else {
    next();
  }
}

// guards/guest.guard.ts
export function guestGuard(to, from, next) {
  const authStore = useAuthStore();
  if (to.meta.guest && authStore.isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
}
```

---

## 🗃️ State Management

### auth.store.ts

```typescript
export interface User {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  city: string;
  state: string;
  pixKey: string;
  role: 'user' | 'admin';
  referralCode: string;
  isActive: boolean;
  title: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  partnerLevel: 'socio' | 'platinum' | 'vip' | 'imperial';
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const userFullName = computed(() => user.value?.fullName || '');

  // Actions
  function setTokens(access: string, refresh: string);
  function setUser(userData: User);
  function clearAuth(); // Logout
  function loadFromStorage();

  return { user, isAuthenticated, isAdmin, ... };
});
```

### app.store.ts

```typescript
export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false);
  const isSidebarOpen = ref(true);
  const locale = ref<'pt-BR' | 'en'>('pt-BR');
  const theme = ref<'light' | 'dark'>('light');

  // Actions
  function setLoading(loading: boolean);
  function toggleSidebar();
  function setLocale(newLocale: 'pt-BR' | 'en');
  function setTheme(newTheme: 'light' | 'dark');
  function loadPreferences();

  return { isLoading, isSidebarOpen, locale, theme, ... };
});
```

---

## 🎨 Estilização (SCSS)

### Paleta de Cores (_colors.scss)

```scss
// === PRIMARY (Ciano - Azul Esverdeado) ===
$primary-500: #00bcd4;  // Main Primary
$primary-600: #00acc1;
$primary-700: #0097a7;

// === SECONDARY (Verde Natureza) ===
$secondary-500: #4caf50;  // Main Secondary

// === ACCENT (Âmbar) ===
$accent-500: #ffc107;  // Main Accent

// === SEMANTIC ===
$success: #4caf50;
$success-light: #81c784;
$success-dark: #388e3c;

$warning: #ff9800;
$error: #f44336;
$info: #2196f3;

// === TITLES (Níveis de Patrocinador) ===
$title-bronze: #cd7f32;
$title-silver: #c0c0c0;
$title-gold: #ffd700;
$title-diamond: #b9f2ff;

// === TEXT ===
$text-primary: #212121;
$text-secondary: #757575;
$text-tertiary: #9e9e9e;

// === BACKGROUNDS ===
$bg-primary: #ffffff;
$bg-secondary: #fafafa;
```

### Sistema de Espaçamento (_spacing.scss)

```scss
$spacing-1: 0.25rem;  // 4px
$spacing-2: 0.5rem;   // 8px
$spacing-3: 0.75rem;  // 12px
$spacing-4: 1rem;     // 16px
$spacing-5: 1.25rem;  // 20px
$spacing-6: 1.5rem;   // 24px
$spacing-8: 2rem;     // 32px
$spacing-10: 2.5rem;  // 40px
$spacing-12: 3rem;    // 48px

// Border Radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-full: 9999px;
```

### Mixins (_mixins.scss)

```scss
// Flexbox
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin flex-column {
  display: flex;
  flex-direction: column;
}

// Typography
@mixin heading-1 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

// Breakpoints
@mixin mobile {
  @media (max-width: 767px) { @content; }
}

@mixin tablet {
  @media (min-width: 768px) and (max-width: 1023px) { @content; }
}

@mixin desktop {
  @media (min-width: 1024px) { @content; }
}
```

---

## 📐 Layouts

### AppLayout.vue

Layout principal para área autenticada com sidebar e topbar.

**Estrutura:**
```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar  │              Topbar (Title, User Menu)          │
│  (Menu)   │─────────────────────────────────────────────────│
│           │                                                  │
│  - Dash   │                    Content                       │
│  - Rede   │                  (RouterView)                    │
│  - Cotas  │                                                  │
│  - etc.   │                                                  │
│           │                                                  │
└───────────┴─────────────────────────────────────────────────┘
```

**Features:**
- Sidebar colapsável em mobile (hamburger menu)
- Menu dinâmico (itens admin visíveis apenas para admins)
- Topbar com título da página, notificações, menu do usuário
- Dropdown de usuário com Perfil, Configurações, Sair

### PublicLayout.vue (implícito)

Layout limpo para páginas públicas (login, landing, reset password).

---

## 🚀 Guia de Desenvolvimento

### Adicionando Nova Feature

1. **Criar pasta da feature:**
```
src/features/nova-feature/
├── components/
│   └── MeuComponente.vue
├── composables/
│   └── useMinhaLogica.ts
├── services/
│   └── novaFeature.service.ts
└── views/
    └── NovaFeatureView.vue
```

2. **Adicionar rota:**
```typescript
// router/routes/nova-feature.routes.ts
export const novaFeatureRoutes = [
  {
    path: '/nova-feature',
    name: 'NovaFeature',
    component: () => import('@/features/nova-feature/views/NovaFeatureView.vue'),
    meta: { requiresAuth: true, title: 'Nova Feature' },
  },
];
```

3. **Adicionar ao menu (AppLayout.vue):**
```typescript
const menuItems = computed(() => [
  // ... itens existentes
  { path: '/nova-feature', label: 'Nova Feature', icon: '🆕' },
]);
```

### Criando Novo Componente do Design System

1. **Criar componente:**
```
src/design-system/DsNovoComponente.vue
```

2. **Exportar no index:**
```typescript
// design-system/index.ts
export { default as DsNovoComponente } from './DsNovoComponente.vue';
```

3. **Usar em qualquer lugar:**
```vue
<script setup>
import { DsNovoComponente } from '@/design-system';
</script>
```

### Adicionando Novo Mock

1. **Criar arquivo:**
```typescript
// mocks/novo.mock.ts
export interface NovoTipo { ... }
export const mockNovoDado: NovoTipo[] = [ ... ];
export function getNovoItem(id: string): NovoTipo | undefined { ... }
```

2. **Exportar no index:**
```typescript
// mocks/index.ts
export * from './novo.mock';
```

### Conectando ao Backend (Futuro - ETAPA 5)

Quando o backend estiver pronto, será necessário:

1. **Criar service real:**
```typescript
// services/auth.service.ts
import { api } from '@/config/axios';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
};
```

2. **Substituir chamadas mock:**
```typescript
// Antes (mock)
const user = mockAuthenticate(email, password);

// Depois (API real)
const user = await authService.login(email, password);
```

---

## 📝 Changelog

### v1.0.0 (2026-02-18)
- ✅ ETAPA 1: Scaffolding completo
  - Vue 3 + Vite 6 + TypeScript configurado
  - Design System com 15 componentes
  - Sistema de mocks com 7 arquivos
  - Paleta de cores Ciano implementada
  
- ✅ ETAPA 2: Frontend com Mocks
  - Auth: Login, Forgot Password, Reset Password
  - Dashboard com stats e histórico
  - Network com visualização em árvore
  - Checkout com fluxo de 4 etapas
  - Quotas info com FAQ
  - Admin: Dashboard, Payouts, Financial Config
  - AppLayout com sidebar e topbar
  - Responsivo mobile-first

---

## 🔗 Links Úteis

- **Dev Server:** http://localhost:5173
- **Build Output:** `frontend/dist/`
- **Credenciais Mock:**
  - Admin: `admin@ciano.com`
  - Usuário: `joao.silva@email.com`

---

*Documentação gerada automaticamente para o Sistema de Cotas Ciano.*
