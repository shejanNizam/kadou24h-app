/**
 * An online rider keeps sending their position in every mode (client 2026-11-22): a rider
 * shopping as a customer still gets the deliveries and moto rides near them (the server
 * only offers work to riders whose position is recent). Going offline stops it.
 */
import { useRiderPresence } from '@/features/rider/useRiderPresence';
import { useAppSelector } from '@/store/hooks';
import { UserRole } from '@/types/api';

export function RiderPresenceEffects() {
  const isRider = useAppSelector((s) => s.auth.status === 'signedIn' && Boolean(s.auth.user?.roles.includes(UserRole.rider)));
  return isRider ? <RiderPresence /> : null;
}

function RiderPresence() {
  useRiderPresence();
  return null;
}
