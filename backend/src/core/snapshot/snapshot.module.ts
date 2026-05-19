import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnapshotService } from './snapshot.service';
import { User } from '../../modules/users/entities/user.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlyUserSnapshot, User, TitleRequirement]),
  ],
  providers: [SnapshotService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
