import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageUploadBox } from '@/components/media/ImageUploadBox';
import { PhotoStrip } from '@/components/media/PhotoStrip';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { StackHeader } from '@/components/ui/StackHeader';
import { TagInput } from '@/components/ui/TagInput';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useUpdateMeMutation } from '@/features/auth/api';
import { SafetyNotice } from '@/features/booking/components/SafetyNotice';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { useGetMyCvQuery, useSaveCvMutation, useSubmitWorkerApplicationMutation } from '@/features/cv/api';
import { cvFileOf, type MyCv } from '@/features/cv/types';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getCurrentPosition, reverseGeocode, type LatLng } from '@/lib/location';
import { useAppSelector } from '@/store/hooks';
import type { FileRef } from '@/types/api';

/** Monday first, as people read a week here; values are 0 (Sunday) … 6 */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Same minimum as the server */
const MIN_DESCRIPTION = 20;

/** Worker profile (Figma "Profile creation"): fill, then send for the team's review. */
export default function WorkerProfileEditScreen() {
  const { t } = useTranslation();
  const { data: cv, isLoading, isError, error, refetch } = useGetMyCvQuery();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('worker.form.title')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError || !cv ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <WorkerForm cv={cv} />
      )}
    </SafeAreaView>
  );
}

function WorkerForm({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const { data: services = [] } = useGetCategoriesQuery('service');

  const [photo, setPhoto] = useState<FileRef | undefined>(cv.photo);
  const [name, setName] = useState(user?.name ?? '');
  const [serviceId, setServiceId] = useState(typeof cv.serviceCategoryId === 'string' ? cv.serviceCategoryId : cv.serviceCategoryId?._id);
  const [profession, setProfession] = useState(cv.profession ?? '');
  const [years, setYears] = useState(cv.experienceYears !== undefined ? String(cv.experienceYears) : '');
  const [rate, setRate] = useState(cv.hourlyRate ? String(cv.hourlyRate) : '');
  const [days, setDays] = useState<number[]>(cv.workingHours?.days ?? []);
  const [from, setFrom] = useState(cv.workingHours?.from ?? '');
  const [to, setTo] = useState(cv.workingHours?.to ?? '');
  const [city, setCity] = useState(cv.city ?? '');
  const [location, setLocation] = useState<LatLng | undefined>(
    cv.location ? { lat: cv.location.coordinates[1], lng: cv.location.coordinates[0] } : undefined,
  );
  const [locating, setLocating] = useState(false);
  const [summary, setSummary] = useState(cv.summary ?? '');
  const [skills, setSkills] = useState<string[]>(cv.skills);
  const [idDocument, setIdDocument] = useState<FileRef | undefined>(cv.idDocument);
  const [workPhotos, setWorkPhotos] = useState<FileRef[]>(cv.workPhotos ?? []);
  const [error, setError] = useState<string | null>(null);

  const [save, saveState] = useSaveCvMutation();
  const [submit, submitState] = useSubmitWorkerApplicationMutation();
  const [updateMe, meState] = useUpdateMeMutation();
  const busy = saveState.isLoading || submitState.isLoading || meState.isLoading;

  const status = cv.approvalStatus ?? 'draft';
  // Draft / sent back: the button sends it for review. Pending / approved: it saves.
  const sends = status === 'draft' || status === 'needs_changes' || status === 'rejected';
  const idChanged = status === 'approved' && idDocument?.url !== cv.idDocument?.url;

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const locate = async () => {
    setLocating(true);
    const pos = await getCurrentPosition();
    setLocating(false);
    if (!pos) return toast.show(t('worker.form.locationDenied'), 'danger');
    setLocation(pos);
    if (!city.trim()) {
      const place = await reverseGeocode(pos);
      const guess = [place.city, place.neighborhood ?? place.commune].filter(Boolean).join(' • ');
      if (guess) setCity(guess);
    }
  };

  const check = (): string | null => {
    if (!photo) return t('worker.form.need.photo');
    if (name.trim().length < 2) return t('worker.form.need.name');
    if (!serviceId) return t('worker.form.need.service');
    if (profession.trim().length < 2) return t('worker.form.need.profession');
    if (!years) return t('worker.form.need.years');
    if (!Number(rate)) return t('worker.form.need.rate');
    if (days.length || from || to) {
      if (!days.length || !HHMM.test(from) || !HHMM.test(to) || from >= to) return t('worker.form.need.hours');
    }
    if (!city.trim()) return t('worker.form.need.city');
    if (summary.trim().length < MIN_DESCRIPTION) return t('worker.form.need.summary', { count: MIN_DESCRIPTION });
    if (!skills.length) return t('worker.form.need.skills');
    if (!idDocument) return t('worker.form.need.id');
    return null;
  };

  const onSubmit = async () => {
    setError(null);
    const problem = check();
    if (problem) return setError(problem);
    try {
      if (name.trim() !== user?.name) await updateMe({ name: name.trim() }).unwrap();
      await save({
        photo,
        profession: profession.trim(),
        serviceCategoryId: serviceId,
        experienceYears: Number(years),
        hourlyRate: Number(rate),
        workingHours: days.length ? { days: [...days].sort(), from, to } : null,
        city: city.trim(),
        ...(location && { location }),
        summary: summary.trim(),
        skills,
        idDocument,
        workPhotos,
      }).unwrap();
      if (sends) {
        await submit().unwrap();
        toast.show(t('worker.form.sent'), 'success');
      } else {
        toast.show(idChanged ? t('worker.form.idReview') : t('common.saved'), 'success');
      }
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  const resume = cvFileOf(cv);
  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {status === 'pending' && <Banner tone="info" message={t('worker.form.pendingEdit')} />}
        {(status === 'needs_changes' || status === 'rejected') && cv.reviewNote && (
          <Banner tone={status === 'rejected' ? 'danger' : 'warning'} message={t('worker.note', { note: cv.reviewNote })} />
        )}

        <View style={[styles.card, styles.photoRow]}>
          <ImageUploadBox value={photo} onChange={setPhoto} title={t('worker.form.photo')} icon="user" height={110} style={styles.photo} />
          <View style={styles.flex}>
            <AppText variant="title">{t('worker.form.photo')}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {t('worker.form.photoHint')}
            </AppText>
          </View>
        </View>

        <TextField label={t('worker.form.name')} value={name} onChangeText={setName} maxLength={60} autoComplete="name" />

        <View style={styles.gap}>
          <AppText variant="label">{t('worker.form.service')}</AppText>
          <View style={styles.chips}>
            {services
              .filter((c) => !c.parentId)
              .map((c) => (
                <Chip key={c._id} label={l(c.name)} selected={serviceId === c._id} onPress={() => setServiceId(c._id)} />
              ))}
          </View>
        </View>
        <TextField label={t('worker.form.profession')} hint={t('cv.professionHint')} value={profession} onChangeText={setProfession} maxLength={100} />

        <View style={styles.twoCols}>
          <TextField
            label={t('worker.form.years')}
            value={years}
            onChangeText={(v) => setYears(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            style={styles.flex}
          />
          <TextField
            label={t('worker.form.rate')}
            hint={t('cv.rateHint')}
            value={rate}
            onChangeText={(v) => setRate(v.replace(/\D/g, '').slice(0, 9))}
            keyboardType="number-pad"
            style={styles.flex}
          />
        </View>

        <View style={styles.gap}>
          <AppText variant="label">
            {t('worker.form.hours')} <AppText variant="caption" color={Colors.textMuted}>{t('common.optional')}</AppText>
          </AppText>
          <View style={styles.chips}>
            {WEEK.map((d) => (
              <Chip key={d} label={t(`worker.days.${d}`)} selected={days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
          <View style={styles.twoCols}>
            <TextField label={t('worker.form.from')} placeholder="08:00" value={from} onChangeText={setFrom} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.flex} />
            <TextField label={t('worker.form.to')} placeholder="18:00" value={to} onChangeText={setTo} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.flex} />
          </View>
        </View>

        <View style={styles.gap}>
          <TextField label={t('worker.form.city')} hint={t('worker.form.cityHint')} value={city} onChangeText={setCity} maxLength={80} />
          <Button
            title={location ? t('worker.form.locationSaved') : t('worker.form.useLocation')}
            icon={location ? 'check' : 'crosshair'}
            variant="outline"
            size="sm"
            loading={locating}
            onPress={() => void locate()}
          />
        </View>

        <TextField
          label={t('worker.form.summary')}
          hint={t('worker.form.summaryHint')}
          value={summary}
          onChangeText={setSummary}
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        <TagInput label={t('worker.form.skills')} values={skills} onChange={setSkills} max={20} />

        <View style={styles.gap}>
          <AppText variant="label">{t('worker.form.workPhotos')}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {t('worker.form.workPhotosHint')}
          </AppText>
          <PhotoStrip value={workPhotos} onChange={setWorkPhotos} max={10} title={t('worker.form.workPhotos')} />
        </View>

        <View style={styles.gap}>
          <AppText variant="label">{t('worker.form.id')}</AppText>
          <ImageUploadBox value={idDocument} onChange={setIdDocument} title={t('worker.form.id')} icon="credit-card" height={140} />
          <AppText variant="caption" color={Colors.textMuted}>
            {status === 'approved' ? t('worker.form.idHintApproved') : t('worker.form.idHint')}
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/cv')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.cvRow, pressed && styles.pressed]}>
          <Feather name="file-text" size={18} color={Colors.primary} />
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{t('worker.form.cv')}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {resume ? t('worker.form.cvAdded') : t('worker.form.cvNone')}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
        </Pressable>

        <SafetyNotice step="register" />
        <Banner tone="danger" message={error} />
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button title={sends ? t('worker.form.send') : t('common.save')} loading={busy} onPress={() => void onSubmit()} />
        <Button title={t('common.cancel')} variant="outline" disabled={busy} onPress={() => router.back()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  photo: { width: 110 },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  twoCols: { flexDirection: 'row', gap: Spacing.md },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  cvRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pressed: { opacity: 0.85 },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
