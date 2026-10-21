import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { ORDER_TABS, useGetMyOrdersInfiniteQuery, type OrdersTab } from '@/features/orders/api';
import { ORDER_TONE } from '@/features/orders/status';
import type { OrderListItem } from '@/features/orders/types';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

const TABS = Object.keys(ORDER_TABS) as OrdersTab[];

export default function OrdersScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('tabs.orders')} message={t('guest.orders')} />;
  return <Orders />;
}

function Orders() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<OrdersTab>('all');
  const result = useGetMyOrdersInfiniteQuery(tab);
  const orders = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <AppText variant="h2" style={styles.title} accessibilityRole="header">
          {t('tabs.orders')}
        </AppText>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              style={[styles.tab, tab === key && styles.tabOn]}>
              <AppText variant="label" color={tab === key ? Colors.primary : Colors.textMuted} numberOfLines={1}>
                {t(`orders.tab.${key}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
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
              <Skeleton height={120} radius={Radius.lg} />
              <Skeleton height={120} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState
              icon="shopping-bag"
              title={t(`orders.empty.${tab}`)}
              message={tab === 'all' ? t('orders.emptyText') : undefined}
              actionLabel={tab === 'all' ? t('cart.startShopping') : undefined}
              onAction={tab === 'all' ? () => router.navigate('/home') : undefined}
            />
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

function OrderCard({ order }: { order: OrderListItem }) {
  const { t, i18n } = useTranslation();
  const items = order.subOrders.flatMap((s) => s.items.filter((i) => !i.removed));
  const count = items.reduce((n, i) => n + i.qty, 0);
  const stores = order.subOrders.map((s) => s.vendorId?.storeName).filter(Boolean).join(', ');
  const date = new Date(order.placedAt ?? order.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order._id } })}
      accessibilityRole="button"
      accessibilityLabel={t('order.number', { number: order.orderNumber })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title">#{order.orderNumber}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {date} · {t('orders.items', { count })}
          </AppText>
        </View>
        <StatusPill label={t(`status.order.${order.status}`)} tone={ORDER_TONE[order.status]} />
      </View>
      <View style={styles.thumbs}>
        {items.slice(0, 4).map((i) => (
          <View key={i._id} style={styles.thumb}>
            {i.image ? <Image source={img(i.image, 'thumb')} style={styles.thumbImg} contentFit="cover" /> : null}
          </View>
        ))}
        {items.length > 4 && (
          <View style={[styles.thumb, styles.more]}>
            <AppText variant="caption" color={Colors.textMuted}>
              +{items.length - 4}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Feather name="shopping-bag" size={14} color={Colors.textMuted} />
        <AppText variant="small" color={Colors.textMuted} numberOfLines={1} style={styles.flex}>
          {stores}
        </AppText>
        <AppText variant="title" color={Colors.primary}>
          {formatGNF(order.total)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  title: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, minHeight: MinTouch, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Colors.primary },
  list: { gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  thumbs: { flexDirection: 'row', gap: Spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' },
  thumbImg: { width: 52, height: 52 },
  more: { alignItems: 'center', justifyContent: 'center' },
});
