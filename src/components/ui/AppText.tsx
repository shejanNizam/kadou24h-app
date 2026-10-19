import { Text, type TextProps } from 'react-native';

import { Colors, Typography, type TypographyVariant } from '@/constants/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** All text in the app goes through this (DM Sans + the type scale). */
export function AppText({ variant = 'body', color = Colors.text, align, style, ...props }: AppTextProps) {
  return <Text {...props} style={[Typography[variant], { color }, align && { textAlign: align }, style]} />;
}
