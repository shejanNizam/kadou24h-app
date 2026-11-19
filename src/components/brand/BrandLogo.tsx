import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const logoWhite = require('../../../assets/logo/logo-white.png');
const logoColor = require('../../../assets/logo/logo-color.png');

// Both files are 1200x1072, trimmed with the same even padding
const LOGO_ASPECT_RATIO = 1200 / 1072;

export interface BrandLogoProps {
  /** Logo height in density-independent pixels. Default: 80. */
  size?: number;
  /** 'white' for dark/gradient backgrounds, 'color' for light backgrounds. Default: 'white'. */
  variant?: 'white' | 'color';
  style?: StyleProp<ViewStyle>;
}

export function BrandLogo({ size = 80, variant = 'white', style }: BrandLogoProps) {
  const height = size;
  const width = Math.round(size * LOGO_ASPECT_RATIO);
  const source = variant === 'color' ? logoColor : logoWhite;

  return (
    <View style={[styles.container, style]} accessibilityRole="image" accessibilityLabel="Kadou24h">
      <Image
        source={source}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
