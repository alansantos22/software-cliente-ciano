import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { PayoutStatus } from '../../shared/interfaces/enums';

interface GeneratedNotif {
  referenceKey: string;
  type: string;
  icon: string;
  title: string;
  description: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
  ) {}

  async getAll(userId: string): Promise<Notification[]> {
    await this.sync(userId);
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId }, { isRead: true });
  }

  private async sync(userId: string): Promise<void> {
    const current = await this.generateCurrent(userId);
    const currentKeys = current.map((n) => n.referenceKey);

    for (const notif of current) {
      const existing = await this.notifRepo.findOne({
        where: { userId, referenceKey: notif.referenceKey },
      });

      if (!existing) {
        await this.notifRepo.save(
          this.notifRepo.create({ userId, ...notif, isRead: false }),
        );
      } else {
        await this.notifRepo.update(existing.id, {
          type: notif.type,
          icon: notif.icon,
          title: notif.title,
          description: notif.description,
        });
      }
    }

    // Remove stale notifications no longer relevant
    const all = await this.notifRepo.find({ where: { userId } });
    const staleIds = all
      .filter((n) => !currentKeys.includes(n.referenceKey))
      .map((n) => n.id);

    if (staleIds.length > 0) {
      await this.notifRepo
        .createQueryBuilder()
        .delete()
        .where('id IN (:...ids)', { ids: staleIds })
        .execute();
    }
  }

  private async generateCurrent(userId: string): Promise<GeneratedNotif[]> {
    const notifications: GeneratedNotif[] = [];

    // 1. Account expiry warning
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.lastPurchaseDate) {
      const expires = new Date(user.lastPurchaseDate);
      expires.setMonth(expires.getMonth() + 6);
      const daysLeft = Math.ceil(
        (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft <= 0) {
        notifications.push({
          referenceKey: 'account_expiry',
          type: 'error',
          icon: 'circle-xmark',
          title: 'Conta inativa',
          description:
            'Sua conta está inativa. Faça uma compra para reativar e continuar recebendo bonificações.',
        });
      } else if (daysLeft <= 30) {
        notifications.push({
          referenceKey: 'account_expiry',
          type: 'warning',
          icon: 'triangle-exclamation',
          title: `Conta vence em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`,
          description:
            'Faça uma recompra para manter sua conta ativa e não perder seus benefícios.',
        });
      }
    }

    // 2. Completed payouts (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const payouts = await this.payoutRepo.find({
      where: { userId, status: PayoutStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: 5,
    });

    for (const payout of payouts) {
      if (!payout.completedAt || payout.completedAt < threeMonthsAgo) continue;
      const amount = Number(payout.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      notifications.push({
        referenceKey: `payout_${payout.id}`,
        type: 'payment',
        icon: 'money-bill-wave',
        title: `Pagamento de ${payout.referenceMonth} processado`,
        description: `${amount} será creditado via PIX em breve.`,
      });
    }

    // 3. New direct network members (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newMembers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.sponsor_id = :userId', { userId })
      .andWhere('u.created_at >= :since', { since: thirtyDaysAgo })
      .andWhere('u.deleted_at IS NULL')
      .orderBy('u.created_at', 'DESC')
      .take(5)
      .getMany();

    for (const member of newMembers) {
      notifications.push({
        referenceKey: `network_${member.id}`,
        type: 'network',
        icon: 'users',
        title: 'Nova indicação na sua rede',
        description: `${member.name} acabou de entrar como seu indicado direto.`,
      });
    }

    return notifications;
  }
}
