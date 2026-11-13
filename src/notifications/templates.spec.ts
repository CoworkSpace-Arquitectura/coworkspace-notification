import { describe, expect, it } from 'vitest';
import { buildNotification } from './templates.js';

describe('buildNotification', () => {
  it('avisa el reembolso de una reserva cancelada a tiempo', () => {
    const draft = buildNotification('billing.charge.refunded', { bookingId: 'b-1', amount: 60000, currency: 'COP' });

    expect(draft?.title).toBe('Reembolso realizado');
    expect(draft?.message).toContain('por cancelar tu reserva a tiempo');
  });

  it('avisa el reembolso de un plan por la garantía de 7 días', () => {
    const draft = buildNotification('billing.charge.refunded', { subscriptionId: 's-1', amount: 250000, currency: 'COP' });

    expect(draft?.message).toContain('garantía de 7 días');
  });

  it('ignora eventos que no tienen aviso', () => {
    expect(buildNotification('billing.subscription.paid', {})).toBeNull();
  });
});
