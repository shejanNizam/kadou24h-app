import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useAppSelector } from '@/store/hooks';

import { useGetBookingsQuery } from '../api';
import type { BookingListFilter, BookingRole } from '../types';
import { BookingCard } from './BookingCard';

type Tab = 'requested' | 'upcoming' | 'active' | 'history';

const FILTER: Record<Tab, BookingListFilter> = {
  requested: 'requested',
  // accepted + done (waiting for the customer), without the new requests
  upcoming: 'active',
  active: 'active',
  history: 'history',
};

/**
 * "My bookings" (customer) and "My jobs" (worker): the same list from each side.
 * Worker tabs: new requests · upcoming · history. Customer: in progress · history.
 */
export function BookingListScreen({ role, initialTab }: { role: BookingRole; initialTab?: string }) {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const tabs: Tab[] = role === 'worker' ? ['requested', 'upcoming', 'history'] : ['active', 'history'];
  const [tab, setTab] = useState<Tab>(tabs.includes(initialTab as Tab) ? (initialTab as Tab) : tabs[0]);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetBookingsQuery({ as: role, status: FILTER[tab] }, { skip: !signedIn });
  const title = role === 'worker' ? t('booking.workerListTitle') : t('booking.listTitle');
  if (!signedIn) return <SignInPrompt title={title} message={t('booking.guest')} />;

  const counts = data?.meta.counts;
  const badge = (k: Tab) => (k === 'requested' ? counts?.requested : k === 'active' && counts ? (counts.done ?? 0) : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={title} />
        <SegmentTabs
          tabs={tabs.map((k) => ({
            key: k,
            label: t(`booking.tabs.${k}`),
            badge: badge(k),
          }))}
          value={tab}
          onChange={setTab}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={(data?.data ?? []).filter((b) => tab !== 'upcoming' || b.status !== 'requested')}
          keyExtractor={(b) => b._id}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}
          ListEmptyComponent={
            role === 'customer' && tab === 'active' ? (
              <EmptyState
                icon="calendar"
                title={t('booking.emptyCustomer')}
                message={t('booking.emptyCustomerText')}
                actionLabel={t('booking.findWorker')}
                onAction={() =>
                  router.push({
                    pathname: '/search',
                    params: { tab: 'workers' },
                  })
                }
              />
            ) : (
              <EmptyState icon="calendar" title={t(`booking.empty.${tab}`)} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  list: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  loader: { marginTop: Spacing.xl },
});
