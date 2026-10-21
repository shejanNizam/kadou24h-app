import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetVendorQuery } from '@/features/catalog/api';
import { ProductResults } from '@/features/catalog/components/ProductResults';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { SpontaneousApply } from '@/features/jobs/components/SpontaneousApply';
import { useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Store page (new — the Figma "Seller info" led nowhere): info + its products. */
export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: store, isLoading, isError, error, refetch } = useGetVendorQuery(id);
  const { open: openChat } = useOpenChat();
  const me = useAppSelector((s) => s.auth.user);

  const header = (
    <View style={styles.header}>
      {isLoading ? (
        <Skeleton height={96} radius={Radius.lg} />
      ) : store ? (
        <View style={styles.card}>
          <View style={styles.logo}>
            {store.logo?.url ? (
              <Image source={img(store.logo.url, 'thumb')} style={styles.logoImg} contentFit="cover" />
            ) : (
              <Feather name="shopping-bag" size={28} color={Colors.primary} />
            )}
          </View>
          <View style={styles.info}>
            <AppText variant="h3">{store.storeName}</AppText>
            {store.marketName || store.address?.city ? (
              <AppText variant="small" color={Colors.textMuted}>
                {[store.marketName, store.address?.city].filter(Boolean).join(' · ')}
              </AppText>
            ) : null}
            <Rating value={store.stats.ratingAvg} count={store.stats.ratingCount} size="medium" />
            <AppText variant="smallMedium" color={store.isOpen ? Colors.success : Colors.danger}>
              {store.isOpen ? t('catalog.open') : t('catalog.storeClosed')}
              {store.availability?.enabled
                ? ` · ${store.availability.openTime}–${store.availability.closeTime}, ${store.availability.days
                    .slice()
                    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
                    .map((d) => t(`days.${d}`))
                    .join(', ')}`
                : ''}
            </AppText>
          </View>
        </View>
      ) : null}
      {/* Not on my own store */}
      {store && store.userId !== me?._id && <SpontaneousApply vendorId={store._id} storeName={store.storeName} />}
      <AppText variant="h3" style={styles.productsTitle}>
        {t('catalog.storeProducts', { count: store?.stats.totalProducts ?? 0 })}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader
          title={store?.storeName}
          right={store ? <HeaderIconButton icon="message-circle" label={t('catalog.messageStore')} onPress={() => openChat({ type: 'buyer_seller', vendorId: id })} /> : undefined}
        />
      </View>
      {isError ? <ErrorState error={error} onRetry={refetch} /> : <ProductResults query={{ vendorId: id, sort: 'popular' }} header={header} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  header: { gap: Spacing.lg, paddingBottom: Spacing.xs },
  card: {
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 4 },
  productsTitle: { marginTop: Spacing.xs },
});
