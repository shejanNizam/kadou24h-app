import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { CategoryTile } from '@/features/catalog/components/CategoryTile';

/** All product categories (Figma "Top Categories" grid). */
export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useGetCategoriesQuery('product');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('home.topCategories')} />
      </View>
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={[styles.inner, styles.grid]}>
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} width={96} height={110} radius={Radius.lg} />)
            : data?.map((c) => <CategoryTile key={c._id} category={c} size={88} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, justifyContent: 'space-between', paddingBottom: Spacing.xxxl },
});
