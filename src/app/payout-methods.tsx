import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDeletePayoutMethodMutation, useGetWalletQuery, useUpdatePayoutMethodMutation } from '@/features/wallet/api';
import { PAYOUT_ICON, PayoutMethodForm, payoutAccountLabel } from '@/features/wallet/components/PayoutMethodForm';
import { MAX_PAYOUT_METHODS, type PayoutMethod } from '@/features/wallet/types';
import { useWalletMode } from '@/features/wallet/useWalletMode';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';

/** Where my withdrawals are sent: Orange Money, Mobile Money or a bank account (up to 5, one default). */
export default function PayoutMethodsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const mode = useWalletMode();
  const name = useAppSelector((s) => s.auth.user?.name);
  const { data: wallet, isLoading, isError, error, refetch } = useGetWalletQuery(mode);
  const [update] = useUpdatePayoutMethodMutation();
  const [remove, removeState] = useDeletePayoutMethodMutation();
  const [editing, setEditing] = useState<PayoutMethod | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PayoutMethod | null>(null);
  const methods = wallet?.payoutMethods ?? [];

  const makeDefault = async (m: PayoutMethod) => {
    try {
      await update({ mode, id: m._id, isDefault: true }).unwrap();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };
  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove({ mode, id: deleting._id }).unwrap();
      setDeleting(null);
    } catch (e) {
      setDeleting(null);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('earnings.payoutMethods')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={[styles.inner, styles.content]}>
          {methods.length === 0 ? (
            <EmptyState icon="credit-card" title={t('payout.emptyTitle')} message={t('payout.emptyText')} />
          ) : (
            methods.map((m) => (
              <View key={m._id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Feather name={PAYOUT_ICON[m.type]} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyMedium">{t(`payout.type.${m.type}`)}</AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      {m.accountName} · {payoutAccountLabel(m)}
                    </AppText>
                  </View>
                  {m.isDefault && <StatusPill label={t('payout.default')} tone="purple" />}
                </View>
                <View style={styles.actions}>
                  {!m.isDefault && <Button title={t('payout.makeDefault')} variant="ghost" size="sm" onPress={() => void makeDefault(m)} />}
                  <Button title={t('common.edit')} variant="ghost" size="sm" onPress={() => setEditing(m)} />
                  <Button title={t('common.delete')} variant="ghost" size="sm" onPress={() => setDeleting(m)} />
                </View>
              </View>
            ))
          )}
          {methods.length < MAX_PAYOUT_METHODS && <Button title={t('payout.add')} icon="plus" variant="outline" onPress={() => setEditing('new')} />}
        </ScrollView>
      )}

      <BottomSheet visible={editing !== null} title={editing === 'new' ? t('payout.add') : t('payout.edit')} onClose={() => setEditing(null)}>
        {editing !== null && (
          <PayoutMethodForm mode={mode} existing={editing === 'new' ? undefined : editing} defaultName={name} onDone={() => setEditing(null)} />
        )}
      </BottomSheet>
      <ConfirmDialog
        visible={deleting !== null}
        title={t('payout.deleteTitle')}
        message={deleting ? `${t(`payout.type.${deleting.type}`)} · ${payoutAccountLabel(deleting)}` : undefined}
        confirmLabel={t('common.delete')}
        destructive
        loading={removeState.isLoading}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs },
});
