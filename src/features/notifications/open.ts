import { router } from 'expo-router';

/**
 * Where a notification leads (push tap or the list). `data` comes from the
 * server: type, mode (who it was for) and ids (orderId, subOrderId,
 * conversationId, withdrawalId…). Returns false when there is no screen for it.
 */
export function openNotification(data: Record<string, unknown> | undefined, fallbackMode?: string): boolean {
  const str = (key: string) => (typeof data?.[key] === 'string' ? (data[key] as string) : undefined);
  const mode = str('mode') ?? fallbackMode;
  const type = str('type');

  if (str('conversationId')) {
    router.push({ pathname: '/chat/[id]', params: { id: str('conversationId')! } });
    return true;
  }
  if (mode === 'vendor' && str('subOrderId')) {
    router.push({ pathname: '/vendor/order/[id]', params: { id: str('subOrderId')! } });
    return true;
  }
  if ((!mode || mode === 'customer') && str('orderId')) {
    router.push({ pathname: '/order/[id]', params: { id: str('orderId')! } });
    return true;
  }
  if (type === 'withdrawal_update' && (mode === 'vendor' || mode === 'rider')) {
    router.push({ pathname: '/withdrawals', params: { mode } });
    return true;
  }
  // Vendor / rider application reviewed: { kind, status }
  if (str('kind') && str('status')) {
    router.push(str('kind') === 'rider' ? '/kyc/rider' : '/kyc/vendor');
    return true;
  }
  return false;
}
