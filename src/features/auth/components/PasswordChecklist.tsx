import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Spacing } from '@/constants/theme';

import { passwordRules } from '../validation';

/** Live ✓ list under a new-password field, so people know the rule before submitting. */
export function PasswordChecklist({ value }: { value: string }) {
  const { t } = useTranslation();
  const items = [
    { ok: passwordRules.length(value), label: t('auth.rules.length') },
    { ok: passwordRules.letter(value), label: t('auth.rules.letter') },
    { ok: passwordRules.digit(value), label: t('auth.rules.digit') },
  ];

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.label} style={styles.row}>
          <Feather
            name={item.ok ? 'check-circle' : 'circle'}
            size={14}
            color={item.ok ? Colors.success : Colors.textSubtle}
          />
          <AppText variant="caption" color={item.ok ? Colors.success : Colors.textMuted}>
            {item.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.md, rowGap: Spacing.xs, marginTop: -Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
