import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplitEngineService } from './split-engine.service';
import { User } from '../../modules/users/entities/user.entity';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { SplitEvent } from '../../modules/quotas/entities/split-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, QuotaSystemState, SplitEvent])],
  providers: [SplitEngineService],
  exports: [SplitEngineService],
})
export class SplitModule {}
