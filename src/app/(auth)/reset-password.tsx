import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useResetPasswordMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { pendingAuth } from '@/features/auth/pending';
import { resetSchema, type ResetForm } from '@/features/auth/validation';
import { getApiErrorMessage, statusOf } from '@/lib/api/errors';
import { zodResolver } from '@/lib/form';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [reset, { isLoading }] = useResetPasswordMutation();
  const [formError, setFormError] = useState<string | null>(() =>
    pendingAuth.getResetToken() ? null : t('auth.reset.expired'),
  );
  const confirmRef = useRef<TextInputInstance>(null);

  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema(t)),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    const resetToken = pendingAuth.getResetToken();
    if (!resetToken) return setFormError(t('auth.reset.expired'));
    setFormError(null);
    try {
      await reset({ newPassword, resetToken }).unwrap();
      pendingAuth.clearResetToken();
      pendingAuth.clearVerification();
      toast.show(t('auth.reset.done'));
      router.dismissTo('/login');
    } catch (error) {
      setFormError(statusOf(error) === 401 ? t('auth.reset.expired') : getApiErrorMessage(error, t));
    }
  });

  const expired = !pendingAuth.getResetToken();

  return (
    <AuthLayout title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} back onBack={() => router.dismissTo('/login')}>
      <Banner message={formError} />
      {expired ? (
        <Button title={t('auth.forgot.submit')} onPress={() => router.replace('/forgot-password')} />
      ) : (
        <>
          <Controller
            control={control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <TextField
                label={t('auth.reset.newPassword')}
                icon="lock"
                password
                autoFocus
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <PasswordChecklist value={newPassword} />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField
                ref={confirmRef}
                label={t('auth.reset.confirmPassword')}
                icon="lock"
                password
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={() => void onSubmit()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button title={t('auth.reset.submit')} onPress={onSubmit} loading={isLoading} />
        </>
      )}
    </AuthLayout>
  );
}
