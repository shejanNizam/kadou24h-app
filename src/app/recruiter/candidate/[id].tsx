import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { useGetApplicationQuery, useScheduleInterviewMutation, useSetApplicationStatusMutation, useUnlockCvMutation } from '@/features/jobs/api';
import { PayFeeSheet } from '@/features/jobs/components/PayFeeSheet';
import { APPLICATION_TONE, MATCH_TONE, openFeePayment } from '@/features/jobs/status';
import type { Candidate } from '@/features/jobs/types';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { img } from '@/lib/image';

/**
 * A candidate (job applicant or spontaneous application to my store):
 * profile and match; phone, e-mail and CV file once unlocked (paid);
 * shortlist, invite to an interview, hire or reject; message them.
 */
export default function CandidateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useGetApplicationQuery(id);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('candidate.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={120} radius={Radius.lg} />
          <Skeleton height={140} radius={Radius.lg} />
        </View>
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Body candidate={data as Candidate} refetch={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}

type Decision = 'shortlisted' | 'hired' | 'rejected';

function Body({ candidate: c, refetch }: { candidate: Candidate; refetch: () => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { open: openChat, opening } = useOpenChat();
  const { data: settings } = useGetPublicSettingsQuery();
  const [unlock] = useUnlockCvMutation();
  const [setStatus, statusState] = useSetApplicationStatusMutation();
  const [unlocking, setUnlocking] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const job = typeof c.jobId === 'object' ? c.jobId : null;
  const closed = c.status === 'withdrawn';

  const decide = async (status: Decision) => {
    try {
      await setStatus({ id: c._id, status }).unwrap();
      setConfirm(null);
      toast.show(t(`candidate.done.${status}`), 'success');
    } catch (e) {
      setConfirm(null);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.inner, styles.content]}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              {c.applicant.avatar?.url ? <Image source={img(c.applicant.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" /> : <Feather name="user" size={24} color={Colors.primary} />}
            </View>
            <View style={styles.flex}>
              <AppText variant="h3">{c.applicant.name}</AppText>
              {c.cvSnapshot.profession ? (
                <AppText variant="small" color={Colors.primary}>
                  {c.cvSnapshot.profession}
                </AppText>
              ) : null}
              <AppText variant="caption" color={Colors.textMuted}>
                {job ? t('candidate.appliedFor', { title: job.title }) : t('candidate.spontaneous')} ·{' '}
                {new Date(c.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
              </AppText>
            </View>
          </View>
          <View style={styles.row}>
            <StatusPill label={t(`applicationStatus.${c.status}`)} tone={APPLICATION_TONE[c.status]} />
            {c.kind === 'offer' && <StatusPill label={t('jobsList.match', { score: c.matchScore })} tone={MATCH_TONE(c.matchScore)} />}
          </View>
        </View>

        {closed && <Banner tone="info" message={t('candidate.withdrawn')} />}

        {/* Free: what they told us about themselves */}
        <View style={styles.card}>
          <AppText variant="title">{t('candidate.profile')}</AppText>
          {c.cvSnapshot.summary ? <AppText variant="body">{c.cvSnapshot.summary}</AppText> : <AppText variant="small" color={Colors.textSubtle}>{t('candidate.noSummary')}</AppText>}
          {c.cvSnapshot.skills?.length ? (
            <View style={styles.tags}>
              {c.cvSnapshot.skills.map((s) => (
                <Tag key={s} label={s} />
              ))}
            </View>
          ) : null}
        </View>

        {/* Paid: contact + CV file */}
        <View style={[styles.card, !c.isCvUnlocked && styles.locked]}>
          <View style={styles.row}>
            <Feather name={c.isCvUnlocked ? 'unlock' : 'lock'} size={18} color={c.isCvUnlocked ? Colors.success : Colors.primary} />
            <AppText variant="title" style={styles.flex}>
              {t('candidate.contact')}
            </AppText>
          </View>
          {c.isCvUnlocked ? (
            <>
              {c.applicant.phone ? <Button title={c.applicant.phone} icon="phone" size="sm" variant="outline" onPress={() => void Linking.openURL(`tel:${c.applicant.phone}`)} /> : null}
              {c.applicant.email ? <Button title={c.applicant.email} icon="mail" size="sm" variant="outline" onPress={() => void Linking.openURL(`mailto:${c.applicant.email}`)} /> : null}
              {c.cvSnapshot.file?.url ? (
                <Button title={t('candidate.openCv')} icon="file-text" size="sm" onPress={() => void Linking.openURL(c.cvSnapshot.file!.url)} />
              ) : (
                <AppText variant="small" color={Colors.textMuted}>
                  {t('candidate.noCvFile')}
                </AppText>
              )}
            </>
          ) : (
            <>
              <AppText variant="small" color={Colors.textMuted}>
                {t('candidate.lockedText')}
              </AppText>
              <Button title={t('candidate.unlock', { amount: (settings?.pricing?.cvUnlockFee ?? 5000).toLocaleString('fr-FR') })} icon="unlock" onPress={() => setUnlocking(true)} />
            </>
          )}
        </View>

        {c.status === 'interview' && c.interview?.at && (
          <View style={[styles.card, styles.interview]}>
            <View style={styles.row}>
              <Feather name="calendar" size={18} color={Colors.warning} />
              <AppText variant="title" style={styles.flex}>
                {new Date(c.interview.at).toLocaleString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </AppText>
              <StatusPill label={c.interview.confirmedAt ? t('application.confirmed') : t('candidate.notConfirmed')} tone={c.interview.confirmedAt ? 'green' : 'amber'} />
            </View>
            {c.interview.location ? <AppText variant="small">{c.interview.location}</AppText> : null}
          </View>
        )}

        {!closed && (
          <View style={styles.actions}>
            <Button title={t('candidate.message')} icon="message-circle" variant="outline" loading={opening} onPress={() => openChat({ type: 'job_application', applicationId: c._id })} />
            {c.status !== 'shortlisted' && c.status !== 'hired' && (
              <Button title={t('candidate.shortlist')} icon="star" variant="soft" loading={statusState.isLoading && statusState.originalArgs?.status === 'shortlisted'} onPress={() => void decide('shortlisted')} />
            )}
            {c.status !== 'hired' && (
              <Button title={c.status === 'interview' ? t('candidate.reschedule') : t('candidate.invite')} icon="calendar" variant="soft" onPress={() => setInviting(true)} />
            )}
            {c.status !== 'hired' && <Button title={t('candidate.hire')} icon="check-circle" onPress={() => setConfirm('hired')} />}
            {c.status !== 'rejected' && <Button title={t('candidate.reject')} variant="ghost" onPress={() => setConfirm('rejected')} />}
          </View>
        )}
      </ScrollView>

      <PayFeeSheet
        visible={unlocking}
        title={t('candidate.unlockTitle')}
        description={t('candidate.unlockText', { name: c.applicant.name ?? '' })}
        amount={settings?.pricing?.cvUnlockFee ?? 5000}
        onClose={() => setUnlocking(false)}
        onPay={async (method) => {
          const res = await unlock({ applicantId: c.applicantId, paymentMethod: method }).unwrap();
          setUnlocking(false);
          if (res.unlocked) refetch();
          else openFeePayment(res.payment);
        }}
      />
      <InterviewSheet applicationId={inviting ? c._id : null} onClose={() => setInviting(false)} />
      <ConfirmDialog
        visible={confirm !== null}
        destructive={confirm === 'rejected'}
        icon={confirm === 'hired' ? 'check-circle' : 'x-circle'}
        title={confirm ? t(`candidate.confirm.${confirm}`, { name: c.applicant.name ?? '' }) : ''}
        message={confirm ? t(`candidate.confirmText.${confirm}`) : undefined}
        confirmLabel={confirm === 'hired' ? t('candidate.hire') : t('candidate.reject')}
        loading={statusState.isLoading}
        onConfirm={() => confirm && void decide(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

/** "12/11/2026" + "14:30" → ISO (local time) */
const toIso = (day: string, time: string) => {
  const d = day.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const h = time.trim().match(/^(\d{1,2})[:h](\d{2})$/);
  if (!d || !h) return undefined;
  const at = new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]), Number(h[1]), Number(h[2]));
  return Number.isNaN(at.getTime()) || at.getTime() < Date.now() ? undefined : at.toISOString();
};

function InterviewSheet({ applicationId, onClose }: { applicationId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [schedule, { isLoading }] = useScheduleInterviewMutation();

  const send = async () => {
    const at = toIso(day, time);
    if (!at) return setError(t('candidate.badDate'));
    if (mapUrl.trim() && !/^https?:\/\//.test(mapUrl.trim())) return setError(t('candidate.badLink'));
    setError(null);
    try {
      await schedule({
        id: applicationId!,
        at,
        ...(place.trim() && { location: place.trim() }),
        ...(mapUrl.trim() && { mapUrl: mapUrl.trim() }),
        ...(note.trim() && { note: note.trim() }),
      }).unwrap();
      toast.show(t('candidate.invited'), 'success');
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={Boolean(applicationId)}
      title={t('candidate.inviteTitle')}
      onClose={onClose}
      onShow={() => setError(null)}
      footer={<Button title={t('candidate.sendInvite')} icon="send" loading={isLoading} onPress={() => void send()} />}>
      <AppText variant="small" color={Colors.textMuted}>
        {t('candidate.inviteHint')}
      </AppText>
      <Banner tone="danger" message={error} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={t('candidate.day')} placeholder="12/11/2026" value={day} onChangeText={setDay} keyboardType="numbers-and-punctuation" maxLength={10} />
        </View>
        <View style={styles.flex}>
          <TextField label={t('candidate.time')} placeholder="10:30" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} />
        </View>
      </View>
      <TextField label={t('candidate.place')} hint={t('candidate.placeHint')} value={place} onChangeText={setPlace} maxLength={200} />
      <TextField label={t('candidate.mapLink')} hint={t('candidate.mapLinkHint')} optional value={mapUrl} onChangeText={setMapUrl} autoCapitalize="none" keyboardType="url" />
      <TextField label={t('candidate.note')} optional value={note} onChangeText={setNote} maxLength={500} multiline />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  locked: { borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySoft },
  interview: { borderColor: Colors.warning, backgroundColor: Colors.warningSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft, overflow: 'hidden' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.sm },
});
