import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';

import { AppText } from './AppText';

const STAR = '#F5A524';

/** "★ 4.8 (96)" — or "New" when nobody has rated yet (no invented ratings). */
export function Rating({ value, count, size = 'small' }: { value: number; count: number; size?: 'small' | 'medium' }) {
  const { t } = useTranslation();
  const variant = size === 'small' ? 'caption' : 'small';

  if (!count) {
    return (
      <AppText variant={variant} color={Colors.textMuted}>
        {t('catalog.noRating')}
      </AppText>
    );
  }
  return (
    <View style={styles.row} accessibilityLabel={t('catalog.ratingA11y', { value: value.toFixed(1), count })}>
      <Feather name="star" size={size === 'small' ? 12 : 14} color={STAR} />
      <AppText variant={variant}>{value.toFixed(1)}</AppText>
      <AppText variant={variant} color={Colors.textMuted}>
        ({count})
      </AppText>
    </View>
  );
}

/** Row of 5 stars for review lists. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather key={i} name="star" size={size} color={i <= Math.round(value) ? STAR : Colors.border} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
