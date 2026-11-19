import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PhotoPreview } from '@/components/media/PhotoPreview';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useAcceptRideMutation, useSkipRideMutation } from '../api';
import { formatKm } from '../status';
import type { RideOffer } from '../types';

/** A passenger near me: the fare (cash, all mine), how far the pickup is, the trip. First to accept gets it. */
export function RideOfferCard({ offer }: { offer: RideOffer }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [accept, { isLoading: accepting }] = useAcceptRideMutation();
  const [skip, { isLoading: skipping }] = useSkipRideMutation();

  const onAccept = async () => {
    try {
      await accept(offer._id).unwrap();
      toast.show(t('ride.rider.accepted'), 'success');
      router.push({ pathname: '/rider/ride/[id]', params: { id: offer._id } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Feather name="user" size={12} color={Colors.textOnPrimary} />
          <AppText variant="caption" color={Colors.textOnPrimary}>
            {t('ride.rider.passengerRide')}
          </AppText>
        </View>
        <View style={styles.flex} />
        <View style={styles.distance}>
          <Feather name="navigation" size={14} color={Colors.primary} />
          <AppText variant="smallMedium" color={Colors.primary}>
            {t('rider.offer.away', { km: formatKm(offer.pickupKm) })}
          </AppText>
        </View>
      </View>
      <View>
        <AppText variant="caption" color={Colors.textMuted}>
          {t('ride.rider.youGet')}
        </AppText>
        <AppText variant="h2" color={Colors.primary}>
          {formatGNF(offer.fare)}
        </AppText>
      </View>
      <View style={styles.route}>
        <View style={styles.row}>
          <Feather name="circle" size={12} color={Colors.primary} />
          <AppText variant="smallMedium" numberOfLines={1} style={styles.flex}>
            {offer.pickup.address}
          </AppText>
        </View>
        <View style={styles.line} />
        <View style={styles.row}>
          <Feather name="map-pin" size={12} color={Colors.success} />
          <AppText variant="smallMedium" numberOfLines={1} style={styles.flex}>
            {offer.dropoff.address}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={Colors.textMuted}>
        {t('ride.tripInfo', { km: offer.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 }), min: offer.durationMin })}
        {offer.note ? ` · “${offer.note}”` : ''}
      </AppText>
      {offer.pickupPhoto?.url ? <PhotoPreview url={offer.pickupPhoto.url} label={t('ride.pickupPhoto')} height={100} /> : null}
      <View style={styles.row}>
        <Button
          title={t('rider.offer.skip')}
          variant="ghost"
          size="sm"
          style={styles.flex}
          disabled={skipping || accepting}
          onPress={() => void skip(offer._id)}
        />
        <Button
          title={t('ride.rider.accept')}
          size="sm"
          style={styles.flex2}
          loading={accepting}
          disabled={skipping}
          onPress={() => void onAccept()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.warning,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  route: { gap: 2 },
  line: { width: 1, height: 10, marginLeft: 5, backgroundColor: Colors.border },
});
