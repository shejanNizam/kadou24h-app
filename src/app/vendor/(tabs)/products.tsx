import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/ui/AppText";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Money } from "@/components/ui/Money";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import {
  Colors,
  MaxContentWidth,
  MinTouch,
  Radius,
  Spacing,
} from "@/constants/theme";
import {
  useGetMyProductsInfiniteQuery,
  useUpdateStockMutation,
} from "@/features/vendor/api";
import { PRODUCT_APPROVAL_TONE, isLowStock } from "@/features/vendor/status";
import type { MyProduct, ProductsTab } from "@/features/vendor/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { img } from "@/lib/image";

const TABS: ProductsTab[] = ["all", "active", "in_review", "out_of_stock"];

/** My products: approval state, stock and "available for sale" at a glance. */
export default function VendorProductsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ProductsTab>("all");
  const [stockFor, setStockFor] = useState<MyProduct | null>(null);
  const result = useGetMyProductsInfiniteQuery(tab);
  const products = result.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
            {t("tabs.products")}
          </AppText>
          <Button
            title={t("products.add")}
            icon="plus"
            size="sm"
            onPress={() => router.push("/vendor/product-edit")}
          />
        </View>
        <SegmentTabs
          tabs={TABS.map((key) => ({ key, label: t(`products.tab.${key}`) }))}
          value={tab}
          onChange={setTab}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => (
          <ProductRow product={item} onStock={() => setStockFor(item)} />
        )}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={
          <RefreshControl
            refreshing={
              result.isFetching &&
              !result.isLoading &&
              !result.isFetchingNextPage
            }
            onRefresh={() => void result.refetch()}
          />
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              <Skeleton height={96} radius={Radius.lg} />
              <Skeleton height={96} radius={Radius.lg} />
            </View>
          ) : result.isError ? (
            <ErrorState
              error={result.error}
              onRetry={() => void result.refetch()}
            />
          ) : (
            <EmptyState
              icon="package"
              title={t(`products.empty.${tab}`)}
              message={tab === "all" ? t("products.emptyText") : undefined}
              actionLabel={tab === "all" ? t("products.addFirst") : undefined}
              onAction={
                tab === "all"
                  ? () => router.push("/vendor/product-edit")
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          result.isFetchingNextPage ? (
            <ActivityIndicator color={Colors.primary} />
          ) : undefined
        }
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage)
            void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />

      <StockSheet product={stockFor} onClose={() => setStockFor(null)} />
    </SafeAreaView>
  );
}

function ProductRow({
  product: p,
  onStock,
}: {
  product: MyProduct;
  onStock: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateStock, { isLoading }] = useUpdateStockMutation();
  const soldOut = p.stockQty === 0;

  const toggle = async (isAvailable: boolean) => {
    try {
      await updateStock({ id: p._id, isAvailable }).unwrap();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), "danger");
    }
  };

  // The card is a View: on web a button can't hold the stock button and the switch.
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/vendor/product-edit",
            params: { id: p._id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={p.name}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={styles.thumb}>
            {p.images[0] ? (
              <Image
                source={img(p.images[0].url, "thumb")}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyMedium" numberOfLines={2}>
              {p.name}
            </AppText>
            <Money
              value={p.discountPrice ?? p.price}
              compareAt={p.discountPrice ? p.price : undefined}
              variant="smallMedium"
            />
            <View style={styles.pills}>
              <StatusPill
                label={t(`products.approval.${p.approvalStatus}`)}
                tone={PRODUCT_APPROVAL_TONE[p.approvalStatus]}
              />
              {soldOut ? (
                <StatusPill label={t("products.soldOut")} tone="red" />
              ) : isLowStock(p) ? (
                <StatusPill label={t("products.lowStock")} tone="orange" />
              ) : null}
            </View>
          </View>
        </View>

        {p.approvalStatus === "rejected" && p.adminReviewNote ? (
          <View style={styles.rejected}>
            <Feather name="alert-circle" size={14} color={Colors.danger} />
            <AppText
              variant="caption"
              color={Colors.danger}
              style={styles.flex}
            >
              {p.adminReviewNote}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      <View style={[styles.row, styles.footerRow]}>
        <Pressable
          onPress={onStock}
          accessibilityRole="button"
          accessibilityLabel={t("products.editStock")}
          style={styles.stock}
        >
          <Feather name="layers" size={14} color={Colors.primary} />
          <AppText variant="smallMedium" color={Colors.primary}>
            {t("products.stock", { count: p.stockQty })}
          </AppText>
        </Pressable>
        <View style={styles.flex} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t("products.forSale")}
        </AppText>
        <Switch
          value={p.isAvailable}
          onValueChange={(v) => void toggle(v)}
          disabled={isLoading}
          trackColor={{ true: Colors.primary, false: Colors.border }}
          accessibilityLabel={t("products.forSale")}
        />
      </View>
    </View>
  );
}

/** Quick stock edit: − / + or type the count, and the low-stock alert level. */
function StockSheet({
  product,
  onClose,
}: {
  product: MyProduct | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [qty, setQty] = useState("");
  const [alertAt, setAlertAt] = useState("");
  const [updateStock, { isLoading }] = useUpdateStockMutation();

  const onShow = () => {
    setQty(String(product?.stockQty ?? 0));
    setAlertAt(String(product?.minStockAlert ?? 0));
  };
  const n = Math.max(0, Number.parseInt(qty, 10) || 0);

  const save = async () => {
    if (!product) return;
    try {
      await updateStock({
        id: product._id,
        stockQty: n,
        minStockAlert: Math.max(0, Number.parseInt(alertAt, 10) || 0),
      }).unwrap();
      toast.show(t("products.stockSaved"), "success");
      onClose();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), "danger");
    }
  };

  return (
    <BottomSheet
      visible={Boolean(product)}
      title={product?.name ?? ""}
      onClose={onClose}
      onShow={onShow}
      footer={
        <Button
          title={t("common.save")}
          loading={isLoading}
          onPress={() => void save()}
        />
      }
    >
      <AppText variant="label">{t("products.stockQty")}</AppText>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => setQty(String(Math.max(0, n - 1)))}
          accessibilityRole="button"
          accessibilityLabel="−"
          style={styles.stepBtn}
        >
          <Feather name="minus" size={20} color={Colors.primary} />
        </Pressable>
        <View style={styles.flex}>
          <TextField
            value={qty}
            onChangeText={(v) => setQty(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            style={styles.stepInput}
            accessibilityLabel={t("products.stockQty")}
          />
        </View>
        <Pressable
          onPress={() => setQty(String(n + 1))}
          accessibilityRole="button"
          accessibilityLabel="+"
          style={styles.stepBtn}
        >
          <Feather name="plus" size={20} color={Colors.primary} />
        </Pressable>
      </View>
      <TextField
        label={t("products.minStockAlert")}
        hint={t("products.minStockAlertHint")}
        value={alertAt}
        onChangeText={(v) => setAlertAt(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardMain: { gap: Spacing.md },
  pressed: { opacity: 0.9 },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  flex: { flex: 1 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  rejected: {
    flexDirection: "row",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  footerRow: { gap: Spacing.sm },
  stock: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: MinTouch - 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stepBtn: {
    width: MinTouch,
    height: MinTouch,
    borderRadius: MinTouch / 2,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInput: { textAlign: "center" },
});
