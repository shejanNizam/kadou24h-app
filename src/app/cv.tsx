import Feather from '@expo/vector-icons/Feather';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePhotoUpload } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMyCvQuery, useSaveCvMutation, useSetWorkerListingMutation } from '@/features/cv/api';
import { makeCvPdf } from '@/features/cv/pdf';
import type { MyCv } from '@/features/cv/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { uploadFile } from '@/lib/upload';
import { useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

type Section = 'about' | 'experience' | 'education' | 'skills' | 'worker';

/**
 * My CV: the profile recruiters see, the CV document applications send
 * (my uploaded file first, else the PDF made here from the profile), the
 * worker listing and paid visibility.
 */
export default function CvScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: cv, isLoading, isError, error, refetch, isFetching } = useGetMyCvQuery(undefined, { skip: !signedIn });
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('cv.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={120} radius={Radius.lg} />
          <Skeleton height={160} radius={Radius.lg} />
        </View>
      ) : isError || !cv ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.inner, styles.content]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
          <Header cv={cv} />
          <Document cv={cv} />
          <SectionCard
            section="about"
            icon="user"
            title={t('cv.summary')}
            filled={Boolean(cv.summary)}
            preview={cv.summary || t('cv.summaryEmpty')}
          />
          <SectionCard
            section="experience"
            icon="briefcase"
            title={t('cv.experience')}
            filled={cv.profileExperience.length > 0}
            preview={cv.profileExperience.length ? cv.profileExperience.map((e) => [e.title, e.company].filter(Boolean).join(' · ')).join('\n') : t('cv.experienceEmpty')}
          />
          <SectionCard
            section="education"
            icon="book-open"
            title={t('cv.education')}
            filled={cv.profileEducation.length > 0}
            preview={cv.profileEducation.length ? cv.profileEducation.map((e) => `${e.degree} · ${e.institution}`).join('\n') : t('cv.educationEmpty')}
          />
          <SectionCard
            section="skills"
            icon="award"
            title={t('cv.skillsAndLanguages')}
            filled={cv.skills.length > 0}
            preview={[...cv.skills, ...cv.languages].join(' · ') || t('cv.skillsEmpty')}
          />
          <WorkerCard cv={cv} />
          <VisibilityCard cv={cv} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const missingOf = (cv: MyCv) =>
  [
    !cv.photo && 'photo',
    !cv.profession && 'profession',
    !cv.summary && 'summary',
    !cv.profileExperience.length && 'experience',
    !cv.profileEducation.length && 'education',
    !cv.skills.length && 'skills',
    !cv.languages.length && 'languages',
  ].filter(Boolean) as string[];

function Header({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const { choose, uploading, sheet } = usePhotoUpload(t('cv.photo'));
  const [save] = useSaveCvMutation();
  const missing = missingOf(cv);
  const done = Math.round(((7 - missing.length) / 7) * 100);

  const changePhoto = async () => {
    const photo = await choose();
    if (!photo) return;
    try {
      await save({ photo }).unwrap();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable onPress={() => void changePhoto()} accessibilityRole="button" accessibilityLabel={t('cv.photo')} style={styles.photo}>
          {cv.photo?.url ? <Image source={img(cv.photo.url, 'card')} style={styles.photo} contentFit="cover" /> : <Feather name={uploading ? 'loader' : 'camera'} size={22} color={Colors.primary} />}
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="h3">{user?.name}</AppText>
          <AppText variant="small" color={cv.profession ? Colors.primary : Colors.textSubtle}>
            {cv.profession || t('cv.noProfession')}
          </AppText>
          {cv.city ? (
            <AppText variant="caption" color={Colors.textMuted}>
              {cv.city}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${done}%` }]} />
      </View>
      <AppText variant="caption" color={Colors.textMuted}>
        {missing.length ? t('cv.completeHint', { percent: done, missing: missing.map((m) => t(`cv.missing.${m}`)).join(', ') }) : t('cv.complete')}
      </AppText>
      {sheet}
    </View>
  );
}

/** The file applications send: my own upload first, else the Kadou24h PDF */
function Document({ cv }: { cv: MyCv }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [save] = useSaveCvMutation();
  const [making, setMaking] = useState(false);
  const [uploading, setUploading] = useState(false);

  const makePdf = async () => {
    if (!user) return;
    if (Platform.OS === 'web') return toast.show(t('cv.pdfInApp'), 'info');
    if (!cv.profession && !cv.summary && !cv.profileExperience.length) return toast.show(t('cv.fillFirst'), 'info');
    setMaking(true);
    try {
      const file = await makeCvPdf(cv, { name: user.name, phone: user.phone, email: user.email }, t, i18n.language);
      if (file) await save({ generatedCv: file }).unwrap();
      toast.show(t('cv.pdfReady'), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    } finally {
      setMaking(false);
    }
  };

  const importCv = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > 8 * 1024 * 1024) return toast.show(t('cv.tooBig'), 'danger');
    setUploading(true);
    try {
      const file = await uploadFile(asset.uri, { name: asset.name, type: asset.mimeType ?? 'application/pdf' });
      await save({ uploadedResume: file }).unwrap();
      toast.show(t('cv.imported'), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const share = (url: string) => void Share.share({ message: url, url });

  return (
    <View style={styles.card}>
      <AppText variant="title">{t('cv.document')}</AppText>
      <AppText variant="caption" color={Colors.textMuted}>
        {t('cv.documentHint')}
      </AppText>

      <View style={styles.file}>
        <Feather name="file-text" size={20} color={Colors.primary} />
        <View style={styles.flex}>
          <AppText variant="bodyMedium">{t('cv.kadouCv')}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {cv.generatedCv && cv.generatedAt
              ? t('cv.madeOn', { date: new Date(cv.generatedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) })
              : t('cv.notMade')}
          </AppText>
        </View>
        {cv.generatedCv && !cv.uploadedResume && <StatusPill label={t('cv.sent')} tone="green" />}
      </View>
      <View style={styles.row}>
        <Button title={cv.generatedCv ? t('cv.updatePdf') : t('cv.makePdf')} icon="refresh-cw" size="sm" style={styles.flex} loading={making} onPress={() => void makePdf()} />
        {cv.generatedCv && <Button title={t('cv.open')} size="sm" variant="outline" onPress={() => void Linking.openURL(cv.generatedCv!.url)} />}
        {cv.generatedCv && <Button title={t('cv.share')} size="sm" variant="outline" onPress={() => share(cv.generatedCv!.url)} />}
      </View>

      <View style={styles.file}>
        <Feather name="upload" size={20} color={Colors.primary} />
        <View style={styles.flex}>
          <AppText variant="bodyMedium">{t('cv.myOwnCv')}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {cv.uploadedResume ? t('cv.ownCvSaved') : t('cv.ownCvHint')}
          </AppText>
        </View>
        {cv.uploadedResume && <StatusPill label={t('cv.sent')} tone="green" />}
      </View>
      <View style={styles.row}>
        <Button title={cv.uploadedResume ? t('cv.replace') : t('cv.import')} icon="upload" size="sm" variant="soft" style={styles.flex} loading={uploading} onPress={() => void importCv()} />
        {cv.uploadedResume && <Button title={t('cv.open')} size="sm" variant="outline" onPress={() => void Linking.openURL(cv.uploadedResume!.url)} />}
        {cv.uploadedResume && (
          <Button
            title={t('common.remove')}
            size="sm"
            variant="ghost"
            onPress={() => void save({ uploadedResume: null }).unwrap().catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'))}
          />
        )}
      </View>
    </View>
  );
}

function SectionCard({ section, icon, title, filled, preview }: { section: Section; icon: 'user' | 'briefcase' | 'book-open' | 'award'; title: string; filled: boolean; preview: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/cv/edit', params: { section } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t('common.edit')}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <Feather name={icon} size={18} color={Colors.primary} />
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
        <AppText variant="smallMedium" color={Colors.primary}>
          {filled ? t('common.edit') : t('cv.add')}
        </AppText>
      </View>
      <AppText variant="small" color={filled ? Colors.text : Colors.textSubtle} numberOfLines={3}>
        {preview}
      </AppText>
    </Pressable>
  );
}

/** "Show me as a worker": customers find me in the workers list and message me */
function WorkerCard({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [setListing, { isLoading }] = useSetWorkerListingMutation();

  const toggle = async (isWorkerListed: boolean) => {
    if (isWorkerListed && !cv.profession) {
      router.push({ pathname: '/cv/edit', params: { section: 'worker' } });
      return;
    }
    try {
      await setListing({ isWorkerListed }).unwrap();
      toast.show(isWorkerListed ? t('cv.listedOn') : t('cv.listedOff'));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Feather name="tool" size={18} color={Colors.primary} />
        <View style={styles.flex}>
          <AppText variant="title">{t('cv.worker')}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {cv.isWorkerListed ? t('cv.workerOn', { rate: cv.hourlyRate ? `${cv.hourlyRate.toLocaleString('fr-FR')} GNF/h` : '—' }) : t('cv.workerOff')}
          </AppText>
        </View>
        <Switch value={cv.isWorkerListed} onValueChange={(v) => void toggle(v)} disabled={isLoading} trackColor={{ true: Colors.success, false: Colors.border }} accessibilityLabel={t('cv.worker')} />
      </View>
      <Button title={t('cv.workerEdit')} size="sm" variant="ghost" onPress={() => router.push({ pathname: '/cv/edit', params: { section: 'worker' } })} />
    </View>
  );
}

function VisibilityCard({ cv }: { cv: MyCv }) {
  const { t, i18n } = useTranslation();
  const on = cv.cvVisible && cv.visibleUntil && new Date(cv.visibleUntil) > new Date();
  return (
    <Pressable onPress={() => router.push('/subscriptions')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.boost, pressed && styles.pressed]}>
      <View style={styles.row}>
        <Feather name="trending-up" size={18} color={Colors.textOnPrimary} />
        <View style={styles.flex}>
          <AppText variant="title" color={Colors.textOnPrimary}>
            {on ? t('cv.boostOn') : t('cv.boost')}
          </AppText>
          <AppText variant="caption" color={Colors.textOnPrimary}>
            {on ? t('cv.boostUntil', { date: new Date(cv.visibleUntil!).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) }) : t('cv.boostHint')}
          </AppText>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textOnPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  photo: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: Colors.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm },
  boost: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressed: { opacity: 0.9 },
});
