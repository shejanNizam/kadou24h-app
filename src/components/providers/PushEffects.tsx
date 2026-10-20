/**
 * Push side effects (no UI): register this phone after sign-in, and open the
 * right screen when a notification is tapped (chat, order, else the list).
 */
import { router } from 'expo-router';
import { useEffect } from 'react';

import { registerForPush } from '@/lib/push';
import { useAppSelector } from '@/store/hooks';

import { useNotificationTap } from './useNotificationTap';

export function PushEffects() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const userId = useAppSelector((s) => s.auth.user?._id);

  // Once per signed-in user (token refreshes don't re-register)
  useEffect(() => {
    if (signedIn && accessToken) void registerForPush(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, userId]);

  useNotificationTap((data) => {
    if (!signedIn) return;
    if (data.conversationId) router.push({ pathname: '/chat/[id]', params: { id: data.conversationId } });
    else if (data.orderId && (!data.mode || data.mode === 'customer')) router.push({ pathname: '/order/[id]', params: { id: data.orderId } });
    else router.push('/notifications');
  });

  return null;
}
