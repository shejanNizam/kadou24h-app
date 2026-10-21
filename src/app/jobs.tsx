import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
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
import { TextField } from '@/components/ui/TextField';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { salaryText } from '@/features/catalog/components/JobCard';
import { useGetMyCvQuery } from '@/features/cv/api';
import { useSearchJobsInfiniteQuery } from '@/features/jobs/api';
import { MATCH_TONE, matchScore } from '@/features/jobs/status';
import type { Job } from '@/features/jobs/types';
import { useDebounced } from '@/hooks/useDebounced';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSelector } from '@/store/hooks';

/**
 * Job offers: search, category chips, and "% match" against my CV (skills and
 * languages) — or an invitation to create a CV first.
 */
export default function JobsScreen() {
  const { t } = useTranslation();
  const l = useLocalized();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const search = useDebounced(text.trim());
  const result = useSearchJobsInfiniteQuery({ search: search || undefined, categoryId });
  const { data: categories = [] } = useGetCategoriesQuery('job');
  const { data: cv } = useGetMyCvQuery(undefined, { skip: !signedIn });
  const jobs = result.data?.pages.flatMap((p) => p.data) ?? [];
  const hasCv = Boolean(cv && (cv.skills.length || cv.languages.length));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('jobsList.title')} />
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j._id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <JobRow job={item} match={hasCv && cv ? matchScore(item, cv) : undefined} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextField icon="search" placeholder={t('jobsList.searchHint')} value={text} onChangeText={setText} autoCorrect={false} accessibilityLabel={t('jobsList.searchHint')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
              <Chip label={t('jobsList.all')} selected={!categoryId} onPress={() => setCategoryId(undefined)} />
              {categories
                .filter((c) => !c.parentId)
                .map((c) => (
                  <Chip key={c._id} label={l(c.name)} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
                ))}
            </ScrollView>
            {signedIn && (
              <View style={styles.links}>
                <QuickLink icon="file-text" label={t('jobsList.myCv')} onPress={() => router.push('/cv')} />
                <QuickLink icon="send" label={t('jobsList.myApplications')} onPress={() => router.push('/jobs/applications')} />
                <QuickLink icon="briefcase" label={t('jobsList.postJob')} onPress={() => router.push('/recruiter')} />
              </View>
            )}
            {signedIn && cv && !hasCv && (
              <Pressable onPress={() => router.push('/cv')} accessibilityRole="button" style={styles.cvBanner}>
                <Feather name="percent" size={16} color={Colors.primary} />
                <AppText variant="small" style={styles.flex}>
                  {t('jobsList.createCvForMatch')}
                </AppText>
                <Feather name="chevron-right" size={16} color={Colors.primary} />
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={120} radius={Radius.lg} />
              <Skeleton height={120} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="briefcase" title={t('jobsList.empty')} message={search || categoryId ? t('jobsList.emptyFiltered') : undefined} />
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

function QuickLink({ icon, label, onPress }: { icon: 'file-text' | 'send' | 'briefcase'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Feather name={icon} size={18} color={Colors.primary} />
      <AppText variant="caption" align="center" numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function JobRow({ job, match }: { job: Job; match?: number }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.organizationName}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="small" color={Colors.primary} numberOfLines={1}>
            {job.organizationName}
          </AppText>
          <AppText variant="title" numberOfLines={2}>
            {job.title}
          </AppText>
        </View>
        {match !== undefined && <StatusPill label={t('jobsList.match', { score: match })} tone={MATCH_TONE(match)} />}
      </View>
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
        {[t(`jobs.type.${job.jobType}`), t(`jobs.workplace.${job.workplace}`), job.area ?? job.city].filter(Boolean).join(' · ')}
      </AppText>
      <View style={styles.row}>
        <AppText variant="smallMedium" style={styles.flex} numberOfLines={1}>
          {salaryText(job, t)}
        </AppText>
        {job.publishedAt ? (
          <AppText variant="caption" color={Colors.textSubtle}>
            {new Date(job.publishedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxxl },
  header: { gap: Spacing.md, paddingTop: Spacing.sm },
  chips: { gap: Spacing.sm },
  links: { flexDirection: 'row', gap: Spacing.sm },
  link: { flex: 1, alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  cvBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.9 },
});
