import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Tone = 'danger' | 'success' | 'info' | 'warning';

const tones: Record<Tone, { bg: string; fg: string; icon: ComponentProps<typeof Feather>['name'] }> = {
  danger: { bg: Colors.dangerSoft, fg: Colors.danger, icon: 'alert-circle' },
  success: { bg: Colors.successSoft, fg: Colors.success, icon: 'check-circle' },
  info: { bg: Colors.infoSoft, fg: Colors.info, icon: 'info' },
  warning: { bg: Colors.warningSoft, fg: Colors.warningText, icon: 'alert-triangle' },
};

/** Inline message box (form errors, notices). Announced to screen readers. */
export function Banner({ tone = 'danger', message }: { tone?: Tone; message?: string | null }) {
  if (!message) return null;
  const c = tones[tone];
  return (
    <View style={[styles.box, { backgroundColor: c.bg }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Feather name={c.icon} size={18} color={c.fg} style={styles.icon} />
      <AppText variant="small" color={c.fg} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'flex-start',
  },
  icon: { marginTop: 1 },
  text: { flex: 1 },
});
