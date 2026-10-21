import Feather from '@expo/vector-icons/Feather';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Spacing } from '@/constants/theme';
import { isOffline } from '@/lib/network';

const BACK_ONLINE_MS = 2500;

/**
 * A thin strip above every screen while there is no internet, then "Back online" for a moment.
 * It sits outside the screens' safe area (see the root layout), so nothing is covered.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = NetInfo.addEventListener((s) => {
      clearTimeout(timer);
      if (isOffline(s)) return setState('offline');
      setState((prev) => (prev === 'offline' ? 'back' : prev === 'back' ? 'back' : 'online'));
      timer = setTimeout(() => setState('online'), BACK_ONLINE_MS);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);

  if (state === 'online') return null;
  const offline = state === 'offline';
  return (
    <View
      style={[styles.strip, { paddingTop: insets.top + Spacing.xs }, offline ? styles.offline : styles.back]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Feather name={offline ? 'wifi-off' : 'wifi'} size={14} color={offline ? Colors.danger : Colors.success} />
      <AppText variant="smallMedium" color={offline ? Colors.danger : Colors.success}>
        {offline ? t('network.offline') : t('network.back')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingBottom: Spacing.xs },
  offline: { backgroundColor: Colors.dangerSoft },
  back: { backgroundColor: Colors.successSoft },
});
