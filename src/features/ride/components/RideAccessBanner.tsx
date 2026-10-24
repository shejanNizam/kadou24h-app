import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { useGetRiderAccessQuery } from '../api';

const DAY_MS = 86_400_000;
const WARN_DAYS = 5;

export const openRidePlans = () => router.push({ pathname: '/subscriptions', params: { audience: 'moto_driver' } });

/**
 * Moto rider, "Near me": nothing while rides are free. Once Kadou24h requires a
 * subscription: a warning when it ended (deliveries still come, passengers don't),
 * a reminder in the last days, else one quiet line with the end date.
 */
export function RideAccessBanner() {
  const { t, i18n } = useTranslation();
  const { data: access } = useGetRiderAccessQuery(undefined, { refetchOnFocus: true });
  const [now] = useState(Date.now);
  if (!access?.required) return null;

  const until = access.until ? new Date(access.until) : null;
  const date = until?.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) ?? '';
  const daysLeft = until ? Math.ceil((until.getTime() - now) / DAY_MS) : 0;

  if (!access.allowed) {
    return (
      <View style={[styles.card, styles.ended]}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="motorbike" size={20} color={Colors.danger} />
          <AppText variant="title" style={styles.flex}>
            {t('ride.access.endedTitle')}
          </AppText>
        </View>
        <AppText variant="small" color={Colors.textMuted}>
          {t('ride.access.endedText')}
        </AppText>
        <Button title={t('ride.access.choose')} size="sm" onPress={openRidePlans} />
      </View>
    );
  }

  if (until && daysLeft <= WARN_DAYS) {
    return (
      <View style={[styles.card, styles.soon]}>
        <AppText variant="smallMedium">{t('ride.access.endsSoon', { count: Math.max(daysLeft, 0), date })}</AppText>
        <Button title={t('ride.access.extend')} size="sm" variant="outline" onPress={openRidePlans} />
      </View>
    );
  }

  return (
    <AppText variant="caption" color={Colors.textMuted} onPress={openRidePlans} accessibilityRole="link">
      {until ? t('ride.access.activeUntil', { date }) : t('ride.access.trialNext', { count: access.trialDays })}
    </AppText>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  ended: { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger },
  soon: { backgroundColor: Colors.warningSoft, borderColor: Colors.warning },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
