/**
 * Status → colour (APP_SPEC §9). Labels live in i18n: status.<domain>.<value>.
 */
import type { StatusTone } from '@/components/ui/StatusPill';

import type { DeliveryStatus, DisputeStatus, Order, OrderPaymentStatus, OrderRefund, OrderStatus, RefundStatus, RefundSummary, SubOrderStatus } from './types';

export const SUB_ORDER_TONE: Record<SubOrderStatus, StatusTone> = {
  pending_payment: 'amber',
  new: 'blue',
  accepted: 'blue',
  preparing: 'amber',
  ready_for_pickup: 'amber',
  in_delivery: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  active: 'purple',
  completed: 'green',
  cancelled: 'red',
  partially_cancelled: 'orange',
};

export const PAYMENT_TONE: Record<OrderPaymentStatus, StatusTone> = {
  unpaid: 'amber',
  paid: 'green',
  partially_refunded: 'orange',
  refunded: 'grey',
};

/** Same rule as the server's list: money being refunded first, else refunded, else refused */
export function summarizeRefunds(refunds: Pick<OrderRefund, 'status' | 'amount'>[] = []): RefundSummary | undefined {
  for (const status of ['pending', 'completed', 'rejected'] as const) {
    const lines = refunds.filter((r) => r.status === status);
    if (lines.length) return { status, amount: lines.reduce((sum, r) => sum + r.amount, 0) };
  }
  return undefined;
}

/**
 * The money badge on an order (client, 2026-11-24/25): a cancelled order never says "to
 * pay"; money coming back is shown with its amount ("Remboursement 8 800 GNF en cours",
 * then "Remboursé 8 800 GNF"). Label: status.payment.<key> with {{amount}}.
 */
export function paymentBadge(
  order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus' | 'feesPaidAt'>,
  refund?: RefundSummary,
): { key: string; tone: StatusTone; amount?: number } {
  if (refund?.status === 'pending') return { key: 'refundPending', tone: 'amber', amount: refund.amount };
  if (order.status !== 'cancelled') return { key: order.paymentStatus, tone: PAYMENT_TONE[order.paymentStatus] };
  if (refund?.status === 'completed') return { key: 'refundedAmount', tone: 'green', amount: refund.amount };
  if (refund?.status === 'rejected') return { key: 'refundRejected', tone: 'red' };
  const paidOnline = order.paymentMethod === 'cod' ? Boolean(order.feesPaidAt) : order.paymentStatus !== 'unpaid';
  if (!paidOnline) return { key: 'nothingToPay', tone: 'grey' };
  return { key: order.paymentStatus, tone: PAYMENT_TONE[order.paymentStatus] };
}

export const REFUND_TONE: Record<RefundStatus, StatusTone> = {
  pending: 'amber',
  completed: 'green',
  rejected: 'red',
};

export const DISPUTE_TONE: Record<DisputeStatus, StatusTone> = {
  open: 'amber',
  resolved: 'green',
  rejected: 'red',
};

/** The steps the buyer sees for one store (cancelled is shown apart) */
export const SUB_ORDER_STEPS: SubOrderStatus[] = ['new', 'accepted', 'preparing', 'ready_for_pickup', 'in_delivery', 'delivered'];

/** A rider is on the way to the store or to the buyer: live map worth showing */
export const TRACKABLE_LEG: DeliveryStatus[] = ['accepted', 'going_to_pickup', 'picked_up', 'in_transit'];
