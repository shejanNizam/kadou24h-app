import { useTranslation } from 'react-i18next';

import { StatusPill } from '@/components/ui/StatusPill';
import type { OrderPaymentStatus, PaymentMethod } from '@/features/orders/types';

/**
 * How the store gets paid for this order: cash at the door (the rider
 * collects), paid online, or online but not paid yet (wait before preparing).
 */
export function PaymentChip({ order }: { order: { paymentMethod: PaymentMethod; paymentStatus: OrderPaymentStatus } }) {
  const { t } = useTranslation();
  if (order.paymentMethod === 'cod') return <StatusPill label={t('vendorOrders.pay.cod')} tone="blue" />;
  if (order.paymentStatus === 'unpaid') return <StatusPill label={t('vendorOrders.pay.unpaid')} tone="amber" />;
  if (order.paymentStatus === 'paid') return <StatusPill label={t('vendorOrders.pay.paid')} tone="green" />;
  return <StatusPill label={t(`status.payment.${order.paymentStatus}`)} tone="grey" />;
}
