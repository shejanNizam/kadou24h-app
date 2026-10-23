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
  // Job application news (candidate or recruiter: the screen picks the right view)
  if (str('applicationId')) {
    router.push({ pathname: '/jobs/application/[id]', params: { id: str('applicationId')! } });
    return true;
  }
  // Moto-taxi: a request near me → "Near me"; otherwise the ride (as rider or passenger)
  if (str('kind') === 'ride' && str('rideId')) {
    if (mode === 'rider' && (data?.offer === true || data?.offer === 'true')) router.push({ pathname: '/rider/deliveries', params: { tab: 'offers' } });
    else if (mode === 'rider') router.push({ pathname: '/rider/ride/[id]', params: { id: str('rideId')! } });
    else router.push({ pathname: '/ride/[id]', params: { id: str('rideId')! } });
    return true;
  }
  // Rider: an open delivery near me (not mine yet) → the "Near me" list
  if (mode === 'rider' && (data?.offer === true || data?.offer === 'true')) {
    router.push({ pathname: '/rider/deliveries', params: { tab: 'offers' } });
    return true;
  }
  // Rider: a delivery (assigned, cancelled…) or my COD cash hand-over
  if (mode === 'rider' && str('deliveryId')) {
    router.push({ pathname: '/rider/delivery/[id]', params: { id: str('deliveryId')! } });
    return true;
  }
  if (mode === 'rider' && str('settlementId')) {
    router.push('/rider/cash');
    return true;
  }
  if (mode === 'rider' && (str('subOrderId') || str('orderId'))) {
    router.push('/rider/deliveries');
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
  // Worker bookings: a request, an answer, a finished job…
  if (str('bookingId')) {
    router.push({ pathname: '/booking/[id]', params: { id: str('bookingId')! } });
    return true;
  }
  // Cancellation penalty (worker or customer) and visibility (trial / plan) notices
  if (str('kind') === 'booking_penalty') {
    router.push(str('role') === 'customer' ? '/bookings' : '/worker-profile');
    return true;
  }
  if (str('kind') === 'worker_listing') {
    router.push('/worker-profile');
    return true;
  }
  // Vendor / rider application reviewed: { kind, status }
  if (str('kind') && str('status')) {
    const kind = str('kind');
    router.push(kind === 'worker' ? '/worker-profile' : kind === 'rider' ? '/kyc/rider' : '/kyc/vendor');
    return true;
  }
  return false;
}
