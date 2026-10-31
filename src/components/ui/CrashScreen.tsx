import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { reportError } from '@/lib/crashReport';
import { Sentry } from '@/lib/sentry';

import { EmptyState } from './EmptyState';

/**
 * Root error boundary (exported by app/_layout). Without it a bug while drawing
 * a screen closes the installed app with no message; now the user sees this and can retry.
 * Rendered outside the store / safe-area providers: keep it to plain UI.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error('Screen crashed', error);
    void reportError(error, false);
    Sentry.captureException(error);
  }, [error]);
  return (
    <View style={styles.container}>
      <EmptyState icon="alert-triangle" title={t('errors.crashTitle')} message={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
});
