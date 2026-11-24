import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

import { REFUND_TONE } from '../status';
import type { OrderRefund, RefundStatus } from '../types';

const TINT: Record<RefundStatus, { background: string; icon: string }> = {
  pending: { background: Colors.warningSoft, icon: Colors.warningText },
  completed: { background: Colors.successSoft, icon: Colors.success },
  rejected: { background: Colors.dangerSoft, icon: Colors.danger },
};

/**
 * Money coming back, shown at the top of the order (client, 2026-11-25): the customer
 * sees at once how much is refunded and where it stands, so they never think it is lost.
 */
export function RefundCard({ refund }: { refund: OrderRefund }) {
  const { t, i18n } = useTranslation();
  const tint = TINT[refund.status];
  const amount = formatGNF(refund.status === 'rejected' ? (refund.requestedAmount ?? refund.amount) : refund.amount);

  return (
    <View style={[styles.card, { backgroundColor: tint.background }]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Feather name={refund.status === 'completed' ? 'check-circle' : 'rotate-ccw'} size={18} color={tint.icon} />
        </View>
        <AppText variant="h3" style={styles.flex}>
          {t('refund.titleAmount', { amount })}
        </AppText>
        <StatusPill label={t(`refund.status.${refund.status}`)} tone={REFUND_TONE[refund.status]} />
      </View>
      <AppText variant="small">
        {refund.status === 'completed'
          ? t('refund.completed', { amount })
          : refund.status === 'pending'
            ? t('refund.pending', { amount })
            : t('refund.rejected', { amount })}
      </AppText>
      {refund.status === 'pending' && refund.dueBy ? (
        <AppText variant="smallMedium">
          {t('refund.dueBy', { date: new Date(refund.dueBy).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}
        </AppText>
      ) : null}
      {refund.status === 'completed' && refund.transactionId ? (
        <AppText variant="caption" color={Colors.textMuted}>
          {t('refund.reference', { ref: refund.transactionId })}
        </AppText>
      ) : null}
      {refund.status === 'rejected' && refund.rejectionReason ? <Banner tone="info" message={refund.rejectionReason} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
