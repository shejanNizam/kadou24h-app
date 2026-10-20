/**
 * Side effects of being signed in (no UI):
 * - keeps the socket connected with the current token
 * - server ended the session (suspension, password reset, logout-all) → sign out
 * - refreshes the cached user once per launch
 * - order / payment / delivery events → refetch what is on screen (orders, tracking)
 */
import { useEffect } from 'react';

import { useGetMeQuery } from '@/features/auth/api';
import { api } from '@/lib/api/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { signedOut, userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const ORDER_EVENTS = ['new_notification', 'delivery:status_changed', 'delivery:assigned', 'payment:successful', 'refund:issued'];

export function SessionEffects() {
  const dispatch = useAppDispatch();
  const { status, accessToken } = useAppSelector((s) => s.auth);
  const signedIn = status === 'signedIn';

  const { data: me } = useGetMeQuery(undefined, { skip: !signedIn });
  useEffect(() => {
    if (me) dispatch(userUpdated(me));
  }, [me, dispatch]);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(accessToken);
    const onRevoked = ({ reason }: { reason?: string } = {}) => {
      dispatch(signedOut({ reason: reason ?? 'revoked' }));
    };
    // Vendor status changes arrive as notifications; riders send delivery events
    const refreshOrders = () => dispatch(api.util.invalidateTags(['Order', 'Delivery', 'Notification']));
    const refreshDisputes = () => dispatch(api.util.invalidateTags(['Dispute', 'Order']));
    socket.on('session:revoked', onRevoked);
    ORDER_EVENTS.forEach((e) => socket.on(e, refreshOrders));
    socket.on('dispute:resolved', refreshDisputes);
    return () => {
      socket.off('session:revoked', onRevoked);
      ORDER_EVENTS.forEach((e) => socket.off(e, refreshOrders));
      socket.off('dispute:resolved', refreshDisputes);
    };
  }, [signedIn, accessToken, dispatch]);

  return null;
}
