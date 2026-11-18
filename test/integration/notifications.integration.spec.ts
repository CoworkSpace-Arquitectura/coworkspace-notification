import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/setup-app.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificationsService } from '../../src/notifications/notifications.service.js';

/** Integración: un evento del sistema se convierte en aviso guardado en PostgreSQL y consultable por la API. */
describe('Avisos (integración con la base de datos)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const memberId = randomUUID();
  const bookingId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { memberId } });
    await app.close();
  });

  it('guarda el aviso de una reserva y no lo duplica si el evento llega dos veces', async () => {
    const event = {
      event: 'booking.created',
      occurredAt: new Date().toISOString(),
      data: { bookingId, memberId, resourceType: 'DESK', status: 'CONFIRMED', extraCharge: 0, startTime: new Date().toISOString() },
    };
    const service = app.get(NotificationsService);
    await service.handleEvent(event);
    await service.handleEvent(event); // idempotencia

    const res = await request(app.getHttpServer()).get(`/notifications?memberId=${memberId}`).expect(200);
    expect(res.body).toHaveLength(1);

    const count = await request(app.getHttpServer()).get(`/notifications/unread-count?memberId=${memberId}`).expect(200);
    expect(count.body).toEqual({ memberId, unread: 1 });
  });

  it('marca todos los avisos como leídos', async () => {
    await request(app.getHttpServer()).patch(`/notifications/read-all?memberId=${memberId}`).expect(200);
    const unread = await prisma.notification.count({ where: { memberId, readAt: null } });
    expect(unread).toBe(0);
  });
});
