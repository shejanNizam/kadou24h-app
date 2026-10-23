import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  canCancelOrder,
  canCancelPart,
  isOnlinePayment,
  needsOnlinePayment,
  newIdempotencyKey,
  useGetMyDisputesQuery,
  useGetOrderQuery,
  useInitiatePaymentMutation,
} from '@/features/orders/api';
import { CancelSheet, DisputeSheet, ReviewSheet } from '@/features/orders/components/OrderSheets';
import { PriceSummary } from '@/features/orders/components/PriceSummary';
import { SubOrderCard } from '@/features/orders/components/SubOrderCard';
import { DISPUTE_TONE, ORDER_TONE, PAYMENT_TONE, REFUND_TONE } from '@/features/orders/status';
import type { PaymentMethod, SubOrder } from '@/features/orders/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';

/**
 * One live screen per order (instead of the Figma's Preparing / On the way /
 * Delivered pages). Socket events refresh it (SessionEffects).
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data, isLoading, isError, error, refetch, isFetching } = useGetOrderQuery(id, { skip: !signedIn });
  const disputes = useGetMyDisputesQuery(undefined, { skip: !signedIn });
  const [initiate, payState] = useInitiatePaymentMutation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPart, setCancelPart] = useState<{ subOrderId: string; storeName: string; paidOnline: boolean; feesOnly?: boolean } | null>(null);
  // Cash on delivery: the fees are paid online with one of these
  const [feesMethod, setFeesMethod] = useState<Exclude<PaymentMethod, 'cod'>>('orange_money');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reviewFor, setReviewFor] = useState<SubOrder | null>(null);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.inner, styles.content]}>
          <StackHeader />
          <Skeleton height={90} radius={Radius.lg} />
          <Skeleton height={260} radius={Radius.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader title={t('order.title')} />
        </View>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const { order, subOrders } = data;
  const address = order.addressSnapshot;
  const unpaidOnline = needsOnlinePayment(order);
  const isCod = order.paymentMethod === 'cod';
  // Cash on delivery: the fees go online (paid, or still to pay), the products in cash
  const codSplit =
    isCod && order.upfrontAmount
      ? {
          online: order.upfrontAmount,
          cash: subOrders.filter((s) => s.status !== 'cancelled').reduce((sum, s) => sum + (s.codAmountToCollect ?? 0), 0),
          paid: Boolean(order.feesPaidAt),
        }
      : undefined;
  const cancellable = canCancelOrder(order, subOrders);
  const myDisputes = (disputes.data?.data ?? []).filter((d) => (typeof d.orderId === 'string' ? d.orderId : d.orderId._id) === order._id);
  const placedAt = new Date(order.placedAt ?? order.createdAt).toLocaleString(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const payNow = async () => {
    try {
      const payment = await initiate({
        purpose: 'order',
        refId: order._id,
        method: isOnlinePayment(order.paymentMethod) ? order.paymentMethod : feesMethod,
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      router.push({ pathname: '/payment/[id]', params: { id: payment._id, orderId: order._id } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('order.number', { number: order.orderNumber })} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
        <View style={styles.card}>
          <View style={styles.row}>
            <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
              {t('order.placedOn', { date: placedAt })}
            </AppText>
            <StatusPill label={t(`status.order.${order.status}`)} tone={ORDER_TONE[order.status]} />
          </View>
          <View style={styles.row}>
            <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
              {t(`payment.method.${order.paymentMethod}`)} · {t(`checkout.type.${order.deliveryType}`)}
            </AppText>
            <StatusPill label={t(`status.payment.${order.paymentStatus}`)} tone={PAYMENT_TONE[order.paymentStatus]} />
          </View>
        </View>

        {unpaidOnline && (
          <View style={styles.payBox}>
            <Banner
              tone="warning"
              message={
                isCod
                  ? t('order.feesUnpaidUntil', {
                      amount: formatGNF(order.upfrontAmount ?? 0),
                      time: order.paymentDueAt
                        ? new Date(order.paymentDueAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
                        : '',
                    })
                  : order.paymentDueAt
                    ? t('order.unpaidUntil', {
                        time: new Date(order.paymentDueAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
                      })
                    : t('order.unpaid')
              }
            />
            {isCod && (
              <View style={styles.feeChips}>
                {(['orange_money', 'mobile_money', 'card'] as const).map((m) => (
                  <Chip key={m} label={t(`payment.method.${m}`)} selected={feesMethod === m} onPress={() => setFeesMethod(m)} />
                ))}
              </View>
            )}
            <Button
              title={isCod ? t('order.payFees', { amount: formatGNF(order.upfrontAmount ?? 0) }) : t('order.payNow')}
              icon="smartphone"
              loading={payState.isLoading}
              onPress={() => void payNow()}
            />
          </View>
        )}

        {subOrders.map((so) => (
          <SubOrderCard
            key={so._id}
            subOrder={so}
            deliveryType={order.deliveryType}
            isCod={order.paymentMethod === 'cod'}
            onReview={setReviewFor}
            onCancelPart={
              canCancelPart(order, subOrders, so)
                ? () =>
                    setCancelPart({
                      subOrderId: so._id,
                      storeName: so.vendorId.storeName,
                      paidOnline: !isCod || Boolean(order.feesPaidAt),
                      feesOnly: isCod && Boolean(order.feesPaidAt),
                    })
                : undefined
            }
          />
        ))}

        <View style={styles.card}>
          <AppText variant="title">{order.deliveryType === 'station_pickup' ? t('order.pickupBy') : t('order.deliverTo')}</AppText>
          <View style={styles.row}>
            <Feather name="map-pin" size={16} color={Colors.primary} />
            <View style={styles.flex}>
              <AppText variant="bodyMedium">{address.fullName}</AppText>
              <AppText variant="small" color={Colors.textMuted}>
                {[address.neighborhood, address.commune, address.city].filter(Boolean).join(', ')}
              </AppText>
              {address.landmark ? (
                <AppText variant="caption" color={Colors.textMuted}>
                  {address.landmark}
                </AppText>
              ) : null}
            </View>
          </View>
          {order.specialInstructions ? (
            <AppText variant="small" color={Colors.textMuted}>
              “{order.specialInstructions}”
            </AppText>
          ) : null}
        </View>

        <View style={styles.card}>
          <PriceSummary pricing={order} storeCount={subOrders.length} split={codSplit} />
        </View>

        {data.refunds?.map((r) => (
          <View key={r._id} style={styles.card}>
            <View style={styles.row}>
              <Feather name="rotate-ccw" size={16} color={Colors.primary} />
              <AppText variant="title" style={styles.flex}>
                {t('refund.title')}
              </AppText>
              <StatusPill label={t(`refund.status.${r.status}`)} tone={REFUND_TONE[r.status]} />
            </View>
            <AppText variant="small">
              {r.status === 'completed'
                ? t('refund.completed', { amount: formatGNF(r.amount) })
                : r.status === 'pending'
                  ? t('refund.pending', { amount: formatGNF(r.amount) })
                  : t('refund.rejected', { amount: formatGNF(r.requestedAmount ?? r.amount) })}
            </AppText>
            {r.status === 'completed' && r.transactionId ? (
              <AppText variant="caption" color={Colors.textMuted}>
                {t('refund.reference', { ref: r.transactionId })}
              </AppText>
            ) : null}
            {r.status === 'rejected' && r.rejectionReason ? <Banner tone="info" message={r.rejectionReason} /> : null}
          </View>
        ))}

        {myDisputes.map((d) => (
          <View key={d._id} style={styles.card}>
            <View style={styles.row}>
              <AppText variant="title" style={styles.flex}>
                {t('order.disputeTitle')}
              </AppText>
              <StatusPill label={t(`status.dispute.${d.status}`)} tone={DISPUTE_TONE[d.status]} />
            </View>
            <AppText variant="small" color={Colors.textMuted}>
              {d.reason}
            </AppText>
            {d.adminResolution ? <Banner tone={d.status === 'resolved' ? 'success' : 'info'} message={t('order.adminReply', { reply: d.adminResolution })} /> : null}
          </View>
        ))}

        <View style={styles.actions}>
          {order.status === 'active' &&
            (cancellable ? (
              <Button title={t('order.cancel')} variant="outline" icon="x-circle" onPress={() => setCancelOpen(true)} />
            ) : (
              <AppText variant="caption" color={Colors.textMuted} align="center">
                {t('order.cannotCancel')}
              </AppText>
            ))}
          <Button title={t('order.reportProblem')} variant="ghost" icon="alert-triangle" onPress={() => setDisputeOpen(true)} />
        </View>
      </ScrollView>

      <CancelSheet orderId={order._id} visible={cancelOpen} onClose={() => setCancelOpen(false)} />
      <CancelSheet orderId={order._id} visible={Boolean(cancelPart)} part={cancelPart} onClose={() => setCancelPart(null)} />
      <DisputeSheet orderId={order._id} subOrders={subOrders} visible={disputeOpen} onClose={() => setDisputeOpen(false)} />
      <ReviewSheet subOrder={reviewFor} onClose={() => setReviewFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  payBox: { gap: Spacing.sm },
  feeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.sm },
});
