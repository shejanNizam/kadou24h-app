import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

import { AppText } from './AppText';

/**
 * A small red counter (unread messages…), hidden at 0. `corner` pins it on the
 * top-right corner of its parent (the parent needs no extra style).
 */
export function CountBadge({ count, corner = false, style }: { count: number; corner?: boolean; style?: StyleProp<ViewStyle> }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, corner && styles.corner, style]} accessibilityElementsHidden importantForAccessibility="no">
      <AppText variant="caption" color={Colors.textOnPrimary} style={styles.text}>
        {count > 99 ? '99+' : count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', top: -6, right: -6, borderWidth: 2, borderColor: Colors.background, minWidth: 22, height: 22, borderRadius: 11 },
  text: { fontSize: 11, lineHeight: 14 },
});
