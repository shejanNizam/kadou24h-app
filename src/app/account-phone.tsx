import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneField } from '@/components/ui/PhoneField';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextLink } from '@/components/ui/TextLink';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRequestPhoneChangeMutation, useVerifyPhoneChangeMutation } from '@/features/profile/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCountdown, isValidPhone, toE164 } from '@/lib/format';
import { userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const CODE_LENGTH = 6;

/** New number → SMS code to that number → saved (the code proves you hold the SIM). */
export default function ChangePhoneScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [digits, setDigits] = useState('');
  const [sentTo, setSentTo] = useState<{ phone: string; masked?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [request, requestState] = useRequestPhoneChangeMutation();
  const [verify, verifyState] = useVerifyPhoneChangeMutation();

  useEffect(() => {
    if (!sentTo) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentTo]);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const phone = toE164(digits);
  const send = async () => {
    setError(null);
    if (!isValidPhone(phone)) return setError(t('validation.phone'));
    try {
      const sent = await request({ phone }).unwrap();
      setSentTo({ phone, masked: sent.phone });
      setCode('');
      setResendAt(Date.now() + sent.resendIn * 1000);
      setNow(Date.now());
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  const confirm = async (value: string) => {
    if (!sentTo || value.length !== CODE_LENGTH || verifyState.isLoading) return;
    setError(null);
    try {
      const updated = await verify({ phone: sentTo.phone, otp: value }).unwrap();
      if (user) dispatch(userUpdated({ ...user, ...updated }));
      toast.show(t('account.phoneChanged'));
      router.back();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('account.changePhone')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {!sentTo ? (
          <>
            <AppText variant="body" color={Colors.textMuted}>
              {user?.phone ? t('account.phoneCurrent', { phone: user.phone }) : t('account.phoneAdd')}
            </AppText>
            <PhoneField label={t('account.newPhone')} value={digits} onChangeText={setDigits} autoFocus returnKeyType="send" onSubmitEditing={() => void send()} />
            <Banner tone="danger" message={error} />
            <Button title={t('account.sendCode')} loading={requestState.isLoading} disabled={digits.length < 9} onPress={() => void send()} />
          </>
        ) : (
          <>
            <AppText variant="body" color={Colors.textMuted}>
              {t('account.codeSentTo', { phone: sentTo.masked ?? sentTo.phone })}
            </AppText>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              onComplete={(v) => void confirm(v)}
              length={CODE_LENGTH}
              error={Boolean(error)}
              autoFocus
              accessibilityLabel={t('auth.verify.codeLabel')}
            />
            <Banner tone="danger" message={error} />
            <Button title={t('account.confirmPhone')} loading={verifyState.isLoading} disabled={code.length !== CODE_LENGTH} onPress={() => void confirm(code)} />
            <View style={styles.links}>
              {secondsLeft > 0 ? (
                <AppText variant="small" color={Colors.textMuted}>
                  {t('auth.verify.resendIn', { time: formatCountdown(secondsLeft) })}
                </AppText>
              ) : (
                <TextLink title={t('auth.verify.resend')} onPress={() => void send()} disabled={requestState.isLoading} />
              )}
              <TextLink title={t('account.otherNumber')} onPress={() => setSentTo(null)} />
            </View>
          </>
        )}
      </KeyboardScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
