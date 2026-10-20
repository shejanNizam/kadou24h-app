import { useLocalSearchParams } from 'expo-router';

import { useAppSelector } from '@/store/hooks';

import type { WalletMode } from './types';

/** `?mode=vendor|rider` on the shared money screens; falls back to the current mode. */
export function useWalletMode(): WalletMode {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const current = useAppSelector((s) => s.auth.user?.lastActiveMode);
  if (mode === 'vendor' || mode === 'rider') return mode;
  return current === 'rider' ? 'rider' : 'vendor';
}
