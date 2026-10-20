import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { PushEffects } from '@/components/providers/PushEffects';
import { SessionEffects } from '@/components/providers/SessionEffects';
import { ToastProvider } from '@/components/ui/Toast';
import { Colors } from '@/constants/theme';
import { bootstrap } from '@/lib/bootstrap';
import i18n from '@/lib/i18n';
import { store } from '@/store';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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
            <ToastProvider>
              <SessionEffects />
              <PushEffects />
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                  animation: 'slide_from_right',
                }}
              />
            </ToastProvider>
          </SafeAreaProvider>
        </I18nextProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
