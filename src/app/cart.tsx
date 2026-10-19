import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGetCartQuery } from '@/features/cart/api';
import { formatGNF } from '@/lib/format';

// Phase 4: full cart grouped by store + checkout. For now: what is in it.
export default function CartScreen() {
  const { t } = useTranslation();
  const { data } = useGetCartQuery();
  const empty = !data || data.totalItems === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader title={t('cart.title')} />
      </View>
      {empty ? (
        <EmptyState
          icon="shopping-cart"
          title={t('cart.emptyTitle')}
          message={t('cart.emptyText')}
          actionLabel={t('cart.startShopping')}
          onAction={() => router.replace('/home')}
        />
      ) : (
        <EmptyState
          icon="shopping-cart"
          title={t('cart.summary', { count: data.totalItems, total: formatGNF(data.subtotal) })}
          message={t('cart.checkoutSoon')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
});
