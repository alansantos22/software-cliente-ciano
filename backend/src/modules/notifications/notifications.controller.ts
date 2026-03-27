import { Controller, Get, Patch, Param, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.notificationsService.getAll(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
