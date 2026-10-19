import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLogoutMutation, useSwitchModeMutation } from '@/features/auth/api';
import { homeFor } from '@/features/auth/session';
import { getApiErrorMessage } from '@/lib/api/errors';
import { signedOut, userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppMode, UserRole } from '@/types/api';

/**
 * Account header, mode switch, language and sign-out — the parts every
 * profile tab shares. The full profile/settings screens come in Phase 6.
 */
export function ProfileBasics() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const language = useAppSelector((s) => s.prefs.language);
  const [switchMode, { isLoading: switching }] = useSwitchModeMutation();
  const [logout] = useLogoutMutation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const modes = [
    { mode: AppMode.customer, label: t('profile.modeCustomer'), icon: 'shopping-cart' as const },
    ...(user?.roles.includes(UserRole.vendor)
      ? [{ mode: AppMode.vendor, label: t('profile.modeVendor'), icon: 'shopping-bag' as const }]
      : []),
    ...(user?.roles.includes(UserRole.rider)
      ? [{ mode: AppMode.rider, label: t('profile.modeRider'), icon: 'truck' as const }]
      : []),
  ];

  const onSwitch = async (mode: AppMode) => {
    if (!user || mode === user.lastActiveMode) return;
    try {
      await switchMode(mode).unwrap();
      const updated = { ...user, lastActiveMode: mode };
      dispatch(userUpdated(updated));
      router.replace(homeFor(updated));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const onSignOut = () => {
    setConfirmSignOut(false);
    void logout(); // best effort: the local session ends either way
    dispatch(signedOut());
    router.replace('/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <AppText variant="h3" color={Colors.primary}>
            {(user?.name ?? '?').charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="title">{user?.name ?? t('profile.guestName')}</AppText>
          {user?.phone && (
            <AppText variant="small" color={Colors.textMuted}>
              {user.phone}
            </AppText>
          )}
        </View>
      </View>

      {!user && <Button title={t('common.signIn')} onPress={() => router.push('/login')} />}

      {modes.length > 1 && (
        <View style={styles.modes} accessibilityRole="radiogroup">
          {modes.map((m) => {
            const active = user?.lastActiveMode === m.mode;
            return (
              <Pressable
                key={m.mode}
                disabled={switching}
                onPress={() => onSwitch(m.mode)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.modeChip, active && styles.modeChipOn]}>
                <Feather name={m.icon} size={16} color={active ? Colors.textOnPrimary : Colors.primary} />
                <AppText variant="label" color={active ? Colors.textOnPrimary : Colors.primary}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/language', params: { from: 'settings' } })}
        accessibilityRole="button">
        <Feather name="globe" size={20} color={Colors.primary} />
        <AppText variant="bodyMedium" style={styles.flex}>
          {t('profile.language')}
        </AppText>
        <AppText variant="small" color={Colors.textMuted}>
          {language === 'fr' ? t('language.fr') : t('language.en')}
        </AppText>
        <Feather name="chevron-right" size={20} color={Colors.textSubtle} />
      </Pressable>

      {user && (
        <Button title={t('common.signOut')} variant="outline" icon="log-out" onPress={() => setConfirmSignOut(true)} />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modes: { flexDirection: 'row', gap: Spacing.sm },
  modeChip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
  },
  modeChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
