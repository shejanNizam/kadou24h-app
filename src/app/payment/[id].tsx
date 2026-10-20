import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  isOnlinePayment,
  newIdempotencyKey,
  useDevConfirmPaymentMutation,
  useGetPaymentQuery,
  useInitiatePaymentMutation,
} from '@/features/orders/api';
import type { Payment } from '@/features/orders/types';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

/**
 * "Paiement en attente" — shared by every online payment (order, job, CV…).
 * Polls the payment + listens to `payment:successful`; success → next screen.
 */
export default function PaymentScreen() {
  const { id, orderId } = useLocalSearchParams<{ id: string; orderId?: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const { data: payment, isError, error, refetch } = useGetPaymentQuery(id, {
    pollingInterval: 4000,
    skipPollingIfUnfocused: true,
  });
  const [initiate, retryState] = useInitiatePaymentMutation();
  const [devConfirm, devState] = useDevConfirmPaymentMutation();

  useSocketEvent<{ paymentId: string }>('payment:successful', (p) => {
    if (p.paymentId === id) void refetch();
  });

  const status = payment?.status;
  useEffect(() => {
    if (status !== 'success' || !payment) return;
    const timer = setTimeout(() => goNext(payment, orderId), 1200);
    return () => clearTimeout(timer);
  }, [status, payment, orderId]);

  const retry = async () => {
    if (!payment || !isOnlinePayment(payment.method)) return;
    try {
      const next = await initiate({
        purpose: payment.purpose,
        refId: payment.refId,
        method: payment.method,
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      router.replace({ pathname: '/payment/[id]', params: { id: next._id, ...(orderId && { orderId }) } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const leave = () => {
    if (orderId) router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    else if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        {!payment || status === 'pending' ? (
          <>
            <View style={[styles.circle, { backgroundColor: Colors.primarySoft }]}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
            <AppText variant="h2" align="center">
              {t('payment.pendingTitle')}
            </AppText>
            {payment && (
              <AppText variant="h3" color={Colors.primary} align="center">
                {formatGNF(payment.amount)}
              </AppText>
            )}
            <AppText variant="body" color={Colors.textMuted} align="center">
              {payment ? t(`payment.pendingHint.${payment.method}`) : ''}
            </AppText>
            <Banner tone="info" message={t('payment.keepOpen')} />
          </>
        ) : status === 'success' ? (
          <>
            <View style={[styles.circle, { backgroundColor: Colors.successSoft }]}>
              <Feather name="check" size={44} color={Colors.success} />
            </View>
            <AppText variant="h2" align="center">
              {t('payment.successTitle')}
            </AppText>
            <AppText variant="body" color={Colors.textMuted} align="center">
              {t('payment.successText', { amount: formatGNF(payment.amount) })}
            </AppText>
          </>
        ) : (
          <>
            <View style={[styles.circle, { backgroundColor: Colors.dangerSoft }]}>
              <Feather name="x" size={44} color={Colors.danger} />
            </View>
            <AppText variant="h2" align="center">
              {t('payment.failedTitle')}
            </AppText>
            <AppText variant="body" color={Colors.textMuted} align="center">
              {t('payment.failedText')}
            </AppText>
          </>
        )}
      </View>

      <View style={styles.footer}>
        {status === 'failed' && <Button title={t('payment.tryAgain')} icon="refresh-cw" loading={retryState.isLoading} onPress={() => void retry()} />}
        {status === 'success' && payment ? (
          <Button title={t('common.continue')} onPress={() => goNext(payment, orderId)} />
        ) : (
          <Button title={orderId ? t('payment.payLater') : t('common.cancel')} variant="ghost" onPress={leave} />
        )}

        {/* No gateway is connected yet: in development, finish the payment by hand */}
        {__DEV__ && status === 'pending' && (
          <View style={styles.dev}>
            <AppText variant="caption" color={Colors.textMuted} align="center">
              {t('payment.devOnly')}
            </AppText>
            <View style={styles.devRow}>
              <Button title={t('payment.devSuccess')} size="sm" variant="soft" style={styles.flex} disabled={devState.isLoading} onPress={() => void devConfirm({ id, status: 'success' }).unwrap().then(() => refetch())} />
              <Button title={t('payment.devFail')} size="sm" variant="outline" style={styles.flex} disabled={devState.isLoading} onPress={() => void devConfirm({ id, status: 'failed' }).unwrap().then(() => refetch())} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Where a successful payment leads, per purpose */
function goNext(payment: Payment, orderId?: string) {
  if (payment.purpose === 'order') {
    router.replace({ pathname: '/order-placed/[id]', params: { id: orderId ?? payment.refId } });
  } else if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/home');
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  footer: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.sm },
  dev: { gap: Spacing.sm, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed' },
  devRow: { flexDirection: 'row', gap: Spacing.sm },
});
