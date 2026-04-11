import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  throttleConfig,
  emailConfig,
} from './config';

// Shared modules
import { EmailModule } from './shared/email/email.module';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { BonusModule } from './core/bonus/bonus.module';
import { TitleModule } from './core/title/title.module';
import { SplitModule } from './core/split/split.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QuotasModule } from './modules/quotas/quotas.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { NetworkModule } from './modules/network/network.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProfileModule } from './modules/profile/profile.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';

// Guards, interceptors, filters
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      load: [appConfig, databaseConfig, jwtConfig, throttleConfig, emailConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        charset: 'utf8mb4',
        timezone: 'Z',
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl') || 60,
            limit: configService.get<number>('throttle.limit') || 100,
          },
        ],
      }),
    }),

    // Scheduled Tasks
    ScheduleModule.forRoot(),

    // Shared
    EmailModule,

    // Core
    DatabaseModule,
    BonusModule,
    TitleModule,
    SplitModule,

    // Feature modules
    AuthModule,
    UsersModule,
    QuotasModule,
    EarningsModule,
    NetworkModule,
    DashboardModule,
    PayoutsModule,
    AdminModule,
    ProfileModule,
    OnboardingModule,
    SettingsModule,
    NotificationsModule,

    // Jobs
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Auth Guard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global Roles Guard
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global Throttler Guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global Response Interceptor
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Global Exception Filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
