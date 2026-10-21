import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { useConfirmInterviewMutation, useGetApplicationQuery, useWithdrawApplicationMutation } from '@/features/jobs/api';
import { APPLICATION_TONE, WITHDRAWABLE } from '@/features/jobs/status';
import type { ApplicationStatus, MyApplication } from '@/features/jobs/types';
import { getApiErrorMessage } from '@/lib/api/errors';

const STEPS: ApplicationStatus[] = ['applied', 'under_review', 'shortlisted', 'interview', 'hired'];

/** One of my applications: where it stands, the interview (confirm / map), message the recruiter, withdraw. */
export default function ApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useGetApplicationQuery(id);

  // The recruiter opening it from a notification: their own screen
  if (data?.viewerRole === 'recruiter') return <Redirect href={{ pathname: '/recruiter/candidate/[id]', params: { id } }} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('application.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={100} radius={Radius.lg} />
          <Skeleton height={160} radius={Radius.lg} />
        </View>
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Body application={data as MyApplication} />
      )}
    </SafeAreaView>
  );
}

function Body({ application: a }: { application: MyApplication }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { open: openChat, opening } = useOpenChat();
  const [confirm, confirmState] = useConfirmInterviewMutation();
  const [withdraw, withdrawState] = useWithdrawApplicationMutation();
  const [askWithdraw, setAskWithdraw] = useState(false);
  const title = a.jobId?.title ?? t('myApplications.spontaneous');
  const org = a.jobId?.organizationName ?? a.targetVendorId?.storeName ?? '';
  const ended = a.status === 'rejected' || a.status === 'withdrawn';
  const reached = STEPS.indexOf(a.status);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.show(done, 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const interviewAt = a.interview?.at ? new Date(a.interview.at) : null;
  return (
    <>
      <ScrollView contentContainerStyle={[styles.inner, styles.content]}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="h3">{title}</AppText>
              <AppText variant="small" color={Colors.textMuted}>
                {org}
              </AppText>
            </View>
            <StatusPill label={t(`applicationStatus.${a.status}`)} tone={APPLICATION_TONE[a.status]} />
          </View>
          <AppText variant="caption" color={Colors.textSubtle}>
            {t('myApplications.sentOn', { date: new Date(a.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}
          </AppText>
          {a.jobId && <Button title={t('application.viewJob')} size="sm" variant="ghost" onPress={() => router.push({ pathname: '/job/[id]', params: { id: a.jobId!._id } })} />}
        </View>

        {/* Where it stands */}
        {ended ? (
          <View style={[styles.card, styles.ended]}>
            <Feather name={a.status === 'rejected' ? 'x-circle' : 'corner-up-left'} size={18} color={Colors.textMuted} />
            <AppText variant="small" style={styles.flex}>
              {t(`application.ended.${a.status}`)}
            </AppText>
          </View>
        ) : a.status === 'pending_payment' ? (
          <View style={[styles.card, styles.ended]}>
            <Feather name="clock" size={18} color={Colors.warning} />
            <AppText variant="small" style={styles.flex}>
              {t('application.pendingPayment')}
            </AppText>
          </View>
        ) : (
          <View style={styles.card}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.step}>
                <View style={[styles.dot, i <= reached && styles.dotOn]}>
                  {i <= reached && <Feather name="check" size={11} color={Colors.textOnPrimary} />}
                </View>
                <AppText variant="small" color={i <= reached ? Colors.text : Colors.textMuted}>
                  {t(`applicationStatus.${s}`)}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {/* The interview */}
        {a.status === 'interview' && interviewAt && (
          <View style={[styles.card, styles.interview]}>
            <View style={styles.row}>
              <Feather name="calendar" size={18} color={Colors.warning} />
              <AppText variant="title" style={styles.flex}>
                {t('application.interview')}
              </AppText>
              {a.interview?.confirmedAt && <StatusPill label={t('application.confirmed')} tone="green" />}
            </View>
            <AppText variant="h3">{interviewAt.toLocaleString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</AppText>
            {a.interview?.location ? (
              <AppText variant="body" color={Colors.textMuted}>
                {a.interview.location}
              </AppText>
            ) : null}
            {a.interview?.note ? (
              <AppText variant="small" color={Colors.textMuted}>
                {a.interview.note}
              </AppText>
            ) : null}
            <View style={styles.row}>
              {a.interview?.mapUrl ? (
                <Button title={t('application.map')} icon="map-pin" size="sm" variant="outline" style={styles.flex} onPress={() => void Linking.openURL(a.interview!.mapUrl!)} />
              ) : null}
              {!a.interview?.confirmedAt && (
                <Button
                  title={t('application.confirm')}
                  icon="check"
                  size="sm"
                  style={styles.flex}
                  loading={confirmState.isLoading}
                  onPress={() => void run(() => confirm(a._id).unwrap(), t('application.confirmedToast'))}
                />
              )}
            </View>
          </View>
        )}

        {/* What I sent */}
        <View style={styles.card}>
          <AppText variant="title">{t('application.sentCv')}</AppText>
          {a.cvSnapshot.profession ? <AppText variant="body">{a.cvSnapshot.profession}</AppText> : null}
          {a.cvSnapshot.skills?.length ? (
            <AppText variant="small" color={Colors.textMuted}>
              {a.cvSnapshot.skills.join(' · ')}
            </AppText>
          ) : null}
          {a.cvSnapshot.summary ? (
            <AppText variant="small" color={Colors.textMuted} numberOfLines={4}>
              {a.cvSnapshot.summary}
            </AppText>
          ) : null}
          {a.cvSnapshot.file?.url ? (
            <Button title={t('application.openCv')} icon="file-text" size="sm" variant="ghost" onPress={() => void Linking.openURL(a.cvSnapshot.file!.url)} />
          ) : null}
        </View>
      </ScrollView>

      {!ended && a.status !== 'pending_payment' && (
        <View style={[styles.inner, styles.footer]}>
          <Button
            title={t('application.message')}
            icon="message-circle"
            variant="outline"
            style={styles.flex}
            loading={opening}
            onPress={() => openChat({ type: 'job_application', applicationId: a._id })}
          />
          {WITHDRAWABLE.includes(a.status) && <Button title={t('application.withdraw')} variant="ghost" onPress={() => setAskWithdraw(true)} />}
        </View>
      )}

      <ConfirmDialog
        visible={askWithdraw}
        destructive
        icon="corner-up-left"
        title={t('application.withdrawTitle')}
        message={t('application.withdrawText')}
        confirmLabel={t('application.withdraw')}
        loading={withdrawState.isLoading}
        onConfirm={() =>
          void run(async () => {
            await withdraw(a._id).unwrap();
            setAskWithdraw(false);
          }, t('application.withdrawn'))
        }
        onCancel={() => setAskWithdraw(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  ended: { flexDirection: 'row', alignItems: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  dotOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  interview: { borderColor: Colors.warning, backgroundColor: Colors.warningSoft },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.background },
});
