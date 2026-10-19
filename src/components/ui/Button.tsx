import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Feather>['name'];
  /** e.g. a brand logo for social sign-in */
  leading?: ReactNode;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.primary, fg: Colors.textOnPrimary, border: Colors.primary },
  outline: { bg: Colors.background, fg: Colors.primary, border: Colors.primaryBorder },
  soft: { bg: Colors.primarySoft, fg: Colors.primary, border: Colors.primarySoft },
  ghost: { bg: 'transparent', fg: Colors.primary, border: 'transparent' },
  danger: { bg: Colors.danger, fg: Colors.textOnPrimary, border: Colors.danger },
};

/** Pill button from the Figma. Shows a spinner and blocks taps while loading. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  leading,
  size = 'md',
  style,
  accessibilityHint,
}: ButtonProps) {
  const colors = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        { backgroundColor: colors.bg, borderColor: colors.border },
        disabled && !loading && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <View style={styles.content}>
          {leading}
          {icon && <Feather name={icon} size={18} color={colors.fg} />}
          <AppText variant="button" color={colors.fg} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: MinTouch - 6, paddingHorizontal: Spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
