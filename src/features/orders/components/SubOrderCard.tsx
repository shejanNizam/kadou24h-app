import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { formatGNF } from '@/lib/format';

import { SUB_ORDER_STEPS, SUB_ORDER_TONE, TRACKABLE_LEG } from '../status';
import type { DeliveryLegSummary, DeliveryType, OrderRider, SubOrder } from '../types';
import { img } from '@/lib/image';

/** One store's part of the order: progress, items, rider, PIN, actions. */
export function SubOrderCard({
  subOrder,
  deliveryType,
  isCod,
  onReview,
  onCancelPart,
}: {
  subOrder: SubOrder;
  deliveryType: DeliveryType;
  isCod: boolean;
  onReview: (subOrder: SubOrder) => void;
  /** Set when this store's part can be cancelled alone */
  onCancelPart?: () => void;
}) {
  const { t } = useTranslation();
  const { open: openChat, opening } = useOpenChat();
  const store = subOrder.vendorId;
  const legs = subOrder.deliveries ?? [];
  const activeLeg = legs.find((l) => TRACKABLE_LEG.includes(l.status));
  const cancelled = subOrder.status === 'cancelled';
  const delivered = subOrder.status === 'delivered';
  const lastModification = subOrder.modifications.at(-1);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logo}>
          {store.logo?.url ? (
            <Image source={img(store.logo.url, 'thumb')} style={styles.logoImg} contentFit="cover" />
          ) : (
            <Feather name="shopping-bag" size={18} color={Colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={1}>
            {store.storeName}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            #{subOrder.subOrderNumber}
          </AppText>
        </View>
        <StatusPill label={t(`status.subOrder.${subOrder.status}`)} tone={SUB_ORDER_TONE[subOrder.status]} />
      </View>

      {cancelled ? (
        subOrder.cancellation && (
          <Banner
            tone="danger"
            message={
              // Payment window over: the server's reason is English, say it in the user's language
              subOrder.cancellation.by === 'system'
                ? t('order.paymentExpired')
                : t('order.cancelledBy', { by: t(`order.by.${subOrder.cancellation.by}`), reason: subOrder.cancellation.reason })
            }
          />
        )
      ) : subOrder.status === 'pending_payment' ? null : (
        <Steps current={subOrder.status} />
      )}

      {/* The code is the proof of delivery: shown until the parcel is handed over */}
      {subOrder.deliveryPin && !cancelled && !delivered && (
        <View style={styles.pin} accessibilityLabel={t('order.pinA11y', { pin: subOrder.deliveryPin.split('').join(' ') })}>
          <AppText variant="smallMedium" color={Colors.primaryDark}>
            {deliveryType === 'station_pickup' ? t('order.pinTitlePickup') : t('order.pinTitle')}
          </AppText>
          <AppText style={styles.pinDigits} color={Colors.primaryDark}>
            {subOrder.deliveryPin}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted} align="center">
            {t('order.pinHint')}
          </AppText>
        </View>
      )}

      {lastModification && (
        <Banner
          tone="warning"
          message={t('order.modified', {
            total: formatGNF(lastModification.newTotal),
            items: lastModification.removedItems.map((i) => i.name).join(', '),
          })}
        />
      )}

      {subOrder.currentRiderId && !cancelled && !delivered && <RiderRow rider={subOrder.currentRiderId} />}

      {legs.length > 1 && <LegTimeline legs={legs} />}

      <View style={styles.items}>
        {subOrder.items.map((item) => (
          <View key={item._id} style={[styles.item, item.removed && styles.removed]}>
            <View style={styles.thumb}>{item.image ? <Image source={img(item.image, 'thumb')} style={styles.thumbImg} contentFit="cover" /> : null}</View>
            <AppText variant="small" numberOfLines={2} style={[styles.flex, item.removed && styles.strike]}>
              {item.qty} × {item.name}
            </AppText>
            <AppText variant="smallMedium" style={item.removed && styles.strike}>
              {formatGNF(item.lineTotal)}
            </AppText>
          </View>
        ))}
        <View style={styles.totalRow}>
          <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
            {t('order.storeTotal')}
          </AppText>
          <AppText variant="title">{formatGNF(subOrder.total)}</AppText>
        </View>
        {isCod && subOrder.codAmountToCollect !== undefined && !cancelled && !delivered && (
          <AppText variant="caption" color={Colors.textMuted}>
            {t('order.payRider', { amount: formatGNF(subOrder.codAmountToCollect) })}
          </AppText>
        )}
      </View>

      <View style={styles.actions}>
        {activeLeg && (
          <Button
            title={t('order.track')}
            icon="map"
            size="sm"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/track/[id]', params: { id: activeLeg._id } })}
          />
        )}
        <Button
          title={t('order.chatStore')}
          icon="message-circle"
          size="sm"
          variant="outline"
          style={styles.flex}
          disabled={opening}
          onPress={() => openChat({ type: 'order', subOrderId: subOrder._id, with: 'vendor' })}
        />
        {subOrder.currentRiderId && !cancelled && !delivered && (
          <Button
            title={t('order.chatRider')}
            icon="mic"
            size="sm"
            variant="outline"
            style={styles.flex}
            disabled={opening}
            onPress={() => openChat({ type: 'order', subOrderId: subOrder._id, with: 'rider' })}
          />
        )}
        {delivered && !subOrder.reviewed && (
          <Button title={t('order.review')} icon="star" size="sm" variant="soft" style={styles.flex} onPress={() => onReview(subOrder)} />
        )}
      </View>
      {onCancelPart && (
        <Button title={t('order.cancelPart')} icon="x-circle" size="sm" variant="ghost" onPress={onCancelPart} />
      )}
      {delivered && subOrder.reviewed && (
        <AppText variant="caption" color={Colors.success}>
          ✓ {t('order.reviewed')}
        </AppText>
      )}
    </View>
  );
}

function Steps({ current }: { current: SubOrder['status'] }) {
  const { t } = useTranslation();
  const index = SUB_ORDER_STEPS.indexOf(current);
  return (
    <View style={styles.steps} accessibilityLabel={t(`status.subOrder.${current}`)}>
      {SUB_ORDER_STEPS.map((s, i) => (
        <View key={s} style={[styles.step, i <= index && styles.stepDone]} />
      ))}
    </View>
  );
}

function RiderRow({ rider }: { rider: OrderRider }) {
  const { t } = useTranslation();
  const v = rider.vehicle;
  const vehicle = [v?.brand, v?.color, v?.plateNumber].filter(Boolean).join(' · ');
  return (
    <View style={styles.rider}>
      <View style={styles.avatar}>
        {rider.userId?.avatar?.url ? (
          <Image source={img(rider.userId.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Feather name={rider.partnerType === 'transit' ? 'truck' : 'user'} size={18} color={Colors.primary} />
        )}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {rider.userId?.name ?? t('order.rider')}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
          {vehicle || t(`order.partner.${rider.partnerType}`)}
        </AppText>
      </View>
      {rider.stats && rider.stats.ratingCount > 0 && (
        <View style={styles.rating}>
          <Feather name="star" size={12} color={Colors.warning} />
          <AppText variant="caption">{rider.stats.ratingAvg.toFixed(1)}</AppText>
        </View>
      )}
    </View>
  );
}

/** Intercity / station pickup: moto → bus → moto, one line per leg. */
function LegTimeline({ legs }: { legs: DeliveryLegSummary[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.legs}>
      {legs.map((leg, i) => {
        const done = leg.status === 'delivered';
        const live = TRACKABLE_LEG.includes(leg.status);
        return (
          <View key={leg._id} style={styles.leg}>
            <View style={styles.legRail}>
              <View style={[styles.legDot, done && styles.legDone, live && styles.legLive]}>
                <Feather name={leg.legType === 'line_haul' ? 'truck' : 'navigation'} size={11} color={done || live ? Colors.textOnPrimary : Colors.textMuted} />
              </View>
              {i < legs.length - 1 && <View style={styles.legLine} />}
            </View>
            <View style={[styles.flex, styles.legText]}>
              <AppText variant="smallMedium">
                {t(`order.leg.${leg.legType}`)} · {leg.fromName} → {leg.toName}
              </AppText>
              <AppText variant="caption" color={live ? Colors.primary : Colors.textMuted}>
                {t(`status.delivery.${leg.status}`)}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 40, height: 40 },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDone: { backgroundColor: Colors.primary },
  pin: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderStyle: 'dashed',
  },
  pinDigits: { fontFamily: 'DMSans_700Bold', fontSize: 36, lineHeight: 44, letterSpacing: 12 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  legs: { gap: 0 },
  leg: { flexDirection: 'row', gap: Spacing.md },
  legRail: { alignItems: 'center', width: 22 },
  legDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  legDone: { backgroundColor: Colors.success },
  legLive: { backgroundColor: Colors.primary },
  legLine: { flex: 1, width: 2, minHeight: 14, backgroundColor: Colors.border },
  legText: { paddingBottom: Spacing.md },
  items: { gap: Spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  removed: { opacity: 0.5 },
  strike: { textDecorationLine: 'line-through' },
  thumb: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surface, overflow: 'hidden' },
  thumbImg: { width: 44, height: 44 },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
