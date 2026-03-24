import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TitleCalculatorService } from './title-calculator.service';
import { User } from '../../modules/users/entities/user.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, TitleRequirement])],
  providers: [TitleCalculatorService],
  exports: [TitleCalculatorService],
})
export class TitleModule {}
