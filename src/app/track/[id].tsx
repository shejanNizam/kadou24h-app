import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTrackDeliveryQuery } from '@/features/orders/api';
import { toLatLng } from '@/features/orders/types';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { connectSocket } from '@/lib/socket';
import type { LatLng } from '@/lib/location';
import { useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

/** Live map of one delivery leg: store/station → rider → you. */
export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const token = useAppSelector((s) => s.auth.accessToken);
  const { data, isLoading, isError, error, refetch } = useTrackDeliveryQuery(id, { pollingInterval: 60_000 });
  const [live, setLive] = useState<LatLng | null>(null);

  // Live positions are sent to the delivery's room
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const join = () => socket.emit('join_delivery', id);
    join();
    socket.on('connect', join); // after a reconnect
    return () => {
      socket.off('connect', join);
      socket.emit('leave_delivery', id);
    };
  }, [id, token]);

  useSocketEvent<{ deliveryId: string; lat: number; lng: number }>('rider:location_updated', (p) => {
    if (String(p.deliveryId) === id) setLive({ lat: p.lat, lng: p.lng });
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.inner, styles.gap]}>
          <StackHeader title={t('track.title')} />
          <Skeleton height={320} radius={Radius.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader title={t('track.title')} />
        </View>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const from = toLatLng(data.fromLocation);
  const to = toLatLng(data.toLocation);
  const rider = data.riderId;
  const riderAt = live ?? toLatLng(rider?.lastLocation);
  const markers: MapMarker[] = [
    ...(from ? [{ id: 'from', kind: data.fromKind === 'station' ? ('station' as const) : ('store' as const), title: data.fromName, ...from }] : []),
    ...(to ? [{ id: 'to', kind: data.toKind === 'station' ? ('station' as const) : ('customer' as const), title: data.toName, ...to }] : []),
    ...(riderAt ? [{ id: 'rider', kind: 'rider' as const, title: rider?.userId?.name, ...riderAt }] : []),
  ];
  const v = rider?.vehicle;
  const center = riderAt ?? to ?? from ?? { lat: 9.537, lng: -13.6785 };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('track.title')} />
      </View>
      <ScrollView contentContainerStyle={[styles.inner, styles.gap]}>
        <AppMap initialCenter={center} initialZoom={14} markers={markers} fitToMarkers style={styles.map} accessibilityLabel={t('track.title')} />

        <View style={styles.card}>
          <AppText variant="h3">{t(`track.status.${data.status}`, { defaultValue: t(`status.delivery.${data.status}`) })}</AppText>
          <View style={styles.route}>
            <Point color={Colors.primary} label={data.fromName} />
            <Point color={Colors.success} label={data.toName} />
          </View>
          {!riderAt && (
            <AppText variant="caption" color={Colors.textMuted}>
              {t('track.noPosition')}
            </AppText>
          )}
        </View>

        {rider && (
          <View style={[styles.card, styles.riderRow]}>
            <View style={styles.avatar}>
              {rider.userId?.avatar?.url ? (
                <Image source={img(rider.userId.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Feather name="user" size={20} color={Colors.primary} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="title">{rider.userId?.name ?? t('order.rider')}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {[v?.brand, v?.color, v?.plateNumber].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          </View>
        )}

        {data.handoverPin && (
          <View style={styles.pin}>
            <AppText variant="smallMedium" color={Colors.primaryDark}>
              {t('order.pinTitle')}
            </AppText>
            <AppText style={styles.pinDigits} color={Colors.primaryDark}>
              {data.handoverPin}
            </AppText>
          </View>
        )}

        {to && (
          <Button
            title={t('track.openMaps')}
            variant="outline"
            icon="external-link"
            onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${riderAt?.lat ?? to.lat},${riderAt?.lng ?? to.lng}`)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Point({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.point}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="small" numberOfLines={1} style={styles.flex}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  gap: { gap: Spacing.lg, paddingBottom: Spacing.xxl },
  flex: { flex: 1 },
  map: { height: 340 },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  route: { gap: Spacing.xs },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 48, height: 48 },
  pin: { alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  pinDigits: { fontFamily: 'DMSans_700Bold', fontSize: 36, lineHeight: 44, letterSpacing: 12 },
});
