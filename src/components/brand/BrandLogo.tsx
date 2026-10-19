import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Colors, Spacing } from '@/constants/theme';

/**
 * TEMPORARY logo (icon + wordmark) until the real KADOU 24H logo is exported
 * from the Figma (SVG or 512px PNG) — then swap this body for an <Image>.
 */
export function BrandLogo({ size = 96, color = Colors.textOnPrimary }: { size?: number; color?: string }) {
  return (
    <View style={styles.container} accessibilityRole="image" accessibilityLabel="Kadou24h">
      <MaterialCommunityIcons name="home-heart" size={size} color={color} />
      <AppText variant="h2" color={color} style={styles.wordmark}>
        KADOU 24H
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.xs },
  wordmark: { letterSpacing: 1 },
});
