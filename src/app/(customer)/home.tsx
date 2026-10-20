import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderIconButton } from '@/components/ui/StackHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { pickDefaultAddress, useGetAddressesQuery } from '@/features/address/api';
import { useGetCartQuery } from '@/features/cart/api';
import { useGetCategoriesQuery, useGetJobsQuery, useGetProductsQuery, useGetWorkersQuery } from '@/features/catalog/api';
import { AdBanner } from '@/features/catalog/components/AdBanner';
import { CategoryTile } from '@/features/catalog/components/CategoryTile';
import { JobCard } from '@/features/catalog/components/JobCard';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ProductGridSkeleton, useGridItemWidth } from '@/features/catalog/components/ProductGrid';
import { WorkerCard } from '@/features/catalog/components/WorkerCard';
import { useGetUnreadCountQuery } from '@/features/notifications/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

/**
 * Figma Home: purple header (deliver to, search, bell, cart), then categories,
 * banner, jobs near you, popular products and popular workers.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const itemWidth = useGridItemWidth();
  const [refreshing, setRefreshing] = useState(false);

  const categories = useGetCategoriesQuery('product');
  const products = useGetProductsQuery({ sort: 'popular', limit: 6 });
  const jobs = useGetJobsQuery({ limit: 6 });
  const workers = useGetWorkersQuery({ limit: 4 });
  const addresses = useGetAddressesQuery(undefined, { skip: !signedIn });
  const cart = useGetCartQuery(undefined, { skip: !signedIn });
  const unread = useGetUnreadCountQuery({ mode: AppMode.customer }, { skip: !signedIn });

  const address = pickDefaultAddress(addresses.data);
  const deliverTo = address
    ? [address.neighborhood, address.commune ?? address.city].filter(Boolean).join(', ')
    : null;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      categories.refetch(),
      products.refetch(),
      jobs.refetch(),
      workers.refetch(),
      ...(signedIn ? [addresses.refetch(), cart.refetch(), unread.refetch()] : []),
    ]);
    setRefreshing(false);
  };

  // Nothing at all could load (offline / server down): one clear message
  if (products.isError && categories.isError) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <ErrorState error={products.error} onRetry={refresh} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.textOnPrimary} />}>
      <LinearGradient colors={Colors.gradient} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <Pressable
              style={styles.flex}
              onPress={() =>
                requireAuth(() =>
                  address ? router.push({ pathname: '/addresses', params: { select: '1' } }) : router.push('/address-edit'),
                )
              }
              accessibilityRole="button"
              accessibilityHint={t('address.changeHint')}>
              <AppText variant="caption" color="rgba(255,255,255,0.8)">
                {t('home.deliverTo')}
              </AppText>
              <View style={styles.addressRow}>
                <AppText variant="title" color={Colors.textOnPrimary} numberOfLines={1} style={styles.shrink}>
                  {deliverTo ?? (signedIn ? t('home.noAddress') : t('home.guestAddress'))}
                </AppText>
                <Feather name="chevron-down" size={18} color={Colors.textOnPrimary} />
              </View>
            </Pressable>
            <HeaderIconButton
              icon="bell"
              color={Colors.textOnPrimary}
              label={t('notifications.title')}
              badge={unread.data}
              onPress={() => requireAuth(() => router.push('/notifications'))}
            />
            <HeaderIconButton
              icon="shopping-cart"
              color={Colors.textOnPrimary}
              label={t('cart.title')}
              badge={cart.data?.totalItems}
              onPress={() => requireAuth(() => router.push('/cart'))}
            />
          </View>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel={t('search.placeholder')}
            style={styles.search}>
            <Feather name="search" size={18} color={Colors.textMuted} />
            <AppText variant="body" color={Colors.textSubtle}>
              {t('search.placeholder')}
            </AppText>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={[styles.inner, styles.body]}>
        <View>
          <SectionHeader title={t('home.topCategories')} onSeeAll={() => router.push('/categories')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {categories.data
              ? categories.data.map((c) => <CategoryTile key={c._id} category={c} />)
              : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} width={80} height={96} radius={Radius.lg} />)}
          </ScrollView>
        </View>

        <AdBanner placement="home" />

        {jobs.data?.data.length ? (
          <View>
            <SectionHeader title={t('home.jobsNearYou')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {jobs.data.data.map((job) => (
                <JobCard key={job._id} job={job} width={Math.min(260, itemWidth * 1.5)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <SectionHeader
            title={t('home.popularProducts')}
            onSeeAll={() => router.push({ pathname: '/search', params: { sort: 'popular' } })}
          />
          {products.data ? (
            <View style={styles.grid}>
              {products.data.data.map((p) => (
                <ProductCard key={p._id} product={p} width={itemWidth} />
              ))}
            </View>
          ) : (
            <ProductGridSkeleton />
          )}
        </View>

        {workers.data?.data.length ? (
          <View>
            <SectionHeader
              title={t('home.popularWorkers')}
              onSeeAll={() => router.push({ pathname: '/search', params: { tab: 'workers' } })}
            />
            <View style={styles.grid}>
              {workers.data.data.map((w) => (
                <WorkerCard key={w._id} worker={w} width={itemWidth} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shrink: { flexShrink: 1 },
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxxl },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  hero: { paddingBottom: Spacing.xl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  body: { gap: Spacing.xxl, paddingTop: Spacing.xl },
  hList: { gap: Spacing.md, paddingRight: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
});
