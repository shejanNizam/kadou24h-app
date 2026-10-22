import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PhotoStrip } from '@/components/media/PhotoStrip';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Stars } from '@/components/ui/Rating';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { addressLine } from '@/features/address/api';
import {
  useAcceptBookingMutation,
  useCancelBookingMutation,
  useConfirmBookingMutation,
  useDeclineBookingMutation,
  useGetBookingQuery,
  useMarkBookingDoneMutation,
  useReportNotDoneMutation,
  useReviewBookingMutation,
} from '@/features/booking/api';
import { SafetyNotice } from '@/features/booking/components/SafetyNotice';
import { BOOKING_TONE, formatBookingDate, penaltyMessage, timeLeft } from '@/features/booking/status';
import type { Booking } from '@/features/booking/types';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';
import type { FileRef } from '@/types/api';

type Sheet = null | 'accept' | 'decline' | 'cancel' | 'done' | 'notDone' | 'review';

/**
 * One booking, for the customer or the worker. Phones and the full address appear
 * only once the worker accepted. Payment happens outside the app (safety notices).
 */
export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: b, isLoading, isError, error, refetch, isFetching } = useGetBookingQuery(id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [penalty, setPenalty] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={b ? b.bookingNumber : t('booking.title')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError || !b ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.inner, styles.content]}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
            <Banner tone="warning" message={penalty} />
            <StatusCard b={b} />
            <PersonCard b={b} />
            <Details b={b} />
            {b.review && <ReviewCard b={b} />}
          </ScrollView>
          <Actions b={b} open={setSheet} />
          <Sheets b={b} sheet={sheet} close={() => setSheet(null)} onPenalty={setPenalty} />
        </>
      )}
    </SafeAreaView>
  );
}

function StatusCard({ b }: { b: Booking }) {
  const { t, i18n } = useTranslation();
  const day = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString(i18n.language, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  const by = b.cancelledBy ? t(`booking.by.${b.cancelledBy}`) : '';
  const text =
    b.status === 'requested'
      ? b.role === 'worker'
        ? t('booking.answerWithin', { time: timeLeft(t, b.respondBy) })
        : t('booking.waitingAnswer', { time: timeLeft(t, b.respondBy) })
      : b.status === 'done'
        ? t(`booking.text.done_${b.role}`, { date: day(b.confirmBy) })
        : b.status === 'cancelled'
          ? `${t('booking.text.cancelled', { by })}${b.cancelReason ? ` « ${b.cancelReason} »` : ''}`
          : b.status === 'declined'
            ? `${t('booking.text.declined')}${b.declineReason ? ` « ${b.declineReason} »` : ''}`
            : t(`booking.text.${b.status}_${b.role}`);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex}>
          {t(`booking.headline.${b.status}_${b.role}`)}
        </AppText>
        <StatusPill label={t(`booking.status.${b.status}`)} tone={BOOKING_TONE[b.status]} />
      </View>
      <AppText variant="small" color={Colors.textMuted}>
        {text}
      </AppText>
    </View>
  );
}

function PersonCard({ b }: { b: Booking }) {
  const { t } = useTranslation();
  const { open, opening } = useOpenChat();
  const person = b.role === 'customer' ? b.worker : b.customer;
  const photo = b.role === 'customer' ? (b.worker?.photo?.url ?? b.worker?.avatar?.url) : b.customer?.avatar?.url;
  const phone = person?.phone;
  const canChat = !['declined', 'expired'].includes(b.status);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {photo ? (
            <Image source={img(photo, 'thumb')} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Feather name="user" size={20} color={Colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={Colors.textMuted}>
            {b.role === 'customer' ? t('booking.yourWorker') : t('booking.yourCustomer')}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {person?.name ?? '—'}
          </AppText>
          {b.role === 'customer' && b.worker?.profession ? (
            <AppText variant="small" color={Colors.textMuted}>
              {b.worker.profession}
              {b.hourlyRate ? ` · ${t('catalog.perHour', { amount: formatGNF(b.hourlyRate) })}` : ''}
            </AppText>
          ) : null}
        </View>
        {b.role === 'customer' && b.worker?.profileId ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/worker/[id]',
                params: { id: b.worker!.profileId! },
              })
            }
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('booking.seeProfile')}>
            <Feather name="chevron-right" size={20} color={Colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>
      {phone ? (
        <View style={styles.phoneRow}>
          <Feather name="phone" size={15} color={Colors.success} />
          <AppText variant="bodyMedium" style={styles.flex}>
            {phone}
          </AppText>
          <Button title={t('booking.call')} size="sm" variant="soft" icon="phone-call" onPress={() => void Linking.openURL(`tel:${phone}`)} />
        </View>
      ) : (
        b.status === 'requested' && (
          <AppText variant="caption" color={Colors.textMuted}>
            {t('booking.phoneAfterAccept')}
          </AppText>
        )
      )}
      {canChat && (
        <Button
          title={t('booking.message')}
          icon="message-circle"
          variant="outline"
          size="sm"
          loading={opening}
          onPress={() => open({ type: 'worker', bookingId: b._id })}
        />
      )}
    </View>
  );
}

function Details({ b }: { b: Booking }) {
  const { t, i18n } = useTranslation();
  const a = b.address;
  const map = a.location ? `https://www.google.com/maps/dir/?api=1&destination=${a.location.lat},${a.location.lng}` : null;
  return (
    <View style={styles.card}>
      <Fact icon="calendar" label={t('booking.when')}>
        <AppText variant="bodyMedium">{formatBookingDate(b.scheduledAt, i18n.language)}</AppText>
      </Fact>
      <Fact icon="map-pin" label={t('booking.where')}>
        <AppText variant="bodyMedium">{addressLine(a)}</AppText>
        {a.landmark ? (
          <AppText variant="small" color={Colors.textMuted}>
            {a.landmark}
          </AppText>
        ) : null}
        {a.directions ? (
          <AppText variant="small" color={Colors.textMuted}>
            {a.directions}
          </AppText>
        ) : null}
        {a.placePhoto?.url ? <Image source={img(a.placePhoto.url, 'card')} style={styles.placePhoto} contentFit="cover" /> : null}
        {b.role === 'worker' && !b.contactShared && (
          <AppText variant="caption" color={Colors.textMuted}>
            {t('booking.addressAfterAccept')}
          </AppText>
        )}
        {b.role === 'worker' && map && (
          <Button title={t('booking.directions')} icon="navigation" size="sm" variant="soft" onPress={() => void Linking.openURL(map)} />
        )}
      </Fact>
      <Fact icon="file-text" label={t('booking.what')}>
        <AppText variant="body">{b.description}</AppText>
        {b.photos.length > 0 && (
          <View style={styles.photos}>
            {b.photos.map((p) => (
              <Image key={p.url} source={img(p.url, 'thumb')} style={styles.photo} contentFit="cover" />
            ))}
          </View>
        )}
      </Fact>
      {b.agreedPrice ? (
        <Fact icon="dollar-sign" label={t('booking.agreedPrice')}>
          <AppText variant="bodyMedium">{formatGNF(b.agreedPrice)}</AppText>
        </Fact>
      ) : null}
    </View>
  );
}

function Fact({ icon, label, children }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <Feather name={icon} size={16} color={Colors.primary} style={styles.factIcon} />
      <View style={styles.factBody}>
        <AppText variant="caption" color={Colors.textMuted}>
          {label}
        </AppText>
        {children}
      </View>
    </View>
  );
}

function ReviewCard({ b }: { b: Booking }) {
  const { t } = useTranslation();
  const r = b.review!;
  return (
    <View style={styles.card}>
      <AppText variant="title">{b.role === 'customer' ? t('booking.yourReview') : t('booking.customerReview')}</AppText>
      <Stars value={r.rating} size={18} />
      {r.comment ? <AppText variant="body">{r.comment}</AppText> : null}
      {r.photos.length > 0 && (
        <View style={styles.photos}>
          {r.photos.map((p) => (
            <Image key={p.url} source={img(p.url, 'thumb')} style={styles.photo} contentFit="cover" />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Actions ───────────────────────────────────────────────────────────

function Actions({ b, open }: { b: Booking; open: (s: Sheet) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirm, { isLoading: confirming }] = useConfirmBookingMutation();
  const buttons: ReactNode[] = [];
  let notice: ReactNode = null;

  if (b.role === 'worker') {
    if (b.status === 'requested') {
      buttons.push(<Button key="d" title={t('booking.decline')} variant="outline" style={styles.flex} onPress={() => open('decline')} />);
      buttons.push(<Button key="a" title={t('booking.accept')} style={styles.flex} onPress={() => open('accept')} />);
    } else if (b.status === 'accepted') {
      buttons.push(<Button key="c" title={t('booking.cancel')} variant="ghost" style={styles.flex} onPress={() => open('cancel')} />);
      buttons.push(<Button key="d" title={t('booking.markDone')} icon="check" style={styles.flex} onPress={() => open('done')} />);
    }
  } else {
    if (b.status === 'requested' || b.status === 'accepted') {
      buttons.push(<Button key="c" title={t('booking.cancel')} variant="outline" style={styles.flex} onPress={() => open('cancel')} />);
    } else if (b.status === 'done') {
      notice = <SafetyNotice step="confirm" compact />;
      buttons.push(<Button key="n" title={t('booking.notDone')} variant="outline" style={styles.flex} onPress={() => open('notDone')} />);
      buttons.push(
        <Button
          key="y"
          title={t('booking.confirmDone')}
          icon="check"
          style={styles.flex}
          loading={confirming}
          onPress={async () => {
            try {
              await confirm(b._id).unwrap();
              toast.show(t('booking.confirmed'));
              open('review');
            } catch (e) {
              toast.show(getApiErrorMessage(e, t), 'danger');
            }
          }}
        />,
      );
    } else if (b.canReview) {
      buttons.push(<Button key="r" title={t('booking.leaveReview')} icon="star" style={styles.flex} onPress={() => open('review')} />);
    } else if (['declined', 'expired', 'cancelled'].includes(b.status) && b.worker?.profileId) {
      buttons.push(
        <Button
          key="b"
          title={t('booking.bookAgain')}
          variant="outline"
          style={styles.flex}
          onPress={() =>
            router.push({
              pathname: '/book/[id]',
              params: { id: b.worker!.profileId! },
            })
          }
        />,
      );
    }
  }
  if (!buttons.length) return null;
  return (
    <View style={styles.footer}>
      <View style={[styles.inner, styles.footerInner]}>
        {notice}
        <View style={styles.actions}>{buttons}</View>
      </View>
    </View>
  );
}

function Sheets({ b, sheet, close, onPenalty }: { b: Booking; sheet: Sheet; close: () => void; onPenalty: (text: string | null) => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<FileRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accept, accepting] = useAcceptBookingMutation();
  const [decline, declining] = useDeclineBookingMutation();
  const [cancel, cancelling] = useCancelBookingMutation();
  const [done, finishing] = useMarkBookingDoneMutation();
  const [notDone, reopening] = useReportNotDoneMutation();
  const [review, reviewing] = useReviewBookingMutation();

  const reset = () => {
    setText('');
    setPrice('');
    setRating(0);
    setPhotos([]);
    setError(null);
  };
  const run = async (task: () => Promise<unknown>, success: string) => {
    setError(null);
    try {
      await task();
      toast.show(success);
      reset();
      close();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };
  const counts = b.status === 'accepted';

  const footer = (label: string, onPress: () => void, loading: boolean, disabled = false, danger = false) => (
    <Button title={label} onPress={onPress} loading={loading} disabled={disabled} variant={danger ? 'danger' : 'primary'} />
  );

  return (
    <>
      <BottomSheet
        visible={sheet === 'accept'}
        title={t('booking.acceptTitle')}
        onClose={close}
        footer={footer(t('booking.accept'), () => void run(() => accept(b._id).unwrap(), t('booking.acceptedToast')), accepting.isLoading)}>
        <SafetyNotice step="accept" />
        <AppText variant="small" color={Colors.textMuted}>
          {t('booking.acceptText')}
        </AppText>
        <Banner message={error} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'decline'}
        title={t('booking.declineTitle')}
        onClose={close}
        footer={footer(
          t('booking.decline'),
          () =>
            void run(
              () =>
                decline({
                  id: b._id,
                  reason: text.trim() || undefined,
                }).unwrap(),
              t('booking.declinedToast'),
            ),
          declining.isLoading,
        )}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('booking.declineText')}
        </AppText>
        <TextField value={text} onChangeText={setText} placeholder={t('booking.reasonOptional')} maxLength={300} />
        <Banner message={error} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'cancel'}
        title={t('booking.cancelTitle')}
        onClose={close}
        footer={footer(
          t('booking.cancelConfirm'),
          () =>
            void (async () => {
              setError(null);
              try {
                const res = await cancel({
                  id: b._id,
                  reason: text.trim() || undefined,
                }).unwrap();
                onPenalty(res.penalty ? penaltyMessage(t, res.penalty, i18n.language) : null);
                toast.show(t('booking.cancelledToast'));
                reset();
                close();
              } catch (e) {
                setError(getApiErrorMessage(e, t));
              }
            })(),
          cancelling.isLoading,
          counts && text.trim().length < 3,
          true,
        )}>
        {counts ? (
          <Banner tone="warning" message={b.role === 'worker' ? t('booking.cancelCountsWorker') : t('booking.cancelCountsCustomer')} />
        ) : (
          <AppText variant="small" color={Colors.textMuted}>
            {t('booking.cancelFree')}
          </AppText>
        )}
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={counts ? t('booking.reasonRequired') : t('booking.reasonOptional')}
          maxLength={300}
        />
        <Banner message={error} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'done'}
        title={t('booking.doneTitle')}
        onClose={close}
        footer={footer(
          t('booking.markDone'),
          () =>
            void run(
              () =>
                done({
                  id: b._id,
                  agreedPrice: price.trim() ? Math.max(0, Number(price.replace(/\D/g, ''))) : undefined,
                }).unwrap(),
              t('booking.doneToast'),
            ),
          finishing.isLoading,
        )}>
        <SafetyNotice step="complete" />
        <TextField
          label={t('booking.agreedPrice')}
          optional
          value={price}
          onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          prefix="GNF"
          hint={t('booking.agreedPriceHint')}
        />
        <Banner message={error} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'notDone'}
        title={t('booking.notDoneTitle')}
        onClose={close}
        footer={footer(
          t('booking.notDoneSend'),
          () => void run(() => notDone({ id: b._id, note: text.trim() || undefined }).unwrap(), t('booking.notDoneToast')),
          reopening.isLoading,
        )}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('booking.notDoneText')}
        </AppText>
        <TextField value={text} onChangeText={setText} placeholder={t('booking.notDonePlaceholder')} maxLength={300} />
        <Banner message={error} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'review'}
        title={t('booking.reviewTitle')}
        onClose={close}
        footer={footer(
          t('booking.reviewSend'),
          () =>
            void run(
              () =>
                review({
                  id: b._id,
                  rating,
                  comment: text.trim() || undefined,
                  photos,
                }).unwrap(),
              t('booking.reviewThanks'),
            ),
          reviewing.isLoading,
          rating === 0,
        )}>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('booking.stars', { count: n })}
              accessibilityState={{ selected: rating === n }}>
              <Feather name="star" size={34} color={n <= rating ? Colors.warning : Colors.border} />
            </Pressable>
          ))}
        </View>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={t('booking.reviewPlaceholder')}
          multiline
          maxLength={1000}
          style={styles.multiline}
        />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('booking.reviewPhotos')}
        </AppText>
        <PhotoStrip value={photos} onChange={setPhotos} max={4} title={t('booking.addPhoto')} size={64} />
        <Banner message={error} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
  fact: { flexDirection: 'row', gap: Spacing.md },
  factIcon: { marginTop: 2 },
  factBody: { flex: 1, gap: Spacing.xs },
  placePhoto: { width: '100%', height: 140, borderRadius: Radius.md },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photo: { width: 72, height: 72, borderRadius: Radius.md },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  footerInner: { gap: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
