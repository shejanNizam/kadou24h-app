/**
 * Status → colour (APP_SPEC §9). Labels live in i18n: status.<domain>.<value>.
 */
import type { StatusTone } from '@/components/ui/StatusPill';

import type { DeliveryStatus, DisputeStatus, OrderPaymentStatus, OrderStatus, RefundStatus, SubOrderStatus } from './types';

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
