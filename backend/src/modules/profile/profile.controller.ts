import { Controller, Get, Put, Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto, UpdatePasswordDto, UpdatePixDto } from './dto/profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto as any);
  }

  @Put('password')
  updatePassword(@CurrentUser() user: User, @Body() dto: UpdatePasswordDto) {
    return this.profileService.updatePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Put('pix')
  updatePix(@CurrentUser() user: User, @Body() dto: UpdatePixDto) {
    return this.profileService.updatePix(user.id, dto.pixKeyType, dto.pixKey);
  }
}
