import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PhotoPreview } from '@/components/media/PhotoPreview';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useAnswerCounterMutation, usePlaceBidMutation, useSkipRideMutation, useWithdrawBidMutation } from '../api';
import { formatKm } from '../status';
import { LIVE_BID, type RideOffer } from '../types';
import { useSecondsLeft } from '../useSecondsLeft';
import { PRICE_STEP, PriceStepper } from './PriceStepper';

/**
 * A passenger near me (negotiable price, client 2026-11-21): I accept Kadou24h's price or ask
 * more (up to maxFare), then wait for the passenger. They may counter-offer: I accept or decline.
 * The fare is cash, all mine.
 */
export function RideOfferCard({ offer }: { offer: RideOffer }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [skip, { isLoading: skipping }] = useSkipRideMutation();
  const bid = offer.myBid;
  const secondsLeft = useSecondsLeft(bid && LIVE_BID.includes(bid.status) ? bid.expiresAt : undefined);
  const waiting = bid?.status === 'pending' && secondsLeft > 0;
  const countered = bid?.status === 'countered' && secondsLeft > 0;

  const run = async (task: () => Promise<unknown>, done?: string) => {
    try {
      await task();
      if (done) toast.show(done, 'success');
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
          {t('ride.bid.suggested')}
        </AppText>
        <AppText variant="h2" color={Colors.primary}>
          {formatGNF(offer.suggestedFare)}
        </AppText>
        {offer.maxFare > offer.suggestedFare && (
          <AppText variant="caption" color={Colors.textMuted}>
            {t('ride.bid.youMayAsk', { max: formatGNF(offer.maxFare) })}
          </AppText>
        )}
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

      {countered ? (
        <CounterAnswer offer={offer} secondsLeft={secondsLeft} run={run} />
      ) : waiting ? (
        <WaitingForPassenger offer={offer} secondsLeft={secondsLeft} run={run} />
      ) : (
        <>
          {bid?.status === 'declined' && <Banner tone="warning" message={t('ride.bid.declined')} />}
          {bid && bid.status !== 'declined' && bid.status !== 'withdrawn' && <Banner tone="warning" message={t('ride.bid.noAnswer')} />}
          {offer.bidsLeft > 0 ? (
            <SendPrice offer={offer} skipping={skipping} onSkip={() => void skip(offer._id)} run={run} />
          ) : (
            <>
              <AppText variant="small" color={Colors.textMuted}>
                {t('ride.bid.noMore')}
              </AppText>
              <Button title={t('rider.offer.skip')} variant="ghost" size="sm" disabled={skipping} onPress={() => void skip(offer._id)} />
            </>
          )}
        </>
      )}
    </View>
  );
}

type Run = (task: () => Promise<unknown>, done?: string) => Promise<void>;

/** Accept Kadou24h's price, or set mine (up to maxFare) and send it */
function SendPrice({ offer, skipping, onSkip, run }: { offer: RideOffer; skipping: boolean; onSkip: () => void; run: Run }) {
  const { t } = useTranslation();
  const [placeBid, { isLoading }] = usePlaceBidMutation();
  const canAsk = offer.maxFare > offer.suggestedFare;
  const [asking, setAsking] = useState(false);
  const [price, setPrice] = useState(Math.min(offer.maxFare, offer.suggestedFare + PRICE_STEP));
  const send = (value?: number) => run(() => placeBid({ id: offer._id, price: value }).unwrap(), t('ride.bid.sent'));

  if (asking) {
    return (
      <View style={styles.box}>
        <AppText variant="smallMedium">{t('ride.bid.yourPrice')}</AppText>
        <PriceStepper value={price} min={offer.suggestedFare + PRICE_STEP} max={offer.maxFare} onChange={setPrice} />
        <View style={styles.row}>
          <Button title={t('common.cancel')} variant="ghost" size="sm" style={styles.flex} disabled={isLoading} onPress={() => setAsking(false)} />
          <Button
            title={t('ride.bid.send', { amount: formatGNF(price) })}
            size="sm"
            style={styles.flex2}
            loading={isLoading}
            onPress={() => void send(price)}
          />
        </View>
      </View>
    );
  }
  return (
    <>
      <Button
        title={t('ride.bid.acceptAt', { amount: formatGNF(offer.suggestedFare) })}
        size="sm"
        loading={isLoading}
        disabled={skipping}
        onPress={() => void send()}
      />
      <View style={styles.row}>
        <Button title={t('rider.offer.skip')} variant="ghost" size="sm" style={styles.flex} disabled={skipping || isLoading} onPress={onSkip} />
        {canAsk && (
          <Button title={t('ride.bid.ask')} variant="outline" size="sm" style={styles.flex2} disabled={isLoading} onPress={() => setAsking(true)} />
        )}
      </View>
    </>
  );
}

/** My price is with the passenger: I can take it back */
function WaitingForPassenger({ offer, secondsLeft, run }: { offer: RideOffer; secondsLeft: number; run: Run }) {
  const { t } = useTranslation();
  const [withdraw, { isLoading }] = useWithdrawBidMutation();
  return (
    <View style={styles.box}>
      <AppText variant="smallMedium">{t('ride.bid.waiting', { amount: formatGNF(offer.myBid!.price) })}</AppText>
      <AppText variant="caption" color={Colors.textMuted}>
        {t('ride.bid.answerIn', { count: secondsLeft })}
      </AppText>
      <Button
        title={t('ride.bid.withdraw')}
        variant="ghost"
        size="sm"
        loading={isLoading}
        onPress={() => void run(() => withdraw(offer._id).unwrap())}
      />
    </View>
  );
}

/** The passenger proposes less: yes takes the ride at their price */
function CounterAnswer({ offer, secondsLeft, run }: { offer: RideOffer; secondsLeft: number; run: Run }) {
  const { t } = useTranslation();
  const [answer, { isLoading, originalArgs }] = useAnswerCounterMutation();
  const bid = offer.myBid!;
  const reply = (accept: boolean) =>
    run(
      async () => {
        await answer({ id: offer._id, accept }).unwrap();
        if (accept) router.push({ pathname: '/rider/ride/[id]', params: { id: offer._id } });
      },
      accept ? t('ride.rider.accepted') : undefined,
    );
  return (
    <View style={[styles.box, styles.counter]}>
      <AppText variant="smallMedium">{t('ride.bid.counter', { amount: formatGNF(bid.counterPrice ?? 0), yours: formatGNF(bid.price) })}</AppText>
      <AppText variant="caption" color={Colors.textMuted}>
        {t('ride.bid.answerIn', { count: secondsLeft })}
      </AppText>
      <View style={styles.row}>
        <Button
          title={t('ride.bid.decline')}
          variant="ghost"
          size="sm"
          style={styles.flex}
          loading={isLoading && originalArgs?.accept === false}
          disabled={isLoading}
          onPress={() => void reply(false)}
        />
        <Button
          title={t('ride.bid.acceptAt', { amount: formatGNF(bid.counterPrice ?? 0) })}
          size="sm"
          style={styles.flex2}
          loading={isLoading && originalArgs?.accept === true}
          disabled={isLoading}
          onPress={() => void reply(true)}
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
  box: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
  counter: { borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySoft },
});
