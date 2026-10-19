import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** "Popular products    See all ›" */
export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <AppText variant="h3" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {onSeeAll && (
        <Pressable
          onPress={onSeeAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.seeAll')} — ${title}`}
          style={styles.link}>
          <AppText variant="smallMedium" color={Colors.primary}>
            {t('common.seeAll')}
          </AppText>
          <Feather name="chevron-right" size={16} color={Colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  title: { flex: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
