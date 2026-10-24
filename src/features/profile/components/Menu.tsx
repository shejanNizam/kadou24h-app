import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';

// Feather has no motorcycle: "motorbike" comes from MaterialCommunityIcons (moto-taxi rows)
type Icon = ComponentProps<typeof Feather>['name'] | 'motorbike';

/** A titled group of rows (one bordered card). */
export function MenuSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title && (
        <AppText variant="smallMedium" color={Colors.textMuted} style={styles.title} accessibilityRole="header">
          {title}
        </AppText>
      )}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** One settings row: icon · label (· value) · chevron or a right element. */
export function MenuRow({
  icon,
  label,
  value,
  onPress,
  danger,
  right,
  last,
}: {
  icon: Icon;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  last?: boolean;
}) {
  const color = danger ? Colors.danger : Colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && onPress && styles.pressed]}>
      <View style={[styles.icon, danger && styles.iconDanger]}>
        {icon === 'motorbike' ? (
          <MaterialCommunityIcons name="motorbike" size={20} color={danger ? Colors.danger : Colors.primary} />
        ) : (
          <Feather name={icon} size={18} color={danger ? Colors.danger : Colors.primary} />
        )}
      </View>
      <AppText variant="bodyMedium" color={color} style={styles.flex} numberOfLines={1}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="small" color={Colors.textMuted} numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {right ?? (onPress && !danger ? <Feather name="chevron-right" size={18} color={Colors.textSubtle} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  title: { marginLeft: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingHorizontal: Spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  pressed: { backgroundColor: Colors.surface },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: Colors.dangerSoft },
  flex: { flex: 1 },
  value: { maxWidth: '45%' },
});
