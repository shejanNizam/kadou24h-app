import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { SUB_ORDER_TONE } from '@/features/orders/status';
import { useGetMyStoreQuery, useGetVendorOrdersInfiniteQuery, useUpdateAvailabilityMutation } from '@/features/vendor/api';
import { PaymentChip } from '@/features/vendor/components/PaymentChip';
import { VENDOR_ORDER_TABS, type VendorOrdersTab, type VendorSubOrder } from '@/features/vendor/types';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

const TABS = Object.keys(VENDOR_ORDER_TABS) as VendorOrdersTab[];

/** Incoming orders for my store, newest first. "New" ones wait for Accept. */
export default function VendorOrdersScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<VendorOrdersTab>('new');
  const result = useGetVendorOrdersInfiniteQuery(tab);
  const { data: summary } = useGetEarningsSummaryQuery({ mode: 'vendor', range: '7d' });
  const orders = result.data?.pages.flatMap((p) => p.data) ?? [];
  const counts = { new: summary?.counts.newOrders, active: summary?.counts.activeOrders };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
            {t('tabs.orders')}
          </AppText>
          <OpenSwitch />
        </View>
        <SegmentTabs
          tabs={TABS.map((key) => ({ key, label: t(`vendorOrders.tab.${key}`), badge: key === 'new' ? counts.new : undefined }))}
          value={tab}
          onChange={setTab}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o._id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={130} radius={Radius.lg} />
              <Skeleton height={130} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="inbox" title={t(`vendorOrders.empty.${tab}`)} message={tab === 'new' ? t('vendorOrders.emptyNewText') : undefined} />
          )
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

/** Open / closed: when closed, customers can't order from the store. */
function OpenSwitch() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: store } = useGetMyStoreQuery();
  const [update, { isLoading }] = useUpdateAvailabilityMutation();
  if (!store) return null;

  const toggle = async (isOpen: boolean) => {
    try {
      await update({ isOpen }).unwrap();
      toast.show(isOpen ? t('store.nowOpen') : t('store.nowClosed'));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.openRow}>
      <AppText variant="smallMedium" color={store.isOpen ? Colors.success : Colors.textMuted}>
        {store.isOpen ? t('store.open') : t('store.closed')}
      </AppText>
      <Switch
        value={store.isOpen}
        onValueChange={(v) => void toggle(v)}
        disabled={isLoading}
        trackColor={{ true: Colors.success, false: Colors.border }}
        accessibilityLabel={t('store.openSwitch')}
      />
    </View>
  );
}

function OrderCard({ order }: { order: VendorSubOrder }) {
  const { t, i18n } = useTranslation();
  const items = order.items.filter((i) => !i.removed);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const placed = new Date(order.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const rider = order.currentRiderId?.userId?.name;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vendor/order/[id]', params: { id: order._id } })}
      accessibilityRole="button"
      accessibilityLabel={t('order.number', { number: order.subOrderNumber })}
      style={({ pressed }) => [styles.card, order.status === 'new' && styles.cardNew, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title">#{order.subOrderNumber}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {placed} · {t('orders.items', { count })}
          </AppText>
        </View>
        <StatusPill label={t(`status.subOrder.${order.status}`)} tone={SUB_ORDER_TONE[order.status]} />
      </View>

      <View style={styles.thumbs}>
        {items.slice(0, 4).map((i) => (
          <View key={i._id} style={styles.thumb}>
            {i.image ? <Image source={i.image} style={styles.thumb} contentFit="cover" /> : null}
          </View>
        ))}
        <View style={styles.flex}>
          <AppText variant="small" numberOfLines={2}>
            {items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
          </AppText>
        </View>
      </View>

      <View style={styles.row}>
        <Feather name="user" size={14} color={Colors.textMuted} />
        <AppText variant="small" color={Colors.textMuted} numberOfLines={1} style={styles.flex}>
          {order.customerId?.name}
          {rider ? `  ·  ${t('vendorOrders.rider', { name: rider })}` : ''}
        </AppText>
        {order.orderId && typeof order.orderId === 'object' ? <PaymentChip order={order.orderId} /> : null}
      </View>

      <View style={[styles.row, styles.moneyRow]}>
        <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
          {t('vendorOrders.youGet')}
        </AppText>
        <AppText variant="title" color={Colors.primary}>
          {formatGNF(order.vendorEarning)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  list: { gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  cardNew: { borderColor: Colors.primaryBorder, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' },
  moneyRow: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
});
