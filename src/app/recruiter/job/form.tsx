import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
import { salaryText } from '@/features/catalog/components/JobCard';
import { useCreateJobMutation, useGetJobDetailsQuery, usePublishJobMutation, useUpdateJobMutation } from '@/features/jobs/api';
import { PayFeeSheet } from '@/features/jobs/components/PayFeeSheet';
import { openFeePayment } from '@/features/jobs/status';
import type { JobDetails, JobInput, JobType, WorkplaceType } from '@/features/jobs/types';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { useGetMyStoreQuery } from '@/features/vendor/api';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

const STEPS = ['basics', 'details', 'candidates', 'preview'] as const;
type Step = (typeof STEPS)[number];
const JOB_TYPES: JobType[] = ['full_time', 'part_time', 'contract', 'internship'];
const WORKPLACES: WorkplaceType[] = ['on_site', 'hybrid', 'remote'];
const FREQUENCIES = ['monthly', 'weekly', 'hourly'] as const;

/** Create or edit a job offer in 4 steps; saved as a draft, then published (paid). */
export default function JobFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const existing = useGetJobDetailsQuery(id ?? '', { skip: !id });
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {id && existing.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : id && (existing.isError || !existing.data) ? (
        <>
          <View style={styles.inner}>
            <StackHeader />
          </View>
          <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />
        </>
      ) : (
        <Form job={existing.data} title={id ? t('jobForm.editTitle') : t('jobForm.newTitle')} />
      )}
    </SafeAreaView>
  );
}

/** Text area "one per line" ↔ list */
const lines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);
/** "31/12/2026" ↔ ISO */
const toDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
const fromDay = (text: string) => {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 10);

function Form({ job, title }: { job?: JobDetails; title: string }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const isVendor = user?.lastActiveMode === AppMode.vendor;
  const { data: store } = useGetMyStoreQuery(undefined, { skip: !isVendor });
  const { data: settings } = useGetPublicSettingsQuery();
  const { data: categories = [] } = useGetCategoriesQuery('job');
  const [create, createState] = useCreateJobMutation();
  const [update, updateState] = useUpdateJobMutation();
  const [publish] = usePublishJobMutation();

  const [step, setStep] = useState<Step>('basics');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState(job?._id);
  const [paying, setPaying] = useState(false);

  // Step 1
  const [jobTitle, setJobTitle] = useState(job?.title ?? '');
  const [org, setOrg] = useState(job?.organizationName ?? (isVendor ? (store?.storeName ?? '') : (user?.name ?? '')));
  const [categoryId, setCategoryId] = useState(job?.categoryId?._id);
  const [jobType, setJobType] = useState<JobType>(job?.jobType ?? 'full_time');
  const [workplace, setWorkplace] = useState<WorkplaceType>(job?.workplace ?? 'on_site');
  const [city, setCity] = useState(job?.city ?? 'Conakry');
  const [area, setArea] = useState(job?.area ?? '');
  // Step 2
  const [salaryMin, setSalaryMin] = useState(job?.salaryMin ? String(job.salaryMin) : '');
  const [salaryMax, setSalaryMax] = useState(job?.salaryMax ? String(job.salaryMax) : '');
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>(job?.salaryFrequency ?? 'monthly');
  const [about, setAbout] = useState(job?.about ?? '');
  const [tasks, setTasks] = useState((job?.responsibilities ?? []).join('\n'));
  const [requirements, setRequirements] = useState((job?.requirements ?? []).join('\n'));
  const [benefits, setBenefits] = useState((job?.benefits ?? []).join('\n'));
  const [vacancies, setVacancies] = useState(job?.vacancies ? String(job.vacancies) : '1');
  // Step 3
  const [experience, setExperience] = useState(job?.prefExperienceLevel ?? '');
  const [education, setEducation] = useState(job?.prefMinEducation ?? '');
  const [skills, setSkills] = useState(job?.prefSkills ?? []);
  const [languages, setLanguages] = useState(job?.prefLanguages ?? []);
  const [deadline, setDeadline] = useState(toDay(job?.applicationDeadline));
  const [aboutCompany, setAboutCompany] = useState(job?.aboutCompany ?? '');

  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const body = (): JobInput => ({
    title: jobTitle.trim(),
    organizationName: org.trim(),
    ...(categoryId && { categoryId }),
    jobType,
    workplace,
    country: 'Guinée',
    city: city.trim(),
    area: area.trim(),
    salaryCurrency: 'GNF',
    ...(salaryMin && { salaryMin: Number(salaryMin) }),
    ...(salaryMax && { salaryMax: Number(salaryMax) }),
    salaryFrequency: frequency,
    about: about.trim(),
    responsibilities: lines(tasks),
    requirements: lines(requirements),
    benefits: lines(benefits),
    ...(vacancies && { vacancies: Number(vacancies) }),
    prefExperienceLevel: experience.trim(),
    prefMinEducation: education.trim(),
    prefSkills: skills,
    prefLanguages: languages,
    ...(fromDay(deadline) && { applicationDeadline: fromDay(deadline) }),
    aboutCompany: aboutCompany.trim(),
  });

  const next = () => {
    if (step === 'basics') {
      if (jobTitle.trim().length < 3) return setError(t('jobForm.titleRequired'));
      if (org.trim().length < 2) return setError(t('jobForm.orgRequired'));
    } else if (step === 'details') {
      if (about.trim().length < 10) return setError(t('jobForm.aboutRequired'));
      if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) return setError(t('jobForm.salaryOrder'));
    } else if (step === 'candidates') {
      if (deadline && !fromDay(deadline)) return setError(t('jobForm.badDate'));
    }
    go(STEPS[index + 1]);
  };

  /** Creates the draft the first time, updates it afterwards */
  const save = async (): Promise<string | null> => {
    setError(null);
    try {
      if (savedId) {
        await update({ id: savedId, ...body() }).unwrap();
        return savedId;
      }
      const created = await create(body()).unwrap();
      setSavedId(created._id);
      return created._id;
    } catch (e) {
      setError(getApiErrorMessage(e, t));
      return null;
    }
  };

  const saveDraft = async () => {
    const savedJob = await save();
    if (!savedJob) return;
    toast.show(t('jobForm.saved'), 'success');
    router.replace({ pathname: '/recruiter/job/[id]', params: { id: savedJob } });
  };

  const draft = body();
  const published = job?.isOpen;
  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={title} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('kyc.step', { current: index + 1, total: STEPS.length })} · {t(`jobForm.steps.${step}`)}
        </AppText>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((index + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={error} />

        {step === 'basics' && (
          <>
            <TextField label={t('jobForm.jobTitle')} hint={t('jobForm.jobTitleHint')} value={jobTitle} onChangeText={setJobTitle} maxLength={120} />
            <TextField label={t('jobForm.org')} value={org} onChangeText={setOrg} maxLength={100} />
            <Choice label={t('jobForm.category')}>
              {categories
                .filter((c) => !c.parentId)
                .map((c) => (
                  <Chip key={c._id} label={l(c.name)} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
                ))}
            </Choice>
            <Choice label={t('jobForm.type')}>
              {JOB_TYPES.map((v) => (
                <Chip key={v} label={t(`jobs.type.${v}`)} selected={jobType === v} onPress={() => setJobType(v)} />
              ))}
            </Choice>
            <Choice label={t('jobForm.workplace')}>
              {WORKPLACES.map((v) => (
                <Chip key={v} label={t(`jobs.workplace.${v}`)} selected={workplace === v} onPress={() => setWorkplace(v)} />
              ))}
            </Choice>
            <TextField label={t('jobForm.city')} value={city} onChangeText={setCity} maxLength={60} />
            <TextField label={t('jobForm.area')} hint={t('jobForm.areaHint')} optional value={area} onChangeText={setArea} maxLength={80} />
          </>
        )}

        {step === 'details' && (
          <>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label={t('jobForm.salaryMin')} optional value={salaryMin} onChangeText={(v) => setSalaryMin(digits(v))} keyboardType="number-pad" />
              </View>
              <View style={styles.flex}>
                <TextField label={t('jobForm.salaryMax')} optional value={salaryMax} onChangeText={(v) => setSalaryMax(digits(v))} keyboardType="number-pad" />
              </View>
            </View>
            <Choice label={t('jobForm.per')}>
              {FREQUENCIES.map((v) => (
                <Chip key={v} label={t(`jobs.per.${v}`)} selected={frequency === v} onPress={() => setFrequency(v)} />
              ))}
            </Choice>
            <TextField label={t('jobs.about')} hint={t('jobForm.aboutHint')} value={about} onChangeText={setAbout} maxLength={4000} multiline />
            <TextField label={t('jobs.responsibilities')} hint={t('jobForm.onePerLine')} optional value={tasks} onChangeText={setTasks} multiline />
            <TextField label={t('jobs.requirements')} hint={t('jobForm.onePerLine')} optional value={requirements} onChangeText={setRequirements} multiline />
            <TextField label={t('jobs.benefits')} hint={t('jobForm.onePerLine')} optional value={benefits} onChangeText={setBenefits} multiline />
            <TextField label={t('jobs.vacancies')} value={vacancies} onChangeText={(v) => setVacancies(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" />
          </>
        )}

        {step === 'candidates' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('jobForm.candidatesHint')}
            </AppText>
            <TagInput label={t('jobForm.skills')} hint={t('jobForm.skillsHint')} values={skills} onChange={setSkills} />
            <TagInput label={t('jobForm.languages')} values={languages} onChange={setLanguages} ideas={LANGUAGE_IDEAS} />
            <TextField label={t('jobForm.experience')} hint={t('jobForm.experienceHint')} optional value={experience} onChangeText={setExperience} maxLength={60} />
            <TextField label={t('jobForm.education')} hint={t('jobForm.educationHint')} optional value={education} onChangeText={setEducation} maxLength={60} />
            <TextField label={t('jobForm.deadline')} placeholder="31/12/2026" optional value={deadline} onChangeText={setDeadline} keyboardType="numbers-and-punctuation" maxLength={10} />
            <TextField label={t('jobForm.aboutCompany')} optional value={aboutCompany} onChangeText={setAboutCompany} maxLength={1000} multiline />
          </>
        )}

        {step === 'preview' && (
          <View style={styles.preview}>
            <AppText variant="small" color={Colors.primary}>
              {draft.organizationName}
            </AppText>
            <AppText variant="h3">{draft.title}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {[t(`jobs.type.${draft.jobType}`), t(`jobs.workplace.${draft.workplace}`), draft.area || draft.city].filter(Boolean).join(' · ')}
            </AppText>
            <AppText variant="smallMedium">{salaryText(draft, t)}</AppText>
            <AppText variant="body" color={Colors.textMuted} numberOfLines={6}>
              {draft.about}
            </AppText>
            {skills.length > 0 && (
              <AppText variant="small">
                {t('jobForm.skills')} : {skills.join(', ')}
              </AppText>
            )}
            <Button title={t('jobForm.editStep')} size="sm" variant="ghost" onPress={() => go('basics')} />
          </View>
        )}
        {step === 'preview' && !published && (
          <Banner tone="info" message={t('jobForm.publishInfo', { amount: (settings?.pricing?.jobPublishFee ?? 5000).toLocaleString('fr-FR') })} />
        )}
      </KeyboardScroll>

      <View style={[styles.inner, styles.footer]}>
        {index > 0 && step !== 'preview' && <Button title={t('common.back')} variant="outline" style={styles.flex} onPress={() => go(STEPS[index - 1])} />}
        {step === 'preview' ? (
          published ? (
            <Button title={t('jobForm.saveChanges')} style={styles.flex} loading={updateState.isLoading} onPress={() => void saveDraft()} />
          ) : (
            <>
              <Button title={t('jobForm.saveDraft')} variant="outline" style={styles.flex} loading={createState.isLoading || updateState.isLoading} onPress={() => void saveDraft()} />
              <Button title={t('jobForm.publish')} style={styles.flex} onPress={() => setPaying(true)} />
            </>
          )
        ) : (
          <Button title={t('common.continue')} style={styles.flex} onPress={next} />
        )}
      </View>

      <PayFeeSheet
        visible={paying}
        title={t('jobForm.publishTitle')}
        description={t('jobForm.publishText')}
        amount={settings?.pricing?.jobPublishFee ?? 5000}
        onClose={() => setPaying(false)}
        onPay={async (method) => {
          const savedJob = await save();
          if (!savedJob) {
            setPaying(false);
            return;
          }
          const { payment } = await publish({ id: savedJob, paymentMethod: method }).unwrap();
          setPaying(false);
          // The job screen underneath; the payment screen comes back to it
          router.replace({ pathname: '/recruiter/job/[id]', params: { id: savedJob } });
          openFeePayment(payment, () => toast.show(t('jobForm.published'), 'success'));
        }}
      />
    </>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.gap}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
  progress: { height: 4, borderRadius: 2, backgroundColor: Colors.surface, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Colors.primary },
  row: { flexDirection: 'row', gap: Spacing.md },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  preview: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
});
