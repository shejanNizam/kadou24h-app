import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';

import { AppText } from '@/components/ui/AppText';
import { TextLink } from '@/components/ui/TextLink';
import { useToast } from '@/components/ui/Toast';
import { Colors, Spacing } from '@/constants/theme';
import { Sentry } from '@/lib/sentry';

const TAPS_TO_UNLOCK = 7;

/**
 * The version line. Tapped 7 times it shows checks that Sentry receives reports. For the
 * team only, English on purpose: remove it once Sentry is confirmed (added 2026-10-31).
 */
export function VersionLine() {
  const toast = useToast();
  const [taps, setTaps] = useState(0);
  const sendError = () => {
    Sentry.captureException(new Error('Sentry test: JavaScript error'));
    toast.show('Test error sent', 'success');
  };
  const freeze = () => {
    const end = Date.now() + 8000;
    while (Date.now() < end);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setTaps((n) => n + 1)}>
        <AppText variant="caption" color={Colors.textSubtle} align="center">
          Kadou24h · v{Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
      </Pressable>
      {taps >= TAPS_TO_UNLOCK && (
        <>
          <TextLink title="Send a test error" onPress={sendError} />
          <TextLink title="Test freeze (8 s)" onPress={freeze} />
          <TextLink title="Test crash (closes the app)" onPress={() => Sentry.nativeCrash()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm },
});
