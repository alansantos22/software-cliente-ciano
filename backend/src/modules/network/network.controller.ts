import { Controller, Get, Param, Post } from '@nestjs/common';
import { NetworkService } from './network.service';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('network')
export class NetworkController {
  constructor(
    private readonly networkService: NetworkService,
    private readonly titleCalculatorService: TitleCalculatorService,
  ) {}

  @Get('tree')
  getTree(@CurrentUser() user: User) {
    return this.networkService.getTree(user.id);
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    return this.networkService.getStats(user.id);
  }

  @Post('recalculate-title')
  async recalculateMyTitle(@CurrentUser() user: User) {
    const title = await this.titleCalculatorService.recalculateTitle(user.id);
    return { title };
  }

  @Get('member/:userId')
  getMember(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.networkService.getMember(userId, user.id);
  }
}
