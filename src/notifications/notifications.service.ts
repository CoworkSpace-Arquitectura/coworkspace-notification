import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildNotification } from './templates.js';

export interface IncomingEvent {
  event: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

const ID_FIELDS = ['chargeId', 'invoiceId', 'bookingId', 'subscriptionId'];

export function eventKey(event: IncomingEvent) {
  const field = ID_FIELDS.find((name) => typeof event.data[name] === 'string');
  const id = field ? String(event.data[field]) : event.occurredAt;
  // Una renovación es un evento distinto para la misma suscripción
  const suffix = event.event === 'membership.activated' ? `:${String(event.data.renewsAt)}` : '';
  return `${event.event}:${id}${suffix}`;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleEvent(event: IncomingEvent) {
    const memberId = event.data.memberId;
    if (typeof memberId !== 'string') {
      return null;
    }
    const draft = buildNotification(event.event, event.data);
    if (!draft) {
      return null;
    }

    try {
      const notification = await this.prisma.notification.create({
        data: { memberId, eventKey: eventKey(event), ...draft },
      });
      this.logger.log(`Aviso para ${memberId}: ${draft.title}`);
      return notification;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(`Evento repetido ignorado: ${eventKey(event)}`);
        return null;
      }
      throw error;
    }
  }

  findByMember(memberId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { memberId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(memberId: string) {
    const count = await this.prisma.notification.count({ where: { memberId, readAt: null } });
    return { memberId, unread: count };
  }

  async markRead(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllRead(memberId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { memberId, readAt: null },
      data: { readAt: new Date() },
    });
    return { memberId, marked: count };
  }
}