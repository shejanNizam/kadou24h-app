import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export type StatusTone = 'blue' | 'amber' | 'purple' | 'green' | 'red' | 'orange' | 'grey';

const tones: Record<StatusTone, { bg: string; fg: string }> = {
  blue: { bg: Colors.infoSoft, fg: Colors.info },
  amber: { bg: Colors.warningSoft, fg: Colors.warningText },
  purple: { bg: Colors.primarySoft, fg: Colors.primaryDark },
  green: { bg: Colors.successSoft, fg: Colors.success },
  red: { bg: Colors.dangerSoft, fg: Colors.danger },
  orange: { bg: '#FFEDD5', fg: '#C2410C' },
  grey: { bg: Colors.surface, fg: Colors.textMuted },
};

/** Coloured status label (colours: APP_SPEC §9). */
export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const c = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <AppText variant="caption" color={c.fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
