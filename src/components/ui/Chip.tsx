import { Pressable, StyleSheet } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** Pill filter / choice. Selected = purple. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: Boolean(selected) } : undefined}
      style={({ pressed }) => [styles.chip, selected && styles.on, pressed && styles.pressed]}>
      <AppText variant="smallMedium" color={selected ? Colors.textOnPrimary : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Non-interactive soft tag (features, skills). */
export function Tag({ label }: { label: string }) {
  return (
    <AppText variant="caption" color={Colors.primary} style={styles.tag}>
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressed: { opacity: 0.85 },
  tag: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
});
