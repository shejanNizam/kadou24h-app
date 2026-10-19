import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** A line, or "—— or ——" when given a label. */
export function Divider({ label }: { label?: string }) {
  if (!label) return <View style={styles.line} />;
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <AppText variant="small" color={Colors.textMuted}>
        {label}
      </AppText>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});
