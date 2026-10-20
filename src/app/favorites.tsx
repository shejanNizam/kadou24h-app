import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useGetFavoritesQuery } from '@/features/catalog/api';
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/components/ProductGrid';
import { useAppSelector } from '@/store/hooks';

/** ❤ products (toggled from the product page). */
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data, isLoading, isError, error, refetch, isFetching } = useGetFavoritesQuery(undefined, { skip: !signedIn });
  if (!signedIn) return <SignInPrompt title={t('profile.favorites')} message={t('guest.profile')} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('profile.favorites')} />
      </View>
      {isLoading ? (
        <View style={styles.inner}>
          <ProductGridSkeleton />
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ProductGrid
          products={data?.data ?? []}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          empty={
            <EmptyState
              icon="heart"
              title={t('favorites.emptyTitle')}
              message={t('favorites.emptyText')}
              actionLabel={t('cart.startShopping')}
              onAction={() => router.navigate('/home')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
});
