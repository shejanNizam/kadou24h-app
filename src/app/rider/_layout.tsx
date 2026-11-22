import { Redirect, Stack } from 'expo-router';

import { NewDeliveryAlert } from '@/features/rider/components/NewDeliveryAlert';
import { useAppSelector } from '@/store/hooks';
import { UserRole } from '@/types/api';

/**
 * Rider mode: only for approved, active riders (role removed when suspended).
 * My position is sent from the root (RiderPresenceEffects), in every mode while I'm online.
 */
export default function RiderLayout() {
  const { status, user } = useAppSelector((s) => s.auth);
  if (status !== 'signedIn' || !user?.roles.includes(UserRole.rider)) return <Redirect href="/home" />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <NewDeliveryAlert />
    </>
  );
}
