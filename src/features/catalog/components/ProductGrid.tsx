import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

import type { Product } from '../types';
import { ProductCard } from './ProductCard';

const GAP = Spacing.md;

/** 2-column width for the current screen (capped on tablets / web preview). */
export function useGridItemWidth(columns = 2, padding = Spacing.xl) {
  const { width } = useWindowDimensions();
  const content = Math.min(width, MaxContentWidth) - padding * 2;
  return Math.floor((content - GAP * (columns - 1)) / columns);
}

/** Infinite 2-column product list with pull-to-refresh. */
export function ProductGrid({
  products,
  header,
  empty,
  onEndReached,
  loadingMore,
  refreshing,
  onRefresh,
}: {
  products: Product[];
  header?: ReactElement;
  empty?: ReactElement;
  onEndReached?: () => void;
  loadingMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const itemWidth = useGridItemWidth();
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p._id}
      numColumns={2}
      renderItem={({ item }) => <ProductCard product={item} width={itemWidth} />}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.more} /> : undefined}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={Colors.primary} /> : undefined}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

/** Placeholder grid while the first page loads. */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  const itemWidth = useGridItemWidth();
  return (
    <View style={styles.skeleton}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: itemWidth, gap: Spacing.sm }}>
          <Skeleton height={itemWidth} radius={12} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={14} width="50%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: GAP },
  row: { gap: GAP },
  more: { marginVertical: Spacing.lg },
  skeleton: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
