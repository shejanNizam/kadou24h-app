import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { Colors, Spacing } from '@/constants/theme';
import { useLoginMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { pendingAuth } from '@/features/auth/pending';
import { useCompleteSignIn } from '@/features/auth/session';
import { isSession } from '@/features/auth/types';
import { loginSchema, type LoginForm } from '@/features/auth/validation';
import { blockedAccount, getApiErrorMessage } from '@/lib/api/errors';
import { toIdentifier } from '@/lib/format';
import { zodResolver } from '@/lib/form';
import { endedReasonSeen } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function LoginScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const endedReason = useAppSelector((s) => s.auth.endedReason);
  const [login, { isLoading }] = useLoginMutation();
  const completeSignIn = useCompleteSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  // "Your session expired" once, after being signed out by the server
  const [notice] = useState(() =>
    endedReason ? t(endedReason === 'expired' ? 'auth.ended.expired' : 'auth.ended.revoked') : null,
  );
  useEffect(() => {
    if (endedReason) dispatch(endedReasonSeen());
  }, [endedReason, dispatch]);

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const identifier = toIdentifier(values.identifier);
    try {
      const result = await login({ identifier, password: values.password }).unwrap();
      if (isSession(result)) return completeSignIn(result);

      // Account never verified: the server just sent a fresh code
      if (identifier.includes('@')) return setFormError(t('auth.login.verifyWithPhone'));
      pendingAuth.setVerification({
        purpose: 'verify_account',
        identifier,
        maskedPhone: result.phone,
        maskedEmail: result.email,
        resendIn: result.resendIn,
        intent: 'customer',
      });
      router.push('/verify');
    } catch (error) {
      const blocked = blockedAccount(error);
      if (blocked) return router.replace({ pathname: '/suspended', params: { status: blocked.status, reason: blocked.reason } });
      setFormError(getApiErrorMessage(error, t));
    }
  });

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <Banner tone="info" message={notice} />
      <Banner message={formError} />

      <Controller
        control={control}
        name="identifier"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.login.identifier')}
            placeholder={t('auth.login.identifierPlaceholder')}
            icon="user"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            ref={passwordRef}
            label={t('auth.login.password')}
            placeholder={t('auth.login.passwordPlaceholder')}
            icon="lock"
            password
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <View style={styles.forgot}>
        <TextLink title={t('auth.login.forgot')} onPress={() => router.push('/forgot-password')} />
      </View>

      <Button title={t('auth.login.submit')} onPress={onSubmit} loading={isLoading || formState.isSubmitting} />

      <View style={styles.row}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('auth.login.noAccount')}
        </AppText>
        <TextLink title={t('auth.login.signUp')} onPress={() => router.push('/register')} />
      </View>

      <Button title={t('auth.login.guest')} variant="ghost" onPress={() => router.replace('/home')} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', marginTop: -Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
});
