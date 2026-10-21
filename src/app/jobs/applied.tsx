import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

/** "Candidature envoyée" — what happens next, and where to follow it. */
export default function AppliedScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Feather name="check" size={44} color={Colors.textOnPrimary} />
        </View>
        <AppText variant="h2" align="center">
          {t('applied.title')}
        </AppText>
        <AppText variant="body" color={Colors.textMuted} align="center">
          {title ? t('applied.textFor', { title }) : t('applied.text')}
        </AppText>
        <View style={styles.actions}>
          <Button title={t('applied.follow')} onPress={() => router.replace({ pathname: '/jobs/application/[id]', params: { id } })} />
          <Button title={t('applied.moreJobs')} variant="outline" onPress={() => router.replace('/jobs')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', justifyContent: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl },
  icon: { width: 88, height: 88, borderRadius: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success },
  actions: { gap: Spacing.md, marginTop: Spacing.lg },
});
