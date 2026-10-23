import type { StatusTone } from '@/components/ui/StatusPill';

import type { RideStatus } from './types';

export const RIDE_TONE: Record<RideStatus, StatusTone> = {
  searching: 'amber',
  accepted: 'blue',
  arrived: 'purple',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  expired: 'grey',
};

/** "3,2 km" */
export const formatKm = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
