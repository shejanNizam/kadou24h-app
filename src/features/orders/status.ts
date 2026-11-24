/**
 * Status → colour (APP_SPEC §9). Labels live in i18n: status.<domain>.<value>.
 */
import type { StatusTone } from '@/components/ui/StatusPill';

import type { DeliveryStatus, DisputeStatus, Order, OrderPaymentStatus, OrderRefund, OrderStatus, RefundStatus, SubOrderStatus } from './types';

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

/**
 * The money badge on an order (client, 2026-11-24): a cancelled order never says "to pay".
 * It shows where the refund stands, or that there is nothing to pay. The key is under
 * status.payment.
 */
export function paymentBadge(order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus' | 'feesPaidAt'>, refunds: Pick<OrderRefund, 'status'>[] = []): { key: string; tone: StatusTone } {
  if (order.status !== 'cancelled') return { key: order.paymentStatus, tone: PAYMENT_TONE[order.paymentStatus] };
  const paidOnline = order.paymentMethod === 'cod' ? Boolean(order.feesPaidAt) : order.paymentStatus !== 'unpaid';
  if (refunds.some((r) => r.status === 'pending')) return { key: 'refundPending', tone: 'amber' };
  if (!paidOnline) return { key: 'nothingToPay', tone: 'grey' };
  if (order.paymentStatus === 'refunded' || refunds.some((r) => r.status === 'completed')) return { key: 'refunded', tone: 'grey' };
  return { key: 'paid', tone: PAYMENT_TONE.paid };
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
