import { Redirect, Stack } from 'expo-router';

import { NewDeliveryAlert } from '@/features/rider/components/NewDeliveryAlert';
import { useRiderPresence } from '@/features/rider/useRiderPresence';
import { useAppSelector } from '@/store/hooks';
import { UserRole } from '@/types/api';

/** Rider mode: only for approved, active riders (role removed when suspended). */
export default function RiderLayout() {
  const { status, user } = useAppSelector((s) => s.auth);
  if (status !== 'signedIn' || !user?.roles.includes(UserRole.rider)) return <Redirect href="/home" />;
  return <RiderShell />;
}

function RiderShell() {
  // Online: my position goes to the server while the app is open
  useRiderPresence();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <NewDeliveryAlert />
    </>
  );
}
