import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

/**
 * Station relay: the code I show to the next driver, who types it on their
 * phone to take the parcel; that one code ends my leg (client, 2026-10-30).
 * Big digits, readable at arm's length.
 */
export function ShowCode({ code, title, hint }: { code: string; title: string; hint: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}: ${code.split('').join(' ')}`}>
      <View style={styles.row}>
        <Feather name="eye" size={16} color={Colors.primary} />
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
      </View>
      <View style={styles.digits}>
        {code.split('').map((digit, i) => (
          <View key={i} style={styles.digit}>
            <AppText style={styles.digitText}>{digit}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="small" color={Colors.textMuted} align="center">
        {hint}
      </AppText>
      <AppText variant="caption" color={Colors.textSubtle} align="center">
        {t('relay.inPerson')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primaryBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  digit: { width: 52, height: 64, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  digitText: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38, color: Colors.primary },
});
