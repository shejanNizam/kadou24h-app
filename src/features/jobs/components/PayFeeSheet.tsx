import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { FEE_METHODS, type FeeMethod } from '../types';

const ICON: Record<FeeMethod, 'smartphone' | 'credit-card'> = { orange_money: 'smartphone', mobile_money: 'smartphone', card: 'credit-card' };

/**
 * Pay a fee (publish a job, unlock a CV, spontaneous application, plan):
 * what it is, the price, an online method. `onPay` starts the payment on the
 * server; the caller then opens the payment screen.
 */
export function PayFeeSheet({
  visible,
  title,
  description,
  amount,
  payLabel,
  onPay,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  description: string;
  amount?: number;
  payLabel?: string;
  onPay: (method: FeeMethod) => Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<FeeMethod>('orange_money');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setError(null);
    setBusy(true);
    try {
      await onPay(method);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onShow={() => setError(null)}
      footer={<Button title={payLabel ?? (amount ? t('fee.payAmount', { amount: formatGNF(amount) }) : t('fee.pay'))} loading={busy} onPress={() => void pay()} />}>
      <AppText variant="body" color={Colors.textMuted}>
        {description}
      </AppText>
      {children}
      {amount !== undefined && (
        <View style={styles.amount}>
          <AppText variant="small" color={Colors.textMuted}>
            {t('fee.price')}
          </AppText>
          <AppText variant="h2" color={Colors.primary}>
            {formatGNF(amount)}
          </AppText>
        </View>
      )}
      <AppText variant="label">{t('fee.method')}</AppText>
      <View style={styles.methods} accessibilityRole="radiogroup">
        {FEE_METHODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMethod(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: method === m }}
            style={[styles.method, method === m && styles.methodOn]}>
            <Feather name={ICON[m]} size={18} color={method === m ? Colors.primary : Colors.textMuted} />
            <AppText variant="bodyMedium" style={styles.flex}>
              {t(`payment.method.${m}`)}
            </AppText>
            <Feather name={method === m ? 'check-circle' : 'circle'} size={18} color={method === m ? Colors.primary : Colors.border} />
          </Pressable>
        ))}
      </View>
      <Banner tone="danger" message={error} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  amount: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft },
  methods: { gap: Spacing.sm },
  method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  methodOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  flex: { flex: 1 },
});
