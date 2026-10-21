import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useAcceptDeliveryMutation } from '../api';
import { cashToCollect, DELIVERY_TONE, legKm } from '../status';
import type { RiderDelivery } from '../types';

/** One leg in my list: where from → where to, my earning, the cash to collect. New ones: Accept / Decline. */
export function DeliveryCard({ delivery, onDecline }: { delivery: RiderDelivery; onDecline?: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [accept, { isLoading }] = useAcceptDeliveryMutation();
  const isNew = delivery.status === 'assigned';
  const cash = cashToCollect(delivery);
  const km = legKm(delivery);
  const items = delivery.subOrderId?.items?.filter((i) => !i.removed) ?? [];
  const count = items.reduce((n, i) => n + i.qty, 0);
  const when = delivery.deliveredAt ?? delivery.assignedAt ?? delivery.createdAt;
  const drop = delivery.toKind === 'customer' ? [delivery.orderId?.addressSnapshot?.neighborhood, delivery.orderId?.addressSnapshot?.commune].filter(Boolean).join(', ') : '';

  const open = () => router.push({ pathname: '/rider/delivery/[id]', params: { id: delivery._id } });
  const onAccept = async () => {
    try {
      await accept(delivery._id).unwrap();
      toast.show(t('rider.accepted'), 'success');
      open();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t('rider.deliveryA11y', { from: delivery.fromName, to: delivery.toName })}
      style={({ pressed }) => [styles.card, isNew && styles.cardNew, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title">#{delivery.subOrderId?.subOrderNumber}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {new Date(when).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {count ? ` · ${t('orders.items', { count })}` : ''}
            {km !== undefined ? ` · ${km.toFixed(1)} km` : ''}
          </AppText>
        </View>
        <StatusPill label={t(`status.delivery.${delivery.status}`)} tone={DELIVERY_TONE[delivery.status]} />
      </View>

      <View style={styles.route}>
        <Point icon={delivery.fromKind === 'station' ? 'home' : 'shopping-bag'} color={Colors.primary} title={delivery.fromName} />
        <View style={styles.line} />
        <Point icon={delivery.toKind === 'station' ? 'home' : 'map-pin'} color={Colors.success} title={delivery.toName} sub={drop} />
      </View>

      <View style={[styles.row, styles.money]}>
        <View style={styles.flex}>
          <AppText variant="caption" color={Colors.textMuted}>
            {t('rider.yourEarning')}
          </AppText>
          <AppText variant="title" color={Colors.primary}>
            {formatGNF(delivery.fee)}
          </AppText>
        </View>
        {cash > 0 && (
          <View style={styles.cash}>
            <Feather name="dollar-sign" size={13} color={Colors.warning} />
            <AppText variant="smallMedium" color={Colors.text}>
              {t('rider.collectShort', { amount: formatGNF(cash) })}
            </AppText>
          </View>
        )}
      </View>

      {isNew && onDecline && (
        <View style={styles.row}>
          <Button title={t('rider.decline')} variant="outline" size="sm" style={styles.flex} onPress={() => onDecline(delivery._id)} />
          <Button title={t('rider.accept')} size="sm" style={styles.flex} loading={isLoading} onPress={() => void onAccept()} />
        </View>
      )}
    </Pressable>
  );
}

function Point({ icon, color, title, sub }: { icon: 'home' | 'shopping-bag' | 'map-pin'; color: string; title: string; sub?: string }) {
  return (
    <View style={styles.point}>
      <Feather name={icon} size={14} color={color} />
      <View style={styles.flex}>
        <AppText variant="smallMedium" numberOfLines={1}>
          {title}
        </AppText>
        {sub ? (
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  cardNew: { borderColor: Colors.primaryBorder, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  route: { gap: 2 },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  line: { width: 1, height: 10, marginLeft: 6, backgroundColor: Colors.border },
  money: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  cash: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.warningSoft },
});
