import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
  ) {}

  async getSettings(userId: string) {
    let settings = await this.settingsRepo.findOne({ where: { userId } });

    if (!settings) {
      settings = this.settingsRepo.create({
        userId,
        theme: 'auto',
        language: 'pt-BR',
        notifyPayments: true,
        notifyNetwork: true,
        notifyPromotions: false,
        notifySystem: true,
      });
      await this.settingsRepo.save(settings);
    }

    return {
      theme: settings.theme,
      language: settings.language,
      notifications: {
        payments: settings.notifyPayments,
        network: settings.notifyNetwork,
        promotions: settings.notifyPromotions,
        system: settings.notifySystem,
      },
    };
  }

  async updateSettings(userId: string, data: {
    theme?: string;
    language?: string;
    notifications?: {
      payments?: boolean;
      network?: boolean;
      promotions?: boolean;
      system?: boolean;
    };
  }) {
    let settings = await this.settingsRepo.findOne({ where: { userId } });

    if (!settings) {
      settings = this.settingsRepo.create({ userId });
    }

    if (data.theme) settings.theme = data.theme as 'auto' | 'light' | 'dark';
    if (data.language) settings.language = data.language;

    if (data.notifications) {
      if (data.notifications.payments !== undefined) settings.notifyPayments = data.notifications.payments;
      if (data.notifications.network !== undefined) settings.notifyNetwork = data.notifications.network;
      if (data.notifications.promotions !== undefined) settings.notifyPromotions = data.notifications.promotions;
      if (data.notifications.system !== undefined) settings.notifySystem = data.notifications.system;
    }

    await this.settingsRepo.save(settings);
    return this.getSettings(userId);
  }
}
