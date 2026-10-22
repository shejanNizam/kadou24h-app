import { useLocalSearchParams } from 'expo-router';

import { BookingListScreen } from '@/features/booking/components/BookingListScreen';

/** My jobs (as a worker): new requests, upcoming, history */
export default function WorkerBookingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <BookingListScreen role="worker" initialTab={tab} />;
}
