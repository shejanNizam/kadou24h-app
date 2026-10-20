import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGetPublicSettingsQuery } from '@/features/profile/api';

/**
 * Shown when the team suspends or bans the account (at sign-in, or live via
 * the socket). The user is already signed out; support is reached outside
 * the app (WhatsApp / phone / e-mail from the public settings).
 */
export default function SuspendedScreen() {
  const { t } = useTranslation();
  const { status, reason } = useLocalSearchParams<{ status?: string; reason?: string }>();
  const { data: settings } = useGetPublicSettingsQuery();
  const banned = status === 'banned';
  const whatsapp = settings?.whatsappSupportNumber?.replace(/\D/g, '');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <View style={styles.icon}>
          <Feather name="slash" size={34} color={Colors.danger} />
        </View>
        <AppText variant="h2" align="center">
          {banned ? t('suspended.bannedTitle') : t('suspended.title')}
        </AppText>
        <AppText variant="body" color={Colors.textMuted} align="center">
          {banned ? t('suspended.bannedText') : t('suspended.text')}
        </AppText>
        {reason ? (
          <View style={styles.reason}>
            <AppText variant="label">{t('suspended.reason')}</AppText>
            <AppText variant="body">{reason}</AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          {whatsapp ? <Button title={t('support.whatsapp')} icon="message-circle" onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)} /> : null}
          {settings?.contactNumber ? (
            <Button title={t('suspended.call')} icon="phone" variant="outline" onPress={() => void Linking.openURL(`tel:${settings.contactNumber}`)} />
          ) : null}
          {settings?.supportEmail ? (
            <Button title={t('suspended.email')} icon="mail" variant="outline" onPress={() => void Linking.openURL(`mailto:${settings.supportEmail}`)} />
          ) : null}
          <Button title={t('suspended.back')} variant="ghost" onPress={() => router.replace('/home')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg, alignItems: 'stretch' },
  icon: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  reason: { gap: Spacing.xs, padding: Spacing.lg, borderRadius: 12, backgroundColor: Colors.surface },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
});
