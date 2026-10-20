import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { pendingAuth } from '@/features/auth/pending';
import { passwordRules } from '@/features/auth/validation';
import { useChangePasswordMutation } from '@/features/profile/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { tokensRotated } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

const valid = (v: string) => passwordRules.length(v) && passwordRules.letter(v) && passwordRules.digit(v);

/** Old + new password. This phone stays signed in; the other devices are signed out. */
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [change, { isLoading }] = useChangePasswordMutation();

  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const canSubmit = oldPassword.length > 0 && valid(newPassword) && confirm === newPassword;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      // The server signs out every device; this one keeps going with the new tokens
      pendingAuth.markPasswordChangedHere();
      const tokens = await change({ oldPassword, newPassword }).unwrap();
      dispatch(tokensRotated(tokens));
      toast.show(t('account.passwordChanged'));
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('account.changePassword')} />
      </View>
      <ScrollView contentContainerStyle={[styles.inner, styles.content]} keyboardShouldPersistTaps="handled">
        <AppText variant="body" color={Colors.textMuted}>
          {t('account.passwordInfo')}
        </AppText>
        <TextField label={t('account.oldPassword')} password value={oldPassword} onChangeText={setOld} autoComplete="current-password" textContentType="password" />
        <TextLink title={t('auth.login.forgot')} onPress={() => router.push('/forgot-password')} />
        <TextField label={t('account.newPassword')} password value={newPassword} onChangeText={setNew} autoComplete="new-password" textContentType="newPassword" />
        <PasswordChecklist value={newPassword} />
        <TextField
          label={t('account.confirmPassword')}
          password
          value={confirm}
          onChangeText={setConfirm}
          error={mismatch ? t('account.passwordMismatch') : undefined}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <Banner tone="danger" message={error} />
        <Button title={t('account.savePassword')} loading={isLoading} disabled={!canSubmit} onPress={() => void submit()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
});
