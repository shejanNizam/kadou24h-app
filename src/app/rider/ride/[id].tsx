import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import { PhotoPreview } from '@/components/media/PhotoPreview';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { toLatLng } from '@/features/orders/types';
import { useGetRideQuery, useReleaseRideMutation, useRideStepMutation } from '@/features/ride/api';
import { RIDE_TONE } from '@/features/ride/status';
import type { Ride } from '@/features/ride/types';
import { directionsUrl } from '@/features/rider/status';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

const NEXT: Partial<Record<Ride['status'], 'arrived' | 'start' | 'complete'>> = {
  accepted: 'arrived',
  arrived: 'start',
  in_progress: 'complete',
};

/**
 * My ride as a moto-taxi rider: go to the passenger (directions, call) → "I'm here"
 * → passenger on board → finish and collect the fare in cash. Before the start I can
 * drop it: it goes back to the other nearby riders.
 */
export default function RiderRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const {
    data: ride,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetRideQuery(id, { pollingInterval: 20_000, skipPollingIfUnfocused: true });
  useSocketEvent<{ rideId: string }>('ride:updated', (p) => {
    if (String(p.rideId) === id) void refetch();
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={ride ? t('ride.title', { number: ride.rideNumber }) : t('ride.rider.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={200} radius={Radius.lg} />
          <Skeleton height={160} radius={Radius.lg} />
        </View>
      ) : isError || !ride ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <Body ride={ride} refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}

function Body({ ride, refreshing, onRefresh }: { ride: Ride; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, stepState] = useRideStepMutation();
  const [release, releaseState] = useReleaseRideMutation();
  const [confirm, setConfirm] = useState<'complete' | 'release' | null>(null);
  const { open: openChat, opening } = useOpenChat();
  const next = NEXT[ride.status];
  const toPickup = ride.status === 'accepted' || ride.status === 'arrived';
  const target = toPickup ? ride.pickup : ride.dropoff;
  const phone = ride.passenger?.phone;
  const from = toLatLng(ride.pickup.location)!;
  const to = toLatLng(ride.dropoff.location)!;

  const move = async (s: 'arrived' | 'start' | 'complete') => {
    try {
      await step({ id: ride._id, step: s }).unwrap();
      setConfirm(null);
      toast.show(t(`ride.rider.done.${s}`), 'success');
    } catch (e) {
      setConfirm(null);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };
  const drop = async () => {
    try {
      await release({ id: ride._id }).unwrap();
      setConfirm(null);
      toast.show(t('ride.rider.dropped'));
      router.replace('/rider/deliveries');
    } catch (e) {
      setConfirm(null);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <AppMap
          initialCenter={from}
          initialZoom={14}
          markers={[
            { id: 'pickup', kind: 'customer', ...from, title: t('ride.pickup') },
            { id: 'dropoff', kind: 'station', ...to, title: t('ride.dropoff') },
          ]}
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
          {ride.status === 'cancelled' && (
            <Banner tone="danger" message={t('ride.rider.cancelledBy', { by: t(`ride.by.${ride.cancellation?.by ?? 'passenger'}`) })} />
          )}
          {ride.status === 'completed' && <Banner tone="success" message={t('ride.rider.completedText', { amount: formatGNF(ride.fare) })} />}
          {ride.status === 'in_progress' && <Banner tone="info" message={t('ride.rider.collectAtEnd', { amount: formatGNF(ride.fare) })} />}

          {ride.passenger && (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {ride.passenger.avatar?.url ? (
                  <Image source={img(ride.passenger.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" />
                ) : (
                  <Feather name="user" size={18} color={Colors.primary} />
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{ride.passenger.name}</AppText>
                {phone ? (
                  <AppText variant="caption" color={Colors.textMuted}>
                    {phone}
                  </AppText>
                ) : null}
              </View>
              {next && (
                <Pressable
                  onPress={() => openChat({ type: 'ride', rideId: ride._id })}
                  disabled={opening}
                  accessibilityRole="button"
                  accessibilityLabel={t('ride.rider.chat')}
                  style={styles.iconBtn}>
                  <Feather name="message-circle" size={18} color={Colors.primary} />
                </Pressable>
              )}
              {phone && next && (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${phone}`)}
                  accessibilityRole="button"
                  accessibilityLabel={t('ride.rider.call')}
                  style={styles.iconBtn}>
                  <Feather name="phone" size={18} color={Colors.primary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Place icon="circle" color={Colors.primary} label={t('ride.pickup')} value={ride.pickup.address} active={toPickup} />
          <Place
            icon="map-pin"
            color={Colors.success}
            label={t('ride.dropoff')}
            value={ride.dropoff.address}
            active={ride.status === 'in_progress'}
          />
          <AppText variant="caption" color={Colors.textMuted}>
            {t('ride.tripInfo', { km: ride.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 }), min: ride.durationMin })}
          </AppText>
          {ride.note ? (
            <AppText variant="small" color={Colors.textMuted}>
              “{ride.note}”
            </AppText>
          ) : null}
          {/* Where the passenger waits (gate, shop): helps find them */}
          {ride.pickupPhoto?.url && toPickup ? <PhotoPreview url={ride.pickupPhoto.url} label={t('ride.pickupPhoto')} /> : null}
          {next && (
            <Button
              title={toPickup ? t('ride.rider.directionsPickup') : t('ride.rider.directionsDropoff')}
              icon="navigation"
              variant="soft"
              size="sm"
              onPress={() => void Linking.openURL(directionsUrl(target.location))}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.inner, styles.footer]}>
        {next && (
          <Button
            title={next === 'complete' ? t('ride.rider.step.complete', { amount: formatGNF(ride.fare) }) : t(`ride.rider.step.${next}`)}
            loading={stepState.isLoading}
            onPress={() => (next === 'complete' ? setConfirm('complete') : void move(next))}
          />
        )}
        {toPickup && <Button title={t('ride.rider.drop')} variant="ghost" onPress={() => setConfirm('release')} />}
        {!next && <Button title={t('rider.backToList')} variant="soft" onPress={() => router.replace('/rider/deliveries')} />}
      </View>

      <ConfirmDialog
        visible={confirm === 'complete'}
        title={t('ride.rider.completeTitle')}
        message={t('ride.rider.completeText', { amount: formatGNF(ride.fare) })}
        confirmLabel={t('ride.rider.completeConfirm')}
        icon="dollar-sign"
        loading={stepState.isLoading}
        onConfirm={() => void move('complete')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'release'}
        title={t('ride.rider.dropTitle')}
        message={t('ride.rider.dropText')}
        confirmLabel={t('ride.rider.drop')}
        destructive
        loading={releaseState.isLoading}
        onConfirm={() => void drop()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function Place({ icon, color, label, value, active }: { icon: 'circle' | 'map-pin'; color: string; label: string; value: string; active: boolean }) {
  return (
    <View style={[styles.row, active && styles.activePlace]}>
      <Feather name={icon} size={14} color={color} />
      <View style={styles.flex}>
        <AppText variant="caption" color={Colors.textMuted}>
          {label}
        </AppText>
        <AppText variant={active ? 'bodyMedium' : 'smallMedium'}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  map: { height: 220 },
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
  activePlace: { padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primarySoft },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md },
});
