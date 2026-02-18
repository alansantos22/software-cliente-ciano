// ========================================
// MOCK: Network - Sistema de Cotas Ciano
// ========================================

import type { UserTitle, PartnerLevel } from './users.mock';

export interface NetworkNode {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: UserTitle;
  partnerLevel: PartnerLevel;
  quotaCount: number;
  directCount: number;
  teamCount: number;
  totalVolume: number; // Total team volume in BRL
  isActive: boolean;
  expiresAt: string; // ISO date string of quota expiration
  level: number; // Depth in tree (1 = direct)
  children: NetworkNode[];
}

export interface NetworkStats {
  totalDirect: number;
  totalTeam: number;
  totalVolume: number;
  activeMembers: number;
  inactiveMembers: number;
  titleDistribution: Record<UserTitle, number>;
  levelDistribution: Record<number, number>;
}

// Build network tree for user-001 (Admin)
export const mockNetworkTree: NetworkNode = {
  id: 'user-001',
  name: 'Administrador Master',
  email: 'admin@ciano.com',
  phone: '(11) 99100-0000',
  title: 'diamond',
  partnerLevel: 'imperial',
  quotaCount: 100,
  directCount: 10,
  teamCount: 150,
  totalVolume: 500000,
  isActive: true,
  expiresAt: '2026-08-01',
  level: 0,
  children: [
    {
      id: 'user-002',
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '(11) 99999-0001',
      title: 'gold',
      partnerLevel: 'vip',
      quotaCount: 50,
      directCount: 8,
      teamCount: 45,
      totalVolume: 150000,
      isActive: true,
      expiresAt: '2026-02-28', // 10 dias — quase expirando
      level: 1,
      children: [
        {
          id: 'user-005',
          name: 'Ana Costa',
          email: 'ana.costa@email.com',
          phone: '(11) 99999-0005',
          title: 'silver',
          partnerLevel: 'platinum',
          quotaCount: 25,
          directCount: 4,
          teamCount: 15,
          totalVolume: 50000,
          isActive: true,
          expiresAt: '2026-04-30',
          level: 2,
          children: [
            {
              id: 'user-008',
              name: 'Roberto Mendes',
              email: 'roberto.mendes@email.com',
              phone: '(11) 99999-0008',
              title: 'none',
              partnerLevel: 'socio',
              quotaCount: 5,
              directCount: 0,
              teamCount: 0,
              totalVolume: 5000,
              isActive: true,
              expiresAt: '2026-02-20', // 2 dias — quase expirando
              level: 3,
              children: [],
            },
            {
              id: 'user-009',
              name: 'Fernanda Rocha',
              email: 'fernanda.rocha@email.com',
              phone: '(11) 99999-0009',
              title: 'none',
              partnerLevel: 'socio',
              quotaCount: 3,
              directCount: 0,
              teamCount: 0,
              totalVolume: 3000,
              isActive: true,
              expiresAt: '2026-05-10',
              level: 3,
              children: [],
            },
          ],
        },
        {
          id: 'user-006',
          name: 'Pedro Alves',
          email: 'pedro.alves@email.com',
          phone: '(11) 99999-0006',
          title: 'bronze',
          partnerLevel: 'socio',
          quotaCount: 15,
          directCount: 2,
          teamCount: 5,
          totalVolume: 22000,
          isActive: true,
          expiresAt: '2026-03-05',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'user-003',
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '(11) 99999-0002',
      title: 'silver',
      partnerLevel: 'platinum',
      quotaCount: 30,
      directCount: 5,
      teamCount: 22,
      totalVolume: 75000,
      isActive: true,
      expiresAt: '2026-03-15',
      level: 1,
      children: [
        {
          id: 'user-007',
          name: 'Lúcia Ferreira',
          email: 'lucia.ferreira@email.com',
          phone: '(11) 99999-0007',
          title: 'bronze',
          partnerLevel: 'socio',
          quotaCount: 8,
          directCount: 1,
          teamCount: 3,
          totalVolume: 12000,
          isActive: true,
          expiresAt: '2026-03-20',
          level: 2,
          children: [],
        },
        {
          id: 'user-010',
          name: 'Usuário Inativo',
          email: 'inativo@email.com',
          phone: '(11) 99999-0010',
          title: 'none',
          partnerLevel: 'socio',
          quotaCount: 0,
          directCount: 0,
          teamCount: 0,
          totalVolume: 0,
          isActive: false,
          expiresAt: '2026-01-01', // já expirou
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'user-004',
      name: 'Carlos Lima',
      email: 'carlos.lima@email.com',
      phone: '(11) 99999-0003',
      title: 'bronze',
      partnerLevel: 'socio',
      quotaCount: 10,
      directCount: 3,
      teamCount: 8,
      totalVolume: 18000,
      isActive: true,
      expiresAt: '2026-02-25', // 7 dias — quase expirando
      level: 1,
      children: [],
    },
    {
      id: 'user-011',
      name: 'Marcos Souza',
      email: 'marcos.souza@email.com',
      phone: '(11) 99999-0011',
      title: 'gold',
      partnerLevel: 'vip',
      quotaCount: 40,
      directCount: 6,
      teamCount: 32,
      totalVolume: 120000,
      isActive: true,
      expiresAt: '2026-04-15',
      level: 1,
      children: [
        {
          id: 'user-012',
          name: 'Júlia Martins',
          email: 'julia.martins@email.com',
          phone: '(11) 99999-0012',
          title: 'silver',
          partnerLevel: 'platinum',
          quotaCount: 20,
          directCount: 3,
          teamCount: 10,
          totalVolume: 35000,
          isActive: true,
          expiresAt: '2026-02-22', // 4 dias — quase expirando
          level: 2,
          children: [],
        },
      ],
    },
  ],
};

// Pre-calculated stats for user-001
export const mockNetworkStats: NetworkStats = {
  totalDirect: 4,
  totalTeam: 12,
  totalVolume: 500000,
  activeMembers: 11,
  inactiveMembers: 1,
  titleDistribution: {
    none: 3,
    bronze: 3,
    silver: 3,
    gold: 2,
    diamond: 1,
  },
  levelDistribution: {
    1: 4,
    2: 5,
    3: 2,
    4: 0,
    5: 0,
  },
};

// Helper functions
export function getDirectChildren(tree: NetworkNode): NetworkNode[] {
  return tree.children;
}

export function flattenNetwork(tree: NetworkNode): NetworkNode[] {
  const result: NetworkNode[] = [tree];
  for (const child of tree.children) {
    result.push(...flattenNetwork(child));
  }
  return result;
}

export function findNodeById(tree: NetworkNode, id: string): NetworkNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function getSubtree(rootId: string): NetworkNode | null {
  return findNodeById(mockNetworkTree, rootId);
}

export function calculateNetworkStats(tree: NetworkNode): NetworkStats {
  const flat = flattenNetwork(tree).slice(1); // Exclude root
  
  const stats: NetworkStats = {
    totalDirect: tree.children.length,
    totalTeam: flat.length,
    totalVolume: flat.reduce((sum, n) => sum + n.totalVolume, 0),
    activeMembers: flat.filter((n) => n.isActive).length,
    inactiveMembers: flat.filter((n) => !n.isActive).length,
    titleDistribution: { none: 0, bronze: 0, silver: 0, gold: 0, diamond: 0 },
    levelDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  for (const node of flat) {
    stats.titleDistribution[node.title]++;
    if (node.level >= 1 && node.level <= 5) {
      const currentCount = stats.levelDistribution[node.level];
      stats.levelDistribution[node.level] = (currentCount ?? 0) + 1;
    }
  }

  return stats;
}

export function getNetworkByLevel(tree: NetworkNode, level: number): NetworkNode[] {
  const flat = flattenNetwork(tree);
  return flat.filter((n) => n.level === level);
}
