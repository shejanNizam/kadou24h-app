import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextLink } from '@/components/ui/TextLink';
import { Colors, Spacing } from '@/constants/theme';
import { useForgotPasswordMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { pendingAuth } from '@/features/auth/pending';
import { forgotSchema, type ForgotForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/lib/api/errors';
import { toE164 } from '@/lib/format';
import { zodResolver } from '@/lib/form';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [forgot, { isLoading }] = useForgotPasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema(t)),
    defaultValues: { phone: '' },
  });

  const onSubmit = handleSubmit(async ({ phone }) => {
    setFormError(null);
    const identifier = toE164(phone);
    try {
      // Same answer whether or not the account exists (no account discovery)
      const sent = await forgot({ identifier }).unwrap();
      pendingAuth.setVerification({
        purpose: 'reset_password',
        identifier,
        resendIn: sent.resendIn,
        intent: 'customer',
      });
      router.push('/verify');
    } catch (error) {
      setFormError(getApiErrorMessage(error, t));
    }
  });

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} back>
      <Banner message={formError} />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneField
            label={t('auth.register.phone')}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={() => void onSubmit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Button title={t('auth.forgot.submit')} onPress={onSubmit} loading={isLoading} />
      <View style={styles.row}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('auth.forgot.remember')}
        </AppText>
        <TextLink title={t('common.signIn')} onPress={() => router.replace('/login')} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
});
