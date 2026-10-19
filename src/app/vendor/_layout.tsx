import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/store/hooks';
import { UserRole } from '@/types/api';

/** Vendor mode: only for approved, active vendors (role removed when suspended). */
export default function VendorLayout() {
  const { status, user } = useAppSelector((s) => s.auth);
  if (status !== 'signedIn' || !user?.roles.includes(UserRole.vendor)) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
