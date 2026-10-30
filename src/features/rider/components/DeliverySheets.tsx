import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { OtpInput } from '@/components/ui/OtpInput';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useDeclineDeliveryMutation, useVerifyHandoverMutation, useVerifyPickupMutation } from '../api';

const DECLINE_REASONS = ['tooFar', 'busy', 'vehicle', 'cashLimit'] as const;

/** Say no to a delivery: it goes back to the store, who picks another rider. */
export function DeclineSheet({ deliveryId, onClose, onDone }: { deliveryId: string | null; onClose: () => void; onDone?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [reason, setReason] = useState<(typeof DECLINE_REASONS)[number] | 'other' | null>(null);
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decline, { isLoading }] = useDeclineDeliveryMutation();

  const text = reason === 'other' ? other.trim() : reason ? t(`rider.declineReason.${reason}`) : '';
  const submit = async () => {
    if (!deliveryId) return;
    setError(null);
    try {
      await decline({ id: deliveryId, reason: text }).unwrap();
      toast.show(t('rider.declined'));
      onClose();
      onDone?.();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={Boolean(deliveryId)}
      title={t('rider.declineTitle')}
      onClose={onClose}
      onShow={() => {
        setReason(null);
        setOther('');
        setError(null);
      }}
      footer={<Button title={t('rider.decline')} variant="danger" disabled={text.length < 3} loading={isLoading} onPress={() => void submit()} />}>
      <AppText variant="small" color={Colors.textMuted}>
        {t('rider.declineHint')}
      </AppText>
      <Banner tone="danger" message={error} />
      <View style={styles.chips}>
        {[...DECLINE_REASONS, 'other' as const].map((r) => (
          <Chip key={r} label={t(`rider.declineReason.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {reason === 'other' && <TextField label={t('rider.reason')} value={other} onChangeText={setOther} maxLength={300} multiline />}
    </BottomSheet>
  );
}

/**
 * Type the 4-digit code the other person shows me:
 * pickup = the store (or, at a bus station, the driver bringing the parcel),
 * handover = the customer (or the driver taking it). Wrong codes count down; too many lock the leg 15 min.
 */
export function PinSheet({
  deliveryId,
  kind,
  hint,
  cash,
  visible,
  onClose,
  onDone,
}: {
  deliveryId: string;
  kind: 'pickup' | 'handover';
  /** Who to ask for the code (store, customer, car driver, moto rider) */
  hint: string;
  /** COD: cash to take from the customer before typing their code */
  cash?: number;
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifyPickup, pickupState] = useVerifyPickupMutation();
  const [verifyHandover, handoverState] = useVerifyHandoverMutation();
  const loading = pickupState.isLoading || handoverState.isLoading;

  const submit = async (code = pin) => {
    if (code.length !== 4 || loading) return;
    setError(null);
    try {
      await (kind === 'pickup' ? verifyPickup : verifyHandover)({ id: deliveryId, pin: code }).unwrap();
      onClose();
      onDone();
    } catch (e) {
      setPin('');
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={kind === 'pickup' ? t('rider.pickupCodeTitle') : t('rider.handoverCodeTitle')}
      onClose={onClose}
      onShow={() => {
        setPin('');
        setError(null);
      }}
      footer={<Button title={t('rider.confirmCode')} disabled={pin.length !== 4} loading={loading} onPress={() => void submit()} />}>
      {cash ? (
        <View style={styles.cash}>
          <AppText variant="small" color={Colors.textMuted}>
            {t('rider.collectFirst')}
          </AppText>
          <AppText variant="h2" color={Colors.primary}>
            {formatGNF(cash)}
          </AppText>
        </View>
      ) : null}
      <AppText variant="body">{hint}</AppText>
      <OtpInput value={pin} onChange={setPin} onComplete={(code) => void submit(code)} length={4} error={Boolean(error)} accessibilityLabel={t('rider.codeA11y')} />
      <Banner tone="danger" message={error} />
      <AppText variant="caption" color={Colors.textSubtle}>
        {t('rider.codeSafety')}
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cash: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
});
