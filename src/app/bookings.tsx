import { useLocalSearchParams } from 'expo-router';

import { BookingListScreen } from '@/features/booking/components/BookingListScreen';

/** My bookings (as a customer) */
export default function BookingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <BookingListScreen role="customer" initialTab={tab} />;
}
