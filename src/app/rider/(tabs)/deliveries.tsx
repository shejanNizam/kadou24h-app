import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useGetMyDeliveriesInfiniteQuery, useGetMyRiderQuery, useGetOffersQuery } from '@/features/rider/api';
import { DeliveryCard } from '@/features/rider/components/DeliveryCard';
import { DeclineSheet } from '@/features/rider/components/DeliverySheets';
import { OfferCard } from '@/features/rider/components/OfferCard';
import { OnlineToggle } from '@/features/rider/components/OnlineToggle';
import type { DeliveryOffer, RiderTab } from '@/features/rider/types';
import { useGetRideOffersQuery, useGetRiderCurrentRideQuery } from '@/features/ride/api';
import { RideAccessBanner } from '@/features/ride/components/RideAccessBanner';
import { SafetyIdsBanner } from '@/features/rider/components/SafetyIdsBanner';
import { RideOfferCard } from '@/features/ride/components/RideOfferCard';
import type { RideOffer } from '@/features/ride/types';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { formatGNF } from '@/lib/format';
import { AppMode } from '@/types/api';

const TABS: RiderTab[] = ['offers', 'new', 'ongoing', 'completed'];
const isTab = (value: unknown): value is RiderTab => TABS.includes(value as RiderTab);
/** "Near me": passengers (moto-taxi) and deliveries, both first-to-accept */
type NearItem = { kind: 'ride'; offer: RideOffer } | { kind: 'delivery'; offer: DeliveryOffer };

/**
 * My jobs: open deliveries near me (the first to accept takes it), the ones a
 * store sent me, the ones on the road (oldest first), and history.
 */
export default function RiderDeliveriesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<RiderTab>(isTab(params.tab) ? params.tab : 'offers');
  // A notification may open this screen on a given tab while it is already mounted
  const [seenParam, setSeenParam] = useState(params.tab);
  if (params.tab !== seenParam) {
    setSeenParam(params.tab);
    if (isTab(params.tab)) setTab(params.tab);
  }
  const [declining, setDeclining] = useState<string | null>(null);
  const result = useGetMyDeliveriesInfiniteQuery(tab === 'offers' ? 'new' : tab, { skip: tab === 'offers' });
  // Also for the tab badge; new offers arrive over the socket, the poll is a safety net
  const offers = useGetOffersQuery(undefined, { pollingInterval: 30_000, refetchOnFocus: true });
  const rideOffers = useGetRideOffersQuery(undefined, { pollingInterval: 30_000, refetchOnFocus: true });
  const { data: currentRide } = useGetRiderCurrentRideQuery();
  // The spinner answers a pull only: the poll and socket refreshes stay silent
  const [pulling, setPulling] = useState(false);
  const refreshNear = async () => {
    setPulling(true);
    await Promise.allSettled([offers.refetch(), rideOffers.refetch()]);
    setPulling(false);
  };
  const near: NearItem[] = [
    ...(rideOffers.data ?? []).map((offer) => ({ kind: 'ride' as const, offer })),
    ...(offers.data?.offers ?? []).map((offer) => ({ kind: 'delivery' as const, offer })),
  ];
  const { data: rider } = useGetMyRiderQuery();
  const { data: summary } = useGetEarningsSummaryQuery({ mode: 'rider', range: '7d' });
  const deliveries = result.data?.pages.flatMap((p) => p.data) ?? [];
  const counts = summary?.counts;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.inner, styles.top]}>
        <View style={styles.titleRow}>
          <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
            {t('tabs.deliveries')}
          </AppText>
          <NotificationBell mode={AppMode.rider} />
        </View>
        <OnlineToggle />
        {currentRide && (
          <Pressable
            onPress={() => router.push({ pathname: '/rider/ride/[id]', params: { id: currentRide._id } })}
            accessibilityRole="button"
            style={styles.rideNow}>
            <Feather name="navigation" size={18} color={Colors.textOnPrimary} />
            <View style={styles.flex}>
              <AppText variant="title" color={Colors.textOnPrimary}>
                {t('ride.rider.current')}
              </AppText>
              <AppText variant="small" color={Colors.textOnPrimary} numberOfLines={1}>
                {t(`ride.status.${currentRide.status}`)} · {currentRide.passenger?.name}
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.textOnPrimary} />
          </Pressable>
        )}
        {summary && <CashStrip owed={summary.balances.cashOwed ?? 0} limit={summary.balances.cashLimit ?? 0} />}
        <SegmentTabs
          tabs={TABS.map((key) => ({
            key,
            label: t(`rider.tab.${key}`),
            badge:
              key === 'offers'
                ? near.length || undefined
                : key === 'new'
                  ? counts?.newRequests
                  : key === 'ongoing'
                    ? Math.max(0, (counts?.activeDeliveries ?? 0) - (counts?.newRequests ?? 0)) || undefined
                    : undefined,
          }))}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'offers' ? (
        <FlatList
          data={near}
          keyExtractor={(item) => `${item.kind}-${item.offer._id}`}
          renderItem={({ item }) => (item.kind === 'ride' ? <RideOfferCard offer={item.offer} /> : <OfferCard offer={item.offer} />)}
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void refreshNear()} />}
          ListHeaderComponent={
            <>
              {rider && rider.partnerType !== 'transit' && <SafetyIdsBanner rider={rider} />}
              {rider && rider.partnerType !== 'transit' && <RideAccessBanner />}
              {near.length ? (
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('rider.offer.intro')}
                </AppText>
              ) : null}
            </>
          }
          ListEmptyComponent={
            offers.isLoading ? (
              <View style={styles.list}>
                <Skeleton height={190} radius={Radius.lg} />
                <Skeleton height={190} radius={Radius.lg} />
              </View>
            ) : offers.isError ? (
              <ErrorState error={offers.error} onRetry={() => void offers.refetch()} />
            ) : (
              <EmptyState
                icon="radio"
                title={t('rider.offer.empty')}
                message={offers.data?.isOnline === false || !rider?.isOnline ? t('rider.offer.emptyOffline') : t('rider.offer.emptyOnline')}
              />
            )
          }
        />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(d) => d._id}
          renderItem={({ item }) => <DeliveryCard delivery={item} onDecline={setDeclining} />}
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
          ListEmptyComponent={
            result.isLoading ? (
              <View style={styles.list}>
                <Skeleton height={150} radius={Radius.lg} />
                <Skeleton height={150} radius={Radius.lg} />
              </View>
            ) : result.isError ? (
              <ErrorState error={result.error} onRetry={() => void result.refetch()} />
            ) : (
              <EmptyState
                icon={tab === 'completed' ? 'check-circle' : 'truck'}
                title={t(`rider.empty.${tab}`)}
                message={tab === 'new' ? (rider?.isOnline ? t('rider.emptyNewOnline') : t('rider.emptyNewOffline')) : undefined}
              />
            )
          }
          ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <DeclineSheet deliveryId={declining} onClose={() => setDeclining(null)} />
    </SafeAreaView>
  );
}

/** Cash in my pocket vs my limit: near the limit I can't take more cash orders */
function CashStrip({ owed, limit }: { owed: number; limit: number }) {
  const { t } = useTranslation();
  if (owed <= 0 || limit <= 0) return null;
  const ratio = Math.min(1, owed / limit);
  const near = ratio >= 0.8;
  return (
    <Pressable
      onPress={() => router.push('/rider/cash')}
      accessibilityRole="button"
      style={[styles.cash, near && styles.cashNear]}>
      <Feather name="dollar-sign" size={16} color={near ? Colors.danger : Colors.warning} />
      <View style={styles.flex}>
        <AppText variant="smallMedium">{t('rider.cashStrip', { amount: formatGNF(owed) })}</AppText>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: near ? Colors.danger : Colors.warning }]} />
        </View>
        <AppText variant="caption" color={near ? Colors.danger : Colors.textMuted}>
          {near ? t('rider.cashNearLimit', { limit: formatGNF(limit) }) : t('rider.cashLimit', { limit: formatGNF(limit) })}
        </AppText>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  top: { gap: Spacing.md, paddingBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md },
  list: { gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  flex: { flex: 1 },
  cash: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.warningSoft },
  rideNow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  cashNear: { backgroundColor: Colors.dangerSoft },
  bar: { height: 4, borderRadius: 2, backgroundColor: Colors.background, marginVertical: 4, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
