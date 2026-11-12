import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findByMember(@Query('memberId', ParseUUIDPipe) memberId: string, @Query('unread') unread?: string) {
    return this.notificationsService.findByMember(memberId, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@Query('memberId', ParseUUIDPipe) memberId: string) {
    return this.notificationsService.unreadCount(memberId);
  }

  @Patch('read-all')
  markAllRead(@Query('memberId', ParseUUIDPipe) memberId: string) {
    return this.notificationsService.markAllRead(memberId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id);
  }
}