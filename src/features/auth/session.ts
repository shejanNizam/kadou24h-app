/**
 * Where each user lands, and the one place a successful sign-in is finished.
 */
import { router, type Href } from 'expo-router';
import { useCallback } from 'react';

import { useAppDispatch } from '@/store/hooks';
import { signedIn } from '@/store/authSlice';
import { AppMode, UserRole, type User } from '@/types/api';

import { pendingAuth } from './pending';
import type { Session, SignupIntent } from './types';

/**
 * The home tab of the user's last mode — only if that role is still active
 * (a suspended vendor/rider loses the role and falls back to customer).
 */
export function homeFor(user: User | null): Href {
  if (user?.lastActiveMode === AppMode.vendor && user.roles.includes(UserRole.vendor)) return '/vendor/orders';
  if (user?.lastActiveMode === AppMode.rider && user.roles.includes(UserRole.rider)) return '/rider/deliveries';
  return '/home';
}

/** Saves the session and opens the right screen (vendor/rider sign-ups go to their application). */
export function useCompleteSignIn() {
  const dispatch = useAppDispatch();
  return useCallback(
    (session: Session, intent: SignupIntent = 'customer') => {
      dispatch(signedIn(session));
      const returnTo = pendingAuth.takeReturnTo();
      if (intent === 'vendor') router.replace('/kyc/vendor');
      else if (intent === 'rider') router.replace('/kyc/rider');
      // Back to the product/worker the guest was looking at
      else if (returnTo) router.dismissTo(returnTo as Href);
      else router.replace(homeFor(session.user));
    },
    [dispatch],
  );
}
