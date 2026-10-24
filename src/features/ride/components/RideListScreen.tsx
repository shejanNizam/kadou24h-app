import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

import { useGetMyRidesInfiniteQuery, useGetRiderRidesInfiniteQuery } from '../api';
import { RIDE_TONE } from '../status';
import type { Ride } from '../types';

/** My moto-taxi rides, as a passenger or as a rider (newest first). */
export function RideListScreen({ role }: { role: 'passenger' | 'rider' }) {
  const { t } = useTranslation();
  const passenger = useGetMyRidesInfiniteQuery(undefined, { skip: role !== 'passenger' });
  const rider = useGetRiderRidesInfiniteQuery(undefined, { skip: role !== 'rider' });
  const result = role === 'passenger' ? passenger : rider;
  const rides = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={role === 'passenger' ? t('profile.myRides') : t('ride.riderHistory')} />
      </View>
      <FlatList
        data={rides}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => <RideRow ride={item} role={role} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={
          <RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={96} radius={Radius.lg} />
              <Skeleton height={96} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState
              icon="navigation"
              title={t('ride.emptyTitle')}
              message={role === 'passenger' ? t('ride.emptyPassenger') : t('ride.emptyRider')}
              actionLabel={role === 'passenger' ? t('ride.orderMoto') : undefined}
              onAction={role === 'passenger' ? () => router.push('/ride/new') : undefined}
            />
          )
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
      {/* With rides in the list the empty-state button is gone: keep ordering one tap away */}
      {role === 'passenger' && rides.length > 0 && (
        <View style={[styles.inner, styles.footer]}>
          <Button title={t('ride.orderMoto')} onPress={() => router.push('/ride/new')} />
        </View>
      )}
    </SafeAreaView>
  );
}

function RideRow({ ride, role }: { ride: Ride; role: 'passenger' | 'rider' }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={() =>
        router.push(
          role === 'passenger' ? { pathname: '/ride/[id]', params: { id: ride._id } } : { pathname: '/rider/ride/[id]', params: { id: ride._id } },
        )
      }
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
          {new Date(ride.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ·{' '}
          {ride.rideNumber}
        </AppText>
        <StatusPill label={t(`ride.status.${ride.status}`)} tone={RIDE_TONE[ride.status]} />
      </View>
      <View style={styles.row}>
        <Feather name="circle" size={12} color={Colors.primary} />
        <AppText variant="smallMedium" numberOfLines={1} style={styles.flex}>
          {ride.pickup.address}
        </AppText>
      </View>
      <View style={styles.row}>
        <Feather name="map-pin" size={12} color={Colors.success} />
        <AppText variant="smallMedium" numberOfLines={1} style={styles.flex}>
          {ride.dropoff.address}
        </AppText>
        <AppText variant="title" color={Colors.primary}>
          {formatGNF(ride.fare)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  card: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.85 },
  footer: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
