import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { User } from '../../modules/users/entities/user.entity';
import { GlobalFinancialSettings } from '../../modules/admin/entities/global-financial-settings.entity';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { PartnerLevelRequirement } from '../../modules/admin/entities/partner-level-requirement.entity';
import {
  UserRole,
  UserTitle,
  PartnerLevel,
  TitleReqType,
  TitleReqLevel,
} from '../../shared/interfaces/enums';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    @InjectRepository(QuotaSystemState) private readonly quotaStateRepo: Repository<QuotaSystemState>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
    @InjectRepository(PartnerLevelRequirement) private readonly partnerReqRepo: Repository<PartnerLevelRequirement>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedGlobalSettings();
    await this.seedQuotaSystemState();
    await this.seedTitleRequirements();
    await this.seedPartnerLevelRequirements();
    this.logger.log('✅ Seed data verified/inserted');
  }

  private async seedAdmin() {
    const existing = await this.userRepo.findOne({ where: { role: UserRole.ADMIN } });
    if (existing) return;

    const email = this.configService.get<string>('ADMIN_EMAIL') || 'admin@ciano.com';
    const password = this.configService.get<string>('ADMIN_PASSWORD') || 'Admin@123';
    const name = this.configService.get<string>('ADMIN_NAME') || 'Administrador Ciano';

    const admin = this.userRepo.create({
      email,
      passwordHash: await argon2.hash(password),
      name,
      cpf: '00000000000',
      phone: '00000000000',
      city: 'Sistema',
      state: 'SP',
      pixKey: email,
      role: UserRole.ADMIN,
      referralCode: 'CIANO-ADMIN',
      isActive: true,
    });

    await this.userRepo.save(admin);
    this.logger.log(`🔑 Admin user created: ${email}`);
  }

  private async seedGlobalSettings() {
    const existing = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (existing) return;

    const settings = this.settingsRepo.create({ id: 1 });
    await this.settingsRepo.save(settings);
    this.logger.log('⚙️ Global financial settings created');
  }

  private async seedQuotaSystemState() {
    const existing = await this.quotaStateRepo.findOne({ where: { id: 1 } });
    if (existing) return;

    const state = this.quotaStateRepo.create({ id: 1 });
    await this.quotaStateRepo.save(state);
    this.logger.log('📊 Quota system state created');
  }

  private async seedTitleRequirements() {
    const count = await this.titleReqRepo.count();
    if (count > 0) return;

    const seeds: Partial<TitleRequirement>[] = [
      { title: UserTitle.NONE, requirementDesc: 'Sem título', reqType: null, reqQuantity: null, reqLevel: null, repurchaseLevels: 0, teamLevels: 0, leadershipPercent: 0 },
      { title: UserTitle.BRONZE, requirementDesc: '2 pessoas ativas na rede', reqType: TitleReqType.PESSOAS_ATIVAS, reqQuantity: 2, reqLevel: TitleReqLevel.QUALQUER, repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0 },
      { title: UserTitle.SILVER, requirementDesc: 'Ajudar 1 indicado a virar Bronze', reqType: TitleReqType.INDICADO, reqQuantity: 1, reqLevel: TitleReqLevel.BRONZE, repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0, minNetworkMovement: 5000, networkLevelsDepth: 3 },
      { title: UserTitle.GOLD, requirementDesc: '2 Bronzes em linhas diferentes', reqType: TitleReqType.LINHAS, reqQuantity: 2, reqLevel: TitleReqLevel.BRONZE, repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1 },
      { title: UserTitle.DIAMOND, requirementDesc: '3 Bronzes em linhas diferentes', reqType: TitleReqType.LINHAS, reqQuantity: 3, reqLevel: TitleReqLevel.BRONZE, repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2 },
    ];

    await this.titleReqRepo.save(seeds.map((s) => this.titleReqRepo.create(s)));
    this.logger.log('🏆 Title requirements seeded');
  }

  private async seedPartnerLevelRequirements() {
    const count = await this.partnerReqRepo.count();
    if (count > 0) return;

    const seeds: Partial<PartnerLevelRequirement>[] = [
      { level: PartnerLevel.SOCIO, minQuotas: 1, benefits: ['Participação nos lucros do Grupo Ciano', 'Participação na valorização do grupo', 'Pode indicar e ganhar comissões', 'Acesso ao grupo geral de investidores'] },
      { level: PartnerLevel.PLATINUM, minQuotas: 10, benefits: ['Todos os benefícios do Sócio', '30% de desconto em pousadas Ciano', 'Comissão maior nas indicações', 'Acesso antecipado a lotes com desconto', 'Reunião mensal com Marcos Maziero'] },
      { level: PartnerLevel.VIP, minQuotas: 20, benefits: ['Todos os benefícios do Platinum', '50% de desconto em pousadas Ciano', '1 final de semana gratuito por ano', 'Convites para eventos e inaugurações', 'Nome listado como Sócio VIP em todas as pousadas', 'Comissão ainda maior nas indicações'] },
      { level: PartnerLevel.IMPERIAL, minQuotas: 60, benefits: ['Todos os benefícios do VIP', 'Hospedagem gratuita ilimitada (até 3 acompanhantes)', 'Máx. 1 quarto simultâneo', 'Pode morar em pousada', '40% de desconto para familiares', 'Viagem anual com Marcos Maziero', 'Quadro com foto no hall de entrada', 'Canal VIP direto com Marcos Maziero', 'Acesso ao grupo Imperial exclusivo'] },
    ];

    await this.partnerReqRepo.save(seeds.map((s) => this.partnerReqRepo.create(s)));
    this.logger.log('👑 Partner level requirements seeded');
  }
}
