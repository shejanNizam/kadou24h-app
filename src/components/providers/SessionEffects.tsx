/**
 * Side effects of being signed in (no UI):
 * - keeps the socket connected with the current token
 * - server ended the session (suspension, password reset, logout-all) → sign out
 * - refreshes the cached user once per launch
 */
import { useEffect } from 'react';

import { useGetMeQuery } from '@/features/auth/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { signedOut, userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

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
    socket.on('session:revoked', onRevoked);
    return () => {
      socket.off('session:revoked', onRevoked);
    };
  }, [signedIn, accessToken, dispatch]);

  return null;
}
