import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

/** Ride prices move in steps of 500 GNF (server rule) */
export const PRICE_STEP = 500;

/** − price + between min and max, in steps of 500 GNF */
export function PriceStepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value, text: formatGNF(value) }}>
      <StepButton icon="minus" label={t('ride.bid.less')} disabled={value <= min} onPress={() => step(-PRICE_STEP)} />
      <AppText variant="h3" color={Colors.primary} style={styles.value}>
        {formatGNF(value)}
      </AppText>
      <StepButton icon="plus" label={t('ride.bid.more')} disabled={value >= max} onPress={() => step(PRICE_STEP)} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}>
      <Feather name={icon} size={20} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  value: { flex: 1, textAlign: 'center' },
  button: {
    width: MinTouch,
    height: MinTouch,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
