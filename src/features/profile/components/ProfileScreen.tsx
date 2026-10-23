import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLogoutMutation } from '@/features/auth/api';
import { RiderSection } from '@/features/rider/components/RiderSection';
import { StoreSection } from '@/features/vendor/components/StoreSection';
import { getPushToken } from '@/lib/push';
import { signedOut } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

import { MenuRow, MenuSection } from './Menu';
import { ModeCard } from './ModeCard';
import { img } from '@/lib/image';

/** Profile tab of every mode: account, mode card, mode extras, settings, help, sign out. */
export function ProfileScreen({ mode }: { mode: AppMode }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const language = useAppSelector((s) => s.prefs.language);
  const [logout] = useLogoutMutation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const onSignOut = () => {
    setConfirmSignOut(false);
    // best effort: the local session ends either way; the server forgets this phone for push
    void logout({ deviceToken: getPushToken() ?? undefined });
    dispatch(signedOut());
    router.replace('/home');
  };

  const share = () =>
    void Share.share({
      message: user?.referralCode ? t('profile.shareWithCode', { code: user.referralCode }) : t('profile.shareText'),
    }).catch(() => undefined);

  const languageRow = (
    <MenuRow
      icon="globe"
      label={t('profile.language')}
      value={language === 'fr' ? t('language.fr') : t('language.en')}
      onPress={() => router.push({ pathname: '/language', params: { from: 'settings' } })}
      last={!user}
    />
  );

  return (
    <Screen scroll>
      <PageHeader title={t('tabs.profile')} />
      <View style={styles.content}>
        {user ? (
          <Pressable onPress={() => router.push('/account')} accessibilityRole="button" accessibilityHint={t('account.title')} style={styles.header}>
            <View style={styles.avatar}>
              {user.avatar?.url ? (
                <Image source={img(user.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <AppText variant="h2" color={Colors.primary}>
                  {user.name.charAt(0).toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="h3" numberOfLines={1}>
                {user.name}
              </AppText>
              <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
                {user.phone ?? user.email ?? ''}
              </AppText>
              <AppText variant="smallMedium" color={Colors.primary}>
                {t('profile.editAccount')}
              </AppText>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.textSubtle} />
          </Pressable>
        ) : (
          <View style={styles.guest}>
            <AppText variant="h3">{t('profile.guestTitle')}</AppText>
            <AppText variant="body" color={Colors.textMuted}>
              {t('guest.profile')}
            </AppText>
            <Button title={t('common.signIn')} onPress={() => router.push('/login')} />
            <Button title={t('profile.createAccount')} variant="outline" onPress={() => router.push('/register')} />
          </View>
        )}

        {user && <ModeCard />}

        {user && mode === AppMode.vendor && <StoreSection />}

        {user && mode === AppMode.rider && <RiderSection />}

        {user && mode === AppMode.customer && (
          <MenuSection title={t('profile.myShopping')}>
            <MenuRow icon="map-pin" label={t('address.title')} onPress={() => router.push('/addresses')} />
            <MenuRow icon="calendar" label={t('profile.myBookings')} onPress={() => router.push('/bookings')} />
            <MenuRow icon="navigation" label={t('profile.myRides')} onPress={() => router.push('/rides')} />
            <MenuRow icon="heart" label={t('profile.favorites')} onPress={() => router.push('/favorites')} />
            <MenuRow icon="credit-card" label={t('profile.payments')} onPress={() => router.push('/payments')} />
            <MenuRow icon="star" label={t('profile.myReviews')} onPress={() => router.push('/my-reviews')} last />
          </MenuSection>
        )}

        {/* Jobs: every mode can look for work or hire */}
        {user && (
          <MenuSection title={t('profile.jobs')}>
            <MenuRow icon="briefcase" label={t('profile.findJob')} onPress={() => router.push('/jobs')} />
            <MenuRow icon="file-text" label={t('profile.myCv')} onPress={() => router.push('/cv')} />
            <MenuRow icon="send" label={t('profile.myApplications')} onPress={() => router.push('/jobs/applications')} />
            {/* Customers and stores can offer their services (client rule); riders already work for Kadou24h */}
            {mode !== AppMode.rider && (
              <MenuRow
                icon="tool"
                label={t('profile.becomeWorker')}
                onPress={() => router.push('/worker-profile')}
              />
            )}
            <MenuRow icon="user-plus" label={t('profile.postJob')} onPress={() => router.push('/recruiter')} last />
          </MenuSection>
        )}

        <MenuSection title={t('profile.settings')}>
          {user && <MenuRow icon="user" label={t('account.title')} onPress={() => router.push('/account')} />}
          {languageRow}
          {user && <MenuRow icon="bell" label={t('notificationSettings.title')} onPress={() => router.push('/notification-settings')} />}
          {user && <MenuRow icon="slash" label={t('chat.blockedTitle')} onPress={() => router.push('/blocked')} last />}
        </MenuSection>

        <MenuSection title={t('profile.help')}>
          {user && <MenuRow icon="life-buoy" label={t('support.title')} onPress={() => router.push('/support')} />}
          <MenuRow icon="share-2" label={t('profile.share')} value={user?.referralCode} onPress={share} last />
        </MenuSection>

        {user && <Button title={t('common.signOut')} variant="outline" icon="log-out" onPress={() => setConfirmSignOut(true)} />}

        <AppText variant="caption" color={Colors.textSubtle} align="center">
          Kadou24h · v{Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
      </View>

      <ConfirmDialog
        visible={confirmSignOut}
        destructive
        icon="log-out"
        title={t('profile.signOutTitle')}
        message={t('profile.signOutMessage')}
        confirmLabel={t('common.signOut')}
        onConfirm={onSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.xl, paddingBottom: Spacing.xxl },
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 64, height: 64 },
  guest: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
});
