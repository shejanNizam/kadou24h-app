import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetReceivedApplicationsInfiniteQuery } from '@/features/jobs/api';
import { CandidateRow } from '@/features/jobs/components/CandidateRow';
import type { ApplicationStatus } from '@/features/jobs/types';

const FILTERS: (ApplicationStatus | 'all')[] = ['all', 'applied', 'shortlisted', 'interview', 'hired', 'rejected'];

/** People who sent my store a (paid) spontaneous application. */
export default function ReceivedApplicationsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const result = useGetReceivedApplicationsInfiniteQuery(filter);
  const rows = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('received.title')} />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f === 'all' ? t('jobsList.all') : t(`applicationStatus.${f}`)} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => <CandidateRow candidate={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListHeaderComponent={
          <AppText variant="small" color={Colors.textMuted}>
            {t('received.hint')}
          </AppText>
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={96} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="inbox" title={t('received.empty')} message={t('received.emptyText')} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  list: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
});
