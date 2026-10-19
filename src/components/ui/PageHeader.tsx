import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** Large title at the top of a tab screen, with optional right-side actions. */
export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="h2" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.md },
  title: { flex: 1 },
});
