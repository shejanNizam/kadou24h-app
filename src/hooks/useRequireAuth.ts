import { router, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui/Toast';
import { pendingAuth } from '@/features/auth/pending';
import { useAppSelector } from '@/store/hooks';

/**
 * Guest browsing: public screens work without an account. Actions that need
 * one (add to cart, favorite, message, apply) go through this guard, which
 * sends guests to sign in and brings them back to the same screen afterwards.
 */
export function useRequireAuth() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const pathname = usePathname();
  const toast = useToast();
  const { t } = useTranslation();

  return useCallback(
    (action: () => void) => {
      if (signedIn) return action();
      pendingAuth.setReturnTo(pathname);
      toast.show(t('guest.signInToContinue'), 'info');
      router.push('/login');
    },
    [signedIn, pathname, toast, t],
  );
}
