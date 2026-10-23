import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { useGetAddressesQuery } from '@/features/address/api';
import { useEstimateRideQuery, useRequestRideMutation } from '@/features/ride/api';
import type { RidePlaceInput } from '@/features/ride/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { CONAKRY, getCurrentPosition, reverseGeocode, type LatLng } from '@/lib/location';

type Step = 'pickup' | 'dropoff' | 'review';

/**
 * Order a moto-taxi: put the pin on the start, then on the destination, see the
 * price (fixed before ordering, paid in cash to the rider) and order. Nearby
 * riders get the request; the first to accept comes.
 */
export default function NewRideScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const addresses = useGetAddressesQuery();
  const [step, setStep] = useState<Step>('pickup');
  const [pin, setPin] = useState<LatLng>(CONAKRY);
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | undefined>();
  const [pickup, setPickup] = useState<RidePlaceInput | null>(null);
  const [dropoff, setDropoff] = useState<RidePlaceInput | null>(null);
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [naming, setNaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestRide, requestState] = useRequestRideMutation();

  const estimate = useEstimateRideQuery(
    { pickup: { lat: pickup?.lat ?? 0, lng: pickup?.lng ?? 0 }, dropoff: { lat: dropoff?.lat ?? 0, lng: dropoff?.lng ?? 0 } },
    { skip: step !== 'review' || !pickup || !dropoff },
  );

  const locateMe = async () => {
    setLocating(true);
    const here = await getCurrentPosition();
    setLocating(false);
    if (!here) {
      toast.show(t('address.locationDenied'), 'info');
      return;
    }
    setPin(here);
    setFocus({ ...here, zoom: 17 });
  };

  // Start where I am (quietly: no message if location is refused)
  useEffect(() => {
    let cancelled = false;
    void getCurrentPosition().then((here) => {
      if (cancelled || !here) return;
      setPin(here);
      setFocus({ ...here, zoom: 17 });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmPin = async () => {
    setNaming(true);
    const guess = await reverseGeocode(pin);
    setNaming(false);
    const address = [guess.neighborhood, guess.commune, guess.city].filter(Boolean).join(', ') || t('ride.new.pinned');
    const place = { ...pin, address };
    if (step === 'pickup') {
      setPickup(place);
      setStep(dropoff ? 'review' : 'dropoff');
      if (dropoff) return;
      setFocus({ ...pin, zoom: 14 });
    } else {
      setDropoff(place);
      setStep('review');
    }
  };

  const goTo = (target: 'pickup' | 'dropoff') => {
    const place = target === 'pickup' ? pickup : dropoff;
    if (place) {
      setPin(place);
      setFocus({ lat: place.lat, lng: place.lng, zoom: 17 });
    }
    setError(null);
    setStep(target);
  };

  const order = async () => {
    if (!pickup || !dropoff) return;
    setError(null);
    try {
      const ride = await requestRide({
        pickup: { ...pickup, address: pickup.address.trim() },
        dropoff: { ...dropoff, address: dropoff.address.trim() },
        note: note.trim() || undefined,
      }).unwrap();
      router.replace({ pathname: '/ride/[id]', params: { id: ride._id } });
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  if (step !== 'review') {
    const saved = addresses.data ?? [];
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.inner}>
          <StackHeader title={step === 'pickup' ? t('ride.new.pickupTitle') : t('ride.new.dropoffTitle')} />
          <AppText variant="small" color={Colors.textMuted}>
            {step === 'pickup' ? t('ride.new.pickupHint') : t('ride.new.dropoffHint')}
          </AppText>
        </View>
        {saved.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.inner, styles.chips]}>
            {saved.map((a) => (
              <Chip
                key={a._id}
                label={a.customLabel || t(`address.label.${a.label}`, { defaultValue: a.label })}
                onPress={() => {
                  setPin(a.location);
                  setFocus({ ...a.location, zoom: 17 });
                }}
              />
            ))}
          </ScrollView>
        )}
        <View style={[styles.inner, styles.mapWrap]}>
          <AppMap
            initialCenter={pin}
            initialZoom={15}
            onCenterChange={setPin}
            focus={focus}
            markers={step === 'dropoff' && pickup ? [{ id: 'pickup', kind: 'customer', lat: pickup.lat, lng: pickup.lng }] : []}
            style={styles.map}
            accessibilityLabel={step === 'pickup' ? t('ride.new.pickupTitle') : t('ride.new.dropoffTitle')}
          />
          <Pressable onPress={() => void locateMe()} accessibilityRole="button" accessibilityLabel={t('address.useMyLocation')} style={styles.locate}>
            {locating ? <ActivityIndicator color={Colors.primary} /> : <Feather name="crosshair" size={20} color={Colors.primary} />}
            <AppText variant="smallMedium" color={Colors.primary}>
              {t('address.useMyLocation')}
            </AppText>
          </Pressable>
        </View>
        <View style={[styles.inner, styles.footer]}>
          <Button
            title={step === 'pickup' ? t('ride.new.confirmPickup') : t('ride.new.confirmDropoff')}
            loading={naming}
            onPress={() => void confirmPin()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const est = estimate.data;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('ride.new.reviewTitle')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <View style={styles.card}>
          <PlaceRow
            icon="circle"
            color={Colors.primary}
            label={t('ride.pickup')}
            value={pickup?.address ?? ''}
            onChange={(address) => pickup && setPickup({ ...pickup, address })}
            onMove={() => goTo('pickup')}
          />
          <View style={styles.divider} />
          <PlaceRow
            icon="map-pin"
            color={Colors.success}
            label={t('ride.dropoff')}
            value={dropoff?.address ?? ''}
            onChange={(address) => dropoff && setDropoff({ ...dropoff, address })}
            onMove={() => goTo('dropoff')}
          />
        </View>

        {estimate.isError ? (
          <Banner tone="danger" message={getApiErrorMessage(estimate.error, t)} />
        ) : !est ? (
          <Skeleton height={120} radius={Radius.lg} />
        ) : (
          <View style={styles.priceCard}>
            <AppText variant="caption" color={Colors.textMuted}>
              {t('ride.price')}
            </AppText>
            <AppText variant="h1" color={Colors.primary}>
              {formatGNF(est.fare)}
            </AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {t('ride.tripInfo', { km: est.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 }), min: est.durationMin })}
            </AppText>
            <View style={styles.cashRow}>
              <Feather name="dollar-sign" size={14} color={Colors.warning} />
              <AppText variant="small">{t('ride.payCash')}</AppText>
            </View>
          </View>
        )}
        {est && (
          <Banner
            tone={est.ridersNearby ? 'info' : 'warning'}
            message={est.ridersNearby ? t('ride.new.ridersNearby', { count: est.ridersNearby }) : t('ride.new.noRiderNearby')}
          />
        )}

        <TextField label={t('ride.new.note')} optional placeholder={t('ride.new.noteHint')} value={note} onChangeText={setNote} maxLength={200} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('ride.new.safety')}
        </AppText>
        <Banner tone="danger" message={error} />
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button
          title={est ? t('ride.new.order', { amount: formatGNF(est.fare) }) : t('ride.new.orderShort')}
          loading={requestState.isLoading}
          disabled={!est || estimate.isFetching || !pickup?.address.trim() || !dropoff?.address.trim()}
          onPress={() => void order()}
        />
      </View>
    </SafeAreaView>
  );
}

function PlaceRow({
  icon,
  color,
  label,
  value,
  onChange,
  onMove,
}: {
  icon: 'circle' | 'map-pin';
  color: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.place}>
      <View style={styles.row}>
        <Feather name={icon} size={14} color={color} />
        <AppText variant="label" style={styles.flex}>
          {label}
        </AppText>
        <Pressable onPress={onMove} hitSlop={8} accessibilityRole="button">
          <AppText variant="smallMedium" color={Colors.primary}>
            {t('ride.new.moveOnMap')}
          </AppText>
        </Pressable>
      </View>
      <TextField value={value} onChangeText={onChange} maxLength={200} placeholder={t('ride.new.addressHint')} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  chips: { gap: Spacing.sm, paddingTop: Spacing.sm },
  mapWrap: { flex: 1, paddingVertical: Spacing.md },
  map: { flex: 1, minHeight: 280 },
  locate: {
    position: 'absolute',
    right: Spacing.xl + Spacing.md,
    bottom: Spacing.md + Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  footer: { paddingVertical: Spacing.md },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  place: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  priceCard: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.xs },
});
