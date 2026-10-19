import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { pickDefaultAddress, useGetAddressesQuery } from '@/features/address/api';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { AdBanner } from '@/features/catalog/components/AdBanner';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ProductFilterSheet,
  type ProductFilters,
} from '@/features/catalog/components/ProductFilterSheet';
import { ProductResults } from '@/features/catalog/components/ProductResults';
import { useLocalized } from '@/hooks/useLocalized';
import { useAppSelector } from '@/store/hooks';

/** Products of one category, with the same filters as search (category fixed). */
export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t } = useTranslation();
  const l = useLocalized();
  const categories = useGetCategoriesQuery('product');
  const title = l(categories.data?.find((c) => c._id === id)?.name) || name;
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS, category: id });
  const [open, setOpen] = useState(false);
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: addresses } = useGetAddressesQuery(undefined, { skip: !signedIn });
  const address = pickDefaultAddress(addresses);
  const count = activeFilterCount(filters) - 1; // the category itself is not a user filter

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader
          title={title}
          right={
            <HeaderIconButton
              icon="sliders"
              label={t('filters.title')}
              badge={count > 0 ? count : undefined}
              onPress={() => setOpen(true)}
            />
          }
        />
      </View>
      <ProductResults
        query={{
          category: id,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          rating: filters.rating,
          inStock: filters.inStock,
          sort: filters.sort,
          ...(filters.maxDistance && address
            ? { maxDistance: filters.maxDistance, lat: address.location.lat, lng: address.location.lng }
            : {}),
        }}
        header={
          <View style={styles.header}>
            <AdBanner placement="category" />
            {count > 0 && (
              <View style={styles.active}>
                <Feather name="filter" size={14} color={Colors.primary} />
                <AppText variant="small" color={Colors.primary}>
                  {t('filters.activeCount', { count })}
                </AppText>
              </View>
            )}
          </View>
        }
        onResetFilters={count > 0 ? () => setFilters({ ...DEFAULT_FILTERS, category: id }) : undefined}
      />
      <ProductFilterSheet
        visible={open}
        value={filters}
        hideCategory
        canUseDistance={Boolean(address)}
        onClose={() => setOpen(false)}
        onApply={(f) => {
          setFilters({ ...f, category: id });
          setOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  header: { gap: Spacing.sm, paddingTop: Spacing.xs },
  active: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
