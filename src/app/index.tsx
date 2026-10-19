import { Redirect } from 'expo-router';

import { homeFor } from '@/features/auth/session';
import { useAppSelector } from '@/store/hooks';

/**
 * Start-up router:
 * - first launch → language → sign in (with "continue without an account")
 * - signed in → the home of the last used mode
 * - guest → customer home (browsing is public; sign-in is asked when needed)
 */
export default function Index() {
  const onboarded = useAppSelector((s) => s.prefs.onboarded);
  const { status, user } = useAppSelector((s) => s.auth);

  if (!onboarded) return <Redirect href="/language" />;
  if (status === 'signedIn') return <Redirect href={homeFor(user)} />;
  return <Redirect href="/home" />;
}
