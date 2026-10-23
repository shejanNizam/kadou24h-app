import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
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
import { SUB_ORDER_TONE } from '@/features/orders/status';
import { toLatLng, type SubOrderStatus } from '@/features/orders/types';
import { useGetVendorOrderQuery, useUpdateOrderStatusMutation } from '@/features/vendor/api';
import { AssignRiderSheet, CancelOrderSheet, ModifyOrderSheet } from '@/features/vendor/components/OrderSheets';
import { PaymentChip } from '@/features/vendor/components/PaymentChip';
import type { VendorLeg, VendorSubOrderDetails } from '@/features/vendor/types';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

/** The one next step the store can take (the rider does pickup and delivery with PINs) */
const NEXT_STEP: Partial<Record<SubOrderStatus, 'accepted' | 'preparing' | 'ready_for_pickup'>> = {
  new: 'accepted',
  accepted: 'preparing',
  preparing: 'ready_for_pickup',
};
const EDITABLE: SubOrderStatus[] = ['new', 'accepted', 'preparing'];
const ASSIGNABLE_LEG = ['pending_assignment', 'declined'];
const ACTIVE_LEG = ['accepted', 'going_to_pickup', 'picked_up', 'in_transit'];

/**
 * One incoming order for my store: who, where, what, how it is paid, what I
 * earn, and the next action (accept → prepare → ready), plus the rider.
 */
export default function VendorOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetVendorOrderQuery(id);
  // A rider declined or moved the parcel: refresh what is on screen
  useSocketEvent('delivery:declined', () => void refetch());
  useSocketEvent('delivery:status_changed', () => void refetch());

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={data ? `#${data.subOrder.subOrderNumber}` : t('order.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={120} radius={Radius.lg} />
          <Skeleton height={200} radius={Radius.lg} />
        </View>
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <OrderBody data={data} refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}

function OrderBody({ data, refreshing, onRefresh }: { data: VendorSubOrderDetails; refreshing: boolean; onRefresh: () => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { open: openChat, opening } = useOpenChat();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [assignLeg, setAssignLeg] = useState<string | null>(null);
  const [updateStatus, { isLoading: moving }] = useUpdateOrderStatusMutation();

  const { subOrder: so, parentOrder: order, deliveries, pickupPin } = data;
  const address = order.addressSnapshot;
  const where = toLatLng(address.location);
  const next = NEXT_STEP[so.status];
  const awaitingPayment = order.paymentMethod !== 'cod' && order.paymentStatus === 'unpaid';
  const items = so.items;
  const phone = so.customerId?.phone;
  const canCall = Boolean(phone && !phone.includes('•'));

  const advance = async () => {
    if (!next) return;
    try {
      await updateStatus({ id: so._id, status: next }).unwrap();
      toast.show(t(`vendorOrders.moved.${next}`), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.row}>
          <StatusPill label={t(`status.subOrder.${so.status}`)} tone={SUB_ORDER_TONE[so.status]} />
          <PaymentChip order={order} />
          <View style={styles.flex} />
          <AppText variant="caption" color={Colors.textMuted}>
            {new Date(so.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </AppText>
        </View>

        {awaitingPayment && so.status !== 'cancelled' && <Banner tone="warning" message={t('vendorOrders.awaitingPayment')} />}
        {so.status === 'cancelled' && so.cancellation && (
          <Banner tone="danger" message={t('order.cancelledBy', { by: t(`vendorOrders.by.${so.cancellation.by}`), reason: so.cancellation.reason })} />
        )}

        {pickupPin && (
          <View style={styles.pin} accessibilityLabel={t('vendorOrders.pinA11y', { pin: pickupPin.split('').join(' ') })}>
            <AppText variant="label" color={Colors.textOnPrimary}>
              {t('order.pinTitlePickup')}
            </AppText>
            <AppText variant="h1" color={Colors.textOnPrimary} style={styles.pinDigits}>
              {pickupPin}
            </AppText>
            <AppText variant="small" color={Colors.textOnPrimary} style={styles.center}>
              {t('vendorOrders.pinHint')}
            </AppText>
          </View>
        )}

        {/* Customer */}
        <Section title={t('vendorOrders.customer')}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              {so.customerId?.avatar?.url ? (
                <Image source={img(so.customerId.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" />
              ) : (
                <Feather name="user" size={18} color={Colors.primary} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyMedium">{so.customerId?.name}</AppText>
              {phone ? (
                <AppText variant="caption" color={Colors.textMuted}>
                  {phone}
                </AppText>
              ) : null}
            </View>
            {canCall && (
              <IconButton icon="phone" label={t('vendorOrders.call')} onPress={() => void Linking.openURL(`tel:${phone}`)} />
            )}
            <IconButton
              icon="message-circle"
              label={t('vendorOrders.chatCustomer')}
              disabled={opening}
              onPress={() => openChat({ type: 'order', subOrderId: so._id, with: 'customer' })}
            />
          </View>
        </Section>

        {/* Delivery */}
        <Section title={t(`checkout.type.${order.deliveryType}`)}>
          {where && (
            <AppMap
              initialCenter={where}
              initialZoom={15}
              markers={[{ id: 'customer', kind: 'customer', ...where }]}
              style={styles.map}
              accessibilityLabel={t('order.deliverTo')}
            />
          )}
          <AppText variant="bodyMedium">{address.fullName}</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            {[address.neighborhood, address.commune, address.city].filter(Boolean).join(', ')}
          </AppText>
          {address.landmark ? <AppText variant="small">📍 {address.landmark}</AppText> : null}
          {address.directions ? <AppText variant="small">{address.directions}</AppText> : null}
          {address.placePhoto?.url ? <Image source={img(address.placePhoto.url, 'card')} style={styles.placePhoto} contentFit="cover" /> : null}
          {order.specialInstructions ? <Banner tone="info" message={`${t('checkout.instructions')} : ${order.specialInstructions}`} /> : null}
        </Section>

        {/* Delivery legs + riders */}
        {deliveries.length > 0 && so.status !== 'cancelled' && (
          <Section title={t('vendorOrders.delivery')}>
            {deliveries.map((leg, i) => (
              <LegRow
                key={leg._id}
                leg={leg}
                orderAccepted={so.status !== 'new'}
                last={i === deliveries.length - 1}
                onAssign={() => setAssignLeg(leg._id)}
                onChat={() => openChat({ type: 'order', subOrderId: so._id, with: 'rider' })}
              />
            ))}
          </Section>
        )}

        {/* Items */}
        <Section
          title={t('vendorOrders.items')}
          action={EDITABLE.includes(so.status) ? { label: t('vendorOrders.modify'), onPress: () => setModifyOpen(true) } : undefined}>
          {items.map((i) => (
            <View key={i._id} style={styles.row}>
              <View style={styles.thumb}>{i.image ? <Image source={img(i.image, 'thumb')} style={styles.thumb} contentFit="cover" /> : null}</View>
              <View style={styles.flex}>
                <AppText variant="small" numberOfLines={2} style={i.removed ? styles.struck : undefined}>
                  {i.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {i.qty} × {formatGNF(i.unitPrice)}
                </AppText>
              </View>
              <AppText variant="smallMedium" style={i.removed ? styles.struck : undefined}>
                {i.removed ? t('vendorOrders.removed') : formatGNF(i.lineTotal)}
              </AppText>
            </View>
          ))}
          {so.modifications?.map((m) => (
            <AppText key={m._id} variant="caption" color={Colors.textMuted}>
              {t('vendorOrders.modifiedOn', {
                date: new Date(m.at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
                old: formatGNF(m.oldTotal),
                total: formatGNF(m.newTotal),
              })}
            </AppText>
          ))}
        </Section>

        {/* Money */}
        <Section title={t('vendorOrders.money')}>
          <MoneyRow label={t('checkout.subtotal')} value={formatGNF(so.subtotal)} />
          <MoneyRow label={t('checkout.delivery')} value={formatGNF(so.deliveryFee)} hint={t('vendorOrders.deliveryForRider')} />
          <MoneyRow label={t('vendorOrders.customerPays')} value={formatGNF(so.total)} />
          <MoneyRow label={t('vendorOrders.commission', { rate: so.commissionRate })} value={`− ${formatGNF(so.commissionAmount)}`} />
          <View style={styles.divider} />
          <MoneyRow label={t('vendorOrders.youGet')} value={formatGNF(so.vendorEarning)} strong />
          {so.codAmountToCollect ? (
            <AppText variant="caption" color={Colors.textMuted}>
              {t('vendorOrders.codNote', { amount: formatGNF(so.codAmountToCollect) })}
            </AppText>
          ) : null}
        </Section>
      </ScrollView>

      {(next || EDITABLE.includes(so.status)) && (
        <View style={[styles.inner, styles.footer]}>
          {EDITABLE.includes(so.status) && (
            <Button
              title={so.status === 'new' ? t('vendorOrders.refuse') : t('vendorOrders.cancel')}
              variant="outline"
              style={styles.flex}
              onPress={() => setCancelOpen(true)}
            />
          )}
          {next && <Button title={t(`vendorOrders.action.${next}`)} style={styles.flex2} loading={moving} onPress={() => void advance()} />}
        </View>
      )}

      <CancelOrderSheet subOrderId={so._id} refuse={so.status === 'new'} visible={cancelOpen} onClose={() => setCancelOpen(false)} />
      <ModifyOrderSheet subOrderId={so._id} items={items} visible={modifyOpen} onClose={() => setModifyOpen(false)} />
      <AssignRiderSheet deliveryId={assignLeg} onClose={() => setAssignLeg(null)} />
    </>
  );
}

/**
 * One delivery leg. Open dispatch: once the order is accepted, nearby riders
 * see it and the first to accept takes it; the store may still send it to one
 * rider, who has a few minutes to answer.
 */
function LegRow({
  leg,
  orderAccepted,
  last,
  onAssign,
  onChat,
}: {
  leg: VendorLeg;
  orderAccepted: boolean;
  last: boolean;
  onAssign: () => void;
  onChat: () => void;
}) {
  const { t, i18n } = useTranslation();
  const rider = leg.riderId;
  const canAssign = ASSIGNABLE_LEG.includes(leg.status);
  const searching = leg.status === 'pending_assignment' && Boolean(leg.offerOpenedAt);
  const reserved = leg.status === 'assigned' && leg.reservedUntil;
  const hint = reserved
    ? t('vendorOrders.legReserved', {
        name: rider?.userId?.name ?? '',
        time: new Date(leg.reservedUntil!).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
      })
    : searching
      ? leg.noRiderAlertedAt
        ? t('vendorOrders.legNobody')
        : t('vendorOrders.legSearching')
      : leg.status === 'pending_assignment' && leg.legNumber === 1 && !orderAccepted
        ? t('vendorOrders.legWaitAccept')
        : null;
  return (
    <View style={[styles.leg, !last && styles.legDivider]}>
      <View style={styles.row}>
        <Feather name={leg.legType === 'line_haul' ? 'truck' : 'navigation'} size={16} color={Colors.primary} />
        <AppText variant="smallMedium" style={styles.flex} numberOfLines={2}>
          {leg.fromName} → {leg.toName}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {t(`vendorOrders.legStatus.${leg.status}`)}
        </AppText>
      </View>
      {rider?.userId ? (
        <View style={styles.row}>
          <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
            {rider.userId.name}
            {rider.vehicle?.type ? ` · ${t(`vehicle.${rider.vehicle.type}`, { defaultValue: rider.vehicle.type })}` : ''}
          </AppText>
          {leg.status !== 'declined' && <IconButton icon="message-circle" label={t('vendorOrders.chatRider')} onPress={onChat} />}
          {ACTIVE_LEG.includes(leg.status) && (
            <IconButton icon="map" label={t('order.track')} onPress={() => router.push({ pathname: '/track/[id]', params: { id: leg._id } })} />
          )}
        </View>
      ) : null}
      {leg.status === 'declined' && <AppText variant="caption" color={Colors.danger}>{t('vendorOrders.riderDeclined')}</AppText>}
      {hint ? (
        <View style={styles.row}>
          {searching && !leg.noRiderAlertedAt && <ActivityIndicator size="small" color={Colors.primary} />}
          <AppText variant="caption" color={leg.noRiderAlertedAt && searching ? Colors.warning : Colors.textMuted} style={styles.flex}>
            {hint}
          </AppText>
        </View>
      ) : null}
      {canAssign && (
        <Button
          title={leg.legType === 'line_haul' ? t('vendorOrders.assignBus') : t('vendorOrders.assignRider')}
          icon="user-plus"
          size="sm"
          variant={leg.status === 'declined' || leg.noRiderAlertedAt ? 'primary' : 'soft'}
          onPress={onAssign}
        />
      )}
    </View>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            <AppText variant="smallMedium" color={Colors.primary}>
              {action.label}
            </AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function MoneyRow({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <View>
      <View style={styles.row}>
        <AppText variant={strong ? 'title' : 'small'} style={styles.flex}>
          {label}
        </AppText>
        <AppText variant={strong ? 'title' : 'smallMedium'} color={strong ? Colors.primary : Colors.text}>
          {value}
        </AppText>
      </View>
      {hint ? (
        <AppText variant="caption" color={Colors.textSubtle}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

function IconButton({ icon, label, onPress, disabled }: { icon: 'phone' | 'message-circle' | 'map'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn}>
      <Feather name={icon} size={18} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  center: { textAlign: 'center' },
  section: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pin: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  pinDigits: { letterSpacing: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  map: { height: 140, borderRadius: Radius.md },
  placePhoto: { height: 120, borderRadius: Radius.md },
  leg: { gap: Spacing.sm, paddingBottom: Spacing.md },
  legDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  thumb: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' },
  struck: { textDecorationLine: 'line-through', color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
});
