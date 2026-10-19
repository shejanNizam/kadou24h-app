import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Money } from '@/components/ui/Money';
import { Rating } from '@/components/ui/Rating';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AddToCartControl } from '@/features/cart/components/AddToCartControl';

import type { Product } from '../types';

export const productBadge = (p: Product): { label: string; tone: 'discount' | 'new' | 'popular' } | null => {
  if (p.discountPrice && p.discountPrice < p.price) {
    return { label: `-${Math.round((1 - p.discountPrice / p.price) * 100)}%`, tone: 'discount' };
  }
  if (p.tags.includes('new')) return { label: 'new', tone: 'new' };
  if (p.tags.includes('popular')) return { label: 'popular', tone: 'popular' };
  return null;
};

const badgeColors = { discount: '#F5B800', new: '#10B981', popular: '#F97316' } as const;

/** Grid card: photo + badge, name, store, rating, price, Add / stepper. */
export function ProductCard({ product, width }: { product: Product; width: number }) {
  const { t } = useTranslation();
  const badge = productBadge(product);
  const outOfStock = product.stockQty <= 0 || !product.isAvailable;
  const storeClosed = product.vendorId && !product.vendorId.isOpen;
  const price = product.discountPrice ?? product.price;

  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product._id } })}
        accessibilityRole="button"
        accessibilityLabel={product.name}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View style={styles.imageBox}>
          <Image
            source={product.images[0]?.url}
            style={styles.image}
            contentFit="contain"
            transition={150}
            accessibilityIgnoresInvertColors
          />
          {badge && (
            <View style={[styles.badge, { backgroundColor: badgeColors[badge.tone] }]}>
              <AppText variant="caption" color={Colors.textOnPrimary}>
                {badge.tone === 'discount' ? badge.label : t(`catalog.tag.${badge.tone}`)}
              </AppText>
            </View>
          )}
          {(outOfStock || storeClosed) && (
            <View style={styles.overlay}>
              <AppText variant="smallMedium" color={Colors.textOnPrimary}>
                {storeClosed ? t('catalog.storeClosed') : t('catalog.outOfStock')}
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="smallMedium" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1} style={styles.store}>
          {product.vendorId?.storeName}
        </AppText>
        <View style={styles.ratingRow}>
          <Rating value={product.ratingAvg} count={product.ratingCount} />
        </View>
        <View style={styles.priceContainer}>
          <Money value={price} compareAt={product.discountPrice ? product.price : undefined} variant="smallMedium" />
        </View>
      </Pressable>
      <View style={styles.actionContainer}>
        <AddToCartControl
          productId={product._id}
          maxQty={product.stockQty}
          disabled={outOfStock || Boolean(storeClosed)}
          compact
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  pressed: { opacity: 0.85 },
  imageBox: {
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,17,26,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    height: 38,
    lineHeight: 18,
    marginBottom: 2,
  },
  store: {
    height: 16,
    marginBottom: 2,
  },
  ratingRow: {
    height: 18,
    justifyContent: 'center',
    marginBottom: 4,
  },
  priceContainer: {
    minHeight: 38,
    justifyContent: 'flex-start',
  },
  actionContainer: {
    marginTop: 'auto',
    paddingTop: Spacing.xs,
  },
});
