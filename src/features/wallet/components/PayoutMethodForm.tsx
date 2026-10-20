import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isValidPhone, toE164 } from '@/lib/format';

import { useAddPayoutMethodMutation, useUpdatePayoutMethodMutation } from '../api';
import type { PayoutMethod, PayoutMethodType, WalletMode } from '../types';

export const PAYOUT_TYPES: PayoutMethodType[] = ['orange_money', 'mobile_money', 'bank'];
export const PAYOUT_ICON = { orange_money: 'smartphone', mobile_money: 'smartphone', bank: 'credit-card' } as const;

/** Mobile money numbers are phone numbers: show them like one */
export const payoutAccountLabel = (m: Pick<PayoutMethod, 'type' | 'accountNumber' | 'bankName'>) =>
  m.type === 'bank' ? `${m.bankName ?? ''} · ${m.accountNumber}` : m.accountNumber;

/**
 * Add or edit one payout method. Choose the type first, then only that type's
 * fields (mobile money: the phone number; bank: bank name + account number).
 */
export function PayoutMethodForm({
  mode,
  existing,
  defaultName,
  onDone,
}: {
  mode: WalletMode;
  existing?: PayoutMethod;
  defaultName?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<PayoutMethodType>(existing?.type ?? 'orange_money');
  const [accountName, setAccountName] = useState(existing?.accountName ?? defaultName ?? '');
  const [phone, setPhone] = useState(existing && existing.type !== 'bank' ? existing.accountNumber.replace(/^\+224/, '') : '');
  const [accountNumber, setAccountNumber] = useState(existing?.type === 'bank' ? existing.accountNumber : '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [add, addState] = useAddPayoutMethodMutation();
  const [update, updateState] = useUpdatePayoutMethodMutation();

  const save = async () => {
    const isBank = type === 'bank';
    const next: Record<string, string> = {};
    if (accountName.trim().length < 2) next.accountName = t('validation.nameShort');
    if (isBank) {
      if (bankName.trim().length < 2) next.bankName = t('payout.bankRequired');
      if (accountNumber.trim().length < 4) next.accountNumber = t('payout.accountRequired');
    } else if (!isValidPhone(toE164(phone))) {
      next.phone = t('validation.phone');
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setFormError(null);
    const body = {
      mode,
      type,
      accountName: accountName.trim(),
      accountNumber: isBank ? accountNumber.trim() : toE164(phone),
      ...(isBank ? { bankName: bankName.trim() } : {}),
    };
    try {
      if (existing) await update({ id: existing._id, ...body }).unwrap();
      else await add(body).unwrap();
      onDone();
    } catch (e) {
      setFormError(getApiErrorMessage(e, t));
    }
  };

  return (
    <View style={styles.form}>
      <Banner tone="danger" message={formError} />
      <View style={styles.types}>
        {PAYOUT_TYPES.map((key) => (
          <OptionCard
            key={key}
            icon={PAYOUT_ICON[key]}
            title={t(`payout.type.${key}`)}
            description={t(`payout.typeHint.${key}`)}
            selected={type === key}
            onPress={() => setType(key)}
          />
        ))}
      </View>
      <TextField label={t('payout.accountName')} hint={t('payout.accountNameHint')} value={accountName} onChangeText={setAccountName} error={errors.accountName} maxLength={80} />
      {type === 'bank' ? (
        <>
          <TextField label={t('payout.bankName')} value={bankName} onChangeText={setBankName} error={errors.bankName} maxLength={80} />
          <TextField label={t('payout.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} error={errors.accountNumber} maxLength={40} />
        </>
      ) : (
        <PhoneField label={t('payout.phone', { type: t(`payout.type.${type}`) })} value={phone} onChangeText={setPhone} error={errors.phone} />
      )}
      <Button title={t('common.save')} loading={addState.isLoading || updateState.isLoading} onPress={() => void save()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  types: { gap: Spacing.sm },
});
