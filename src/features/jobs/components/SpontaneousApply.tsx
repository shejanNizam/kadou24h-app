import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGetMyCvQuery } from '@/features/cv/api';
import { cvFileOf } from '@/features/cv/types';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppSelector } from '@/store/hooks';

import { useApplySpontaneousMutation } from '../api';
import { openFeePayment } from '../status';
import { PayFeeSheet } from './PayFeeSheet';

/**
 * "Work here?" on a store page: send my CV to the store without a job offer.
 * Paid (spontaneous application fee); the store only sees it once paid.
 */
export function SpontaneousApply({ vendorId, storeName }: { vendorId: string; storeName: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: cv } = useGetMyCvQuery(undefined, { skip: !signedIn });
  const { data: settings } = useGetPublicSettingsQuery();
  const [apply] = useApplySpontaneousMutation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const hasCv = Boolean(cvFileOf(cv));

  return (
    <>
      <Pressable onPress={() => requireAuth(() => setOpen(true))} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Feather name="briefcase" size={16} color={Colors.primary} />
        <AppText variant="small" style={styles.flex}>
          {t('spontaneous.cta', { store: storeName })}
        </AppText>
        <Feather name="chevron-right" size={16} color={Colors.primary} />
      </Pressable>

      {hasCv ? (
        <PayFeeSheet
          visible={open}
          title={t('spontaneous.title')}
          description={t('spontaneous.text', { store: storeName })}
          amount={settings?.pricing?.spontaneousApplicationFee ?? 1000}
          onClose={() => setOpen(false)}
          onPay={async (method) => {
            const { payment } = await apply({ targetVendorId: vendorId, paymentMethod: method, ...(note.trim() && { coverNote: note.trim() }) }).unwrap();
            setOpen(false);
            setNote('');
            openFeePayment(payment, () => toast.show(t('spontaneous.sent'), 'success'));
          }}>
          <TextField label={t('jobDetail.note')} hint={t('spontaneous.noteHint')} optional value={note} onChangeText={setNote} maxLength={1000} multiline />
        </PayFeeSheet>
      ) : (
        <BottomSheet
          visible={open}
          title={t('spontaneous.title')}
          onClose={() => setOpen(false)}
          footer={
            <Button
              title={t('jobDetail.createCv')}
              icon="file-text"
              onPress={() => {
                setOpen(false);
                router.push('/cv');
              }}
            />
          }>
          <AppText variant="body" color={Colors.textMuted}>
            {t('jobDetail.needCvText')}
          </AppText>
        </BottomSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryBorder },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
});

