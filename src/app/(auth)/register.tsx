import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { Colors, Spacing } from '@/constants/theme';
import { useRegisterMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { IntentPicker } from '@/features/auth/components/IntentPicker';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { pendingAuth } from '@/features/auth/pending';
import type { SignupIntent } from '@/features/auth/types';
import { registerSchema, type RegisterForm } from '@/features/auth/validation';
import { errorCode, getApiErrorMessage, serverMessage } from '@/lib/api/errors';
import { toE164 } from '@/lib/format';
import { zodResolver } from '@/lib/form';
import { useAppSelector } from '@/store/hooks';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.prefs.language);
  const [register, { isLoading }] = useRegisterMutation();
  const [intent, setIntent] = useState<SignupIntent>('customer');
  const [showReferral, setShowReferral] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const { control, handleSubmit, setError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema(t)),
    defaultValues: { name: '', email: '', phone: '', password: '', referralCode: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const phone = toE164(values.phone);
    try {
      const sent = await register({
        name: values.name.trim(),
        phone,
        email: values.email.trim() || undefined,
        password: values.password,
        referralCode: values.referralCode.trim().toUpperCase() || undefined,
        language,
      }).unwrap();

      pendingAuth.setVerification({
        purpose: 'verify_account',
        identifier: phone,
        maskedPhone: sent.phone,
        maskedEmail: sent.email,
        resendIn: sent.resendIn,
        intent,
      });
      router.push('/verify');
    } catch (error) {
      // Point at the field when the server says which one is wrong
      // (the text checks are for an older server without error codes)
      const code = errorCode(error);
      const message = serverMessage(error) ?? '';
      const text = getApiErrorMessage(error, t);
      if (code === 'PHONE_ALREADY_REGISTERED' || /phone number already exists/i.test(message)) setError('phone', { message: text });
      else if (code === 'EMAIL_TAKEN' || /email is already in use/i.test(message)) setError('email', { message: text });
      else if (code === 'REFERRAL_CODE_INVALID' || /referral code/i.test(message)) setError('referralCode', { message: text });
      else setFormError(text);
    }
  });

  return (
    <AuthLayout title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} back>
      <Banner message={formError} />

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.register.name')}
            placeholder={t('auth.register.namePlaceholder')}
            icon="user"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneField
            ref={phoneRef}
            label={t('auth.register.phone')}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            ref={emailRef}
            label={t('auth.register.email')}
            optional
            placeholder={t('auth.register.emailPlaceholder')}
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
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
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
            icon="lock"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <PasswordChecklist value={password} />

      {showReferral ? (
        <Controller
          control={control}
          name="referralCode"
          render={({ field, fieldState }) => (
            <TextField
              label={t('auth.register.referral')}
              optional
              placeholder={t('auth.register.referralPlaceholder')}
              icon="gift"
              autoCapitalize="characters"
              maxLength={8}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : (
        <TextLink title={t('auth.register.haveReferral')} onPress={() => setShowReferral(true)} />
      )}

      <IntentPicker value={intent} onChange={setIntent} />

      <Button
        title={t(intent === 'vendor' ? 'auth.register.submitVendor' : intent === 'rider' ? 'auth.register.submitRider' : 'auth.register.submit')}
        onPress={onSubmit}
        loading={isLoading}
      />

      <View style={styles.row}>
        <AppText variant="small" color={Colors.textMuted}>
          {t('auth.register.haveAccount')}
        </AppText>
        <TextLink title={t('common.signIn')} onPress={() => router.replace('/login')} />
      </View>
      <AppText variant="caption" color={Colors.textSubtle} align="center">
        {t('auth.register.terms')}
      </AppText>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
});
