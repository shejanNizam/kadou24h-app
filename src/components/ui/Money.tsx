import { StyleSheet, View } from 'react-native';

import { Colors, type TypographyVariant } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

import { AppText } from './AppText';

/** GNF amount; with `compareAt` shows the old price struck through (discount). */
export function Money({
  value,
  compareAt,
  variant = 'title',
  color = Colors.primary,
}: {
  value: number;
  compareAt?: number;
  variant?: TypographyVariant;
  color?: string;
}) {
  const discounted = compareAt !== undefined && compareAt > value;
  return (
    <View style={styles.row}>
      <AppText variant={variant} color={color}>
        {formatGNF(value)}
      </AppText>
      {discounted && (
        <AppText variant="caption" color={Colors.textSubtle} style={styles.old}>
          {formatGNF(compareAt)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 },
  old: { textDecorationLine: 'line-through' },
});
