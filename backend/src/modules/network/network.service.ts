import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { UserTitle } from '../../shared/interfaces/enums';

export interface NetworkNode {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  partnerLevel: string;
  quotaCount: number;
  directCount: number;
  teamCount: number;
  totalVolume: number;
  isActive: boolean;
  expiresAt: string | null;
  level: number;
  children: NetworkNode[];
}

@Injectable()
export class NetworkService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
  ) {}

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  private getExpiresAt(user: User): string | null {
    if (!user.lastPurchaseDate) return null;
    const expires = new Date(user.lastPurchaseDate);
    expires.setMonth(expires.getMonth() + 6);
    return expires.toISOString().slice(0, 10);
  }

  async getTree(userId: string): Promise<NetworkNode[]> {
    const directs = await this.userRepo.find({
      where: { sponsorId: userId, deletedAt: null as unknown as Date },
    });

    const nodes: NetworkNode[] = [];
    for (const direct of directs) {
      nodes.push(await this.buildNode(direct, 1));
    }

    return nodes;
  }

  private async buildNode(user: User, level: number): Promise<NetworkNode> {
    const children = await this.userRepo.find({
      where: { sponsorId: user.id, deletedAt: null as unknown as Date },
    });

    const childNodes: NetworkNode[] = [];
    if (level < 6) {
      for (const child of children) {
        childNodes.push(await this.buildNode(child, level + 1));
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      title: user.title,
      partnerLevel: user.partnerLevel,
      quotaCount: user.quotaBalance,
      directCount: user.directCount,
      teamCount: user.teamCount,
      totalVolume: Number(user.totalEarnings),
      isActive: this.isActive(user),
      expiresAt: this.getExpiresAt(user),
      level,
      children: childNodes,
    };
  }

  async getStats(userId: string) {
    const allNodes = await this.getTree(userId);
    const flatList = this.flattenTree(allNodes);

    const titleDist: Record<string, number> = { none: 0, bronze: 0, silver: 0, gold: 0, diamond: 0 };
    const levelDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    let activeMembers = 0;
    let inactiveMembers = 0;
    let totalVolume = 0;
    let qualifiedBronzes = 0;

    for (const node of flatList) {
      titleDist[node.title] = (titleDist[node.title] || 0) + 1;
      const levelKey = String(Math.min(node.level, 5));
      levelDist[levelKey] = (levelDist[levelKey] || 0) + 1;

      if (node.isActive) activeMembers++;
      else inactiveMembers++;

      totalVolume += node.totalVolume;

      if (node.title !== 'none') qualifiedBronzes++;
    }

    // Count qualified lines
    const directChildren = allNodes;
    let qualifiedLines = 0;
    for (const child of directChildren) {
      const hasQualified = this.nodeOrChildHasTitle(child, 'bronze');
      if (hasQualified) qualifiedLines++;
    }

    return {
      totalDirect: directChildren.length,
      totalTeam: flatList.length,
      totalVolume,
      activeMembers,
      inactiveMembers,
      qualifiedBronzes,
      qualifiedLines,
      titleDistribution: titleDist,
      levelDistribution: levelDist,
    };
  }

  async getMember(userId: string, requestingUserId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      title: user.title,
      partnerLevel: user.partnerLevel,
      quotaCount: user.quotaBalance,
      directCount: user.directCount,
      teamCount: user.teamCount,
      isActive: this.isActive(user),
      expiresAt: this.getExpiresAt(user),
      joinedAt: user.createdAt,
    };
  }

  private flattenTree(nodes: NetworkNode[]): NetworkNode[] {
    const result: NetworkNode[] = [];
    for (const node of nodes) {
      result.push(node);
      result.push(...this.flattenTree(node.children));
    }
    return result;
  }

  private nodeOrChildHasTitle(node: NetworkNode, minTitle: string): boolean {
    const hierarchy: Record<string, number> = { none: 0, bronze: 1, silver: 2, gold: 3, diamond: 4 };
    const minVal = hierarchy[minTitle] || 0;

    if ((hierarchy[node.title] || 0) >= minVal) return true;

    for (const child of node.children) {
      if (this.nodeOrChildHasTitle(child, minTitle)) return true;
    }

    return false;
  }
}
