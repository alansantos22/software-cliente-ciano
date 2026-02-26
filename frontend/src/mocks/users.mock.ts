// ========================================
// MOCK: Users - Sistema de Cotas Ciano
// ========================================

export type UserTitle = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
export type PartnerLevel = 'socio' | 'platinum' | 'vip' | 'imperial';
export type UserRole = 'admin' | 'user';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  cpf: string;
  role: UserRole;
  title: UserTitle;
  partnerLevel: PartnerLevel;
  sponsorId: string | null;
  referralCode: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  // Financial
  /**
   * Cotas compradas diretamente.
   * ⚠️ REGRA DO SISTEMA: apenas estas definem o nível (partnerLevel).
   */
  purchasedQuotas: number;
  /**
   * Cotas recebidas via split (bônus em cotas).
   * ⚠️ REGRA DO SISTEMA: não sobem de nível, apenas contribuem para dividendos.
   */
  splitQuotas: number;
  /** Total para dividendos = purchasedQuotas + splitQuotas. NÃO usar para nível. */
  quotaBalance: number;
  availableWithdraw: number;
  totalEarnings: number;
  /** Data da última compra de cota. Se null ou mais de 6 meses atrás → conta inativa. */
  lastPurchaseDate: string | null;
  // Network stats
  directCount: number;
  teamCount: number;
}

// Generate deterministic users
export const mockUsers: MockUser[] = [
  // Admin user
  {
    id: 'user-001',
    email: 'admin@ciano.com',
    name: 'Administrador Master',
    phone: '11999999999',
    cpf: '12345678901',
    role: 'admin',
    title: 'diamond',
    partnerLevel: 'imperial',
    sponsorId: null,
    referralCode: 'ADMIN001',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastPurchaseDate: '2025-12-01T00:00:00Z',
    purchasedQuotas: 100, // Imperial (≥60 compradas)
    splitQuotas: 15,
    quotaBalance: 115,    // purchased + split (dividendos)
    availableWithdraw: 50000,
    totalEarnings: 250000,
    directCount: 10,
    teamCount: 150,
  },
  // Level 1 - Direct from Admin
  {
    id: 'user-002',
    email: 'joao.silva@email.com',
    name: 'João Silva',
    phone: '11988887777',
    cpf: '98765432100',
    role: 'user',
    title: 'gold',
    partnerLevel: 'vip',
    sponsorId: 'user-001',
    referralCode: 'JOAO002',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    lastPurchaseDate: '2025-10-15T10:30:00Z',
    purchasedQuotas: 50, // VIP (≥20 compradas)
    splitQuotas: 7,
    quotaBalance: 57,
    availableWithdraw: 15000,
    totalEarnings: 85000,
    directCount: 8,
    teamCount: 45,
  },
  {
    id: 'user-003',
    email: 'maria.santos@email.com',
    name: 'Maria Santos',
    phone: '11977776666',
    cpf: '11122233344',
    role: 'user',
    title: 'silver',
    partnerLevel: 'platinum',
    sponsorId: 'user-001',
    referralCode: 'MARIA003',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-02-01T08:00:00Z',
    lastPurchaseDate: '2025-11-01T08:00:00Z',
    purchasedQuotas: 30, // Platinum (≥10 compradas)
    splitQuotas: 4,
    quotaBalance: 34,
    availableWithdraw: 8500,
    totalEarnings: 42000,
    directCount: 5,
    teamCount: 22,
  },
  {
    id: 'user-004',
    email: 'carlos.lima@email.com',
    name: 'Carlos Lima',
    phone: '11966665555',
    cpf: '22233344455',
    role: 'user',
    title: 'bronze',
    partnerLevel: 'platinum',
    sponsorId: 'user-001',
    referralCode: 'CARLOS004',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-02-10T14:20:00Z',
    lastPurchaseDate: '2025-07-01T14:20:00Z',
    purchasedQuotas: 10, // Platinum (≥10 compradas)
    splitQuotas: 2,
    quotaBalance: 12,
    availableWithdraw: 2500,
    totalEarnings: 12000,
    directCount: 3,
    teamCount: 8,
  },
  // Level 2 - Under João (user-002)
  {
    id: 'user-005',
    email: 'ana.costa@email.com',
    name: 'Ana Costa',
    phone: '11955554444',
    cpf: '33344455566',
    role: 'user',
    title: 'silver',
    partnerLevel: 'platinum',
    sponsorId: 'user-002',
    referralCode: 'ANA005',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-02-20T09:15:00Z',
    lastPurchaseDate: '2025-09-20T09:15:00Z',
    purchasedQuotas: 25, // VIP (≥20 compradas)
    splitQuotas: 3,
    quotaBalance: 28,
    availableWithdraw: 6200,
    totalEarnings: 28500,
    directCount: 4,
    teamCount: 15,
  },
  {
    id: 'user-006',
    email: 'pedro.alves@email.com',
    name: 'Pedro Alves',
    phone: '11944443333',
    cpf: '44455566677',
    role: 'user',
    title: 'bronze',
    partnerLevel: 'platinum',
    sponsorId: 'user-002',
    referralCode: 'PEDRO006',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-03-01T11:45:00Z',
    lastPurchaseDate: '2025-06-10T11:45:00Z',
    purchasedQuotas: 15, // Platinum (≥10 compradas)
    splitQuotas: 2,
    quotaBalance: 17,
    availableWithdraw: 3800,
    totalEarnings: 15600,
    directCount: 2,
    teamCount: 5,
  },
  // Level 2 - Under Maria (user-003)
  {
    id: 'user-007',
    email: 'lucia.ferreira@email.com',
    name: 'Lúcia Ferreira',
    phone: '11933332222',
    cpf: '55566677788',
    role: 'user',
    title: 'bronze',
    partnerLevel: 'socio',
    sponsorId: 'user-003',
    referralCode: 'LUCIA007',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-03-05T16:30:00Z',
    lastPurchaseDate: '2025-12-05T16:30:00Z',
    purchasedQuotas: 8, // Sócio (≥1 comprada)
    splitQuotas: 1,
    quotaBalance: 9,
    availableWithdraw: 1800,
    totalEarnings: 8200,
    directCount: 1,
    teamCount: 3,
  },
  // Level 3 - Under Ana (user-005)
  {
    id: 'user-008',
    email: 'roberto.mendes@email.com',
    name: 'Roberto Mendes',
    phone: '11922221111',
    cpf: '66677788899',
    role: 'user',
    title: 'none',
    partnerLevel: 'socio',
    sponsorId: 'user-005',
    referralCode: 'ROBERTO008',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-03-15T10:00:00Z',
    lastPurchaseDate: '2025-10-15T10:00:00Z',
    purchasedQuotas: 5, // Sócio (≥1 comprada)
    splitQuotas: 0,
    quotaBalance: 5,
    availableWithdraw: 950,
    totalEarnings: 4200,
    directCount: 0,
    teamCount: 0,
  },
  {
    id: 'user-009',
    email: 'fernanda.rocha@email.com',
    name: 'Fernanda Rocha',
    phone: '11911110000',
    cpf: '77788899900',
    role: 'user',
    title: 'none',
    partnerLevel: 'socio',
    sponsorId: 'user-005',
    referralCode: 'FERNANDA009',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-03-20T13:25:00Z',
    lastPurchaseDate: '2025-06-20T13:25:00Z',
    purchasedQuotas: 3, // Sócio (≥1 comprada)
    splitQuotas: 0,
    quotaBalance: 3,
    availableWithdraw: 620,
    totalEarnings: 2800,
    directCount: 0,
    teamCount: 0,
  },
  // Inactive user example
  {
    id: 'user-010',
    email: 'inativo@email.com',
    name: 'Usuário Inativo',
    phone: '11900001111',
    cpf: '88899900011',
    role: 'user',
    title: 'none',
    partnerLevel: 'socio',
    sponsorId: 'user-003',
    referralCode: 'INATIVO010',
    avatarUrl: null,
    isActive: false,
    createdAt: '2024-02-25T08:30:00Z',
    lastPurchaseDate: null,
    purchasedQuotas: 0,
    splitQuotas: 0,
    quotaBalance: 0,
    availableWithdraw: 0,
    totalEarnings: 500,
    directCount: 0,
    teamCount: 0,
  },
  // More users for variety
  {
    id: 'user-011',
    email: 'marcos.souza@email.com',
    name: 'Marcos Souza',
    phone: '21999998888',
    cpf: '99900011122',
    role: 'user',
    title: 'gold',
    partnerLevel: 'vip',
    sponsorId: 'user-001',
    referralCode: 'MARCOS011',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-01-20T10:00:00Z',
    lastPurchaseDate: '2025-12-20T10:00:00Z',
    purchasedQuotas: 40, // VIP (≥20 compradas)
    splitQuotas: 6,
    quotaBalance: 46,
    availableWithdraw: 12000,
    totalEarnings: 65000,
    directCount: 6,
    teamCount: 32,
  },
  {
    id: 'user-012',
    email: 'julia.martins@email.com',
    name: 'Júlia Martins',
    phone: '21988887777',
    cpf: '00011122233',
    role: 'user',
    title: 'silver',
    partnerLevel: 'vip',
    sponsorId: 'user-011',
    referralCode: 'JULIA012',
    avatarUrl: null,
    isActive: true,
    createdAt: '2024-02-15T14:30:00Z',
    lastPurchaseDate: '2025-11-15T14:30:00Z',
    purchasedQuotas: 20, // VIP (≥20 compradas)
    splitQuotas: 3,
    quotaBalance: 23,
    availableWithdraw: 5500,
    totalEarnings: 24000,
    directCount: 3,
    teamCount: 10,
  },
];

// Helper functions
export function getMockUserById(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getMockUserByEmail(email: string): MockUser | undefined {
  return mockUsers.find((u) => u.email === email);
}

export function getMockUserBySponsor(sponsorId: string): MockUser[] {
  return mockUsers.filter((u) => u.sponsorId === sponsorId);
}

/**
 * Retorna true se a conta expirou por inatividade:
 * sem compra nos últimos 6 meses (ou nunca comprou).
 */
export function isAccountExpired(user: MockUser): boolean {
  if (!user.lastPurchaseDate) return true;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(user.lastPurchaseDate) < sixMonthsAgo;
}

/** Retorna usuários com conta ativa (flag isActive + não expiradas por 6 meses). */
export function getActiveUsers(): MockUser[] {
  return mockUsers.filter((u) => u.isActive && !isAccountExpired(u));
}

// Auth mock - returns user if credentials match (all use 'senha123' as password)
export function mockAuthenticate(email: string, _password: string): MockUser | null {
  const user = getMockUserByEmail(email);
  if (user && user.isActive && !isAccountExpired(user)) {
    return user;
  }
  return null;
}
