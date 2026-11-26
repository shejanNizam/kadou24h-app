import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OptionCard } from '@/components/ui/OptionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { needsNeighborhood, pickDefaultAddress, useGetAddressesQuery, type Address } from '@/features/address/api';
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
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { kmBetween } from '@/lib/geo';
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
/** Cash on delivery: the fees are paid online first, with one of these */
const FEE_METHODS: Exclude<PaymentMethod, 'cod'>[] = ['orange_money', 'mobile_money', 'card'];

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
  const settings = useGetPublicSettingsQuery();
  const defaultAddress = pickDefaultAddress(addresses.data);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('local');
  const [station, setStation] = useState<TransitStation | undefined>();
  // Another city (client, 2026-11-25): the last moto leaves the arrival station, so the address
  // must be in that city. The default (often Conakry) is skipped for one there; none → add one.
  const arrival = deliveryType === 'intercity' ? station : undefined;
  const maxKm = settings.data?.intercity?.maxAddressKm;
  const arrivalAt = arrival?.location;
  const inArrivalCity = (a: Address) => !arrivalAt || !maxKm || !a.location || kmBetween(a.location, arrivalAt) <= maxKm;
  const address = defaultAddress && inArrivalCity(defaultAddress) ? defaultAddress : addresses.data?.find(inArrivalCity);
  const noAddressThere = Boolean(arrivalAt && maxKm && !address && defaultAddress);
  const [stationSheet, setStationSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [feesMethod, setFeesMethod] = useState<Exclude<PaymentMethod, 'cod'>>('orange_money');
  const [notes, setNotes] = useState('');
  const instructions = useDebounced(notes.trim(), 600);
  const [placeError, setPlaceError] = useState<string | null>(null);
  // Promo code: typed, then applied (the server says if it is valid)
  const [codeText, setCodeText] = useState('');
  const [couponCode, setCouponCode] = useState<string | undefined>();

  const needsStation = deliveryType !== 'local';
  const input: CheckoutInput = {
    addressId: address?._id,
    deliveryType,
    ...(needsStation && station && { destinationStationId: station._id }),
    specialInstructions: instructions || undefined,
    paymentMethod,
    couponCode,
  };
  const ready = Boolean(address) && (!needsStation || Boolean(station)) && (cart.data?.totalItems ?? 0) > 0;
  const summary = useGetCheckoutSummaryQuery(input, { skip: !ready });
  const noNeighborhood = Boolean(address && needsNeighborhood(address));

  const [placeOrder, placeState] = usePlaceOrderMutation();
  const [initiatePayment, payState] = useInitiatePaymentMutation();
  const placing = placeState.isLoading || payState.isLoading;

  const onPlace = async () => {
    setPlaceError(null);
    try {
      // A code the server refused is not sent (the order would be refused)
      const validCode = summary.data?.coupon?.valid ? couponCode : undefined;
      const { order } = await placeOrder({ ...input, couponCode: validCode, specialInstructions: notes.trim() || undefined }).unwrap();
      // Everything is paid online now, or (cash on delivery) the fees; the store gets the order once paid
      try {
        const payment = await initiatePayment({
          purpose: 'order',
          refId: order._id,
          method: isOnlinePayment(paymentMethod) ? paymentMethod : feesMethod,
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
          ) : noAddressThere && arrival ? (
            <>
              <Banner tone="warning" message={t('checkout.addressInArrivalCity', { city: arrival.city })} />
              <Button title={t('checkout.addAddressIn', { city: arrival.city })} icon="map-pin" variant="outline" onPress={() => router.push('/address-edit')} />
            </>
          ) : address ? (
            <>
              <AddressCard address={address} />
              {address !== defaultAddress && arrival && (
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('checkout.addressUsedForCity', { city: arrival.city })}
                </AppText>
              )}
              {/* The quartier is mandatory (client, 2026-11-24): an older address is completed first */}
              {noNeighborhood && (
                <>
                  <Banner tone="warning" message={t('address.completeNeighborhood')} />
                  <Button title={t('address.complete')} icon="edit-2" variant="outline" size="sm" onPress={() => router.push({ pathname: '/address-edit', params: { id: address._id } })} />
                </>
              )}
            </>
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
              {/* Who gets what (one store: one route) */}
              {splits.length === 1 && route.legFees ? (
                <AppText variant="caption" color={Colors.textMuted}>
                  {route.legFees.lastMile
                    ? t('checkout.legsShare', {
                        first: formatGNF(route.legFees.firstMile),
                        bus: formatGNF(route.legFees.lineHaul),
                        last: formatGNF(route.legFees.lastMile),
                      })
                    : t('checkout.legsSharePickup', { first: formatGNF(route.legFees.firstMile), bus: formatGNF(route.legFees.lineHaul) })}
                </AppText>
              ) : null}
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
          {paymentMethod === 'cod' && !codBlocked && (
            <View style={styles.gap}>
              <AppText variant="label">{t('checkout.feesWith')}</AppText>
              <View style={styles.feeChips}>
                {FEE_METHODS.map((m) => (
                  <Chip key={m} label={t(`payment.method.${m}`)} selected={feesMethod === m} onPress={() => setFeesMethod(m)} />
                ))}
              </View>
            </View>
          )}
          <AppText variant="caption" color={Colors.textMuted}>
            {paymentMethod === 'cod' ? t('checkout.payFeesWithin', { minutes: PAYMENT_WINDOW_MINUTES }) : t('checkout.payWithin', { minutes: PAYMENT_WINDOW_MINUTES })}
          </AppText>
        </Section>

        {/* 5. Promo code */}
        <Section title={t('checkout.promo')}>
          {couponCode && summary.data?.coupon?.valid ? (
            <View style={styles.promoOn}>
              <Feather name="tag" size={16} color={Colors.success} />
              <View style={styles.flex}>
                <AppText variant="bodyMedium" color={Colors.success}>
                  {t('checkout.promoApplied', { code: summary.data.coupon.code, amount: formatGNF(summary.data.coupon.discount) })}
                </AppText>
                {summary.data.coupon.description ? (
                  <AppText variant="caption" color={Colors.textMuted}>
                    {summary.data.coupon.description}
                  </AppText>
                ) : null}
              </View>
              <Button
                title={t('common.remove')}
                size="sm"
                variant="ghost"
                onPress={() => {
                  setCouponCode(undefined);
                  setCodeText('');
                }}
              />
            </View>
          ) : (
            <TextField
              placeholder={t('checkout.promoPlaceholder')}
              value={codeText}
              onChangeText={(v) => setCodeText(v.toUpperCase().replace(/\s/g, ''))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              icon="tag"
              error={couponCode && summary.data?.coupon && !summary.data.coupon.valid ? couponMessage(t, summary.data.coupon) : undefined}
              right={
                <Button
                  title={t('checkout.promoApply')}
                  size="sm"
                  variant="soft"
                  disabled={codeText.trim().length < 3 || !ready}
                  loading={Boolean(couponCode) && summary.isFetching}
                  onPress={() => setCouponCode(codeText.trim())}
                />
              }
            />
          )}
        </Section>

        {/* 6. Summary (server) */}
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
              <PriceSummary
                pricing={summary.data.pricing}
                storeCount={splits.length}
                split={paymentMethod === 'cod' ? { online: summary.data.pricing.payNow, cash: summary.data.pricing.payOnDelivery } : undefined}
              />
              {paymentMethod === 'cod' && (
                <Banner
                  tone="info"
                  message={
                    splits.length > 1
                      ? t('checkout.codMultiple', { count: splits.length })
                      : t('checkout.codSingle', { total: formatGNF(summary.data.pricing.payOnDelivery) })
                  }
                />
              )}
            </View>
          )}
        </Section>

        <Banner tone="danger" message={placeError} />
      </KeyboardScroll>

      <View style={[styles.inner, styles.footer]}>
        <Button
          title={
            summary.data
              ? paymentMethod === 'cod'
                ? t('checkout.placeCod', { amount: formatGNF(summary.data.pricing.payNow) })
                : t('checkout.place', { total: formatGNF(summary.data.pricing.total) })
              : t('checkout.placeShort')
          }
          loading={placing}
          disabled={!ready || noNeighborhood || !summary.data || summary.isFetching || summary.isError || (paymentMethod === 'cod' && codBlocked)}
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

/** Why a promo code was refused. The server says it in the app's language; an older server, in English (matched below). */
function couponMessage(t: TFunction, coupon: { reason?: string; message?: string }) {
  if (coupon.reason && coupon.message) return coupon.message;
  const m = coupon.message ?? '';
  const min = m.match(/minimum order of ([\d\s\u00a0\u202f.,]+) GNF/i);
  if (min) return t('checkout.promoMin', { amount: `${min[1].trim()} GNF` });
  if (/already used/i.test(m)) return t('checkout.promoUsed');
  if (/expired/i.test(m)) return t('checkout.promoExpired');
  if (/not valid yet/i.test(m)) return t('checkout.promoNotYet');
  if (/fully used/i.test(m)) return t('checkout.promoFull');
  return t('checkout.promoInvalid');
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
  feeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
  promoOn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  storeLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
