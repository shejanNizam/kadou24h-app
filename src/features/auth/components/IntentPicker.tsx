import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Divider } from '@/components/ui/Divider';
import { Colors, Radius, Spacing } from '@/constants/theme';

import type { SignupIntent } from '../types';

/**
 * Figma: "or continue as [Vendor] [Rider]" under the sign-up form.
 * Optional toggle — tap again to go back to a plain customer account.
 */
export function IntentPicker({ value, onChange }: { value: SignupIntent; onChange: (v: SignupIntent) => void }) {
  const { t } = useTranslation();
  const options = [
    { key: 'vendor' as const, label: t('auth.register.vendor'), icon: 'shopping-bag' as const },
    { key: 'rider' as const, label: t('auth.register.rider'), icon: 'truck' as const },
  ];

  return (
    <View style={styles.wrapper}>
      <Divider label={t('auth.register.continueAs')} />
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = value === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(selected ? 'customer' : o.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}>
              <Feather name={selected ? 'check' : o.icon} size={16} color={selected ? Colors.textOnPrimary : Colors.primary} />
              <AppText variant="label" color={selected ? Colors.textOnPrimary : Colors.primary}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {value !== 'customer' && (
        <AppText variant="small" color={Colors.textMuted} align="center">
          {t(value === 'vendor' ? 'auth.register.intentVendorHint' : 'auth.register.intentRiderHint')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  chip: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressed: { opacity: 0.85 },
});
