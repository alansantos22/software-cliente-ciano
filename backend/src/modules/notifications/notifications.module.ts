import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, PayoutRequest])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
