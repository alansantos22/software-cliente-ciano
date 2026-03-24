import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OnboardingRegisterDto } from './dto/onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('register-user')
  registerUser(@CurrentUser() user: User, @Body() dto: OnboardingRegisterDto) {
    return this.onboardingService.registerUser(user.id, dto);
  }
}
