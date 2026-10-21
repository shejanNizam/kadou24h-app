import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getCurrentPosition } from '@/lib/location';

import { useGetMyRiderQuery, useSendLocationMutation, useSetOnlineMutation } from '../api';

/**
 * Online = stores can give me deliveries. Going online needs my position
 * (stores pick the nearest riders), so location permission comes first.
 */
export function OnlineToggle({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: rider } = useGetMyRiderQuery();
  const [setOnline, { isLoading }] = useSetOnlineMutation();
  const [sendLocation] = useSendLocationMutation();
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  if (!rider) return null;

  const online = rider.isOnline;
  const busy = isLoading || locating;

  const toggle = async (next: boolean) => {
    try {
      if (next) {
        setLocating(true);
        const here = await getCurrentPosition();
        setLocating(false);
        if (!here) {
          setDenied(true);
          return;
        }
        setDenied(false);
        await sendLocation(here).unwrap();
      }
      await setOnline(next).unwrap();
      toast.show(next ? t('rider.nowOnline') : t('rider.nowOffline'), next ? 'success' : 'info');
    } catch (e) {
      setLocating(false);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const control = busy ? (
    <ActivityIndicator color={Colors.primary} />
  ) : (
    <Switch
      value={online}
      onValueChange={(v) => void toggle(v)}
      trackColor={{ true: Colors.success, false: Colors.border }}
      accessibilityLabel={t('rider.onlineSwitch')}
    />
  );

  if (compact) {
    return (
      <View style={styles.compact}>
        <AppText variant="smallMedium" color={online ? Colors.success : Colors.textMuted}>
          {online ? t('rider.online') : t('rider.offline')}
        </AppText>
        {control}
      </View>
    );
  }

  return (
    <View style={[styles.card, online ? styles.cardOn : styles.cardOff]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: online ? Colors.success : Colors.textSubtle }]} />
        <View style={styles.flex}>
          <AppText variant="title">{online ? t('rider.online') : t('rider.offline')}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {online ? t('rider.onlineHint') : t('rider.offlineHint')}
          </AppText>
        </View>
        {control}
      </View>
      {denied && (
        <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" style={styles.denied}>
          <Feather name="map-pin" size={14} color={Colors.danger} />
          <AppText variant="caption" color={Colors.danger} style={styles.flex}>
            {t('rider.locationNeeded')}
          </AppText>
          <AppText variant="smallMedium" color={Colors.primary}>
            {t('rider.openSettings')}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  cardOn: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
  cardOff: { borderColor: Colors.border, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
  denied: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
});
