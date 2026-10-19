import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { useCartLine } from '../useCartLine';

/**
 * Figma had a stepper AND "Add to cart" on every card. Here: one "Add" button
 * that turns into − qty + once the product is in the cart.
 */
export function AddToCartControl({
  productId,
  disabled,
  maxQty,
  compact,
}: {
  productId: string;
  disabled?: boolean;
  maxQty: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { qty, busy, add, increment, decrement } = useCartLine(productId);

  if (qty === 0) {
    return (
      <Pressable
        onPress={() => add()}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled || busy) }}
        style={({ pressed }) => [
          styles.add,
          compact && styles.compact,
          (disabled || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}>
        {busy ? (
          <ActivityIndicator size="small" color={Colors.textOnPrimary} />
        ) : (
          <>
            <Feather name="plus" size={14} color={Colors.textOnPrimary} />
            <AppText variant="smallMedium" color={Colors.textOnPrimary}>
              {t('cart.add')}
            </AppText>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <View style={[styles.stepper, compact && styles.compact]} accessibilityLabel={t('cart.inCart', { count: qty })}>
      <StepButton icon={qty === 1 ? 'trash-2' : 'minus'} onPress={decrement} disabled={busy} label={t('cart.decrease')} />
      <AppText variant="label" color={Colors.primary} style={styles.qty}>
        {qty}
      </AppText>
      <StepButton icon="plus" onPress={increment} disabled={busy || qty >= maxQty} label={t('cart.increase')} />
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: 'plus' | 'minus' | 'trash-2';
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.step, disabled && styles.disabled]}>
      <Feather name={icon} size={14} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: {
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  compact: { minHeight: 34 },
  stepper: {
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  step: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 20, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});
