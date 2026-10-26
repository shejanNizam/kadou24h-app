import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { safetyIdsNeeded, type MyRider } from '../types';

/**
 * A moto-taxi approved before plate and vest became required: no passengers until
 * both are filled in (deliveries keep coming).
 */
export function SafetyIdsBanner({ rider }: { rider: MyRider }) {
  const { t } = useTranslation();
  const needs = safetyIdsNeeded(rider.partnerType, rider.vehicle?.type);
  const missing = (needs.plate && !rider.vehicle?.plateNumber) || (needs.vest && !rider.vestNumber);
  if (!missing) return null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.danger} />
        <AppText variant="title" style={styles.flex}>
          {t('rider.safetyIds.title')}
        </AppText>
      </View>
      <AppText variant="small" color={Colors.textMuted}>
        {t('rider.safetyIds.text')}
      </AppText>
      <Button title={t('rider.safetyIds.action')} size="sm" onPress={() => router.push('/rider/vehicle')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: Colors.dangerSoft, borderColor: Colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
