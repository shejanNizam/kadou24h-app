import { useEffect, useEffectEvent } from 'react';

import { connectSocket } from '@/lib/socket';
import { useAppSelector } from '@/store/hooks';

/**
 * Listen to one server event while the screen is mounted. Re-subscribes when
 * the socket is replaced (new token after a refresh).
 */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    if (!token) return;
    // Same token → the existing connection (child effects can run before SessionEffects)
    const socket = connectSocket(token);
    const listener = (payload: T) => onEvent(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event, token]);
}
