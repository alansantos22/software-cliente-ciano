import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { UserTitle, TitleReqType } from '../../shared/interfaces/enums';

@Injectable()
export class TitleCalculatorService {
  private readonly logger = new Logger(TitleCalculatorService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
  ) {}

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  async recalculateTitle(userId: string): Promise<UserTitle> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return UserTitle.NONE;

    const requirements = await this.titleReqRepo.find({ order: { id: 'DESC' } });
    let newTitle = UserTitle.NONE;

    // Check from highest to lowest
    for (const req of requirements) {
      if (req.title === UserTitle.NONE) continue;
      if (await this.meetsRequirement(user, req)) {
        newTitle = req.title;
        break;
      }
    }

    if (user.title !== newTitle) {
      await this.userRepo.update(userId, { title: newTitle });
      this.logger.log(`🏆 ${user.name}: ${user.title} → ${newTitle}`);
    }

    return newTitle;
  }

  async recalculateAllTitles(): Promise<void> {
    const users = await this.userRepo.find({ where: { deletedAt: null as unknown as Date } });

    for (const user of users) {
      await this.recalculateTitle(user.id);
    }

    this.logger.log(`✅ All titles recalculated (${users.length} users)`);
  }

  private async meetsRequirement(user: User, req: TitleRequirement): Promise<boolean> {
    if (!req.reqType || !req.reqQuantity) return false;

    switch (req.reqType) {
      case TitleReqType.PESSOAS_ATIVAS:
        return this.checkPessoasAtivas(user, req.reqQuantity);

      case TitleReqType.INDICADO:
        return this.checkIndicado(user, req.reqQuantity, req.reqLevel as string);

      case TitleReqType.LINHAS:
        return this.checkLinhas(user, req.reqQuantity, req.reqLevel as string);

      default:
        return false;
    }
  }

  private async checkPessoasAtivas(user: User, required: number): Promise<boolean> {
    const directs = await this.userRepo.find({
      where: { sponsorId: user.id, deletedAt: null as unknown as Date },
    });

    const activeCount = directs.filter((d) => this.isActive(d)).length;
    return activeCount >= required;
  }

  private async checkIndicado(
    user: User,
    quantity: number,
    minLevel: string,
  ): Promise<boolean> {
    const directs = await this.userRepo.find({
      where: { sponsorId: user.id, deletedAt: null as unknown as Date },
    });

    const titleHierarchy: Record<string, number> = {
      none: 0,
      bronze: 1,
      silver: 2,
      gold: 3,
      diamond: 4,
    };

    const minTitleValue = titleHierarchy[minLevel] || 0;

    const qualifiedCount = directs.filter(
      (d) => (titleHierarchy[d.title] || 0) >= minTitleValue,
    ).length;

    return qualifiedCount >= quantity;
  }

  private async checkLinhas(
    user: User,
    requiredLines: number,
    minLevel: string,
  ): Promise<boolean> {
    const directs = await this.userRepo.find({
      where: { sponsorId: user.id, deletedAt: null as unknown as Date },
    });

    const titleHierarchy: Record<string, number> = {
      none: 0,
      bronze: 1,
      silver: 2,
      gold: 3,
      diamond: 4,
    };

    const minTitleValue = titleHierarchy[minLevel] || 0;
    let qualifiedLines = 0;

    for (const direct of directs) {
      const hasQualified = await this.lineHasQualifiedMember(
        direct.id,
        minTitleValue,
      );

      if (hasQualified) {
        qualifiedLines++;
      }
    }

    return qualifiedLines >= requiredLines;
  }

  private async lineHasQualifiedMember(
    rootId: string,
    minTitleValue: number,
  ): Promise<boolean> {
    const titleHierarchy: Record<string, number> = {
      none: 0,
      bronze: 1,
      silver: 2,
      gold: 3,
      diamond: 4,
    };

    // Check the root user first
    const rootUser = await this.userRepo.findOne({ where: { id: rootId } });
    if (!rootUser) return false;
    if ((titleHierarchy[rootUser.title] || 0) >= minTitleValue) return true;

    // BFS to check entire sub-tree
    const queue = [rootId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = await this.userRepo.find({
        where: { sponsorId: currentId, deletedAt: null as unknown as Date },
      });

      for (const child of children) {
        if ((titleHierarchy[child.title] || 0) >= minTitleValue) return true;
        queue.push(child.id);
      }
    }

    return false;
  }
}
