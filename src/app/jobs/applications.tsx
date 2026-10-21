import Feather from '@expo/vector-icons/Feather';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMyApplicationsInfiniteQuery } from '@/features/jobs/api';
import { APPLICATION_TONE } from '@/features/jobs/status';
import type { ApplicationStatus, MyApplication } from '@/features/jobs/types';
import { useAppSelector } from '@/store/hooks';

const FILTERS: (ApplicationStatus | 'all')[] = ['all', 'applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn'];

/** My job applications (offers + spontaneous), with status chips. */
export default function MyApplicationsScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const result = useGetMyApplicationsInfiniteQuery(filter, { skip: !signedIn });
  const rows = result.data?.pages.flatMap((p) => p.data) ?? [];
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('myApplications.title')} />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips]}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f === 'all' ? t('jobsList.all') : t(`applicationStatus.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(a) => a._id}
        renderItem={({ item }) => <ApplicationRow application={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={96} radius={Radius.lg} />
              <Skeleton height={96} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState
              icon="send"
              title={t('myApplications.empty')}
              message={t('myApplications.emptyText')}
              actionLabel={t('myApplications.findJobs')}
              onAction={() => router.push('/jobs')}
            />
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

function ApplicationRow({ application: a }: { application: MyApplication }) {
  const { t, i18n } = useTranslation();
  const title = a.jobId?.title ?? t('myApplications.spontaneous');
  const org = a.jobId?.organizationName ?? a.targetVendorId?.storeName ?? '';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/jobs/application/[id]', params: { id: a._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${org}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
            {org}
          </AppText>
        </View>
        <StatusPill label={t(`applicationStatus.${a.status}`)} tone={APPLICATION_TONE[a.status]} />
      </View>
      <View style={styles.row}>
        <AppText variant="caption" color={Colors.textSubtle} style={styles.flex}>
          {t('myApplications.sentOn', { date: new Date(a.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) })}
        </AppText>
        {a.status === 'interview' && a.interview?.at ? (
          <View style={styles.interview}>
            <Feather name="calendar" size={12} color={Colors.warning} />
            <AppText variant="caption">
              {new Date(a.interview.at).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  list: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  interview: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: Colors.warningSoft },
  pressed: { opacity: 0.9 },
});
