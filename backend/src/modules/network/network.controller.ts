import { Controller, Get, Param } from '@nestjs/common';
import { NetworkService } from './network.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('tree')
  getTree(@CurrentUser() user: User) {
    return this.networkService.getTree(user.id);
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    return this.networkService.getStats(user.id);
  }

  @Get('member/:userId')
  getMember(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.networkService.getMember(userId, user.id);
  }
}
