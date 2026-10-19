import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TextField } from '@/components/ui/TextField';
import { Colors, MaxContentWidth, MinTouch, Spacing } from '@/constants/theme';
import { pickDefaultAddress, useGetAddressesQuery } from '@/features/address/api';
import { useGetCategoriesQuery, useSearchWorkersInfiniteQuery } from '@/features/catalog/api';
import { AdBanner } from '@/features/catalog/components/AdBanner';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ProductFilterSheet,
  type ProductFilters,
} from '@/features/catalog/components/ProductFilterSheet';
import { useGridItemWidth } from '@/features/catalog/components/ProductGrid';
import { ProductResults } from '@/features/catalog/components/ProductResults';
import { WorkerCard } from '@/features/catalog/components/WorkerCard';
import type { ProductSort } from '@/features/catalog/types';
import { useDebounced } from '@/hooks/useDebounced';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSelector } from '@/store/hooks';

type Tab = 'products' | 'workers';

/** Products | Workers (the Figma mixed workers into the categories). */
export default function SearchScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: Tab; sort?: ProductSort }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'workers' ? 'workers' : 'products');
  const [text, setText] = useState('');
  const term = useDebounced(text.trim());
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS, sort: params.sort ?? 'newest' });
  const [sheetOpen, setSheetOpen] = useState(false);

  // The tab stays mounted: "See all" from Home arrives as new params → apply them
  const [seenParams, setSeenParams] = useState({ tab: params.tab, sort: params.sort });
  if (seenParams.tab !== params.tab || seenParams.sort !== params.sort) {
    setSeenParams({ tab: params.tab, sort: params.sort });
    if (params.tab) setTab(params.tab === 'workers' ? 'workers' : 'products');
    if (params.sort) setFilters((f) => ({ ...f, sort: params.sort as ProductSort }));
  }

  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: addresses } = useGetAddressesQuery(undefined, { skip: !signedIn });
  const address = pickDefaultAddress(addresses);

  const count = activeFilterCount(filters);
  const productQuery = {
    searchTerm: term || undefined,
    category: filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    rating: filters.rating,
    inStock: filters.inStock,
    sort: filters.sort,
    // Distance is measured from the delivery address
    ...(filters.maxDistance && address
      ? { maxDistance: filters.maxDistance, lat: address.location.lat, lng: address.location.lng }
      : {}),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <View style={styles.flex}>
            <TextField
              icon="search"
              placeholder={tab === 'products' ? t('search.placeholder') : t('search.workersPlaceholder')}
              value={text}
              onChangeText={setText}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={t('tabs.search')}
              right={
                text ? (
                  <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
                    <Feather name="x-circle" size={18} color={Colors.textSubtle} />
                  </Pressable>
                ) : undefined
              }
            />
          </View>
          {tab === 'products' && (
            <Pressable
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={count ? `${t('filters.title')} (${count})` : t('filters.title')}
              style={[styles.filterBtn, count > 0 && styles.filterOn]}>
              <Feather name="sliders" size={20} color={count ? Colors.textOnPrimary : Colors.text} />
              {count > 0 && (
                <View style={styles.filterBadge}>
                  <AppText variant="caption" color={Colors.primary}>
                    {count}
                  </AppText>
                </View>
              )}
            </Pressable>
          )}
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['products', 'workers'] as Tab[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              style={[styles.tab, tab === key && styles.tabOn]}>
              <AppText variant="label" color={tab === key ? Colors.primary : Colors.textMuted}>
                {t(`search.${key}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'products' ? (
        <ProductResults
          query={productQuery}
          header={
            <View style={styles.listHeader}>
              <AdBanner placement="search" />
            </View>
          }
          onResetFilters={count || term ? () => {
            setFilters(DEFAULT_FILTERS);
            setText('');
          } : undefined}
        />
      ) : (
        <WorkerResults search={term} />
      )}

      <ProductFilterSheet
        visible={sheetOpen}
        value={filters}
        canUseDistance={Boolean(address)}
        onClose={() => setSheetOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function WorkerResults({ search }: { search: string }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const itemWidth = useGridItemWidth();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const services = useGetCategoriesQuery('service');
  const result = useSearchWorkersInfiniteQuery({ search: search || undefined, categoryId });
  const workers = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <FlatList
      data={workers}
      keyExtractor={(w) => w._id}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      renderItem={({ item }) => <WorkerCard worker={item} width={itemWidth} />}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('filters.all')} selected={!categoryId} onPress={() => setCategoryId(undefined)} />
          {services.data?.map((c) => (
            <Chip key={c._id} label={l(c.name)} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
          ))}
        </ScrollView>
      }
      ListEmptyComponent={
        result.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : result.isError ? (
          <ErrorState error={result.error} onRetry={() => void result.refetch()} />
        ) : (
          <EmptyState icon="users" title={t('search.noWorkers')} message={t('search.noResultsHint')} />
        )
      }
      ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
      onEndReached={() => {
        if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  top: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, minHeight: MinTouch, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Colors.primary },
  listHeader: { paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  gridRow: { gap: Spacing.md },
  gridContent: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  loading: { marginTop: Spacing.xxxl },
});
