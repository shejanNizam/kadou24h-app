import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { useGetEarningsSummaryQuery, useGetWalletQuery, useRequestWithdrawalMutation } from '@/features/wallet/api';
import { PAYOUT_ICON, PayoutMethodForm, payoutAccountLabel } from '@/features/wallet/components/PayoutMethodForm';
import { MIN_WITHDRAWAL, withdrawalFee, type Withdrawal } from '@/features/wallet/types';
import { useWalletMode } from '@/features/wallet/useWalletMode';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';

/**
 * Withdraw: amount (≥ 5 000 GNF, ≤ withdrawable), where to send it, and the
 * fee + "you will receive" shown live. An admin then pays it out.
 */
export default function WithdrawScreen() {
  const { t } = useTranslation();
  const mode = useWalletMode();
  const name = useAppSelector((s) => s.auth.user?.name);
  const summary = useGetEarningsSummaryQuery({ mode, range: '7d' });
  const wallet = useGetWalletQuery(mode);
  const { data: settings } = useGetPublicSettingsQuery();
  const [request, { isLoading }] = useRequestWithdrawalMutation();
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Withdrawal | null>(null);

  const methods = wallet.data?.payoutMethods ?? [];
  const method = methods.find((m) => m._id === methodId) ?? methods.find((m) => m.isDefault) ?? methods[0];
  const withdrawable = summary.data?.balances.withdrawable ?? 0;
  const value = Number.parseInt(amount, 10) || 0;
  const fee = method ? withdrawalFee(value, method.type, settings?.withdrawalFees) : 0;
  const tooSmall = value > 0 && value < MIN_WITHDRAWAL;
  const tooBig = value > withdrawable;

  const submit = async () => {
    if (!method) return;
    setError(null);
    try {
      setDone(await request({ mode, amount: value, payoutMethodId: method._id }).unwrap());
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="check-circle"
          title={t('withdraw.sentTitle')}
          message={t('withdraw.sentText', { number: done.requestNumber, amount: formatGNF(done.netAmount) })}
          actionLabel={t('earnings.withdrawals')}
          onAction={() => router.replace({ pathname: '/withdrawals', params: { mode } })}
        />
      </SafeAreaView>
    );
  }

  const loading = summary.isLoading || wallet.isLoading;
  const failed = summary.isError || wallet.isError;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('earnings.withdraw')} />
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : failed ? (
        <ErrorState
          error={summary.error ?? wallet.error}
          onRetry={() => {
            void summary.refetch();
            void wallet.refetch();
          }}
        />
      ) : (
        <>
          <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
            <View style={styles.available}>
              <AppText variant="small" color={Colors.textMuted}>
                {t('earnings.withdrawable')}
              </AppText>
              <AppText variant="h2" color={Colors.primary}>
                {formatGNF(withdrawable)}
              </AppText>
            </View>
            <Banner tone="danger" message={error} />

            <TextField
              label={t('withdraw.amount')}
              prefix="GNF"
              keyboardType="number-pad"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
              error={tooSmall ? t('withdraw.min', { amount: formatGNF(MIN_WITHDRAWAL) }) : tooBig ? t('withdraw.tooBig') : undefined}
              right={
                <Pressable onPress={() => setAmount(String(withdrawable))} hitSlop={8} accessibilityRole="button">
                  <AppText variant="smallMedium" color={Colors.primary}>
                    {t('withdraw.all')}
                  </AppText>
                </Pressable>
              }
            />

            <AppText variant="label">{t('withdraw.to')}</AppText>
            {methods.length === 0 ? (
              <Banner tone="info" message={t('withdraw.noMethod')} />
            ) : (
              methods.map((m) => {
                const on = m._id === method?._id;
                return (
                  <Pressable
                    key={m._id}
                    onPress={() => setMethodId(m._id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.method, on && styles.methodOn]}>
                    <Feather name={PAYOUT_ICON[m.type]} size={18} color={Colors.primary} />
                    <View style={styles.flex}>
                      <AppText variant="bodyMedium">{t(`payout.type.${m.type}`)}</AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        {m.accountName} · {payoutAccountLabel(m)}
                      </AppText>
                    </View>
                    <Feather name={on ? 'check-circle' : 'circle'} size={20} color={on ? Colors.primary : Colors.textSubtle} />
                  </Pressable>
                );
              })
            )}
            <Button title={t('payout.add')} variant="ghost" icon="plus" size="sm" onPress={() => setAddOpen(true)} />

            {value >= MIN_WITHDRAWAL && method && (
              <View style={styles.summary}>
                <Line label={t('withdraw.requested')} value={formatGNF(value)} />
                <Line label={t('withdraw.fee')} value={fee ? `− ${formatGNF(fee)}` : t('withdraw.noFee')} />
                <View style={styles.divider} />
                <Line label={t('withdraw.youReceive')} value={formatGNF(Math.max(0, value - fee))} strong />
              </View>
            )}
            <AppText variant="caption" color={Colors.textMuted}>
              {t('withdraw.delayNote')}
            </AppText>
          </KeyboardScroll>
          <View style={[styles.inner, styles.footer]}>
            <Button
              title={t('withdraw.submit')}
              loading={isLoading}
              disabled={!method || value < MIN_WITHDRAWAL || tooBig}
              onPress={() => void submit()}
            />
          </View>
        </>
      )}

      <BottomSheet visible={addOpen} title={t('payout.add')} onClose={() => setAddOpen(false)}>
        <PayoutMethodForm mode={mode} defaultName={name} onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </SafeAreaView>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant={strong ? 'title' : 'small'} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'title' : 'smallMedium'} color={strong ? Colors.primary : Colors.text}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  available: { gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  methodOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  flex: { flex: 1 },
  summary: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border },
  footer: { paddingVertical: Spacing.md },
});
