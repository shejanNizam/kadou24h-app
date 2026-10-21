import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { salaryText } from '@/features/catalog/components/JobCard';
import { useGetMyCvQuery } from '@/features/cv/api';
import { cvFileOf } from '@/features/cv/types';
import { useApplyToJobMutation, useGetJobDetailsQuery } from '@/features/jobs/api';
import { APPLICATION_TONE, MATCH_TONE, matchScore } from '@/features/jobs/status';
import type { JobDetails } from '@/features/jobs/types';
import { useLocalized } from '@/hooks/useLocalized';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';

/** Job details → Apply with my CV (or create one first). */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const l = useLocalized();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: job, isLoading, isError, error, refetch } = useGetJobDetailsQuery(id);
  const { data: cv } = useGetMyCvQuery(undefined, { skip: !signedIn });
  const [applying, setApplying] = useState(false);
  const hasProfile = Boolean(cv && (cv.skills.length || cv.languages.length));
  const match = job && cv && hasProfile ? matchScore(job, cv) : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader />
      </View>
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={[styles.inner, styles.body]}>
              {isLoading || !job ? (
                <>
                  <Skeleton height={28} width="70%" />
                  <Skeleton height={120} radius={Radius.lg} />
                </>
              ) : (
                <>
                  <View style={styles.gap}>
                    <AppText variant="small" color={Colors.primary}>
                      {job.organizationName}
                    </AppText>
                    <AppText variant="h2">{job.title}</AppText>
                    <View style={styles.tags}>
                      <Tag label={t(`jobs.type.${job.jobType}`)} />
                      <Tag label={t(`jobs.workplace.${job.workplace}`)} />
                      {job.categoryId ? <Tag label={l(job.categoryId.name)} /> : null}
                    </View>
                  </View>

                  {match !== undefined && !job.isOwner && <MatchCard job={job} match={match} skills={cv?.skills ?? []} languages={cv?.languages ?? []} />}
                  {signedIn && cv && !hasProfile && !job.isOwner && (
                    <Banner tone="info" message={t('jobDetail.createCvForMatch')} />
                  )}

                  <View style={styles.card}>
                    <Row label={t('jobs.salary')} value={salaryText(job, t)} />
                    <Row label={t('jobs.location')} value={[job.area, job.city].filter(Boolean).join(', ')} />
                    {job.vacancies ? <Row label={t('jobs.vacancies')} value={String(job.vacancies)} /> : null}
                    {job.applicationDeadline ? (
                      <Row label={t('jobs.deadline')} value={new Date(job.applicationDeadline).toLocaleDateString(i18n.language)} />
                    ) : null}
                    {job.prefExperienceLevel ? <Row label={t('jobDetail.experience')} value={job.prefExperienceLevel} /> : null}
                    {job.prefMinEducation ? <Row label={t('jobDetail.education')} value={job.prefMinEducation} /> : null}
                  </View>

                  <Block title={t('jobs.about')} text={job.about} />
                  <List title={t('jobs.responsibilities')} items={job.responsibilities} />
                  <List title={t('jobs.requirements')} items={job.requirements} />
                  <List title={t('jobs.benefits')} items={job.benefits} />
                  {job.prefSkills?.length ? <TagBlock title={t('jobDetail.skills')} items={job.prefSkills} /> : null}
                  {job.prefLanguages?.length ? <TagBlock title={t('jobDetail.languages')} items={job.prefLanguages} /> : null}
                  {job.aboutCompany ? <Block title={t('jobs.aboutCompany', { org: job.organizationName })} text={job.aboutCompany} /> : null}
                </>
              )}
            </View>
          </ScrollView>

          {job && (
            <View style={styles.footer}>
              <View style={styles.inner}>
                <Footer job={job} onApply={() => requireAuth(() => setApplying(true))} />
              </View>
            </View>
          )}
          {job && <ApplySheet job={job} visible={applying} match={match} onClose={() => setApplying(false)} />}
        </>
      )}
    </SafeAreaView>
  );
}

/** The one action for whoever is looking */
function Footer({ job, onApply }: { job: JobDetails; onApply: () => void }) {
  const { t } = useTranslation();
  if (job.isOwner) {
    return <Button title={t('jobDetail.manage')} variant="outline" icon="settings" onPress={() => router.push({ pathname: '/recruiter/job/[id]', params: { id: job._id } })} />;
  }
  if (job.myApplication) {
    const a = job.myApplication;
    return (
      <View style={styles.applied}>
        <StatusPill label={t(`applicationStatus.${a.status}`)} tone={APPLICATION_TONE[a.status]} />
        <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
          {t('jobDetail.alreadyApplied')}
        </AppText>
        <Button title={t('jobDetail.viewApplication')} size="sm" variant="soft" onPress={() => router.push({ pathname: '/jobs/application/[id]', params: { id: a._id } })} />
      </View>
    );
  }
  if (job.isOpen === false) return <Button title={t('jobDetail.closed')} disabled onPress={() => undefined} />;
  return <Button title={t('jobs.apply')} icon="send" onPress={onApply} />;
}

function MatchCard({ job, match, skills, languages }: { job: JobDetails; match: number; skills: string[]; languages: string[] }) {
  const { t } = useTranslation();
  const have = new Set([...skills, ...languages].map((s) => s.toLowerCase().trim()));
  const wanted = [...(job.prefSkills ?? []), ...(job.prefLanguages ?? [])];
  return (
    <View style={styles.match}>
      <View style={styles.row}>
        <Feather name="target" size={18} color={Colors.primary} />
        <AppText variant="title" style={styles.flex}>
          {t('jobDetail.yourMatch')}
        </AppText>
        <StatusPill label={`${match} %`} tone={MATCH_TONE(match)} />
      </View>
      {wanted.length > 0 && (
        <View style={styles.tags}>
          {wanted.map((w) => (
            <View key={w} style={[styles.skill, have.has(w.toLowerCase().trim()) ? styles.skillHave : styles.skillMissing]}>
              <Feather name={have.has(w.toLowerCase().trim()) ? 'check' : 'x'} size={12} color={have.has(w.toLowerCase().trim()) ? Colors.success : Colors.textSubtle} />
              <AppText variant="caption">{w}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Confirm before sending: which CV goes, an optional note to the recruiter */
function ApplySheet({ job, visible, match, onClose }: { job: JobDetails; visible: boolean; match?: number; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: cv, isLoading } = useGetMyCvQuery();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apply, { isLoading: sending }] = useApplyToJobMutation();
  const file = cvFileOf(cv);

  const send = async () => {
    setError(null);
    try {
      const application = await apply({ jobId: job._id, ...(note.trim() && { coverNote: note.trim() }) }).unwrap();
      onClose();
      router.push({ pathname: '/jobs/applied', params: { id: application._id, title: job.title } });
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('jobDetail.applyTitle')}
      onClose={onClose}
      onShow={() => {
        setNote('');
        setError(null);
      }}
      footer={
        file ? (
          <Button title={t('jobDetail.send')} icon="send" loading={sending} onPress={() => void send()} />
        ) : (
          <Button
            title={t('jobDetail.createCv')}
            icon="file-text"
            onPress={() => {
              onClose();
              router.push('/cv');
            }}
          />
        )
      }>
      {isLoading ? null : file ? (
        <>
          <AppText variant="body">{t('jobDetail.applyTo', { title: job.title, org: job.organizationName })}</AppText>
          <View style={styles.cvRow}>
            <Feather name="file-text" size={18} color={Colors.primary} />
            <View style={styles.flex}>
              <AppText variant="bodyMedium">{cv?.uploadedResume ? t('jobDetail.myUploadedCv') : t('jobDetail.myKadouCv')}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {[cv?.profession, match !== undefined ? t('jobsList.match', { score: match }) : null].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            <Button title={t('common.edit')} size="sm" variant="ghost" onPress={() => { onClose(); router.push('/cv'); }} />
          </View>
          <TextField label={t('jobDetail.note')} hint={t('jobDetail.noteHint')} optional value={note} onChangeText={setNote} maxLength={1000} multiline />
          <AppText variant="caption" color={Colors.textMuted}>
            {t('jobDetail.privacy')}
          </AppText>
          <Banner tone="danger" message={error} />
        </>
      ) : (
        <View style={styles.noCv}>
          <Feather name="file-plus" size={32} color={Colors.primary} />
          <AppText variant="h3" align="center">
            {t('jobDetail.needCvTitle')}
          </AppText>
          <AppText variant="body" color={Colors.textMuted} align="center">
            {t('jobDetail.needCvText')}
          </AppText>
        </View>
      )}
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <AppText variant="small" color={Colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="smallMedium" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.gap}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" color={Colors.textMuted}>
        {text}
      </AppText>
    </View>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <View style={styles.gap}>
      <AppText variant="h3">{title}</AppText>
      {items.map((item, i) => (
        <AppText key={item + i} variant="body" color={Colors.textMuted}>
          {`•  ${item}`}
        </AppText>
      ))}
    </View>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.gap}>
      <AppText variant="h3">{title}</AppText>
      <View style={styles.tags}>
        {items.map((item) => (
          <Tag key={item} label={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: Spacing.xxl },
  body: { gap: Spacing.xl },
  gap: { gap: Spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  value: { flexShrink: 1, textAlign: 'right' },
  flex: { flex: 1 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md },
  applied: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  match: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill },
  skillHave: { backgroundColor: Colors.successSoft },
  skillMissing: { backgroundColor: Colors.background },
  cvRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
  noCv: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
});
