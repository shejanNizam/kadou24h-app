import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface OptionCardProps {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  selected: boolean;
  onPress: () => void;
  /** Greyed out and not selectable (the description says why) */
  disabled?: boolean;
}

/** Selectable card (language, partner type, payout type…). Radio semantics. */
export function OptionCard({ title, description, icon, selected, onPress, disabled }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}>
      {icon && (
        <View style={[styles.icon, selected && styles.iconSelected]}>
          <Feather name={icon} size={18} color={selected ? Colors.textOnPrimary : Colors.primary} />
        </View>
      )}
      <View style={styles.text}>
        <AppText variant="title">{title}</AppText>
        {description && (
          <AppText variant="small" color={Colors.textMuted}>
            {description}
          </AppText>
        )}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.dot} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.55 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: { backgroundColor: Colors.primary },
  text: { flex: 1, gap: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
