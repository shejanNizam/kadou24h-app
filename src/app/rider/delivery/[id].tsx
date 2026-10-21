import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import type { MapMarker } from '@/components/map/types';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { toLatLng } from '@/features/orders/types';
import { useAcceptDeliveryMutation, useGetMyRiderQuery, useGetRiderDeliveryQuery, useGoingToPickupMutation } from '@/features/rider/api';
import { DeclineSheet, PinSheet } from '@/features/rider/components/DeliverySheets';
import { ShowCode } from '@/features/rider/components/ShowCode';
import { cashToCollect, DELIVERY_TONE, directionsUrl, handoverTo, pickupFrom, riderStep, type RiderStep } from '@/features/rider/status';
import type { RiderDeliveryDetails } from '@/features/rider/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { connectSocket } from '@/lib/socket';
import { useAppSelector } from '@/store/hooks';

// Accepted → picked up → delivered: how many are behind me at each step
const MILESTONES = ['accepted', 'pickedUp', 'delivered'] as const;
const PROGRESS: Record<RiderStep, number> = { answer: 0, leave: 1, pickupCode: 1, handoverCode: 2, done: 3 };

/**
 * One delivery leg, one big button for the next action (APP_SPEC §7.4):
 * accept → leave for pickup → type the store's code → (collect the cash) →
 * type the customer's code → done.
 */
export default function RiderDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const token = useAppSelector((s) => s.auth.accessToken);
  const { data, isLoading, isError, error, refetch } = useGetRiderDeliveryQuery(id);

  // Live: a cancellation or change by the store shows at once
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const join = () => socket.emit('join_delivery', id);
    const onChange = (p: { status?: string }) => p && void refetch();
    join();
    socket.on('connect', join);
    socket.on('delivery:status_changed', onChange);
    return () => {
      socket.off('connect', join);
      socket.off('delivery:status_changed', onChange);
      socket.emit('leave_delivery', id);
    };
  }, [id, token, refetch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={data ? `#${data.subOrderId?.subOrderNumber}` : t('rider.deliveryTitle')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.gap]}>
          <Skeleton height={200} radius={Radius.lg} />
          <Skeleton height={140} radius={Radius.lg} />
        </View>
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <DeliveryBody delivery={data} />
      )}
    </SafeAreaView>
  );
}

function DeliveryBody({ delivery: d }: { delivery: RiderDeliveryDetails }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { open: openChat, opening } = useOpenChat();
  const { data: me } = useGetMyRiderQuery();
  const [accept, acceptState] = useAcceptDeliveryMutation();
  const [leave, leaveState] = useGoingToPickupMutation();
  const [declining, setDeclining] = useState(false);
  const [pin, setPin] = useState<'pickup' | 'handover' | null>(null);

  const step = riderStep(d.status);
  const cash = cashToCollect(d);
  const address = d.orderId?.addressSnapshot;
  // Who gives me the parcel and who I give it to (store, customer, or the other driver at a bus station)
  const giver = pickupFrom(d);
  const receiver = handoverTo(d);
  const toCustomer = receiver === 'customer';
  const fromStore = giver === 'store';
  const customerName = address?.fullName ?? d.toName;
  const lockedMin = useLockMinutes(d.pinLockedUntil);
  const items = d.subOrderId?.items?.filter((i) => !i.removed) ?? [];

  const from = toLatLng(d.fromLocation);
  const to = toLatLng(d.toLocation);
  const markers: MapMarker[] = [
    ...(from ? [{ id: 'from', kind: d.fromKind === 'station' ? ('station' as const) : ('store' as const), title: d.fromName, ...from }] : []),
    ...(to ? [{ id: 'to', kind: d.toKind === 'station' ? ('station' as const) : ('customer' as const), title: d.toName, ...to }] : []),
    ...(me?.lastLocation ? [{ id: 'me', kind: 'rider' as const, title: t('rider.me'), ...me.lastLocation }] : []),
  ];

  const run = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) toast.show(done, 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const progress = PROGRESS[step];
  return (
    <>
      <ScrollView contentContainerStyle={[styles.inner, styles.content]}>
        <View style={styles.row}>
          <StatusPill label={t(`status.delivery.${d.status}`)} tone={DELIVERY_TONE[d.status]} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
            {d.legType !== 'local' ? t(`rider.leg.${d.legType}`) : ''}
          </AppText>
          <AppText variant="title" color={Colors.primary}>
            {formatGNF(d.fee)}
          </AppText>
        </View>

        {d.status !== 'cancelled' && (
          <View style={styles.steps} accessibilityLabel={t('rider.stepA11y', { current: progress, total: MILESTONES.length })}>
            {MILESTONES.map((m, i) => {
              const reached = progress > i;
              return (
                <View key={m} style={styles.stepItem}>
                  <View style={[styles.stepDot, reached && styles.stepDotOn]}>
                    {reached ? <Feather name="check" size={12} color={Colors.textOnPrimary} /> : <AppText variant="caption">{i + 1}</AppText>}
                  </View>
                  <AppText variant="caption" color={reached ? Colors.text : Colors.textMuted} align="center" numberOfLines={1}>
                    {t(`rider.milestone.${m}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {d.status === 'cancelled' && <Banner tone="danger" message={t('rider.cancelledBanner')} />}
        {d.status === 'delivered' && <Banner tone="success" message={t('rider.deliveredBanner', { amount: formatGNF(d.fee) })} />}
        {lockedMin > 0 && step !== 'done' && <Banner tone="warning" message={t('rider.pinLocked', { count: lockedMin })} />}

        {/* Bus station relay: each side shows one code and types the other's */}
        {(step === 'leave' || step === 'pickupCode') && giver !== 'store' && d.incomingHandoverPin && (
          <ShowCode code={d.incomingHandoverPin} title={t('relay.showTitle')} hint={t(`relay.showIncoming.${giver}`, { station: d.fromName })} />
        )}
        {step === 'handoverCode' && receiver !== 'customer' && d.outgoingPickupPin && (
          <ShowCode code={d.outgoingPickupPin} title={t('relay.showTitle')} hint={t(`relay.showOutgoing.${receiver}`, { station: d.toName })} />
        )}

        <AppMap
          initialCenter={(step === 'handoverCode' ? to : from) ?? to ?? from ?? { lat: 9.537, lng: -13.6785 }}
          initialZoom={14}
          markers={markers}
          fitToMarkers
          style={styles.map}
          accessibilityLabel={t('rider.mapA11y')}
        />

        {/* Pickup */}
        <Stop
          active={step === 'leave' || step === 'pickupCode'}
          done={progress >= 2}
          icon={d.fromKind === 'station' ? 'home' : 'shopping-bag'}
          label={t('rider.pickupAt')}
          title={d.fromName}
          lines={[d.fromAddressText]}
          onNavigate={step !== 'done' && step !== 'answer' ? () => void Linking.openURL(directionsUrl(d.fromLocation)) : undefined}
          onChat={fromStore && step !== 'done' && step !== 'answer' ? () => openChat({ type: 'order', subOrderId: d.subOrderId._id, with: 'vendor' }) : undefined}
          chatting={opening}
        />

        {/* Drop-off: landmark, directions and gate photo beat raw coordinates */}
        <Stop
          active={step === 'handoverCode'}
          done={d.status === 'delivered'}
          icon={d.toKind === 'station' ? 'home' : 'map-pin'}
          label={t('rider.dropAt')}
          title={toCustomer ? customerName : d.toName}
          lines={
            toCustomer && d.toKind === 'station'
              ? // Station pickup: the customer meets me at the destination bus station
                [t('relay.atStation', { station: d.toName }), d.toAddressText]
              : toCustomer && address
                ? [[address.neighborhood, address.commune, address.city].filter(Boolean).join(', '), address.landmark && t('rider.landmark', { text: address.landmark }), address.directions]
                : [d.toAddressText]
          }
          photo={toCustomer && d.toKind === 'customer' ? address?.placePhoto?.url : undefined}
          onNavigate={step === 'handoverCode' ? () => void Linking.openURL(directionsUrl(d.toLocation)) : undefined}
          onChat={toCustomer && step !== 'done' && step !== 'answer' ? () => openChat({ type: 'order', subOrderId: d.subOrderId._id, with: 'customer' }) : undefined}
          chatting={opening}
        />

        {/* Money: what I collect, what I earn */}
        <View style={styles.card}>
          {toCustomer &&
            (cash > 0 ? (
              <View style={styles.collect}>
                <Feather name="dollar-sign" size={18} color={Colors.warning} />
                <View style={styles.flex}>
                  <AppText variant="small" color={Colors.textMuted}>
                    {t('rider.amountToCollect')}
                  </AppText>
                  <AppText variant="h2">{formatGNF(cash)}</AppText>
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                <Feather name="check-circle" size={16} color={Colors.success} />
                <AppText variant="small" style={styles.flex}>
                  {t('rider.paidOnline')}
                </AppText>
              </View>
            ))}
          <View style={styles.row}>
            <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
              {t('rider.yourEarning')}
            </AppText>
            <AppText variant="title" color={Colors.primary}>
              {formatGNF(d.fee)}
            </AppText>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.card}>
            <AppText variant="title">{t('rider.parcel', { count: items.reduce((n, i) => n + i.qty, 0) })}</AppText>
            {items.map((i, k) => (
              <AppText key={k} variant="small" color={Colors.textMuted}>
                {i.qty}× {i.name}
              </AppText>
            ))}
          </View>
        )}
      </ScrollView>

      {/* The one next action */}
      {step !== 'done' && (
        <View style={[styles.inner, styles.footer]}>
          {step === 'answer' && (
            <>
              <Button title={t('rider.decline')} variant="outline" style={styles.flex} onPress={() => setDeclining(true)} />
              <Button
                title={t('rider.accept')}
                style={styles.flex}
                loading={acceptState.isLoading}
                onPress={() => void run(() => accept(d._id).unwrap(), t('rider.accepted'))}
              />
            </>
          )}
          {step === 'leave' && (
            <Button
              title={t('rider.step.leave')}
              icon="navigation"
              style={styles.flex}
              loading={leaveState.isLoading}
              onPress={() => void run(() => leave(d._id).unwrap())}
            />
          )}
          {step === 'pickupCode' && (
            <Button title={t('rider.step.pickupCode')} icon="lock" style={styles.flex} disabled={lockedMin > 0} onPress={() => setPin('pickup')} />
          )}
          {step === 'handoverCode' && (
            <Button
              title={cash > 0 ? t('rider.step.handoverCash', { amount: formatGNF(cash) }) : t('rider.step.handoverCode')}
              icon="unlock"
              style={styles.flex}
              disabled={lockedMin > 0}
              onPress={() => setPin('handover')}
            />
          )}
        </View>
      )}
      {step === 'done' && (
        <View style={[styles.inner, styles.footer]}>
          <Button title={t('rider.backToList')} variant="outline" style={styles.flex} onPress={() => router.back()} />
        </View>
      )}

      <DeclineSheet deliveryId={declining ? d._id : null} onClose={() => setDeclining(false)} onDone={() => router.back()} />
      <PinSheet
        deliveryId={d._id}
        kind={pin ?? 'pickup'}
        hint={pin === 'handover' ? t(`relay.askHandover.${receiver}`, { name: customerName }) : t(`relay.askPickup.${giver}`, { name: d.fromName })}
        cash={pin === 'handover' && cash > 0 ? cash : undefined}
        visible={pin !== null}
        onClose={() => setPin(null)}
        onDone={() => toast.show(pin === 'handover' ? t('rider.handoverDone') : t('rider.pickupDone'), 'success')}
      />
    </>
  );
}

/** Minutes left on a wrong-code lock (0 = unlocked); counts down while shown */
function useLockMinutes(until?: string) {
  const [now, setNow] = useState(() => Date.now());
  const end = until ? new Date(until).getTime() : 0;
  // The clock ticks every 30 s while the screen is open
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return end > now ? Math.ceil((end - now) / 60_000) : 0;
}

function Stop({
  active,
  done,
  icon,
  label,
  title,
  lines,
  photo,
  onNavigate,
  onChat,
  chatting,
}: {
  active: boolean;
  done: boolean;
  icon: 'home' | 'shopping-bag' | 'map-pin';
  label: string;
  title: string;
  lines: (string | undefined | false)[];
  photo?: string;
  onNavigate?: () => void;
  onChat?: () => void;
  chatting?: boolean;
}) {
  const { t } = useTranslation();
  const [viewPhoto, setViewPhoto] = useState(false);
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.row}>
        <View style={[styles.stopIcon, done && styles.stopIconDone]}>
          <Feather name={done ? 'check' : icon} size={16} color={done ? Colors.textOnPrimary : Colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={Colors.textMuted}>
            {label}
          </AppText>
          <AppText variant="title">{title}</AppText>
        </View>
      </View>
      {lines.filter(Boolean).map((line, i) => (
        <AppText key={i} variant="small" color={Colors.textMuted}>
          {line}
        </AppText>
      ))}
      {photo ? (
        <Pressable onPress={() => setViewPhoto((v) => !v)} accessibilityRole="imagebutton" accessibilityLabel={t('rider.gatePhoto')}>
          <Image source={photo} style={viewPhoto ? styles.photoBig : styles.photo} contentFit="cover" />
        </Pressable>
      ) : null}
      {(onNavigate || onChat) && (
        <View style={styles.row}>
          {onNavigate && <Button title={t('rider.navigate')} icon="navigation" variant="soft" size="sm" style={styles.flex} onPress={onNavigate} />}
          {onChat && <Button title={t('rider.message')} icon="message-circle" variant="outline" size="sm" style={styles.flex} loading={chatting} onPress={onChat} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  gap: { gap: Spacing.md },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  steps: { flexDirection: 'row', gap: Spacing.xs },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  stepDotOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  map: { height: 200 },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  cardActive: { borderColor: Colors.primary, borderWidth: 2 },
  stopIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  stopIconDone: { backgroundColor: Colors.success },
  photo: { height: 90, borderRadius: Radius.md },
  photoBig: { height: 260, borderRadius: Radius.md },
  collect: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.warningSoft },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.background },
});
