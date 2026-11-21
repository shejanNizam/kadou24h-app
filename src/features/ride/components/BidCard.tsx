import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/ui/Rating';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

import { useAcceptBidMutation, useCounterBidMutation, useDeclineBidMutation } from '../api';
import { formatKm } from '../status';
import type { Ride, RideBid } from '../types';
import { useSecondsLeft } from '../useSecondsLeft';
import { PRICE_STEP, PriceStepper } from './PriceStepper';

/**
 * One rider's price, for the passenger: who (name, photo, moto, rating — never the phone), how far,
 * the price and how long it stays. I choose it, decline it, or counter-offer once (never under
 * Kadou24h's price).
 */
export function BidCard({ ride, bid }: { ride: Ride; bid: RideBid }) {
  const { t } = useTranslation();
  const toast = useToast();
  const secondsLeft = useSecondsLeft(bid.expiresAt);
  const [accept, acceptState] = useAcceptBidMutation();
  const [decline, declineState] = useDeclineBidMutation();
  const [counter, counterState] = useCounterBidMutation();
  const [countering, setCountering] = useState(false);
  const counterMax = bid.price - PRICE_STEP;
  const canCounter = bid.status === 'pending' && counterMax >= ride.suggestedFare;
  const [price, setPrice] = useState(Math.max(ride.suggestedFare, counterMax));
  const busy = acceptState.isLoading || declineState.isLoading || counterState.isLoading;
  const r = bid.rider;
  const moto = [r?.vehicle?.brand, r?.vehicle?.color].filter(Boolean).join(' · ');

  const run = async (task: () => Promise<unknown>, done?: string) => {
    try {
      await task();
      if (done) toast.show(done, 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  // Gone on the screen right away; the server closes it within seconds
  if (secondsLeft === 0) return null;

  return (
    <View style={[styles.card, bid.price === ride.suggestedFare && styles.suggested]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {r?.avatar?.url ? (
            <Image source={img(r.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" />
          ) : (
            <Feather name="user" size={18} color={Colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyMedium" numberOfLines={1}>
            {r?.name ?? t('ride.by.rider')}
          </AppText>
          <View style={styles.row}>
            {r?.ratingCount ? <Stars value={r.rating} size={11} /> : null}
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1} style={styles.flex}>
              {r?.ratingCount ? `${r.rating.toFixed(1)} · ` : ''}
              {t('ride.riderRides', { count: r?.rides ?? 0 })}
              {moto ? ` · ${moto}` : ''}
            </AppText>
          </View>
        </View>
        <View style={styles.price}>
          <AppText variant="title" color={Colors.primary}>
            {formatGNF(bid.price)}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {t('ride.bid.eta', { km: formatKm(bid.pickupKm), min: bid.etaMin })}
          </AppText>
        </View>
      </View>

      {bid.status === 'countered' ? (
        <AppText variant="small" color={Colors.textMuted}>
          {t('ride.bid.youCountered', { amount: formatGNF(bid.counterPrice ?? 0), count: secondsLeft })}
        </AppText>
      ) : (
        <AppText variant="caption" color={Colors.textMuted}>
          {t('ride.bid.validFor', { count: secondsLeft })}
        </AppText>
      )}

      {countering ? (
        <View style={styles.box}>
          <AppText variant="smallMedium">{t('ride.bid.counterTitle')}</AppText>
          <PriceStepper value={price} min={ride.suggestedFare} max={counterMax} onChange={setPrice} />
          <View style={styles.row}>
            <Button title={t('common.cancel')} variant="ghost" size="sm" style={styles.flex} disabled={busy} onPress={() => setCountering(false)} />
            <Button
              title={t('ride.bid.sendCounter', { amount: formatGNF(price) })}
              size="sm"
              style={styles.flex2}
              loading={counterState.isLoading}
              onPress={() =>
                void run(async () => {
                  await counter({ id: ride._id, bidId: bid._id, price }).unwrap();
                  setCountering(false);
                }, t('ride.bid.counterSent'))
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <Button
            title={t('ride.bid.decline')}
            variant="ghost"
            size="sm"
            style={styles.flex}
            loading={declineState.isLoading}
            disabled={busy}
            onPress={() => void run(() => decline({ id: ride._id, bidId: bid._id }).unwrap())}
          />
          {canCounter && (
            <Button
              title={t('ride.bid.counterButton')}
              variant="outline"
              size="sm"
              style={styles.flex}
              disabled={busy}
              onPress={() => setCountering(true)}
            />
          )}
          <Button
            title={t('ride.bid.choose')}
            size="sm"
            style={styles.flex}
            loading={acceptState.isLoading}
            disabled={busy}
            onPress={() => void run(() => accept({ id: ride._id, bidId: bid._id }).unwrap(), t('ride.bid.chosen'))}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  suggested: { borderColor: Colors.primaryBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  price: { alignItems: 'flex-end' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  box: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
});
