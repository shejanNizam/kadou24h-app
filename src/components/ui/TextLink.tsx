import { Pressable, StyleSheet } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** Tappable inline text ("Forgot password?", "Sign up"). Generous hit area. */
export function TextLink({
  title,
  onPress,
  disabled,
  color = Colors.primary,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="link"
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dim]}>
      <AppText variant="smallMedium" color={disabled ? Colors.textSubtle : color}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { paddingVertical: Spacing.xs },
  dim: { opacity: 0.6 },
});
