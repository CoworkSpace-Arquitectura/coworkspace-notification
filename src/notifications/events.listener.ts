import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { NotificationsService } from './notifications.service.js';
import type { IncomingEvent } from './notifications.service.js';

const PATTERNS = ['membership.*', 'booking.*', 'billing.*'];

@Injectable()
export class EventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsListener.name);
  private subscriber?: Redis;

  constructor(private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (!process.env.REDIS_URL) {
      this.logger.warn('REDIS_URL no está configurado: no se escucharán eventos');
      return;
    }
    this.subscriber = new Redis(process.env.REDIS_URL);
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      void this.handle(channel, message);
    });
    this.subscriber
      .psubscribe(...PATTERNS)
      .then(() => this.logger.log(`Escuchando ${PATTERNS.join(', ')}`))
      .catch((error: Error) => this.logger.error(`No se pudo suscribir: ${error.message}`));
  }

  private async handle(channel: string, message: string) {
    try {
      const event = JSON.parse(message) as IncomingEvent;
      await this.notifications.handleEvent({ ...event, event: channel });
    } catch (error) {
      this.logger.error(`Error procesando ${channel}: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }
}