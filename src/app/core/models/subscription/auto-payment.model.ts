/** Estado de una suscripción Stripe */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'canceled'
  | 'unpaid';

/** Detalle del pago más reciente de un jugador para una cuota */
export interface LatestPaymentInfo {
  latestPaymentStatus: string;
  latestPaymentAmount: number;       // en céntimos
  amountReceived: number;            // en céntimos
  latestPaymentDate: string;         // ISO datetime
  failureCode: string | null;
  failureMessage: string | null;
  receiptUrl: string | null;
  currency: string;
}

/** Detalle de suscripción automática por jugador */
export interface PlayerAutoPayment {
  subscriptionId: string;
  playerId: number;
  userId: number;
  teamId: number;
  playerName: string;
  playerPhoto: string | null;
  teamName: string;
  status: SubscriptionStatus;
  priceId: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  cancelAt: string | null;
  pausedAt: string | null;
  pausedBy: string | null;
  resumedAt: string | null;
  latestInvoiceId: string | null;
  latestPaymentIntentId: string | null;
  // Último pago enriquecido
  latestPaymentStatus: string | null;
  latestPaymentAmount: number | null;
  amountReceived: number | null;
  latestPaymentDate: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  receiptUrl: string | null;
}

/** Cuota con todas sus suscripciones automáticas */
export interface AutoPaymentCuota {
  pagoClubId: number;
  titulo: string;
  descripcion: string;
  importe: string;
  intervalo: string;
  intervaloCuenta: string;
  fechaInicio: string;
  fechaFin: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  totalSubscribers: number;
  activeCount: number;
  pastDueCount: number;
  pausedCount: number;
  canceledCount: number;
  players: PlayerAutoPayment[];
}
