import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMyReviewsInfiniteQuery, type MyReview } from '@/features/profile/api';

/** Reviews I wrote (one per delivered store order). */
export default function MyReviewsScreen() {
  const { t } = useTranslation();
  const result = useGetMyReviewsInfiniteQuery();
  const reviews = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('profile.myReviews')} />
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => <ReviewRow review={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={96} radius={Radius.md} />
              ))}
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="star" title={t('myReviews.emptyTitle')} message={t('myReviews.emptyText')} />
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

function ReviewRow({ review: r }: { review: MyReview }) {
  const { t, i18n } = useTranslation();
  const store = r.vendorId;
  return (
    <View style={styles.card}>
      <Pressable
        disabled={!store}
        onPress={() => store && router.push({ pathname: '/store/[id]', params: { id: store._id } })}
        accessibilityRole="button"
        style={styles.head}>
        <View style={styles.logo}>
          {store?.logo?.url ? <Image source={store.logo.url} style={styles.logoImg} contentFit="cover" /> : <Feather name="shopping-bag" size={16} color={Colors.primary} />}
        </View>
        <AppText variant="title" numberOfLines={1} style={styles.flex}>
          {store?.storeName ?? '—'}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {new Date(r.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
        </AppText>
      </Pressable>
      <View style={styles.stars} accessibilityLabel={t('order.stars', { count: r.rating })}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Feather key={n} name="star" size={16} color={n <= r.rating ? Colors.warning : Colors.border} />
        ))}
      </View>
      {r.comment ? <AppText variant="body">{r.comment}</AppText> : null}
      {r.status !== 'visible' && (
        <AppText variant="caption" color={Colors.warning}>
          {t('myReviews.hidden')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 32, height: 32 },
  flex: { flex: 1 },
  stars: { flexDirection: 'row', gap: 2 },
});
