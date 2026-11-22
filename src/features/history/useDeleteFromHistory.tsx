import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useHideBookingMutation } from '@/features/booking/api';
import { useHideOrderMutation } from '@/features/orders/api';
import { useHideRideMutation } from '@/features/ride/api';
import { getApiErrorMessage } from '@/lib/api/errors';

/**
 * "Delete from my history" for a finished order, ride (client, 2026-10-30) or worker booking
 * (2026-11-22): hidden for me only; the other side and Kadou24h keep it. `ask(id)` opens the
 * confirmation; render `dialog` once in the screen.
 */
export function useDeleteFromHistory(kind: 'order' | 'ride' | 'booking', onDeleted?: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const [hideOrder, orderState] = useHideOrderMutation();
  const [hideRide, rideState] = useHideRideMutation();
  const [hideBooking, bookingState] = useHideBookingMutation();
  const hide = { order: hideOrder, ride: hideRide, booking: hideBooking }[kind];
  const [target, setTarget] = useState<string | null>(null);

  const confirm = async () => {
    if (!target) return;
    try {
      await hide(target).unwrap();
      setTarget(null);
      toast.show(t('history.deleted'), 'success');
      onDeleted?.();
    } catch (e) {
      setTarget(null);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const dialog = (
    <ConfirmDialog
      visible={target !== null}
      title={t('history.deleteTitle')}
      message={t({ order: 'history.deleteOrderText', ride: 'history.deleteRideText', booking: 'history.deleteBookingText' }[kind])}
      confirmLabel={t('history.delete')}
      onConfirm={() => void confirm()}
      onCancel={() => setTarget(null)}
      destructive
      icon="trash-2"
      loading={orderState.isLoading || rideState.isLoading || bookingState.isLoading}
    />
  );

  return { ask: setTarget, dialog };
}
