import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useClaimOfferMutation, useSkipOfferMutation } from '../api';
import type { DeliveryOffer } from '../types';

const km = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;

/**
 * An open delivery near me: what I earn first, how far the pickup is, the trip,
 * the cash to collect. The first rider to accept gets it; "Not for me" hides it.
 */
export function OfferCard({ offer }: { offer: DeliveryOffer }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [claim, { isLoading: claiming }] = useClaimOfferMutation();
  const [skip, { isLoading: skipping }] = useSkipOfferMutation();
  const to = offer.toName ?? offer.toArea ?? t('rider.offer.customer');

  const onTake = async () => {
    try {
      await claim(offer._id).unwrap();
      toast.show(t('rider.offer.taken'), 'success');
      router.push({ pathname: '/rider/delivery/[id]', params: { id: offer._id } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={[styles.card, offer.fromMyStore && styles.cardMine]} accessibilityLabel={t('rider.deliveryA11y', { from: offer.fromName, to })}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="caption" color={Colors.textMuted}>
            {t('rider.yourEarning')}
          </AppText>
          <AppText variant="h2" color={Colors.primary}>
            {formatGNF(offer.fee)}
          </AppText>
        </View>
        <View style={styles.distance}>
          <Feather name="navigation" size={14} color={Colors.primary} />
          <AppText variant="smallMedium" color={Colors.primary}>
            {offer.pickupKm !== undefined ? t('rider.offer.away', { km: km(offer.pickupKm) }) : t('rider.offer.awayUnknown')}
          </AppText>
        </View>
      </View>

      {(offer.fromMyStore || offer.servesRoute || offer.legType !== 'local') && (
        <View style={styles.tags}>
          {offer.fromMyStore && <Tag icon="star" label={t('rider.offer.myStore')} />}
          {offer.servesRoute && <Tag icon="repeat" label={t('rider.offer.myRoute')} />}
          {offer.legType !== 'local' && <Tag icon="truck" label={t(`rider.leg.${offer.legType}`)} />}
        </View>
      )}

      <View style={styles.route}>
        <Point
          icon={offer.fromKind === 'station' ? 'home' : 'shopping-bag'}
          color={Colors.primary}
          title={offer.fromName}
          sub={offer.fromAddressText}
        />
        <View style={styles.line} />
        <Point
          icon={offer.toKind === 'station' ? 'home' : 'map-pin'}
          color={Colors.success}
          title={to}
          sub={offer.toName ? offer.toArea : undefined}
        />
      </View>

      <AppText variant="caption" color={Colors.textMuted}>
        {[t('rider.offer.trip', { km: km(offer.tripKm) }), offer.itemCount ? t('orders.items', { count: offer.itemCount }) : null]
          .filter(Boolean)
          .join(' · ')}
      </AppText>

      {offer.cashToCollect > 0 && (
        <View style={styles.cash}>
          <Feather name="dollar-sign" size={13} color={Colors.warning} />
          <AppText variant="smallMedium">{t('rider.collectShort', { amount: formatGNF(offer.cashToCollect) })}</AppText>
        </View>
      )}

      {!offer.canTake && offer.blockedReason && (
        <AppText variant="caption" color={Colors.danger}>
          {t(`rider.offer.blocked.${offer.blockedReason}`)}
        </AppText>
      )}

      <View style={styles.row}>
        <Button
          title={t('rider.offer.skip')}
          variant="ghost"
          size="sm"
          style={styles.flex}
          disabled={skipping || claiming}
          onPress={() => void skip(offer._id)}
        />
        <Button
          title={t('rider.offer.take')}
          size="sm"
          style={styles.flex2}
          loading={claiming}
          disabled={!offer.canTake || skipping}
          onPress={() => void onTake()}
        />
      </View>
    </View>
  );
}

function Tag({ icon, label }: { icon: 'star' | 'repeat' | 'truck'; label: string }) {
  return (
    <View style={styles.tag}>
      <Feather name={icon} size={12} color={Colors.primary} />
      <AppText variant="caption" color={Colors.primary}>
        {label}
      </AppText>
    </View>
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
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardMine: { borderColor: Colors.primaryBorder, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  route: { gap: 2 },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  line: { width: 1, height: 10, marginLeft: 6, backgroundColor: Colors.border },
  cash: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.warningSoft,
  },
});
