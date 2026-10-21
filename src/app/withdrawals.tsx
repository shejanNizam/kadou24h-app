import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { WITHDRAWAL_TONE } from '@/features/vendor/status';
import { useGetWithdrawalsInfiniteQuery } from '@/features/wallet/api';
import { payoutAccountLabel } from '@/features/wallet/components/PayoutMethodForm';
import type { Withdrawal } from '@/features/wallet/types';
import { useWalletMode } from '@/features/wallet/useWalletMode';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

/** My withdrawal requests: pending, paid (with the transfer reference and receipt) or rejected (reason). */
export default function WithdrawalsScreen() {
  const { t } = useTranslation();
  const mode = useWalletMode();
  const result = useGetWithdrawalsInfiniteQuery(mode);
  const rows = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('earnings.withdrawals')} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(w) => w._id}
        renderItem={({ item }) => <Row w={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <Skeleton height={110} radius={Radius.lg} />
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="arrow-up-right" title={t('withdrawals.empty')} message={t('withdrawals.emptyText')} />
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

function Row({ w }: { w: Withdrawal }) {
  const { t, i18n } = useTranslation();
  const date = new Date(w.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title">{formatGNF(w.amount)}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            #{w.requestNumber} · {date}
          </AppText>
        </View>
        <StatusPill label={t(`withdrawals.status.${w.status}`)} tone={WITHDRAWAL_TONE[w.status]} />
      </View>
      <AppText variant="small" color={Colors.textMuted}>
        {t(`payout.type.${w.payoutMethodSnapshot.type}`)} · {payoutAccountLabel(w.payoutMethodSnapshot)}
      </AppText>
      <AppText variant="small">
        {t('withdrawals.net', { amount: formatGNF(w.netAmount) })}
        {w.fee ? ` · ${t('withdrawals.fee', { amount: formatGNF(w.fee) })}` : ''}
      </AppText>
      {w.status === 'completed' && w.transactionId ? (
        <AppText variant="small" color={Colors.success}>
          {t('withdrawals.reference', { id: w.transactionId })}
        </AppText>
      ) : null}
      {w.status === 'completed' && w.receiptImage?.url ? (
        <Pressable onPress={() => void Linking.openURL(w.receiptImage!.url)} accessibilityRole="imagebutton" accessibilityLabel={t('withdrawals.receipt')}>
          <Image source={img(w.receiptImage.url, 'card')} style={styles.receipt} contentFit="cover" />
        </Pressable>
      ) : null}
      {w.status === 'rejected' ? (
        <AppText variant="small" color={Colors.danger}>
          {t('withdrawals.rejected', { reason: w.rejectionReason ?? '' })}
        </AppText>
      ) : null}
      {w.status === 'pending' ? (
        <AppText variant="caption" color={Colors.textMuted}>
          {t('withdrawals.pendingHint')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  receipt: { height: 120, borderRadius: Radius.md },
});
