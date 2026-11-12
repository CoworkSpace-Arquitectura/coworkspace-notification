import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { NotificationsService, eventKey } from './notifications.service.js';
import { buildNotification } from './templates.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('buildNotification', () => {
  it('arma el aviso de pago pendiente con el enlace de Stripe', () => {
    const draft = buildNotification('billing.payment.requested', {
      amount: 60000,
      currency: 'COP',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });

    expect(draft?.title).toBe('Pago pendiente');
    expect(draft?.link).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
  });

  it('explica cuando una reserva se canceló por el pago', () => {
    const draft = buildNotification('booking.cancelled', {
      reason: 'PAYMENT_REJECTED',
      startTime: '2026-12-15T14:00:00.000Z',
    });

    expect(draft?.message).toContain('pago no se completó');
  });

  it('ignora eventos que no conoce', () => {
    expect(buildNotification('analytics.report.ready', {})).toBeNull();
  });
});

describe('NotificationsService', () => {
  const prisma = { notification: { create: vi.fn() } };
  let service: NotificationsService;

  const event = {
    event: 'billing.charge.succeeded',
    occurredAt: '2026-11-12T04:24:09.000Z',
    data: { chargeId: 'charge-1', memberId: 'member-1', amount: 60000, currency: 'COP' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('guarda el aviso con una llave única por evento', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n-1' });

    await service.handleEvent(event);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        memberId: 'member-1',
        title: 'Pago recibido',
        eventKey: 'billing.charge.succeeded:charge-1',
      }),
    });
  });

  it('ignora un evento repetido sin fallar', async () => {
    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(service.handleEvent(event)).resolves.toBeNull();
  });

  it('no crea avisos para eventos sin miembro', async () => {
    await service.handleEvent({ ...event, data: { chargeId: 'charge-1' } });

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('distingue cada renovación de la misma suscripción', () => {
    const base = { event: 'membership.activated', occurredAt: '', data: { subscriptionId: 'sub-1' } };

    const first = eventKey({ ...base, data: { ...base.data, renewsAt: '2026-12-12' } });
    const second = eventKey({ ...base, data: { ...base.data, renewsAt: '2027-01-12' } });

    expect(first).not.toBe(second);
  });
});