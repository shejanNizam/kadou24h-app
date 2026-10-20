import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { StackHeader } from '@/components/ui/StackHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useUpdateNotificationPrefsMutation } from '@/features/profile/api';
import { MenuRow, MenuSection } from '@/features/profile/components/Menu';
import { getApiErrorMessage } from '@/lib/api/errors';
import { userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { UserRole, type NotificationPrefs } from '@/types/api';

type Key = keyof NotificationPrefs;
const ICONS: Record<Key, 'package' | 'message-circle' | 'truck' | 'tag' | 'briefcase' | 'shield'> = {
  orderUpdates: 'package',
  messages: 'message-circle',
  deliveryUpdates: 'truck',
  offers: 'tag',
  jobPosts: 'briefcase',
  accountAlerts: 'shield',
};

/** One switch per kind of push. Suspension and safety warnings always arrive (server rule). */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [update] = useUpdateNotificationPrefsMutation();
  // Missing = on (server default)
  const [prefs, setPrefs] = useState<Partial<NotificationPrefs>>(() => user?.notificationPrefs ?? {});

  const isRider = user?.roles.includes(UserRole.rider);
  const keys: Key[] = ['orderUpdates', 'messages', ...(isRider ? (['deliveryUpdates'] as Key[]) : []), 'offers', 'jobPosts', 'accountAlerts'];

  const toggle = async (key: Key, value: boolean) => {
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      const saved = await update({ [key]: value }).unwrap();
      setPrefs(saved);
      if (user) dispatch(userUpdated({ ...user, notificationPrefs: saved }));
    } catch (e) {
      setPrefs(before);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('notificationSettings.title')} />
      </View>
      <ScrollView contentContainerStyle={[styles.inner, styles.content]}>
        <AppText variant="body" color={Colors.textMuted}>
          {t('notificationSettings.intro')}
        </AppText>
        <MenuSection>
          {keys.map((key, i) => (
              <MenuRow
                key={key}
                icon={ICONS[key]}
                label={t(`notificationSettings.${key}`)}
                last={i === keys.length - 1}
                right={
                  <Switch
                    value={prefs[key] !== false}
                    onValueChange={(v) => void toggle(key, v)}
                    trackColor={{ true: Colors.primary, false: Colors.border }}
                    accessibilityLabel={t(`notificationSettings.${key}`)}
                  />
                }
              />
          ))}
        </MenuSection>
        <AppText variant="caption" color={Colors.textMuted}>
          {t('notificationSettings.securityNote')}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
});
