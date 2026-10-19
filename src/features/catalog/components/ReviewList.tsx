import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Stars } from '@/components/ui/Rating';
import { Colors, Radius, Spacing } from '@/constants/theme';

import type { Review } from '../types';

const authorName = (r: Review) => (typeof r.customerId === 'object' && r.customerId ? r.customerId.name : '');

/** Latest reviews, or a clear "no reviews yet" (never placeholder reviews). */
export function ReviewList({ reviews, total }: { reviews: Review[]; total: number }) {
  const { t, i18n } = useTranslation();
  if (total === 0) {
    return (
      <AppText variant="small" color={Colors.textMuted}>
        {t('catalog.noReviews')}
      </AppText>
    );
  }
  return (
    <View style={styles.list}>
      {reviews.map((r) => (
        <View key={r._id} style={styles.item}>
          <View style={styles.row}>
            <AppText variant="smallMedium" style={styles.flex} numberOfLines={1}>
              {authorName(r) || t('catalog.customer')}
            </AppText>
            <Stars value={r.rating} size={12} />
          </View>
          {r.comment ? <AppText variant="small">{r.comment}</AppText> : null}
          <AppText variant="caption" color={Colors.textSubtle}>
            {new Date(r.createdAt).toLocaleDateString(i18n.language)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  item: { gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
