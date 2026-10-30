import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetTransactionsInfiniteQuery } from '@/features/wallet/api';
import { describeTransaction } from '@/features/wallet/describe';
import type { TransactionType, WalletTransaction } from '@/features/wallet/types';
import { useWalletMode } from '@/features/wallet/useWalletMode';
import { formatGNF } from '@/lib/format';

/** Money in (+) or out (−) of my wallet; the rest are moves inside it (held → available) */
const DIRECTION: Partial<Record<TransactionType, 1 | -1>> = {
  earning_held: 1,
  withdrawal_reversal: 1,
  commission: -1,
  withdrawal: -1,
  withdrawal_fee: -1,
  refund_deduction: -1,
  earning_held_reversed: -1,
  cod_offset: -1,
};

/**
 * A rider's fee goes straight to available: for them it is money in, with its own
 * name, not the vendor's "held → available" move (client, 2026-10-30).
 */
const label = (type: TransactionType, mode: string) => (mode === 'rider' && type === 'earning_released' ? 'delivery_fee' : type);
const direction = (type: TransactionType, mode: string) => (mode === 'rider' && type === 'earning_released' ? 1 : DIRECTION[type]);

/** Every movement of my wallet (the ledger), newest first. */
export default function WalletHistoryScreen() {
  const { t } = useTranslation();
  const mode = useWalletMode();
  const result = useGetTransactionsInfiniteQuery(mode);
  const rows = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('earnings.history')} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => x._id}
        renderItem={({ item }) => <Row tx={item} mode={mode} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <Skeleton height={64} radius={Radius.lg} />
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="list" title={t('walletHistory.empty')} />
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

function Row({ tx, mode }: { tx: WalletTransaction; mode: string }) {
  const { t, i18n } = useTranslation();
  const sign = direction(tx.type, mode) ?? (tx.amount < 0 ? -1 : 0);
  const amount = Math.abs(tx.amount);
  const note = describeTransaction(tx, t);
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{t(`walletHistory.type.${label(tx.type, mode)}`)}</AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={2}>
          {new Date(tx.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {note ? ` · ${note}` : ''}
        </AppText>
      </View>
      <AppText variant="title" color={sign > 0 ? Colors.success : sign < 0 ? Colors.danger : Colors.text}>
        {sign > 0 ? '+ ' : sign < 0 ? '− ' : ''}
        {formatGNF(amount)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  flex: { flex: 1 },
});
