import Feather from '@expo/vector-icons/Feather';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMyJobsInfiniteQuery } from '@/features/jobs/api';
import { jobState } from '@/features/jobs/status';
import type { MyJob, MyJobsTab } from '@/features/jobs/types';
import { useAppSelector } from '@/store/hooks';

const TABS: MyJobsTab[] = ['active', 'draft', 'closed'];

/** "Post a job" home: my offers by state, with their numbers. */
export default function RecruiterScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [tab, setTab] = useState<MyJobsTab>('active');
  const result = useGetMyJobsInfiniteQuery(tab, { skip: !signedIn });
  if (!signedIn) return <Redirect href="/login" />;
  const jobs = result.data?.pages.flatMap((p) => p.data) ?? [];
  const counts = result.data?.pages[0]?.meta.counts;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('recruiter.title')} />
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j._id}
        renderItem={({ item }) => <JobRow job={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <Stat icon="briefcase" label={t('recruiter.statActive')} value={counts?.active} />
              <Stat icon="users" label={t('recruiter.statApplicants')} value={counts?.applicants} />
              <Stat icon="eye" label={t('recruiter.statViews')} value={counts?.views} />
            </View>
            <Button title={t('recruiter.post')} icon="plus" onPress={() => router.push('/recruiter/job/form')} />
            <SegmentTabs
              tabs={TABS.map((key) => ({ key, label: t(`recruiter.tab.${key}`), badge: key === 'draft' ? counts?.draft || undefined : undefined }))}
              value={tab}
              onChange={setTab}
            />
          </View>
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={110} radius={Radius.lg} />
              <Skeleton height={110} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="briefcase" title={t(`recruiter.empty.${tab}`)} message={tab === 'active' ? t('recruiter.emptyText') : undefined} />
          )
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: { icon: 'briefcase' | 'users' | 'eye'; label: string; value?: number }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={16} color={Colors.primary} />
      <AppText variant="h3">{value ?? '—'}</AppText>
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function JobRow({ job }: { job: MyJob }) {
  const { t, i18n } = useTranslation();
  const state = jobState(job);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recruiter/job/[id]', params: { id: job._id } })}
      accessibilityRole="button"
      accessibilityLabel={job.title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex} numberOfLines={2}>
          {job.title}
        </AppText>
        <StatusPill label={t(`recruiter.state.${state.key}`)} tone={state.tone} />
      </View>
      <AppText variant="caption" color={Colors.textMuted}>
        {[job.organizationName, job.area ?? job.city].filter(Boolean).join(' · ')}
      </AppText>
      <View style={styles.row}>
        <Feather name="users" size={14} color={Colors.textMuted} />
        <AppText variant="small">{t('recruiter.applicants', { count: job.stats?.applicants ?? 0 })}</AppText>
        <Feather name="eye" size={14} color={Colors.textMuted} />
        <AppText variant="small" style={styles.flex}>
          {job.stats?.views ?? 0}
        </AppText>
        {job.isOpen && job.expiresAt ? (
          <AppText variant="caption" color={Colors.textSubtle}>
            {t('recruiter.until', { date: new Date(job.expiresAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  header: { gap: Spacing.md, paddingTop: Spacing.sm },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxxl },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.9 },
});
