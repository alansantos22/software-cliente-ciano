// ========================================
// MOCK: Dashboard - Sistema de Cotas Ciano
// Dados persuasivos: Split, Carreira, Saúde
// ========================================

export interface SplitTickerData {
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  splitProgress: number;        // 0-100 % toward next event
  quotasToNextEvent: number;    // How many quota purchases trigger the event
  nextEventLabel: string;
}

export interface CareerProgressData {
  currentLevel: 'bronze' | 'prata' | 'ouro' | 'diamante';
  nextLevel: 'bronze' | 'prata' | 'ouro' | 'diamante';
  currentValue: number;        // Sales volume accumulated
  targetValue: number;         // Sales volume required for next level
  bonusPercentUnlock: number;
}

export interface AccountHealthData {
  status: 'active' | 'warning' | 'critical';
  daysRemaining: number;
  lastPurchaseDate: string;
  renewalDeadline: string;
}

export interface DashboardKpiData {
  estimatedPatrimony: number;   // Total invested + valorization
  availableWithdraw: number;    // What they can withdraw NOW
  activeDirects: number;
  totalDirects: number;
  inactiveDirects: number;
  networkTotal: number;
}

export interface EarningSourceData {
  label: string;
  value: number;
  color: string;
  type: string;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  description: string;
  sourceUserName: string | null;
  sourceAvatarInitials: string | null;
  sourceAvatarColor: string | null;
  amount: number;
  date: string;
}

// ─── Mock data ────────────────────────────────────────────────

export const mockSplitTicker: SplitTickerData = {
  currentPrice: 2500,
  previousPrice: 2000,
  changePercent: 25,
  splitProgress: 85,
  quotasToNextEvent: 48,
  nextEventLabel: 'Aumento de Preço',
};

export const mockCareerProgress: CareerProgressData = {
  currentLevel: 'ouro',
  nextLevel: 'diamante',
  currentValue: 2,   // 2 Bronzes in different lines achieved
  targetValue: 3,    // 3 Bronzes in different lines needed for Diamante
  bonusPercentUnlock: 2,
};

export const mockAccountHealth: AccountHealthData = {
  status: 'warning',
  daysRemaining: 8,
  lastPurchaseDate: '2025-08-14T10:00:00Z',
  renewalDeadline: '2026-02-14T10:00:00Z',
};

export const mockDashboardKpi: DashboardKpiData = {
  estimatedPatrimony: 17500,
  availableWithdraw: 5200,
  activeDirects: 10,
  totalDirects: 12,
  inactiveDirects: 2,
  networkTotal: 45,
};

export const DONUT_COLORS = {
  firstPurchase: '#00bcd4',
  repurchase:    '#4caf50',
  team:          '#ff9800',
  leadership:    '#ffc107',
  dividend:      '#7c3aed',
};

export function buildEarningsSources(
  firstPurchase: number,
  repurchase: number,
  team: number,
  leadership: number,
  dividend: number
): EarningSourceData[] {
  return [
    { label: 'Bônus Primeira Compra', value: firstPurchase, color: DONUT_COLORS.firstPurchase, type: 'firstPurchase' },
    { label: 'Bônus Recompra',        value: repurchase,    color: DONUT_COLORS.repurchase,    type: 'repurchase' },
    { label: 'Bônus Equipe',          value: team,          color: DONUT_COLORS.team,          type: 'team' },
    { label: 'Bônus Liderança',       value: leadership,    color: DONUT_COLORS.leadership,    type: 'leadership' },
    { label: 'Dividendos',            value: dividend,      color: DONUT_COLORS.dividend,      type: 'dividend' },
  ];
}

const AVATAR_COLORS = [
  '#00bcd4', '#4caf50', '#7c3aed', '#ff9800', '#e91e63',
  '#3f51b5', '#f44336', '#009688',
];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => (w[0] ?? '').toUpperCase())
    .join('');
}

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? AVATAR_COLORS[0] ?? '#00bcd4';
}

export const mockRecentActivity: RecentActivityItem[] = [
  {
    id: 'act-001',
    type: 'Primeira Compra',
    description: 'Indicação direta',
    sourceUserName: 'João Silva',
    sourceAvatarInitials: initials('João Silva'),
    sourceAvatarColor: avatarColor('João Silva'),
    amount: 250,
    date: '2026-02-17',
  },
  {
    id: 'act-002',
    type: 'Bônus Recompra',
    description: 'Nível 2 - rede de João',
    sourceUserName: 'Ana Costa',
    sourceAvatarInitials: initials('Ana Costa'),
    sourceAvatarColor: avatarColor('Ana Costa'),
    amount: 75.50,
    date: '2026-02-16',
  },
  {
    id: 'act-003',
    type: 'Dividendo',
    description: 'Dividendo mensal',
    sourceUserName: null,
    sourceAvatarInitials: null,
    sourceAvatarColor: null,
    amount: 320,
    date: '2026-02-15',
  },
  {
    id: 'act-004',
    type: 'Bônus Liderança',
    description: 'Bônus de liderança Ouro',
    sourceUserName: null,
    sourceAvatarInitials: null,
    sourceAvatarColor: null,
    amount: 500,
    date: '2026-02-12',
  },
  {
    id: 'act-005',
    type: 'Compra',
    description: 'Aquisição de 2 cotas',
    sourceUserName: null,
    sourceAvatarInitials: null,
    sourceAvatarColor: null,
    amount: -2500,
    date: '2026-02-08',
  },
];
