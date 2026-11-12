export interface NotificationDraft {
  type: string;
  title: string;
  message: string;
  link?: string;
}

type EventData = Record<string, unknown>;

const money = (amount: unknown, currency: unknown = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: String(currency) }).format(Number(amount));

const date = (iso: unknown) =>
  new Date(String(iso)).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

const resource = (type: unknown) => (type === 'ROOM' ? 'una sala' : 'un puesto');

export function buildNotification(event: string, data: EventData): NotificationDraft | null {
  switch (event) {
    case 'membership.activated':
      return {
        type: 'MEMBERSHIP',
        title: data.renewal ? 'Membresía renovada' : 'Membresía activa',
        message: `Tu plan ${String(data.planName)} está activo hasta el ${date(data.renewsAt)}.`,
      };
    case 'membership.expired':
      return {
        type: 'MEMBERSHIP',
        title: 'Membresía finalizada',
        message:
          data.reason === 'CANCELLED'
            ? 'Cancelaste tu membresía. Tu acceso a las sedes fue desactivado.'
            : 'Tu membresía venció. Tu acceso a las sedes fue desactivado.',
      };
    case 'booking.created':
      return {
        type: 'BOOKING',
        title: data.status === 'PENDING_PAYMENT' ? 'Reserva pendiente de pago' : 'Reserva confirmada',
        message:
          data.status === 'PENDING_PAYMENT'
            ? `Reservaste ${resource(data.resourceType)} para el ${date(data.startTime)}. Tiene un cargo de ${money(data.extraCharge, data.currency)}.`
            : `Reservaste ${resource(data.resourceType)} para el ${date(data.startTime)}.`,
      };
    case 'booking.cancelled':
      return {
        type: 'BOOKING',
        title: 'Reserva cancelada',
        message:
          data.reason === 'PAYMENT_REJECTED'
            ? `Tu reserva del ${date(data.startTime)} se canceló porque el pago no se completó.`
            : `Cancelaste tu reserva del ${date(data.startTime)}.`,
      };
    case 'billing.payment.requested':
      return {
        type: 'PAYMENT',
        title: 'Pago pendiente',
        message: `Tienes un pago pendiente de ${money(data.amount, data.currency)}. Complétalo para confirmar tu reserva.`,
        link: typeof data.checkoutUrl === 'string' ? data.checkoutUrl : undefined,
      };
    case 'billing.charge.succeeded':
      return {
        type: 'PAYMENT',
        title: 'Pago recibido',
        message: `Recibimos tu pago de ${money(data.amount, data.currency)}. Tu reserva quedó confirmada.`,
      };
    case 'billing.charge.failed':
      return {
        type: 'PAYMENT',
        title: 'Pago no completado',
        message: `Tu pago de ${money(data.amount, data.currency)} no se completó: ${String(data.reason)}.`,
      };
    case 'billing.invoice.created':
      return {
        type: 'INVOICE',
        title: 'Nueva factura',
        message: `Se generó tu factura de ${money(data.amount)} para el periodo ${String(data.period)}.`,
      };
    default:
      return null;
  }
}