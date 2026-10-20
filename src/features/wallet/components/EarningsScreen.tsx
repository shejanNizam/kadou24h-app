import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MenuRow, MenuSection } from '@/features/profile/components/Menu';
import { formatGNF } from '@/lib/format';

import { useGetEarningsSummaryQuery } from '../api';
import { MIN_WITHDRAWAL, type EarningsBucket, type EarningsSummary, type SummaryRange, type WalletMode } from '../types';

const RANGES: SummaryRange[] = ['7d', '30d', '6m', '12m'];

/**
 * Earnings home (vendor now, rider in Phase 8): what I can withdraw, what is
 * still on its way and why, a chart of delivered work, and the money screens.
 */
export function EarningsScreen({ mode }: { mode: WalletMode }) {
  const { t } = useTranslation();
  const [range, setRange] = useState<SummaryRange>('7d');
  const { data, isLoading, isError, error, refetch, isFetching } = useGetEarningsSummaryQuery({ mode, range });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {t('tabs.earnings')}
        </AppText>
        {isLoading ? (
          <>
            <Skeleton height={150} radius={Radius.lg} />
            <Skeleton height={110} radius={Radius.lg} />
            <Skeleton height={200} radius={Radius.lg} />
          </>
        ) : isError || !data ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <>
            <Hero mode={mode} data={data} />
            <Balances mode={mode} data={data} />

            <View style={styles.card}>
              <View style={styles.row}>
                <AppText variant="title" style={styles.flex}>
                  {t('earnings.activity')}
                </AppText>
              </View>
              <View style={styles.chips}>
                {RANGES.map((r) => (
                  <Chip key={r} label={t(`earnings.range.${r}`)} selected={range === r} onPress={() => setRange(r)} />
                ))}
              </View>
              <View style={styles.row}>
                <Stat label={t('earnings.periodEarned')} value={formatGNF(data.period.earnings)} />
                <Stat label={t(mode === 'vendor' ? 'earnings.ordersDelivered' : 'earnings.deliveriesDone')} value={String(data.period.count)} />
              </View>
              <Chart series={data.series} monthly={range.endsWith('m')} />
              <AppText variant="caption" color={Colors.textMuted}>
                {t('earnings.today', { amount: formatGNF(data.today.earnings), count: data.today.count })}
              </AppText>
            </View>

            <MenuSection title={t('earnings.money')}>
              <MenuRow icon="arrow-up-right" label={t('earnings.withdrawals')} onPress={() => router.push({ pathname: '/withdrawals', params: { mode } })} />
              <MenuRow icon="credit-card" label={t('earnings.payoutMethods')} onPress={() => router.push({ pathname: '/payout-methods', params: { mode } })} />
              <MenuRow icon="list" label={t('earnings.history')} onPress={() => router.push({ pathname: '/wallet-history', params: { mode } })} last />
            </MenuSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero({ mode, data }: { mode: WalletMode; data: EarningsSummary }) {
  const { t } = useTranslation();
  const amount = data.balances.withdrawable;
  return (
    <View style={styles.hero}>
      <AppText variant="small" color={Colors.textOnPrimary}>
        {t('earnings.withdrawable')}
      </AppText>
      <AppText variant="h1" color={Colors.textOnPrimary}>
        {formatGNF(amount)}
      </AppText>
      <AppText variant="caption" color={Colors.textOnPrimary} style={styles.heroHint}>
        {amount >= MIN_WITHDRAWAL ? t('earnings.withdrawableHint') : t('earnings.minWithdrawal', { amount: formatGNF(MIN_WITHDRAWAL) })}
      </AppText>
      <Button
        title={t('earnings.withdraw')}
        variant="outline"
        icon="arrow-up-right"
        disabled={amount < MIN_WITHDRAWAL}
        onPress={() => router.push({ pathname: '/withdraw', params: { mode } })}
      />
    </View>
  );
}

/** Where the rest of the money is, each with one line of explanation */
function Balances({ mode, data }: { mode: WalletMode; data: EarningsSummary }) {
  const { t } = useTranslation();
  const b = data.balances;
  const cards =
    mode === 'vendor'
      ? [
          { key: 'inEscrow', value: b.inEscrow ?? 0, icon: 'lock' as const },
          { key: 'awaitingCod', value: b.awaitingCod ?? 0, icon: 'truck' as const },
          { key: 'totalEarned', value: b.totalEarned, icon: 'trending-up' as const },
          { key: 'totalCommission', value: b.totalCommission, icon: 'percent' as const },
        ]
      : [
          { key: 'cashOwed', value: b.cashOwed ?? 0, icon: 'dollar-sign' as const },
          { key: 'totalEarned', value: b.totalEarned, icon: 'trending-up' as const },
        ];
  return (
    <View style={styles.grid}>
      {cards.map((c) => (
        <View key={c.key} style={styles.balance}>
          <View style={styles.row}>
            <Feather name={c.icon} size={14} color={Colors.primary} />
            <AppText variant="caption" color={Colors.textMuted} style={styles.flex} numberOfLines={2}>
              {t(`earnings.balance.${c.key}`)}
            </AppText>
          </View>
          <AppText variant="title">{formatGNF(c.value)}</AppText>
          <AppText variant="caption" color={Colors.textSubtle}>
            {t(`earnings.balanceHint.${c.key}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <AppText variant="caption" color={Colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}

/** Simple bars (no chart library on low-end phones). Tallest bar = 100%. */
function Chart({ series, monthly }: { series: EarningsBucket[]; monthly: boolean }) {
  const { t, i18n } = useTranslation();
  const max = Math.max(...series.map((s) => s.earnings), 0);
  const label = (key: string) =>
    monthly
      ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString(i18n.language, { month: 'short', timeZone: 'UTC' })
      : new Date(`${key}T00:00:00Z`).toLocaleDateString(i18n.language, { day: 'numeric', timeZone: 'UTC' });
  const every = Math.ceil(series.length / 7);

  if (max === 0) {
    return (
      <View style={styles.chartEmpty}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('earnings.noActivity')}
        </AppText>
      </View>
    );
  }
  return (
    <View accessibilityLabel={t('earnings.chartA11y')}>
      <View style={styles.chart}>
        {series.map((s) => (
          <View key={s.key} style={styles.barSlot}>
            <View style={[styles.bar, { height: `${Math.max(4, (s.earnings / max) * 100)}%` }, s.earnings === 0 && styles.barZero]} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {series.map((s, i) => (
          <AppText key={s.key} variant="caption" color={Colors.textSubtle} style={styles.barLabel} numberOfLines={1}>
            {i % every === 0 ? label(s.key) : ''}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  title: { paddingTop: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  hero: { gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  heroHint: { opacity: 0.85, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  balance: { flexGrow: 1, flexBasis: '45%', gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: Colors.primary },
  barZero: { backgroundColor: Colors.border },
  labels: { flexDirection: 'row', gap: 2, marginTop: Spacing.xs },
  barLabel: { flex: 1, fontSize: 10, textAlign: 'center' },
  chartEmpty: { height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.surface },
});
