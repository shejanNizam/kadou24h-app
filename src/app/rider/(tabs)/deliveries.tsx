import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
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
import { useGetMyDeliveriesInfiniteQuery, useGetMyRiderQuery } from '@/features/rider/api';
import { DeliveryCard } from '@/features/rider/components/DeliveryCard';
import { DeclineSheet } from '@/features/rider/components/DeliverySheets';
import { OnlineToggle } from '@/features/rider/components/OnlineToggle';
import type { RiderTab } from '@/features/rider/types';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { formatGNF } from '@/lib/format';

const TABS: RiderTab[] = ['new', 'ongoing', 'completed'];

/** My jobs: new ones to accept, the ones on the road (oldest first), and history. */
export default function RiderDeliveriesScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<RiderTab>('new');
  const [declining, setDeclining] = useState<string | null>(null);
  const result = useGetMyDeliveriesInfiniteQuery(tab);
  const { data: rider } = useGetMyRiderQuery();
  const { data: summary } = useGetEarningsSummaryQuery({ mode: 'rider', range: '7d' });
  const deliveries = result.data?.pages.flatMap((p) => p.data) ?? [];
  const counts = summary?.counts;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.inner, styles.top]}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {t('tabs.deliveries')}
        </AppText>
        <OnlineToggle />
        {summary && <CashStrip owed={summary.balances.cashOwed ?? 0} limit={summary.balances.cashLimit ?? 0} />}
        <SegmentTabs
          tabs={TABS.map((key) => ({
            key,
            label: t(`rider.tab.${key}`),
            badge: key === 'new' ? counts?.newRequests : key === 'ongoing' ? Math.max(0, (counts?.activeDeliveries ?? 0) - (counts?.newRequests ?? 0)) || undefined : undefined,
          }))}
          value={tab}
          onChange={setTab}
        />
      </View>

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
  title: { paddingTop: Spacing.md },
  list: { gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  flex: { flex: 1 },
  cash: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.warningSoft },
  cashNear: { backgroundColor: Colors.dangerSoft },
  bar: { height: 4, borderRadius: 2, backgroundColor: Colors.background, marginVertical: 4, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
