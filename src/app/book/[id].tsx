import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PhotoStrip } from '@/components/media/PhotoStrip';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { needsNeighborhood, pickDefaultAddress, useGetAddressesQuery } from '@/features/address/api';
import { AddressCard } from '@/features/address/components/AddressCard';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useCreateBookingMutation, useGetStandingQuery } from '@/features/booking/api';
import { DayTimePicker, toScheduledAt } from '@/features/booking/components/DayTimePicker';
import { SafetyNotice } from '@/features/booking/components/SafetyNotice';
import { formatDay } from '@/features/booking/status';
import { useGetWorkerQuery } from '@/features/catalog/api';
import { getApiErrorMessage, getFieldErrors } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';
import { useAppSelector } from '@/store/hooks';
import type { FileRef } from '@/types/api';

const MIN_DESCRIPTION = 10;
const MAX_PHOTOS = 5;

/** Book a worker: date + time, where, what. The worker answers within 24 h. */
export default function BookWorkerScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('booking.bookTitle')} message={t('booking.guest')} />;
  return <BookForm />;
}

function BookForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const worker = useGetWorkerQuery(id);
  const addresses = useGetAddressesQuery();
  const standing = useGetStandingQuery();
  const [create, { isLoading }] = useCreateBookingMutation();

  const [day, setDay] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<FileRef[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const chosenAddress = addressId ?? pickDefaultAddress(addresses.data)?._id ?? null;
  // The quartier is mandatory (client, 2026-11-24): an older address is completed first
  const chosenIncomplete = (addresses.data ?? []).some((a) => a._id === chosenAddress && needsNeighborhood(a));
  const w = worker.data;
  const limitedUntil = standing.data?.customer.limitedUntil;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!day || !time) next.when = t('booking.need.when');
    if (!chosenAddress) next.address = t('booking.need.address');
    else if (chosenIncomplete) next.address = t('address.completeNeighborhood');
    if (description.trim().length < MIN_DESCRIPTION)
      next.description = t('booking.need.description', {
        count: MIN_DESCRIPTION,
      });
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || !day || !time || !chosenAddress) return;
    try {
      const booking = await create({
        workerProfileId: id,
        scheduledAt: toScheduledAt(day, time),
        addressId: chosenAddress,
        description: description.trim(),
        photos,
      }).unwrap();
      toast.show(t('booking.sent'));
      router.replace({
        pathname: '/booking/[id]',
        params: { id: booking._id },
      });
    } catch (e) {
      setErrors(getFieldErrors(e));
      setFormError(getApiErrorMessage(e, t));
    }
  };

  if (worker.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.inner}>
          <StackHeader title={t('booking.bookTitle')} />
        </View>
        <ErrorState error={worker.error} onRetry={() => void worker.refetch()} />
      </SafeAreaView>
    );
  }

  const photo = w?.photo?.url ?? w?.userId.avatar?.url;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('booking.bookTitle')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {!w ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View style={[styles.card, styles.row]}>
            <View style={styles.avatar}>
              {photo ? (
                <Image source={img(photo, 'thumb')} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Feather name="user" size={22} color={Colors.primary} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="title">{w.userId.name}</AppText>
              <AppText variant="small" color={Colors.textMuted}>
                {w.profession}
                {w.hourlyRate ? ` · ${t('catalog.perHour', { amount: formatGNF(w.hourlyRate) })}` : ''}
              </AppText>
            </View>
          </View>
        )}

        <SafetyNotice step="book" />
        {limitedUntil && (
          <Banner
            tone="warning"
            message={t('booking.limitedBanner', {
              date: formatDay(limitedUntil, i18n.language),
            })}
          />
        )}

        <Section title={t('booking.when')} error={errors.when ?? errors.scheduledAt}>
          <DayTimePicker
            hours={w?.workingHours}
            day={day}
            time={time}
            onDay={(d) => {
              setDay(d);
              setTime(null);
            }}
            onTime={setTime}
          />
        </Section>

        <Section title={t('booking.where')} error={errors.address ?? errors.addressId}>
          {addresses.isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              {(addresses.data ?? []).map((a) => (
                <AddressCard key={a._id} address={a} selected={a._id === chosenAddress} onPress={() => setAddressId(a._id)} />
              ))}
              {chosenIncomplete && chosenAddress && (
                <Button title={t('address.complete')} icon="edit-2" size="sm" onPress={() => router.push({ pathname: '/address-edit', params: { id: chosenAddress } })} />
              )}
              <Button title={t('address.add')} icon="plus" variant="outline" size="sm" onPress={() => router.push('/address-edit')} />
            </>
          )}
        </Section>

        <Section title={t('booking.what')}>
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder={t('booking.whatHint')}
            multiline
            numberOfLines={4}
            maxLength={1000}
            style={styles.multiline}
            error={errors.description}
          />
          <AppText variant="caption" color={Colors.textMuted}>
            {t('booking.photosHint', { count: MAX_PHOTOS })}
          </AppText>
          <PhotoStrip value={photos} onChange={setPhotos} max={MAX_PHOTOS} title={t('booking.addPhoto')} />
        </Section>

        <View style={[styles.card, styles.info]}>
          {(['info1', 'info2', 'info3'] as const).map((k, i) => (
            <View key={k} style={styles.infoRow}>
              <Feather name={(['clock', 'phone', 'dollar-sign'] as const)[i]} size={15} color={Colors.primary} style={styles.infoIcon} />
              <AppText variant="small" style={styles.flex}>
                {t(`booking.${k}`)}
              </AppText>
            </View>
          ))}
        </View>
        <Banner message={formError} />
      </KeyboardScroll>
      <View style={styles.footer}>
        <View style={styles.inner}>
          <Button title={t('booking.send')} icon="send" loading={isLoading} disabled={!w} onPress={() => void submit()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      {children}
      {error ? (
        <AppText variant="small" color={Colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52 },
  section: { gap: Spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  info: { gap: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoIcon: { marginTop: 2 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
});
