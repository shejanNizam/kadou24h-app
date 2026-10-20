import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Payment, PaymentStatus } from '@/features/orders/types';
import { useGetMyPaymentsInfiniteQuery } from '@/features/profile/api';
import { formatGNF } from '@/lib/format';

const TONE: Record<PaymentStatus, StatusTone> = { pending: 'amber', success: 'green', failed: 'red', refunded: 'grey' };
const ICON = { order: 'shopping-bag', subscription: 'award', job_publish: 'briefcase', cv_unlock: 'unlock', spontaneous_application: 'send' } as const;

/** Online payments I made (orders, job posts, CV unlocks…). COD is paid to the rider, so it isn't here. */
export default function PaymentsScreen() {
  const { t } = useTranslation();
  const result = useGetMyPaymentsInfiniteQuery();
  const payments = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('profile.payments')} />
      </View>
      <FlatList
        data={payments}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => <Row payment={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListHeaderComponent={
          <AppText variant="caption" color={Colors.textMuted}>
            {t('payments.codNote')}
          </AppText>
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={68} radius={Radius.md} />
              ))}
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="credit-card" title={t('payments.emptyTitle')} message={t('payments.emptyText')} />
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

function Row({ payment: p }: { payment: Payment }) {
  const { t, i18n } = useTranslation();
  const date = new Date(p.paidAt ?? p.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const canOpen = p.purpose === 'order';
  return (
    <Pressable
      disabled={!canOpen}
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: p.refId } })}
      accessibilityRole={canOpen ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Feather name={ICON[p.purpose] ?? 'credit-card'} size={18} color={Colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {t(`payments.purpose.${p.purpose}`)}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {t(`payment.method.${p.method}`)} · {date}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="title">{formatGNF(p.amount)}</AppText>
        <StatusPill label={t(`payments.status.${p.status}`)} tone={TONE[p.status]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
});
