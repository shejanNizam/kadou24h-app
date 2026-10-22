import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';

/**
 * Client rule (2026-10-22): payments are made outside Kadou24h, so every step shows
 * that Kadou24h does not guarantee them, plus the advice for that step.
 *  - book / confirm: the customer, before booking and before confirming the job
 *  - accept / register / complete: the worker
 */
export type SafetyStep = 'book' | 'confirm' | 'accept' | 'register' | 'complete';

export function SafetyNotice({ step, compact }: { step: SafetyStep; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.box, compact && styles.compact]} accessibilityRole="alert">
      <Feather name="shield" size={18} color={Colors.warningText} style={styles.icon} />
      <View style={styles.flex}>
        <AppText variant="smallMedium" color={Colors.warningText}>
          {t('booking.safety.title')}
        </AppText>
        <AppText variant="small" color={Colors.warningText}>
          {t(`booking.safety.${step}`)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
    alignItems: 'flex-start',
  },
  compact: { padding: Spacing.sm },
  icon: { marginTop: 2 },
  flex: { flex: 1, gap: 2 },
});
