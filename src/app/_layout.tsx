import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { OfflineBanner } from '@/components/providers/OfflineBanner';
import { PushEffects } from '@/components/providers/PushEffects';
import { SessionEffects } from '@/components/providers/SessionEffects';
import { ToastProvider } from '@/components/ui/Toast';
import { Colors } from '@/constants/theme';
import { bootstrap } from '@/lib/bootstrap';
import { installCrashReporter, setCrashScreen } from '@/lib/crashReport';
import { Sentry } from '@/lib/sentry';
import i18n from '@/lib/i18n';
import { store } from '@/store';
import { useAppSelector } from '@/store/hooks';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// An error that would close the app is reported to the team first (see lib/crashReport)
installCrashReporter(() => store.getState().auth.accessToken);

// A screen that throws shows "Something went wrong · Try again" instead of closing the app
export { CrashScreen as ErrorBoundary } from '@/components/ui/CrashScreen';

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    bootstrap(store.dispatch).finally(() => setBooted(true));
  }, []);

  // A font failure must not block the app: it falls back to the system font
  const ready = booted && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <ToastProvider>
                <SessionEffects />
                <CrashScreenTracker />
                <PushEffects />
                <StatusBar style="dark" />
                <View style={{ flex: 1, backgroundColor: Colors.background }}>
                  <OfflineBanner />
                  {/* Nested provider: screens measure their safe area below the offline strip */}
                  <SafeAreaProvider style={{ flex: 1 }}>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.background },
                        animation: 'slide_from_right',
                      }}
                    />
                  </SafeAreaProvider>
                </View>
              </ToastProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </I18nextProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

/** Route pattern (e.g. "ride/[id]"), never ids, and the account id: attached to crash reports */
function CrashScreenTracker() {
  const segments = useSegments();
  const userId = useAppSelector((s) => s.auth.user?._id);
  useEffect(() => {
    const screen = '/' + segments.join('/');
    setCrashScreen(screen);
    Sentry.setTag('screen', screen);
    Sentry.addBreadcrumb({ category: 'navigation', message: screen });
  }, [segments]);
  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);
  return null;
}
