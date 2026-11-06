import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCloseJobMutation, useGetJobCandidatesInfiniteQuery, useGetJobDetailsQuery, usePublishJobMutation } from '@/features/jobs/api';
import { PayFeeSheet } from '@/features/jobs/components/PayFeeSheet';
import { CandidateRow } from '@/features/jobs/components/CandidateRow';
import { jobState, openFeePayment } from '@/features/jobs/status';
import type { ApplicationStatus, JobDetails } from '@/features/jobs/types';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { getApiErrorMessage } from '@/lib/api/errors';

const FILTERS: (ApplicationStatus | 'all')[] = ['all', 'applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected'];

/** One of my offers: its state and numbers, publish / close / edit, and the candidates. */
export default function RecruiterJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const job = useGetJobDetailsQuery(id);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match');
  const candidates = useGetJobCandidatesInfiniteQuery({ jobId: id, status: filter === 'all' ? undefined : filter, sortBy }, { skip: !job.data?.isOwner });
  const rows = candidates.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('recruiterJob.title')} />
      </View>
      {job.isLoading ? (
        <View style={[styles.inner, styles.list]}>
          <Skeleton height={150} radius={Radius.lg} />
        </View>
      ) : job.isError || !job.data ? (
        <ErrorState error={job.error} onRetry={() => void job.refetch()} />
      ) : !job.data.isOwner ? (
        <EmptyState icon="lock" title={t('recruiterJob.notYours')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => <CandidateRow candidate={item} />}
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={
            <RefreshControl
              refreshing={(job.isFetching || candidates.isFetching) && !candidates.isLoading && !candidates.isFetchingNextPage}
              onRefresh={() => void Promise.all([job.refetch(), candidates.refetch()])}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <JobHeader job={job.data} />
              <View style={styles.row}>
                <AppText variant="h3" style={styles.flex}>
                  {t('recruiterJob.candidates')}
                </AppText>
                <Pressable onPress={() => setSortBy((s) => (s === 'match' ? 'date' : 'match'))} accessibilityRole="button" style={styles.sort}>
                  <Feather name="bar-chart-2" size={14} color={Colors.primary} />
                  <AppText variant="smallMedium" color={Colors.primary}>
                    {t(`recruiterJob.sort.${sortBy}`)}
                  </AppText>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {FILTERS.map((f) => (
                  <Chip key={f} label={f === 'all' ? t('jobsList.all') : t(`applicationStatus.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            candidates.isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : candidates.isError ? (
              <ErrorState error={candidates.error} onRetry={() => void candidates.refetch()} />
            ) : (
              <EmptyState icon="users" title={t('recruiterJob.noCandidates')} message={job.data.isOpen ? t('recruiterJob.noCandidatesOpen') : t('recruiterJob.noCandidatesClosed')} />
            )
          }
          ListFooterComponent={candidates.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
          onEndReached={() => {
            if (candidates.hasNextPage && !candidates.isFetchingNextPage) void candidates.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

function JobHeader({ job }: { job: JobDetails }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: settings } = useGetPublicSettingsQuery();
  const [publish] = usePublishJobMutation();
  const [close, closeState] = useCloseJobMutation();
  const [paying, setPaying] = useState(false);
  const [askClose, setAskClose] = useState(false);
  const state = jobState(job);
  const removed = job.status === 'removed';
  const s = job.stats;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText variant="h3" style={styles.flex}>
          {job.title}
        </AppText>
        <StatusPill label={t(`recruiter.state.${state.key}`)} tone={state.tone} />
      </View>
      {job.isOpen && job.expiresAt ? (
        <AppText variant="caption" color={Colors.textMuted}>
          {t('recruiterJob.liveUntil', { date: new Date(job.expiresAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}
        </AppText>
      ) : null}
      {removed && (
        <View style={styles.removed}>
          <Feather name="slash" size={18} color={Colors.danger} />
          <View style={styles.flex}>
            <AppText variant="title">{t('recruiterJob.removedTitle')}</AppText>
            {job.removal?.reason ? (
              <AppText variant="small" color={Colors.textMuted}>
                {t('recruiterJob.removedReason', { reason: job.removal.reason })}
              </AppText>
            ) : null}
            <AppText variant="small" color={Colors.textMuted}>
              {t('recruiterJob.removedText')}
            </AppText>
          </View>
        </View>
      )}
      {s && (
        <View style={styles.stats}>
          <Stat label={t('recruiterJob.views')} value={s.views} />
          <Stat label={t('recruiterJob.applicants')} value={s.applicants} />
          <Stat label={t('recruiterJob.shortlisted')} value={s.shortlisted} />
          <Stat label={t('recruiterJob.interviews')} value={s.interviews} />
        </View>
      )}
      {!removed && (
        <View style={styles.row}>
          <Button title={t('common.edit')} icon="edit-2" size="sm" variant="outline" style={styles.flex} onPress={() => router.push({ pathname: '/recruiter/job/form', params: { id: job._id } })} />
          {job.isOpen ? (
            <Button title={t('recruiterJob.close')} size="sm" variant="ghost" style={styles.flex} onPress={() => setAskClose(true)} />
          ) : (
            <Button
              title={job.status === 'draft' || job.status === 'pending_payment' ? t('recruiterJob.publish') : t('recruiterJob.republish')}
              icon="send"
              size="sm"
              style={styles.flex}
              onPress={() => setPaying(true)}
            />
          )}
        </View>
      )}
      {job.isOpen && <Button title={t('recruiterJob.seePublic')} size="sm" variant="ghost" onPress={() => router.push({ pathname: '/job/[id]', params: { id: job._id } })} />}

      <PayFeeSheet
        visible={paying}
        title={t('jobForm.publishTitle')}
        description={t('jobForm.publishText')}
        amount={settings?.pricing?.jobPublishFee ?? 5000}
        onClose={() => setPaying(false)}
        onPay={async (method) => {
          const { payment } = await publish({ id: job._id, paymentMethod: method }).unwrap();
          setPaying(false);
          openFeePayment(payment, () => toast.show(t('jobForm.published'), 'success'));
        }}
      />
      <ConfirmDialog
        visible={askClose}
        destructive
        icon="x-circle"
        title={t('recruiterJob.closeTitle')}
        message={t('recruiterJob.closeText')}
        confirmLabel={t('recruiterJob.close')}
        loading={closeState.isLoading}
        onConfirm={() =>
          void close(job._id)
            .unwrap()
            .then(() => {
              setAskClose(false);
              toast.show(t('recruiterJob.closed'));
            })
            .catch((e: unknown) => {
              setAskClose(false);
              toast.show(getApiErrorMessage(e, t), 'danger');
            })
        }
        onCancel={() => setAskClose(false)}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title">{value ?? 0}</AppText>
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  header: { gap: Spacing.md, paddingTop: Spacing.sm },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface },
  chips: { gap: Spacing.sm },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.9 },
  removed: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
});
