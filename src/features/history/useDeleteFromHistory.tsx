import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useHideOrderMutation } from '@/features/orders/api';
import { useHideRideMutation } from '@/features/ride/api';
import { getApiErrorMessage } from '@/lib/api/errors';

/**
 * "Delete from my history" for a finished order or ride (client, 2026-10-30): hidden for
 * the customer only, the store, riders and Kadou24h keep it. `ask(id)` opens the
 * confirmation; render `dialog` once in the screen.
 */
export function useDeleteFromHistory(kind: 'order' | 'ride', onDeleted?: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const [hideOrder, orderState] = useHideOrderMutation();
  const [hideRide, rideState] = useHideRideMutation();
  const [target, setTarget] = useState<string | null>(null);

  const confirm = async () => {
    if (!target) return;
    try {
      await (kind === 'order' ? hideOrder(target) : hideRide(target)).unwrap();
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
      message={t(kind === 'order' ? 'history.deleteOrderText' : 'history.deleteRideText')}
      confirmLabel={t('history.delete')}
      onConfirm={() => void confirm()}
      onCancel={() => setTarget(null)}
      destructive
      icon="trash-2"
      loading={orderState.isLoading || rideState.isLoading}
    />
  );

  return { ask: setTarget, dialog };
}
