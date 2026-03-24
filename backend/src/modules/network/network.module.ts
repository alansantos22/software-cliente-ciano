import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Earning])],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
