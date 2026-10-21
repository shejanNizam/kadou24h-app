import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import {
  useClearCartMutation,
  useGetCartQuery,
  useGetCartSuggestionsQuery,
  useUpdateCartQtyMutation,
  type CartItem,
  type CartStoreGroup,
} from '@/features/cart/api';
import { AddToCartControl } from '@/features/cart/components/AddToCartControl';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

/** Cart grouped by store: each store becomes one delivery (sub-order). */
export default function CartScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('cart.title')} message={t('guest.cart')} />;
  return <Cart />;
}

function Cart() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetCartQuery();
  const [clearCart, clearState] = useClearCartMutation();
  const [confirmClear, setConfirmClear] = useState(false);

  const groups = data?.groupedByVendor ?? [];
  const unavailable = data?.unavailableItems ?? [];
  const closedStores = groups.filter((g) => !g.isOpen);
  const empty = !isLoading && groups.length === 0 && unavailable.length === 0;

  const onClear = async () => {
    try {
      await clearCart().unwrap();
      setConfirmClear(false);
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader
          title={data?.totalItems ? t('cart.titleCount', { count: data.totalItems }) : t('cart.title')}
          right={
            groups.length > 0 || unavailable.length > 0 ? (
              <HeaderIconButton icon="trash-2" label={t('cart.clear')} onPress={() => setConfirmClear(true)} />
            ) : undefined
          }
        />
      </View>

      {isLoading ? (
        <View style={[styles.inner, styles.gap]}>
          <Skeleton height={140} radius={Radius.lg} />
          <Skeleton height={140} radius={Radius.lg} />
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : empty ? (
        <EmptyState
          icon="shopping-cart"
          title={t('cart.emptyTitle')}
          message={t('cart.emptyText')}
          actionLabel={t('cart.startShopping')}
          onAction={() => router.replace('/home')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.inner, styles.content]}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
            {groups.length > 1 && <Banner tone="info" message={t('cart.multiStore', { count: groups.length })} />}
            {groups.map((g) => (
              <StoreGroup key={g.vendorId} group={g} />
            ))}
            {unavailable.length > 0 && <UnavailableItems items={unavailable} />}
            {groups.length > 0 && <AlsoBought groups={groups} />}
          </ScrollView>

          {groups.length > 0 && (
            <View style={[styles.inner, styles.footer]}>
              {closedStores.length > 0 && (
                <Banner tone="warning" message={t('cart.closedBlocksCheckout', { stores: closedStores.map((s) => s.storeName).join(', ') })} />
              )}
              <View style={styles.row}>
                <AppText variant="body" color={Colors.textMuted} style={styles.flex}>
                  {t('cart.subtotal')}
                </AppText>
                <Money value={data?.subtotal ?? 0} variant="h3" />
              </View>
              <AppText variant="caption" color={Colors.textMuted}>
                {t('cart.feesAtCheckout')}
              </AppText>
              <Button
                title={t('cart.checkout')}
                icon="arrow-right"
                disabled={closedStores.length > 0}
                onPress={() => router.push('/checkout')}
              />
            </View>
          )}
        </>
      )}

      <ConfirmDialog
        visible={confirmClear}
        icon="trash-2"
        destructive
        title={t('cart.clearTitle')}
        message={t('cart.clearMessage')}
        confirmLabel={t('cart.clear')}
        loading={clearState.isLoading}
        onConfirm={() => void onClear()}
        onCancel={() => setConfirmClear(false)}
      />
    </SafeAreaView>
  );
}

function StoreGroup({ group }: { group: CartStoreGroup }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push({ pathname: '/store/[id]', params: { id: group.vendorId } })}
        accessibilityRole="button"
        style={styles.storeRow}>
        <View style={styles.logo}>
          {group.logo ? (
            <Image source={img(group.logo, 'thumb')} style={styles.logoImg} contentFit="cover" />
          ) : (
            <Feather name="shopping-bag" size={18} color={Colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={1}>
            {group.storeName}
          </AppText>
          <AppText variant="caption" color={group.isOpen ? Colors.textMuted : Colors.danger}>
            {group.isOpen ? t('cart.storeItems', { count: group.itemCount }) : t('catalog.storeClosed')}
          </AppText>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
      </Pressable>

      {group.items.map((item) => (
        <View key={item._id} style={styles.item}>
          <Pressable
            onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.productId } })}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={styles.thumb}>
            {item.image ? <Image source={img(item.image, 'thumb')} style={styles.thumbImg} contentFit="cover" /> : null}
          </Pressable>
          <View style={[styles.flex, styles.itemText]}>
            <AppText variant="bodyMedium" numberOfLines={2}>
              {item.name}
            </AppText>
            <Money
              value={item.effectivePrice}
              compareAt={item.effectivePrice < item.price ? item.price : undefined}
              variant="smallMedium"
            />
            {item.qty >= item.stockQty && (
              <AppText variant="caption" color={Colors.warningText}>
                {t('cart.maxStock', { count: item.stockQty })}
              </AppText>
            )}
          </View>
          <View style={styles.stepper}>
            <AddToCartControl productId={item.productId} maxQty={item.stockQty} compact />
            <AppText variant="smallMedium" align="right">
              {formatGNF(item.lineTotal)}
            </AppText>
          </View>
        </View>
      ))}

      <View style={[styles.row, styles.storeTotal]}>
        <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
          {t('cart.storeSubtotal')}
        </AppText>
        <AppText variant="title">{formatGNF(group.subtotal)}</AppText>
      </View>
    </View>
  );
}

const SUGGESTION_WIDTH = 156;

/** "Customers also bought" — from the server; nothing shown when it has nothing to say. */
function AlsoBought({ groups }: { groups: CartStoreGroup[] }) {
  const { t } = useTranslation();
  const inCart = new Set(groups.flatMap((g) => g.items.map((i) => i.productId)));
  const key = [...inCart].sort().join(',');
  const { data } = useGetCartSuggestionsQuery(key);
  // Just added from here: hide it until the new list arrives
  const products = (data ?? []).filter((p) => !inCart.has(p._id));
  if (products.length === 0) return null;
  return (
    <View style={styles.gap}>
      <AppText variant="title">{t('cart.alsoBought')}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
        {products.map((p) => (
          <ProductCard key={p._id} product={p} width={SUGGESTION_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

function UnavailableItems({ items }: { items: CartItem[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [update, { isLoading }] = useUpdateCartQtyMutation();
  const remove = (productId: string) =>
    update({ productId, qty: 0 })
      .unwrap()
      .catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'));

  return (
    <View style={styles.card}>
      <AppText variant="title">{t('cart.unavailableTitle')}</AppText>
      <AppText variant="small" color={Colors.textMuted}>
        {t('cart.unavailableText')}
      </AppText>
      {items.map((item) => (
        <View key={item._id} style={[styles.item, styles.dim]}>
          <View style={styles.thumb}>{item.image ? <Image source={img(item.image, 'thumb')} style={styles.thumbImg} contentFit="cover" /> : null}</View>
          <AppText variant="body" numberOfLines={2} style={styles.flex}>
            {item.name}
          </AppText>
          <Button title={t('cart.remove')} variant="outline" size="sm" disabled={isLoading} onPress={() => void remove(item.productId)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  gap: { gap: Spacing.md },
  hList: { gap: Spacing.md, paddingRight: Spacing.xl },
  flex: { flex: 1 },
  content: { gap: Spacing.lg, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 40, height: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  itemText: { gap: 2 },
  thumb: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' },
  thumbImg: { width: 64, height: 64 },
  stepper: { width: 108, gap: Spacing.xs },
  storeTotal: { paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  dim: { opacity: 0.7 },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});
