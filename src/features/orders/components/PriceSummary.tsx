import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

/**
 * Subtotal · Delivery · Tax (hidden at 0) · Platform fee · Total — always the
 * server's numbers (checkout summary or the order itself).
 */
export function PriceSummary({
  pricing,
  storeCount,
  split,
}: {
  pricing: { subtotal: number; deliveryFee: number; taxAmount: number; platformFee: number; discount: number; total: number };
  storeCount?: number;
  /** Cash on delivery: the fees paid online (now, or already) and the products in cash */
  split?: { online: number; cash: number; paid?: boolean };
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.box}>
      <Line label={t('checkout.subtotal')} value={pricing.subtotal} />
      <Line
        label={storeCount && storeCount > 1 ? t('checkout.deliveryStores', { count: storeCount }) : t('checkout.delivery')}
        value={pricing.deliveryFee}
      />
      {pricing.taxAmount > 0 && <Line label={t('checkout.tax')} value={pricing.taxAmount} />}
      <Line label={t('checkout.platformFee')} value={pricing.platformFee} />
      {pricing.discount > 0 && <Line label={t('checkout.discount')} value={-pricing.discount} />}
      <View style={styles.divider} />
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex}>
          {t('checkout.total')}
        </AppText>
        <AppText variant="h3" color={Colors.primary}>
          {formatGNF(pricing.total)}
        </AppText>
      </View>
      {split && (
        <View style={styles.split}>
          <Line label={split.paid ? t('checkout.feesPaid') : t('checkout.payNowFees')} value={split.online} />
          <Line label={t('checkout.payCash')} value={split.cash} />
        </View>
      )}
    </View>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" color={Colors.textMuted} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyMedium">{formatGNF(value)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  split: { gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
});
