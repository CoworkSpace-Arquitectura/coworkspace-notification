import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { EventsListener } from './events.listener.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventsListener],
})
export class NotificationsModule {}