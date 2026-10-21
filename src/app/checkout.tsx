import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OptionCard } from '@/components/ui/OptionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { pickDefaultAddress, useGetAddressesQuery } from '@/features/address/api';
import { AddressCard } from '@/features/address/components/AddressCard';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useGetCartQuery } from '@/features/cart/api';
import {
  isOnlinePayment,
  newIdempotencyKey,
  useGetCheckoutSummaryQuery,
  useGetStationsQuery,
  useInitiatePaymentMutation,
  usePlaceOrderMutation,
} from '@/features/orders/api';
import { PriceSummary } from '@/features/orders/components/PriceSummary';
import type { CheckoutInput, DeliveryType, PaymentMethod, TransitStation } from '@/features/orders/types';
import { useDebounced } from '@/hooks/useDebounced';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';

const DELIVERY_TYPES: { type: DeliveryType; icon: 'home' | 'truck' | 'map-pin' }[] = [
  { type: 'local', icon: 'home' },
  { type: 'intercity', icon: 'truck' },
  { type: 'station_pickup', icon: 'map-pin' },
];
/** Same as the server's PAYMENT_WINDOW_MINUTES (order.checkout.service.ts) — shown as a hint only */
const PAYMENT_WINDOW_MINUTES = 30;

const PAYMENTS: { method: PaymentMethod; icon: 'dollar-sign' | 'smartphone' | 'credit-card' }[] = [
  { method: 'cod', icon: 'dollar-sign' },
  { method: 'orange_money', icon: 'smartphone' },
  { method: 'mobile_money', icon: 'smartphone' },
  { method: 'card', icon: 'credit-card' },
];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('checkout.title')} message={t('guest.cart')} />;
  return <Checkout />;
}

function Checkout() {
  const { t } = useTranslation();
  const cart = useGetCartQuery();
  const addresses = useGetAddressesQuery();
  const stations = useGetStationsQuery();
  const address = pickDefaultAddress(addresses.data);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('local');
  const [station, setStation] = useState<TransitStation | undefined>();
  const [stationSheet, setStationSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const instructions = useDebounced(notes.trim(), 600);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const needsStation = deliveryType !== 'local';
  const input: CheckoutInput = {
    addressId: address?._id,
    deliveryType,
    ...(needsStation && station && { destinationStationId: station._id }),
    specialInstructions: instructions || undefined,
    paymentMethod,
  };
  const ready = Boolean(address) && (!needsStation || Boolean(station)) && (cart.data?.totalItems ?? 0) > 0;
  const summary = useGetCheckoutSummaryQuery(input, { skip: !ready });

  const [placeOrder, placeState] = usePlaceOrderMutation();
  const [initiatePayment, payState] = useInitiatePaymentMutation();
  const placing = placeState.isLoading || payState.isLoading;

  const onPlace = async () => {
    setPlaceError(null);
    try {
      const { order } = await placeOrder({ ...input, specialInstructions: notes.trim() || undefined }).unwrap();
      if (!isOnlinePayment(paymentMethod)) {
        router.replace({ pathname: '/order-placed/[id]', params: { id: order._id } });
        return;
      }
      try {
        const payment = await initiatePayment({
          purpose: 'order',
          refId: order._id,
          method: paymentMethod,
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        router.replace({ pathname: '/payment/[id]', params: { id: payment._id, orderId: order._id } });
      } catch {
        // The order exists: pay from its page
        router.replace({ pathname: '/order/[id]', params: { id: order._id } });
      }
    } catch (e) {
      setPlaceError(getApiErrorMessage(e, t));
    }
  };

  if (cart.data && cart.data.totalItems === 0 && !placing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader title={t('checkout.title')} />
        </View>
        <EmptyState icon="shopping-cart" title={t('cart.emptyTitle')} actionLabel={t('cart.startShopping')} onAction={() => router.replace('/home')} />
      </SafeAreaView>
    );
  }

  const splits = summary.data?.vendorSplits ?? [];
  // Above a rider's cash limit per store, cash on delivery is not possible (server rule)
  const codBlocked = summary.data?.cod?.allowed === false;
  const codLimit = summary.data?.cod?.limit ?? 0;
  const route = splits.find((s) => s.stationRoute)?.stationRoute;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('checkout.title')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {/* 1. Address */}
        <Section title={t('checkout.address')} action={address ? t('common.change') : undefined} onAction={() => router.push({ pathname: '/addresses', params: { select: '1' } })}>
          {addresses.isLoading ? (
            <Skeleton height={88} radius={Radius.lg} />
          ) : address ? (
            <AddressCard address={address} />
          ) : (
            <Button title={t('address.add')} icon="map-pin" variant="outline" onPress={() => router.push('/address-edit')} />
          )}
          {deliveryType === 'station_pickup' && address && (
            <AppText variant="caption" color={Colors.textMuted}>
              {t('checkout.pickupContact')}
            </AppText>
          )}
        </Section>

        {/* 2. Delivery method */}
        <Section title={t('checkout.deliveryMethod')}>
          {DELIVERY_TYPES.map(({ type, icon }) => (
            <OptionCard
              key={type}
              icon={icon}
              title={t(`checkout.type.${type}`)}
              description={t(`checkout.typeHint.${type}`)}
              selected={deliveryType === type}
              onPress={() => setDeliveryType(type)}
            />
          ))}
          {needsStation && (
            <Pressable
              onPress={() => setStationSheet(true)}
              accessibilityRole="button"
              style={[styles.stationPicker, !station && styles.stationMissing]}>
              <Feather name="map-pin" size={18} color={Colors.primary} />
              <View style={styles.flex}>
                <AppText variant="caption" color={Colors.textMuted}>
                  {deliveryType === 'intercity' ? t('checkout.destinationStation') : t('checkout.pickupStation')}
                </AppText>
                <AppText variant="bodyMedium">{station ? `${station.name} · ${station.city}` : t('checkout.chooseStation')}</AppText>
              </View>
              <Feather name="chevron-down" size={18} color={Colors.textSubtle} />
            </Pressable>
          )}
          {route && (
            <View style={styles.route}>
              <AppText variant="smallMedium">
                {route.fromCity} → {route.toCity}
                {route.estimatedHours ? ` · ${t('checkout.eta', { count: route.estimatedHours })}` : ''}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {deliveryType === 'intercity' ? t('checkout.legsIntercity') : t('checkout.legsPickup')}
              </AppText>
            </View>
          )}
        </Section>

        {/* 3. Instructions */}
        <TextField
          label={t('checkout.instructions')}
          optional
          placeholder={t('checkout.instructionsHint')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={300}
          style={styles.multiline}
        />

        {/* 4. Payment */}
        <Section title={t('checkout.payment')}>
          {PAYMENTS.map(({ method, icon }) => (
            <OptionCard
              key={method}
              icon={icon}
              title={t(`payment.method.${method}`)}
              description={
                method === 'cod' && codBlocked ? t('checkout.codUnavailable', { limit: formatGNF(codLimit) }) : t(`checkout.paymentHint.${method}`)
              }
              selected={paymentMethod === method}
              disabled={method === 'cod' && codBlocked}
              onPress={() => setPaymentMethod(method)}
            />
          ))}
          {paymentMethod === 'cod' && codBlocked && <Banner tone="warning" message={t('checkout.codTooHigh', { limit: formatGNF(codLimit) })} />}
          {isOnlinePayment(paymentMethod) && (
            <AppText variant="caption" color={Colors.textMuted}>
              {t('checkout.payWithin', { minutes: PAYMENT_WINDOW_MINUTES })}
            </AppText>
          )}
        </Section>

        {/* 5. Summary (server) */}
        <Section title={t('checkout.summary')}>
          {!ready ? (
            <AppText variant="small" color={Colors.textMuted}>
              {!address ? t('checkout.needAddress') : t('checkout.needStation')}
            </AppText>
          ) : summary.isError ? (
            <Banner tone="danger" message={getApiErrorMessage(summary.error, t)} />
          ) : !summary.data ? (
            <Skeleton height={140} radius={Radius.md} />
          ) : (
            <View style={[styles.gap, summary.isFetching && styles.dim]}>
              {splits.map((s) => (
                <View key={s.vendorId} style={styles.storeLine}>
                  <Feather name="shopping-bag" size={14} color={Colors.textMuted} />
                  <AppText variant="small" style={styles.flex} numberOfLines={1}>
                    {s.storeName} · {t('cart.storeItems', { count: s.items.reduce((n, i) => n + i.qty, 0) })}
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {s.deliveryDistanceKm !== undefined ? `${s.deliveryDistanceKm.toFixed(1)} km · ` : ''}
                    {t('checkout.deliveryShort')} {formatGNF(s.deliveryFee)}
                  </AppText>
                </View>
              ))}
              <PriceSummary pricing={summary.data.pricing} storeCount={splits.length} />
              {paymentMethod === 'cod' && (
                <Banner
                  tone="info"
                  message={splits.length > 1 ? t('checkout.codMultiple', { count: splits.length }) : t('checkout.codSingle', { total: formatGNF(summary.data.pricing.total) })}
                />
              )}
            </View>
          )}
        </Section>

        <Banner tone="danger" message={placeError} />
      </KeyboardScroll>

      <View style={[styles.inner, styles.footer]}>
        <Button
          title={summary.data ? t('checkout.place', { total: formatGNF(summary.data.pricing.total) }) : t('checkout.placeShort')}
          loading={placing}
          disabled={!ready || !summary.data || summary.isFetching || summary.isError || (paymentMethod === 'cod' && codBlocked)}
          onPress={() => void onPlace()}
        />
      </View>

      <BottomSheet visible={stationSheet} title={t('checkout.chooseStation')} onClose={() => setStationSheet(false)}>
        {stations.data?.map((s) => (
          <OptionCard
            key={s._id}
            icon="map-pin"
            title={s.name}
            description={[s.city, s.region].filter(Boolean).join(' · ')}
            selected={station?._id === s._id}
            onPress={() => {
              setStation(s);
              setStationSheet(false);
            }}
          />
        ))}
        {stations.data?.length === 0 && <AppText color={Colors.textMuted}>{t('checkout.noStations')}</AppText>}
      </BottomSheet>
    </SafeAreaView>
  );
}

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="title" style={styles.flex} accessibilityRole="header">
          {title}
        </AppText>
        {action && onAction && (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" style={styles.action}>
            <AppText variant="smallMedium" color={Colors.primary}>
              {action}
            </AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.xxl, paddingBottom: Spacing.xxl },
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  dim: { opacity: 0.5 },
  section: { gap: Spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  action: { minHeight: MinTouch, justifyContent: 'center' },
  stationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  stationMissing: { borderColor: Colors.warning, backgroundColor: Colors.warningSoft },
  route: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, gap: 2 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  storeLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
