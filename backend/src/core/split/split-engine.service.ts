import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { SplitEvent } from '../../modules/quotas/entities/split-event.entity';
import { SplitEventType } from '../../shared/interfaces/enums';

@Injectable()
export class SplitEngineService {
  private readonly logger = new Logger(SplitEngineService.name);
  private readonly BASE_PRICE = 2000;
  private readonly PRICE_INCREMENT = 500;
  private readonly MAX_PHASE = 2; // Phases: 0 (R$2000), 1 (R$2500), 2 (R$3000)

  constructor(
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(SplitEvent) private readonly eventRepo: Repository<SplitEvent>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getState(): Promise<QuotaSystemState> {
    let state = await this.stateRepo.findOne({ where: { id: 1 } });
    if (!state) {
      // First run: splitCount=0 starts at phase 1 (R$2500)
      state = this.stateRepo.create({
        id: 1,
        currentPhase: 1,
        currentQuotaPrice: this.BASE_PRICE + this.PRICE_INCREMENT, // R$2500
      });
      await this.stateRepo.save(state);
    }
    return state;
  }

  /**
   * Called after each quota purchase.
   * Check if we need to schedule a phase advance or split (pending until midnight).
   */
  async checkAndProcess(): Promise<void> {
    const state = await this.getState();

    // If there's already a pending event, don't schedule another
    if (state.pendingEventType) return;

    const target = state.nextEventTarget || this.calculateTarget(state.splitCount);
    if (state.totalQuotasSold < target) return;

    // Schedule event for midnight — don't apply immediately
    if (state.currentPhase < this.MAX_PHASE) {
      // Schedule price increase
      state.pendingEventType = SplitEventType.PRICE_INCREASE;
      state.pendingEventDate = this.getNextMidnight();
      await this.stateRepo.save(state);
      this.logger.log(`⏳ Price increase scheduled for midnight. Current phase: ${state.currentPhase}`);
    } else {
      // Schedule split (phase is at max)
      state.pendingEventType = SplitEventType.SPLIT;
      state.pendingEventDate = this.getNextMidnight();
      await this.stateRepo.save(state);
      this.logger.log(`⏳ Split scheduled for midnight. Current phase: ${state.currentPhase}`);
    }
  }

  /**
   * Called by the daily cron job at midnight.
   * Applies any pending event (price increase or split).
   */
  async applyPendingEvent(): Promise<void> {
    const state = await this.getState();
    if (!state.pendingEventType) return;

    if (state.pendingEventType === SplitEventType.PRICE_INCREASE) {
      await this.advancePhase(state);
    } else if (state.pendingEventType === SplitEventType.SPLIT) {
      await this.executeSplit(state);
    }

    // Clear the pending event (already saved inside advancePhase/executeSplit)
  }

  /**
   * Force a split event (admin action)
   */
  async forceSplit(): Promise<void> {
    const state = await this.getState();
    await this.executeSplit(state);
  }

  private calculateTarget(splitCount: number): number {
    return 50 * Math.pow(2, splitCount);
  }

  private getNextMidnight(): Date {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    return midnight;
  }

  private async advancePhase(state: QuotaSystemState): Promise<void> {
    const oldPrice = Number(state.currentQuotaPrice);
    const newPhase = state.currentPhase + 1;
    const newPrice = this.BASE_PRICE + this.PRICE_INCREMENT * newPhase;

    // Record event
    const event = this.eventRepo.create({
      eventType: SplitEventType.PRICE_INCREASE,
      oldQuotaPrice: oldPrice,
      newQuotaPrice: newPrice,
      splitNumber: state.splitCount,
      phase: newPhase,
      quotasSoldTotal: state.totalQuotasSold,
      description: `Aumento de preço: fase ${newPhase} — R$${oldPrice} → R$${newPrice}`,
    });
    await this.eventRepo.save(event);

    // Update state — move the target forward by one lot size from where we are now
    const lotSize = this.calculateTarget(state.splitCount);
    state.currentPhase = newPhase;
    state.currentQuotaPrice = newPrice;
    state.nextEventTarget = state.totalQuotasSold + lotSize;
    state.nextEventLabel = newPhase >= this.MAX_PHASE ? 'Split' : 'Aumento de Preço';
    state.pendingEventType = null;
    state.pendingEventDate = null;
    await this.stateRepo.save(state);

    this.logger.log(`📈 Price increase: phase ${newPhase}, R$${newPrice}, next target: ${state.nextEventTarget}`);
  }

  private async executeSplit(state: QuotaSystemState): Promise<void> {
    const oldPrice = Number(state.currentQuotaPrice);
    const newPrice = this.BASE_PRICE;
    const newSplitCount = state.splitCount + 1;

    this.logger.log(`🔄 Executing SPLIT #${newSplitCount}`);

    // Step 1: For every user with quotas (purchased, admin-granted, or from previous splits),
    // apply a 2:1 split: new_split_quotas = purchased_quotas + admin_granted_quotas + (split_quotas * 2)
    // This ensures new_quota_balance = 2 * old_quota_balance for all quota types
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        splitQuotas: () => 'purchased_quotas + admin_granted_quotas + (split_quotas * 2)',
      })
      .where('purchased_quotas > 0 OR admin_granted_quotas > 0 OR split_quotas > 0')
      .execute();

    // Step 2: Recalculate quota_balance for ALL users from the updated fields
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        quotaBalance: () => 'purchased_quotas + admin_granted_quotas + split_quotas',
      })
      .execute();

    // Record event
    const event = this.eventRepo.create({
      eventType: SplitEventType.SPLIT,
      oldQuotaPrice: oldPrice,
      newQuotaPrice: newPrice,
      splitNumber: newSplitCount,
      phase: 0,
      quotasSoldTotal: state.totalQuotasSold,
      description: `Split #${newSplitCount}: cotas split dobradas, preço resetado para R$${newPrice}`,
    });
    await this.eventRepo.save(event);

    // Update total split quotas count
    const result = await this.userRepo
      .createQueryBuilder('u')
      .select('SUM(u.split_quotas)', 'total')
      .getRawOne();

    // Reset state — new lot size is based on the new splitCount, target advances from current sold
    const newLotSize = this.calculateTarget(newSplitCount);
    state.currentQuotaPrice = newPrice;
    state.currentPhase = 0;
    state.splitCount = newSplitCount;
    state.totalSplitQuotas = parseInt(result?.total || '0', 10);
    state.nextEventTarget = state.totalQuotasSold + newLotSize;
    state.nextEventLabel = 'Aumento de Preço';
    state.pendingEventType = null;
    state.pendingEventDate = null;
    await this.stateRepo.save(state);

    this.logger.log(`✅ Split #${newSplitCount} completed. New price: R$${newPrice}, next target: ${state.nextEventTarget}`);
  }

  async incrementQuotasSold(quantity: number): Promise<void> {
    const state = await this.getState();
    state.totalQuotasSold += quantity;
    await this.stateRepo.save(state);
  }
}
