import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Money } from '@/components/ui/Money';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetCartQuery } from '@/features/cart/api';
import { AddToCartControl } from '@/features/cart/components/AddToCartControl';
import { useGetProductQuery, useGetProductReviewsQuery, useToggleFavoriteMutation } from '@/features/catalog/api';
import { ImageGallery } from '@/features/catalog/components/ImageGallery';
import { productBadge } from '@/features/catalog/components/ProductCard';
import { ReviewList } from '@/features/catalog/components/ReviewList';
import { useLocalized } from '@/hooks/useLocalized';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppSelector } from '@/store/hooks';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const l = useLocalized();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data, isLoading, isError, error, refetch } = useGetProductQuery(id);
  const reviews = useGetProductReviewsQuery({ productId: id, limit: 3 });
  const cart = useGetCartQuery(undefined, { skip: !signedIn });
  const [toggleFavorite] = useToggleFavoriteMutation();

  if (isLoading) return <ProductSkeleton />;
  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader />
        </View>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const { product, isFavorite } = data;
  const store = product.vendorId;
  const outOfStock = product.stockQty <= 0 || !product.isAvailable;
  const lowStock = !outOfStock && product.stockQty <= Math.max(product.minStockAlert, 5);
  const badge = productBadge(product);
  const inCart = cart.data?.groupedByVendor.some((g) => g.items.some((i) => i.productId === product._id));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader
          right={
            <HeaderIconButton
              icon="heart"
              label={isFavorite ? t('catalog.removeFavorite') : t('catalog.addFavorite')}
              color={isFavorite ? Colors.danger : Colors.text}
              onPress={() => requireAuth(() => void toggleFavorite(product._id))}
            />
          }
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <ImageGallery images={product.images} />
        </View>

        <View style={[styles.inner, styles.body]}>
          <View style={styles.gap}>
            <AppText variant="h2">{product.name}</AppText>
            <View style={styles.row}>
              <Money
                value={product.discountPrice ?? product.price}
                compareAt={product.discountPrice ? product.price : undefined}
                variant="h3"
              />
              {badge?.tone === 'discount' && (
                <View style={styles.discount}>
                  <AppText variant="caption" color={Colors.textOnPrimary}>
                    {badge.label}
                  </AppText>
                </View>
              )}
            </View>
            <View style={styles.row}>
              <Rating value={product.ratingAvg} count={product.ratingCount} size="medium" />
              <AppText
                variant="smallMedium"
                color={outOfStock ? Colors.danger : lowStock ? Colors.warning : Colors.success}>
                {outOfStock
                  ? t('catalog.outOfStock')
                  : lowStock
                    ? t('catalog.lowStock', { count: product.stockQty })
                    : t('catalog.inStock')}
              </AppText>
            </View>
          </View>

          {store && (
            <Pressable
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: store._id } })}
              accessibilityRole="button"
              accessibilityLabel={t('catalog.visitStore', { store: store.storeName })}
              style={styles.storeCard}>
              <View style={styles.logo}>
                {store.logo?.url ? (
                  <Image source={store.logo.url} style={styles.logoImg} contentFit="cover" />
                ) : (
                  <Feather name="shopping-bag" size={20} color={Colors.primary} />
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="title" numberOfLines={1}>
                  {store.storeName}
                </AppText>
                <AppText variant="caption" color={store.isOpen ? Colors.success : Colors.danger}>
                  {store.isOpen ? t('catalog.open') : t('catalog.storeClosed')}
                  {store.address?.city ? ` · ${store.address.city}` : ''}
                </AppText>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textSubtle} />
            </Pressable>
          )}

          {product.description ? (
            <Section title={t('catalog.description')}>
              <AppText variant="body" color={Colors.textMuted}>
                {product.description}
              </AppText>
            </Section>
          ) : null}

          {product.features.length > 0 && (
            <Section title={t('catalog.features')}>
              <View style={styles.tags}>
                {product.features.map((f) => (
                  <Tag key={f} label={f} />
                ))}
              </View>
            </Section>
          )}

          {product.inTheBox.length > 0 && (
            <Section title={t('catalog.inTheBox')}>
              {product.inTheBox.map((item, i) => (
                <AppText key={item + i} variant="body" color={Colors.textMuted}>
                  {`${i + 1}. ${item}`}
                </AppText>
              ))}
            </Section>
          )}

          <Section title={t('catalog.reviewsTitle', { count: product.ratingCount })}>
            <ReviewList reviews={reviews.data?.data ?? []} total={reviews.data?.meta.total ?? 0} />
          </Section>

          <AppText variant="caption" color={Colors.textSubtle}>
            {l(product.categoryId?.name)}
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.inner, styles.footerRow]}>
          <View style={styles.flex}>
            <AddToCartControl
              productId={product._id}
              maxQty={product.stockQty}
              disabled={outOfStock || !store?.isOpen}
            />
          </View>
          {inCart && (
            <Button title={t('cart.view')} variant="outline" size="sm" icon="shopping-cart" onPress={() => router.push('/cart')} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.gap}>
      <AppText variant="h3" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ProductSkeleton() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, styles.gap]}>
        <StackHeader />
        <Skeleton height={300} radius={Radius.lg} />
        <Skeleton height={24} width="80%" />
        <Skeleton height={20} width="40%" />
        <Skeleton height={64} radius={Radius.lg} />
        <Skeleton height={80} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: Spacing.xxl },
  body: { gap: Spacing.xl, paddingTop: Spacing.lg },
  gap: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  discount: { backgroundColor: '#F5B800', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: '100%', height: '100%' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md, backgroundColor: Colors.background },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
