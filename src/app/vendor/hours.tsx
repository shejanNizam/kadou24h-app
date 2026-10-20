import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGetMyStoreQuery, useUpdateAvailabilityMutation } from '@/features/vendor/api';
import { WEEK_DAYS, type MyStore, type WeekDay } from '@/features/vendor/types';
import { getApiErrorMessage } from '@/lib/api/errors';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "0830" → "08:30" while typing */
const asTime = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

/** Opening days and hours shown on the store page. */
export default function StoreHoursScreen() {
  const { data, isLoading, isError, error, refetch } = useGetMyStoreQuery();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError || !data ? (
        <>
          <View style={styles.inner}>
            <StackHeader />
          </View>
          <ErrorState error={error} onRetry={refetch} />
        </>
      ) : (
        <HoursForm store={data} />
      )}
    </SafeAreaView>
  );
}

function HoursForm({ store }: { store: MyStore }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [update, { isLoading }] = useUpdateAvailabilityMutation();
  const [enabled, setEnabled] = useState(store.availability.enabled);
  const [days, setDays] = useState<WeekDay[]>(store.availability.days);
  const [open, setOpen] = useState(store.availability.openTime);
  const [close, setClose] = useState(store.availability.closeTime);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: WeekDay) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));
  const badTime = !TIME.test(open) || !TIME.test(close) || open >= close;

  const save = async () => {
    setError(null);
    try {
      await update({ availability: { enabled, days: WEEK_DAYS.filter((d) => days.includes(d)), openTime: open, closeTime: close } }).unwrap();
      toast.show(t('account.saved'), 'success');
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={t('store.hours')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('store.hoursHint')}
        </AppText>
        <Banner tone="danger" message={error} />
        <View style={styles.switchRow}>
          <AppText variant="bodyMedium" style={styles.flex}>
            {t('store.useHours')}
          </AppText>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: Colors.primary, false: Colors.border }} accessibilityLabel={t('store.useHours')} />
        </View>
        {enabled && (
          <>
            <AppText variant="label">{t('store.days')}</AppText>
            <View style={styles.chips}>
              {WEEK_DAYS.map((d) => (
                <Chip key={d} label={t(`days.${d}`)} selected={days.includes(d)} onPress={() => toggleDay(d)} />
              ))}
            </View>
            <View style={styles.twoCols}>
              <View style={styles.flex}>
                <TextField label={t('store.opens')} value={open} onChangeText={(v) => setOpen(asTime(v))} keyboardType="number-pad" placeholder="08:00" maxLength={5} />
              </View>
              <View style={styles.flex}>
                <TextField label={t('store.closes')} value={close} onChangeText={(v) => setClose(asTime(v))} keyboardType="number-pad" placeholder="21:00" maxLength={5} />
              </View>
            </View>
            {badTime && (
              <AppText variant="caption" color={Colors.danger}>
                {t('store.badTime')}
              </AppText>
            )}
          </>
        )}
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('common.save')} loading={isLoading} disabled={enabled && (badTime || days.length === 0)} onPress={() => void save()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  twoCols: { flexDirection: 'row', gap: Spacing.md },
  footer: { paddingVertical: Spacing.md },
});
