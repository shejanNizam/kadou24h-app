import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMyRiderQuery, useUpdateMyRiderMutation } from '@/features/rider/api';
import { RoutesEditor, routesFrom, routesPayload, type RouteDraft } from '@/features/rider/components/RoutesEditor';
import type { MyRider } from '@/features/rider/types';
import { getApiErrorMessage } from '@/lib/api/errors';

/**
 * My vehicle, work area and (bus drivers) routes, editable; my identity as approved
 * (read-only: partner type, ID number and documents need support to change).
 */
export default function RiderVehicleScreen() {
  const { t } = useTranslation();
  const { data: rider, isLoading, isError, error, refetch } = useGetMyRiderQuery();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('rider.vehicleTitle')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError || !rider ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <VehicleForm rider={rider} />
      )}
    </SafeAreaView>
  );
}

function VehicleForm({ rider }: { rider: MyRider }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [brand, setBrand] = useState(rider.vehicle?.brand ?? '');
  const [color, setColor] = useState(rider.vehicle?.color ?? '');
  const [plate, setPlate] = useState(rider.vehicle?.plateNumber ?? '');
  const [vest, setVest] = useState(rider.vestNumber ?? '');
  const [cityArea, setCityArea] = useState(rider.cityArea ?? '');
  const bus = rider.partnerType === 'transit';
  const [routes, setRoutes] = useState<RouteDraft[]>(() => routesFrom(rider.transitRoutes));
  const [routesError, setRoutesError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [update, { isLoading }] = useUpdateMyRiderMutation();

  const save = async () => {
    setError(null);
    if (cityArea.trim().length < 2) return setError(t('kycRider.cityRequired'));
    // Bus drivers: stores pick drivers by route
    const payload = bus ? routesPayload(routes) : null;
    setRoutesError(payload?.error ? t(`kycRider.${payload.error}`) : undefined);
    if (payload?.error) return;
    try {
      await update({
        vehicle: { brand: brand.trim(), color: color.trim(), plateNumber: plate.trim().toUpperCase() },
        vestNumber: vest.trim(),
        cityArea: cityArea.trim(),
        ...(payload && { transitRoutes: payload.routes }),
      }).unwrap();
      toast.show(t('common.saved'), 'success');
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  const idMasked = rider.nationalIdNumber ? `•••• ${rider.nationalIdNumber.slice(-4)}` : '—';
  return (
    <>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <View style={styles.card}>
          <AppText variant="title">{t('rider.identity')}</AppText>
          <Line label={t('kycRider.partnerLabel')} value={rider.partnerType ? t(`kycRider.partner.${rider.partnerType}`) : '—'} />
          <Line label={t('kycRider.vehicleType')} value={rider.vehicle?.type ? t(`vehicle.${rider.vehicle.type}`) : '—'} />
          <Line label={t('kycRider.nationalId')} value={idMasked} />
          {rider.documents.map((d) => (
            <View key={d._id} style={styles.row}>
              <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
                {t(`kycRider.doc.${d.type}`)}
              </AppText>
              <StatusPill label={t(`kycRider.docStatus.${d.status}`)} tone={d.status === 'verified' ? 'green' : d.status === 'rejected' ? 'red' : 'amber'} />
            </View>
          ))}
          <AppText variant="caption" color={Colors.textSubtle}>
            {t('rider.identityLocked')}
          </AppText>
        </View>

        <Banner tone="danger" message={error} />
        <TextField label={t('kycRider.brand')} optional value={brand} onChangeText={setBrand} maxLength={40} />
        <TextField label={t('kycRider.color')} optional value={color} onChangeText={setColor} maxLength={30} />
        <TextField label={t('kycRider.plate')} optional value={plate} onChangeText={setPlate} autoCapitalize="characters" maxLength={20} />
        {rider.partnerType !== 'transit' && <TextField label={t('kycRider.vest')} optional value={vest} onChangeText={setVest} maxLength={20} />}
        <TextField label={t('kycRider.cityArea')} hint={t('kycRider.cityAreaHint')} value={cityArea} onChangeText={setCityArea} maxLength={80} />
        {bus && (
          <>
            <AppText variant="title">{t('kycRider.steps.routes')}</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kycRider.routesHint')}
            </AppText>
            <RoutesEditor routes={routes} onChange={setRoutes} error={routesError} />
          </>
        )}
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('common.save')} loading={isLoading} onPress={() => void save()} />
      </View>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="smallMedium">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  footer: { paddingVertical: Spacing.md },
});
