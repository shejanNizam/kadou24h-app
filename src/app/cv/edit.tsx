import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { StackHeader } from '@/components/ui/StackHeader';
import { LANGUAGE_IDEAS, TagInput } from '@/components/ui/TagInput';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { useGetMyCvQuery, useSaveCvMutation, useSetWorkerListingMutation, useSuggestSummaryMutation } from '@/features/cv/api';
import type { Education, Experience, MyCv } from '@/features/cv/types';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage } from '@/lib/api/errors';

type Section = 'about' | 'experience' | 'education' | 'skills' | 'worker';

/** Edit one part of my CV, then save it (PUT /professional-profiles/me). */
export default function CvEditScreen() {
  const { section = 'about' } = useLocalSearchParams<{ section?: Section }>();
  const { t } = useTranslation();
  const { data: cv, isLoading, isError, error, refetch } = useGetMyCvQuery();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t(`cv.edit.${section}`)} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError || !cv ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : section === 'experience' ? (
        <ExperienceForm cv={cv} />
      ) : section === 'education' ? (
        <EducationForm cv={cv} />
      ) : section === 'skills' ? (
        <SkillsForm cv={cv} />
      ) : section === 'worker' ? (
        <WorkerForm cv={cv} />
      ) : (
        <AboutForm cv={cv} />
      )}
    </SafeAreaView>
  );
}

/** Shared bottom bar: save, then back to the CV */
function useSave() {
  const { t } = useTranslation();
  const toast = useToast();
  const [save, { isLoading }] = useSaveCvMutation();
  const [error, setError] = useState<string | null>(null);
  const run = async (body: Parameters<typeof save>[0]) => {
    setError(null);
    try {
      await save(body).unwrap();
      toast.show(t('common.saved'), 'success');
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };
  return { run, isLoading, error, setError };
}

function Footer({ onSave, loading, disabled }: { onSave: () => void; loading: boolean; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.inner, styles.footer]}>
      <Button title={t('common.save')} loading={loading} disabled={disabled} onPress={onSave} />
    </View>
  );
}

function AboutForm({ cv }: { cv: MyCv }) {
  const { t, i18n } = useTranslation();
  const [profession, setProfession] = useState(cv.profession ?? '');
  const [city, setCity] = useState(cv.city ?? '');
  const [years, setYears] = useState(cv.experienceYears !== undefined ? String(cv.experienceYears) : '');
  const [summary, setSummary] = useState(cv.summary ?? '');
  const [suggest, suggestState] = useSuggestSummaryMutation();
  const { run, isLoading, error, setError } = useSave();

  const suggestNow = async () => {
    try {
      const { summary: text } = await suggest({ targetRole: profession.trim() || undefined, lang: i18n.language.startsWith('en') ? 'en' : 'fr' }).unwrap();
      setSummary(text);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={error} />
        <TextField label={t('cv.profession')} hint={t('cv.professionHint')} value={profession} onChangeText={setProfession} maxLength={100} />
        <TextField label={t('cv.city')} optional value={city} onChangeText={setCity} maxLength={60} />
        <TextField label={t('cv.years')} optional value={years} onChangeText={(v) => setYears(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
        <TextField label={t('cv.summary')} hint={t('cv.summaryHint')} value={summary} onChangeText={setSummary} maxLength={2000} multiline />
        <Button title={t('cv.suggest')} icon="edit-3" variant="soft" size="sm" loading={suggestState.isLoading} onPress={() => void suggestNow()} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('cv.suggestHint')}
        </AppText>
      </KeyboardScroll>
      <Footer
        loading={isLoading}
        disabled={profession.trim().length > 0 && profession.trim().length < 2}
        onSave={() =>
          void run({
            ...(profession.trim() && { profession: profession.trim() }),
            city: city.trim(),
            summary: summary.trim(),
            ...(years && { experienceYears: Number(years) }),
          })
        }
      />
    </>
  );
}

/** "03/2022" ↔ ISO date */
const toMonth = (iso?: string) => (iso ? `${String(new Date(iso).getMonth() + 1).padStart(2, '0')}/${new Date(iso).getFullYear()}` : '');
const fromMonth = (text: string) => {
  const m = text.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return undefined;
  return new Date(Date.UTC(Number(m[2]), Number(m[1]) - 1, 1)).toISOString();
};

type ExperienceDraft = Omit<Experience, 'startDate' | 'endDate'> & { start: string; end: string };

function ExperienceForm({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExperienceDraft[]>(() =>
    cv.profileExperience.map((e) => ({ ...e, start: toMonth(e.startDate), end: toMonth(e.endDate) })),
  );
  const { run, isLoading, error, setError } = useSave();
  const update = (i: number, patch: Partial<ExperienceDraft>) => setItems((all) => all.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const save = () => {
    const bad = items.find((x) => !x.title.trim() || (x.start && !fromMonth(x.start)) || (!x.isCurrent && x.end && !fromMonth(x.end)));
    if (bad) return setError(bad.title.trim() ? t('cv.badMonth') : t('cv.titleRequired'));
    void run({
      profileExperience: items.map(({ start, end, _id: _ignored, ...x }) => ({
        ...x,
        title: x.title.trim(),
        company: x.company?.trim() || undefined,
        location: x.location?.trim() || undefined,
        description: x.description?.trim() || undefined,
        startDate: fromMonth(start),
        endDate: x.isCurrent ? undefined : fromMonth(end),
      })),
    });
  };

  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={error} />
        {items.map((x, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.row}>
              <AppText variant="label" style={styles.flex}>
                {t('cv.experienceN', { n: i + 1 })}
              </AppText>
              <RemoveButton onPress={() => setItems((all) => all.filter((_, k) => k !== i))} />
            </View>
            <TextField label={t('cv.jobTitle')} value={x.title} onChangeText={(v) => update(i, { title: v })} maxLength={100} />
            <TextField label={t('cv.company')} optional value={x.company ?? ''} onChangeText={(v) => update(i, { company: v })} maxLength={100} />
            <TextField label={t('cv.place')} optional value={x.location ?? ''} onChangeText={(v) => update(i, { location: v })} maxLength={80} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label={t('cv.start')} placeholder="03/2022" value={x.start} onChangeText={(v) => update(i, { start: v })} keyboardType="numbers-and-punctuation" maxLength={7} />
              </View>
              {!x.isCurrent && (
                <View style={styles.flex}>
                  <TextField label={t('cv.end')} placeholder="12/2024" value={x.end} onChangeText={(v) => update(i, { end: v })} keyboardType="numbers-and-punctuation" maxLength={7} />
                </View>
              )}
            </View>
            <View style={styles.row}>
              <AppText variant="small" style={styles.flex}>
                {t('cv.current')}
              </AppText>
              <Switch value={x.isCurrent} onValueChange={(v) => update(i, { isCurrent: v })} trackColor={{ true: Colors.primary, false: Colors.border }} />
            </View>
            <TextField label={t('cv.tasks')} optional value={x.description ?? ''} onChangeText={(v) => update(i, { description: v })} maxLength={600} multiline />
          </View>
        ))}
        <Button title={t('cv.addExperience')} icon="plus" variant="outline" onPress={() => setItems((all) => [...all, { title: '', isCurrent: false, start: '', end: '' }])} />
      </KeyboardScroll>
      <Footer loading={isLoading} onSave={save} />
    </>
  );
}

function EducationForm({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Education[]>(() => cv.profileEducation.map(({ degree, institution, year }) => ({ degree, institution, year })));
  const { run, isLoading, error, setError } = useSave();
  const update = (i: number, patch: Partial<Education>) => setItems((all) => all.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const save = () => {
    if (items.some((x) => !x.degree.trim() || !x.institution.trim() || !/^\d{4}$/.test(x.year.trim()))) return setError(t('cv.educationIncomplete'));
    void run({ profileEducation: items.map((x) => ({ degree: x.degree.trim(), institution: x.institution.trim(), year: x.year.trim() })) });
  };

  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={error} />
        {items.map((x, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.row}>
              <AppText variant="label" style={styles.flex}>
                {t('cv.educationN', { n: i + 1 })}
              </AppText>
              <RemoveButton onPress={() => setItems((all) => all.filter((_, k) => k !== i))} />
            </View>
            <TextField label={t('cv.degree')} hint={t('cv.degreeHint')} value={x.degree} onChangeText={(v) => update(i, { degree: v })} maxLength={100} />
            <TextField label={t('cv.school')} value={x.institution} onChangeText={(v) => update(i, { institution: v })} maxLength={100} />
            <TextField label={t('cv.year')} placeholder="2021" value={x.year} onChangeText={(v) => update(i, { year: v.replace(/\D/g, '').slice(0, 4) })} keyboardType="number-pad" />
          </View>
        ))}
        <Button title={t('cv.addEducation')} icon="plus" variant="outline" onPress={() => setItems((all) => [...all, { degree: '', institution: '', year: '' }])} />
      </KeyboardScroll>
      <Footer loading={isLoading} onSave={save} />
    </>
  );
}

function SkillsForm({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const [skills, setSkills] = useState(cv.skills);
  const [languages, setLanguages] = useState(cv.languages);
  const [achievements, setAchievements] = useState(cv.achievements);
  const { run, isLoading, error } = useSave();
  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={error} />
        <TagInput label={t('cv.skills')} hint={t('cv.skillsHint')} values={skills} onChange={setSkills} />
        <TagInput label={t('cv.languages')} values={languages} onChange={setLanguages} ideas={LANGUAGE_IDEAS} />
        <TagInput label={t('cv.achievements')} hint={t('cv.achievementsHint')} values={achievements} onChange={setAchievements} />
      </KeyboardScroll>
      <Footer loading={isLoading} onSave={() => void run({ skills, languages, achievements })} />
    </>
  );
}

/** Listed in the workers directory: profession, rate per hour, service type */
function WorkerForm({ cv }: { cv: MyCv }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const { data: services = [] } = useGetCategoriesQuery('service');
  const [listed, setListed] = useState(cv.isWorkerListed || !cv.profession);
  const [profession, setProfession] = useState(cv.profession ?? '');
  const [rate, setRate] = useState(cv.hourlyRate ? String(cv.hourlyRate) : '');
  const [years, setYears] = useState(cv.experienceYears !== undefined ? String(cv.experienceYears) : '');
  const [serviceId, setServiceId] = useState(typeof cv.serviceCategoryId === 'string' ? cv.serviceCategoryId : cv.serviceCategoryId?._id);
  const [error, setError] = useState<string | null>(null);
  const [save, saveState] = useSaveCvMutation();
  const [setListing, listingState] = useSetWorkerListingMutation();

  const submit = async () => {
    setError(null);
    if (listed && profession.trim().length < 2) return setError(t('cv.professionRequired'));
    try {
      if (profession.trim() && profession.trim() !== cv.profession) await save({ profession: profession.trim() }).unwrap();
      await setListing({
        isWorkerListed: listed,
        ...(rate && { hourlyRate: Number(rate) }),
        ...(years && { experienceYears: Number(years) }),
        ...(serviceId && { serviceCategoryId: serviceId }),
      }).unwrap();
      toast.show(listed ? t('cv.listedOn') : t('cv.listedOff'), 'success');
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('cv.workerHint')}
        </AppText>
        <Banner tone="danger" message={error} />
        <View style={[styles.card, styles.row]}>
          <AppText variant="bodyMedium" style={styles.flex}>
            {t('cv.workerSwitch')}
          </AppText>
          <Switch value={listed} onValueChange={setListed} trackColor={{ true: Colors.success, false: Colors.border }} />
        </View>
        <TextField label={t('cv.profession')} hint={t('cv.professionHint')} value={profession} onChangeText={setProfession} maxLength={100} />
        <TextField label={t('cv.rate')} hint={t('cv.rateHint')} optional value={rate} onChangeText={(v) => setRate(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
        <TextField label={t('cv.years')} optional value={years} onChangeText={(v) => setYears(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
        {services.length > 0 && (
          <View style={styles.gap}>
            <AppText variant="label">{t('cv.serviceType')}</AppText>
            <View style={styles.chips}>
              {services
                .filter((c) => !c.parentId)
                .map((c) => (
                  <Chip key={c._id} label={l(c.name)} selected={serviceId === c._id} onPress={() => setServiceId(c._id)} />
                ))}
            </View>
          </View>
        )}
        <AppText variant="caption" color={Colors.textMuted}>
          {t('cv.workerPrivacy')}
        </AppText>
      </KeyboardScroll>
      <Footer loading={saveState.isLoading || listingState.isLoading} onSave={() => void submit()} />
    </>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.remove')}>
      <Feather name="trash-2" size={16} color={Colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  footer: { paddingVertical: Spacing.md },
});
