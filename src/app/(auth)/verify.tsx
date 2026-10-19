import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { TextLink } from '@/components/ui/TextLink';
import { useToast } from '@/components/ui/Toast';
import { Colors, Spacing } from '@/constants/theme';
import { useResendOtpMutation, useVerifyAccountMutation, useVerifyResetOtpMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { pendingAuth } from '@/features/auth/pending';
import { useCompleteSignIn } from '@/features/auth/session';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCountdown } from '@/lib/format';

const CODE_LENGTH = 6;

/** One OTP screen for both "verify my account" and "reset my password". */
export default function VerifyScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const completeSignIn = useCompleteSignIn();
  const [pending] = useState(() => pendingAuth.getVerification());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(() =>
    pending ? pending.sentAt + pending.resendIn * 1000 : 0,
  );
  const [now, setNow] = useState(() => Date.now());

  const [verifyAccount, verifyAccountState] = useVerifyAccountMutation();
  const [verifyReset, verifyResetState] = useVerifyResetOtpMutation();
  const [resend, resendState] = useResendOtpMutation();
  const verifying = verifyAccountState.isLoading || verifyResetState.isLoading;

  // Resend countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const submit = useCallback(
    async (value: string) => {
      if (!pending || verifying) return;
      if (value.length !== CODE_LENGTH) return setError(t('validation.otp'));
      setError(null);
      try {
        if (pending.purpose === 'verify_account') {
          const session = await verifyAccount({ phone: pending.identifier, otp: value }).unwrap();
          pendingAuth.clearVerification();
          completeSignIn(session, pending.intent);
        } else {
          const { resetToken, expiresIn } = await verifyReset({ identifier: pending.identifier, otp: value }).unwrap();
          pendingAuth.setResetToken(resetToken, expiresIn);
          router.replace('/reset-password');
        }
      } catch (e) {
        setError(getApiErrorMessage(e, t));
        setCode('');
      }
    },
    [pending, verifying, verifyAccount, verifyReset, completeSignIn, t],
  );

  const onResend = async () => {
    if (!pending) return;
    setError(null);
    try {
      const sent = await resend({ identifier: pending.identifier, purpose: pending.purpose }).unwrap();
      setResendAt(Date.now() + sent.resendIn * 1000);
      setCode('');
      toast.show(t('auth.verify.resent'));
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  // Opened directly (web reload, deep link) without a pending code
  if (!pending) {
    return (
      <AuthLayout title={t('auth.verify.title')} back>
        <Banner tone="warning" message={t('auth.verify.missing')} />
        <Button title={t('common.signIn')} onPress={() => router.replace('/login')} />
      </AuthLayout>
    );
  }

  const subtitle =
    pending.maskedPhone && pending.maskedEmail
      ? t('auth.verify.subtitleBoth', { phone: pending.maskedPhone, email: pending.maskedEmail })
      : t('auth.verify.subtitle', { target: pending.maskedPhone ?? pending.maskedEmail ?? pending.identifier });

  return (
    <AuthLayout title={t('auth.verify.title')} subtitle={subtitle} back>
      <OtpInput
        value={code}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        onComplete={submit}
        length={CODE_LENGTH}
        error={Boolean(error)}
        accessibilityLabel={t('auth.verify.title')}
      />
      <Banner message={error} />

      <Button title={t('auth.verify.submit')} onPress={() => submit(code)} loading={verifying} disabled={code.length !== CODE_LENGTH} />

      <View style={styles.resend}>
        {secondsLeft > 0 ? (
          <AppText variant="small" color={Colors.textMuted}>
            {t('auth.verify.resendIn', { time: formatCountdown(secondsLeft) })}
          </AppText>
        ) : (
          <TextLink title={t('auth.verify.resend')} onPress={onResend} disabled={resendState.isLoading} />
        )}
        {pending.purpose === 'verify_account' && (
          <TextLink title={t('auth.verify.wrongNumber')} color={Colors.textMuted} onPress={() => router.back()} />
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  resend: { alignItems: 'center', gap: Spacing.xs },
});
