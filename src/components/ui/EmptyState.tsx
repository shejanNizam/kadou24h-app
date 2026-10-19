import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ComponentProps<typeof Feather>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * One component for every empty / error / "sign in first" state.
 * (The Figma illustrations replace the icon once exported as assets.)
 */
export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={36} color={Colors.primary} />
      </View>
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {message && (
        <AppText variant="body" color={Colors.textMuted} align="center">
          {message}
        </AppText>
      )}
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  action: { alignSelf: 'stretch', marginTop: Spacing.md },
});
