import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { AdminManagerService } from './admin-manager.service';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import {
  SetManagerPasswordDto,
  ManagerOperationDto,
  AddQuotasDto,
  RemoveQuotasDto,
  ChangeSponsorDto,
  SetUserActiveDto,
  DeleteUserDto,
  RestoreUserDto,
  SimulatePurchaseDto,
} from './dto/admin.dto';

@Roles(Role.ADMIN)
@Controller('admin/manager')
export class AdminManagerController {
  constructor(private readonly managerService: AdminManagerService) {}

  @Get('has-password')
  hasPassword() {
    return this.managerService.hasPassword();
  }

  @Post('set-password')
  setPassword(@Body() dto: SetManagerPasswordDto) {
    return this.managerService.setPassword(dto.password);
  }

  @Post('verify-password')
  verifyPassword(@Body() dto: ManagerOperationDto) {
    return this.managerService.verifyPassword(dto.managerPassword);
  }

  @Get('users')
  getUsers() {
    return this.managerService.getUsers();
  }

  @Post('users/:userId/add-quotas')
  addQuotas(@Param('userId') userId: string, @Body() dto: AddQuotasDto) {
    return this.managerService.addQuotas(userId, dto.quantity, dto.managerPassword, dto.reason);
  }

  @Post('users/:userId/remove-quotas')
  removeQuotas(@Param('userId') userId: string, @Body() dto: RemoveQuotasDto) {
    return this.managerService.removeQuotas(userId, dto.quantity, dto.managerPassword, dto.reason);
  }

  @Patch('users/:userId/sponsor')
  changeSponsor(@Param('userId') userId: string, @Body() dto: ChangeSponsorDto) {
    return this.managerService.changeSponsor(userId, dto.newSponsorId, dto.managerPassword);
  }

  @Patch('users/:userId/set-active')
  setUserActive(@Param('userId') userId: string, @Body() dto: SetUserActiveDto) {
    return this.managerService.setUserActive(userId, dto.isActive, dto.managerPassword);
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string, @Body() dto: DeleteUserDto) {
    return this.managerService.deleteUser(userId, dto.managerPassword);
  }

  @Post('users/:userId/restore')
  restoreUser(@Param('userId') userId: string, @Body() dto: RestoreUserDto) {
    return this.managerService.restoreUser(userId, dto.managerPassword);
  }

  @Get('trash')
  getTrash() {
    return this.managerService.getTrash();
  }

  @Post('users/:userId/simulate-purchase')
  simulatePurchase(@Param('userId') userId: string, @Body() dto: SimulatePurchaseDto) {
    return this.managerService.simulatePurchase(userId, dto.quantity, dto.managerPassword, dto.reason);
  }

  @Delete('test-cleanup')
  purgeTestData() {
    return this.managerService.purgeTestData();
  }
}
