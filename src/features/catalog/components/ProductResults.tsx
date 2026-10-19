import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spacing } from '@/constants/theme';

import { useSearchProductsInfiniteQuery } from '../api';
import type { ProductQuery } from '../types';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

/** Paged product grid for a query (search tab, category, store). */
export function ProductResults({
  query,
  header,
  onResetFilters,
}: {
  query: ProductQuery;
  header?: ReactElement;
  onResetFilters?: () => void;
}) {
  const { t } = useTranslation();
  const result = useSearchProductsInfiniteQuery(query);
  const products = result.data?.pages.flatMap((p) => p.data) ?? [];

  let empty: ReactElement | undefined;
  if (result.isLoading) {
    empty = (
      <View style={styles.pad}>
        <ProductGridSkeleton count={6} />
      </View>
    );
  } else if (result.isError) {
    empty = <ErrorState error={result.error} onRetry={() => void result.refetch()} />;
  } else {
    empty = (
      <EmptyState
        icon="search"
        title={t('search.noResults')}
        message={t('search.noResultsHint')}
        actionLabel={onResetFilters ? t('filters.reset') : undefined}
        onAction={onResetFilters}
      />
    );
  }

  return (
    <ProductGrid
      products={products}
      header={header}
      empty={empty}
      onEndReached={() => {
        if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
      }}
      loadingMore={result.isFetchingNextPage}
      refreshing={result.isFetching && !result.isFetchingNextPage && !result.isLoading}
      onRefresh={() => void result.refetch()}
    />
  );
}

const styles = StyleSheet.create({
  pad: { paddingTop: Spacing.sm },
});
