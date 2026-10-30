import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Stars } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { toLatLng } from '@/features/orders/types';
import { useCancelRideMutation, useGetRideQuery, useRateRideMutation, useRequestRideMutation, useShareRideMutation } from '@/features/ride/api';
import { RIDE_TONE } from '@/features/ride/status';
import { RUNNING_RIDE, type Ride } from '@/features/ride/types';
import { useDeleteFromHistory } from '@/features/history/useDeleteFromHistory';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

/**
 * My moto-taxi ride: looking for a rider → the rider is coming (live on the map)
 * → arrived → on the way → finished (pay in cash, rate). The rider's phone is
 * never shown (client rule); the rider can call me.
 */
export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);
  const {
    data: ride,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetRideQuery(id, { pollingInterval: 15_000, skipPollingIfUnfocused: true });

  useSocketEvent<{ rideId: string }>('ride:updated', (p) => {
    if (String(p.rideId) === id) void refetch();
  });
  useSocketEvent<{ rideId: string; lat: number; lng: number }>('ride:location', (p) => {
    if (String(p.rideId) === id) setLive({ lat: p.lat, lng: p.lng });
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={ride ? t('ride.title', { number: ride.rideNumber }) : t('ride.entry.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={220} radius={Radius.lg} />
          <Skeleton height={140} radius={Radius.lg} />
        </View>
      ) : isError || !ride ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <RideBody ride={ride} live={live} refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}

function RideBody({
  ride,
  live,
  refreshing,
  onRefresh,
}: {
  ride: Ride;
  live: { lat: number; lng: number } | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancel, cancelState] = useCancelRideMutation();
  const [requestRide, requestState] = useRequestRideMutation();
  const [shareRide, shareState] = useShareRideMutation();
  const running = RUNNING_RIDE.includes(ride.status);
  const remove = useDeleteFromHistory('ride', () => router.back());
  const canCancel = ['searching', 'accepted', 'arrived'].includes(ride.status);
  const from = toLatLng(ride.pickup.location)!;
  const to = toLatLng(ride.dropoff.location)!;
  const riderAt = live ?? toLatLng(ride.rider?.location);
  const markers: MapMarker[] = [
    { id: 'pickup', kind: 'customer', ...from, title: t('ride.pickup') },
    { id: 'dropoff', kind: 'station', ...to, title: t('ride.dropoff') },
    ...(running && riderAt ? [{ id: 'rider', kind: 'rider' as const, ...riderAt, title: ride.rider?.name }] : []),
  ];

  const onCancel = async () => {
    try {
      await cancel({ id: ride._id }).unwrap();
      setConfirmCancel(false);
      toast.show(t('ride.cancelled'));
    } catch (e) {
      setConfirmCancel(false);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  // A close one follows the trip from a link (browser, no app); it closes when the ride ends
  const onShare = async () => {
    try {
      const { url } = await shareRide(ride._id).unwrap();
      await Share.share({ message: t('ride.share.message', { url }) });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  // Same trip again (no rider came, or after a cancellation)
  const again = async () => {
    try {
      const next = await requestRide({
        pickup: { ...toLatLng(ride.pickup.location)!, address: ride.pickup.address },
        dropoff: { ...toLatLng(ride.dropoff.location)!, address: ride.dropoff.address },
        note: ride.note,
      }).unwrap();
      router.replace({ pathname: '/ride/[id]', params: { id: next._id } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* key: a new map once the rider appears, so all three points fit */}
        <AppMap
          key={riderAt ? 'with-rider' : 'trip'}
          initialCenter={from}
          initialZoom={14}
          markers={markers}
          fitToMarkers
          style={styles.map}
          accessibilityLabel={t('ride.mapA11y')}
        />

        <View style={styles.card}>
          <View style={styles.row}>
            <StatusPill label={t(`ride.status.${ride.status}`)} tone={RIDE_TONE[ride.status]} />
            <View style={styles.flex} />
            <AppText variant="title" color={Colors.primary}>
              {formatGNF(ride.fare)}
            </AppText>
          </View>

          {ride.status === 'searching' && (
            <View style={styles.row}>
              <ActivityIndicator color={Colors.primary} />
              <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
                {t('ride.searchingText')}
              </AppText>
            </View>
          )}
          {ride.status === 'arrived' && <Banner tone="success" message={t('ride.arrivedText')} />}
          {ride.status === 'in_progress' && <Banner tone="info" message={t('ride.onTheWayText', { place: ride.dropoff.address })} />}
          {ride.status === 'completed' && <Banner tone="success" message={t('ride.completedText', { amount: formatGNF(ride.fare) })} />}
          {ride.status === 'expired' && <Banner tone="warning" message={t('ride.expiredText')} />}
          {ride.status === 'cancelled' && (
            <Banner
              tone="danger"
              message={
                t('ride.cancelledBy', { by: t(`ride.by.${ride.cancellation?.by ?? 'passenger'}`) }) +
                (ride.cancellation?.reason ? ` « ${ride.cancellation.reason} »` : '')
              }
            />
          )}

          {ride.rider && ride.status !== 'searching' && <RiderCard ride={ride} />}
        </View>

        <View style={styles.card}>
          <Place icon="circle" color={Colors.primary} label={t('ride.pickup')} value={ride.pickup.address} />
          <Place icon="map-pin" color={Colors.success} label={t('ride.dropoff')} value={ride.dropoff.address} />
          <AppText variant="caption" color={Colors.textMuted}>
            {t('ride.tripInfo', { km: ride.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 }), min: ride.durationMin })} ·{' '}
            {t('ride.payCash')}
          </AppText>
          {ride.note ? (
            <AppText variant="small" color={Colors.textMuted}>
              “{ride.note}”
            </AppText>
          ) : null}
        </View>

        {ride.status === 'completed' && <RateRide ride={ride} />}
        {running && (
          <AppText variant="caption" color={Colors.textMuted}>
            {t('ride.safety')}
          </AppText>
        )}
        {!running && <Button title={t('history.deleteAction')} variant="ghost" icon="trash-2" onPress={() => remove.ask(ride._id)} />}
      </ScrollView>

      <View style={[styles.inner, styles.footer]}>
        {running && <Button title={t('ride.share.button')} icon="share-2" variant="soft" loading={shareState.isLoading} onPress={() => void onShare()} />}
        {canCancel && <Button title={t('ride.cancel')} variant="outline" onPress={() => setConfirmCancel(true)} />}
        {(ride.status === 'expired' || ride.status === 'cancelled') && (
          <Button title={t('ride.again')} icon="refresh-cw" loading={requestState.isLoading} onPress={() => void again()} />
        )}
        {ride.status === 'completed' && <Button title={t('ride.newRide')} variant="soft" onPress={() => router.replace('/ride/new')} />}
      </View>

      <ConfirmDialog
        visible={confirmCancel}
        title={t('ride.cancelTitle')}
        message={ride.status === 'searching' ? t('ride.cancelTextSearching') : t('ride.cancelTextRider')}
        confirmLabel={t('ride.cancel')}
        destructive
        loading={cancelState.isLoading}
        onConfirm={() => void onCancel()}
        onCancel={() => setConfirmCancel(false)}
      />
      {remove.dialog}
    </>
  );
}

function RiderCard({ ride }: { ride: Ride }) {
  const { t } = useTranslation();
  const r = ride.rider!;
  const vehicle = [r.vehicle?.brand, r.vehicle?.color].filter(Boolean).join(' · ');
  // What the passenger checks before getting on
  const ids = [
    { label: t('ride.plate'), value: r.vehicle?.plateNumber },
    { label: t('ride.vest'), value: r.vestNumber },
  ].filter((x) => x.value);
  return (
    <View style={styles.rider}>
      <View style={styles.avatar}>
        {r.avatar?.url ? (
          <Image source={img(r.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" />
        ) : (
          <Feather name="user" size={20} color={Colors.primary} />
        )}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{r.name}</AppText>
        {vehicle ? (
          <AppText variant="small" color={Colors.textMuted}>
            {vehicle}
          </AppText>
        ) : null}
        {ids.length ? (
          <View style={styles.ids}>
            {ids.map((x) => (
              <View key={x.label} style={styles.idBox}>
                <AppText variant="caption" color={Colors.textMuted}>
                  {x.label}
                </AppText>
                <AppText variant="title">{x.value}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.row}>
          {r.ratingCount ? <Stars value={r.rating} size={12} /> : null}
          <AppText variant="caption" color={Colors.textMuted}>
            {r.ratingCount ? `${r.rating.toFixed(1)} · ` : ''}
            {t('ride.riderRides', { count: r.rides })}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function RateRide({ ride }: { ride: Ride }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rate, { isLoading }] = useRateRideMutation();

  if (ride.rating) {
    return (
      <View style={styles.card}>
        <AppText variant="title">{t('ride.yourRating')}</AppText>
        <Stars value={ride.rating.stars} size={18} />
        {ride.rating.comment ? <AppText variant="small">“{ride.rating.comment}”</AppText> : null}
      </View>
    );
  }
  const send = async () => {
    try {
      await rate({ id: ride._id, stars, comment: comment.trim() || undefined }).unwrap();
      toast.show(t('ride.rated'), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };
  return (
    <View style={styles.card}>
      <AppText variant="title">{t('ride.rateTitle', { name: ride.rider?.name ?? '' })}</AppText>
      <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: stars }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setStars(n)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('order.stars', { count: n })}
            style={styles.star}>
            <Feather name="star" size={30} color={n <= stars ? Colors.warning : Colors.border} />
          </Pressable>
        ))}
      </View>
      <TextField label={t('order.reviewComment')} optional value={comment} onChangeText={setComment} maxLength={500} />
      <Button title={t('ride.rateSend')} size="sm" disabled={stars === 0} loading={isLoading} onPress={() => void send()} />
    </View>
  );
}

function Place({ icon, color, label, value }: { icon: 'circle' | 'map-pin'; color: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Feather name={icon} size={14} color={color} />
      <View style={styles.flex}>
        <AppText variant="caption" color={Colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="smallMedium">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  map: { height: 240 },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  ids: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginVertical: Spacing.xs },
  idBox: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.text },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs },
  star: { minWidth: MinTouch, minHeight: MinTouch, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md },
});
