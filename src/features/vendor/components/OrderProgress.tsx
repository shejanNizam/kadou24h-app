import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Spacing } from '@/constants/theme';
import type { SubOrderStatus, TimelineEntry } from '@/features/orders/types';
import { formatGNF } from '@/lib/format';

import type { VendorLeg, VendorSubOrderDetails } from '../types';

type Step = 'received' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'handed_over' | 'on_the_way' | 'delivered' | 'paid';
type State = 'done' | 'current' | 'todo';

const STEPS: Step[] = ['received', 'accepted', 'preparing', 'ready_for_pickup', 'handed_over', 'on_the_way', 'delivered', 'paid'];
const ICONS: Record<Step, keyof typeof Feather.glyphMap> = {
  received: 'inbox',
  accepted: 'check',
  preparing: 'package',
  ready_for_pickup: 'shopping-bag',
  handed_over: 'user-check',
  on_the_way: 'navigation',
  delivered: 'home',
  paid: 'credit-card',
};
/** How far the order is: index in STEPS of the last step reached by each status */
const REACHED: Record<Exclude<SubOrderStatus, 'cancelled' | 'pending_payment'>, number> = {
  new: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  in_delivery: 4,
  delivered: 6,
};
/** The timeline entry that dates each step (the server writes these) */
const ENTRY: Partial<Record<Step, string[]>> = {
  received: ['payment_received', 'order_placed'],
  accepted: ['accepted'],
  preparing: ['preparing'],
  ready_for_pickup: ['ready_for_pickup'],
  handed_over: ['picked_up'],
  delivered: ['delivered'],
};

/** When a step happened: the store sees what was done when, from the order's timeline */
const timeOf = (timeline: TimelineEntry[], step: Step): string | undefined =>
  ENTRY[step]?.map((s) => timeline.find((e) => e.status === s)?.at).find(Boolean);

/** The rider doing the store's leg (first leg); later legs are other drivers */
const firstRider = (legs: VendorLeg[]) => legs.find((l) => l.legNumber === 1)?.riderId?.userId?.name;

/**
 * Where the order is, step by step, up to the money landing in the store's wallet.
 * Everything comes from the server: status, timeline, deliveries and settlement.
 */
export function OrderProgress({ data }: { data: VendorSubOrderDetails }) {
  const { t, i18n } = useTranslation();
  const { subOrder: so, deliveries } = data;
  const cancelled = so.status === 'cancelled';
  const time = (at?: string) =>
    at ? new Date(at).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined;

  // A cancelled order shows the steps it went through, then where it stopped
  const reached = cancelled
    ? Math.max(0, ...STEPS.map((s, i) => (timeOf(so.timeline, s) ? i : 0)))
    : (REACHED[so.status as keyof typeof REACHED] ?? 0);
  const paid = so.settlement === 'released';

  const stateOf = (i: number): State => {
    const step = STEPS[i];
    if (step === 'paid') return paid ? 'done' : so.status === 'delivered' ? 'current' : 'todo';
    if (cancelled) return i <= reached ? 'done' : 'todo';
    if (i <= reached) return 'done';
    return i === reached + 1 ? 'current' : 'todo';
  };

  const detail = (step: Step, state: State): string | undefined => {
    if (step === 'handed_over' && state !== 'todo') {
      const name = firstRider(deliveries);
      if (!name) return undefined;
      return state === 'done' ? t('vendorOrders.progress.riderName', { name }) : t('vendorOrders.progress.riderComing', { name });
    }
    if (step === 'on_the_way' && state === 'current' && deliveries.length > 1) {
      const leg = deliveries.find((l) => l._id === so.currentLegId) ?? deliveries.find((l) => l.status !== 'delivered');
      return leg ? t('vendorOrders.progress.leg', { n: leg.legNumber, total: deliveries.length, to: leg.toName }) : undefined;
    }
    if (step === 'paid') {
      if (paid) return t('vendorOrders.progress.paidAmount', { amount: formatGNF(so.vendorEarning) });
      if (so.settlement === 'awaiting_cod') return t('vendorOrders.progress.awaitingCod');
      if (state === 'current') return t('vendorOrders.progress.releasing');
    }
    return undefined;
  };

  const steps = STEPS.map((step, i) => {
    const state = stateOf(i);
    return {
      step,
      state,
      at: step === 'paid' ? so.releasedAt : timeOf(so.timeline, step),
      detail: detail(step, state),
    };
  }).filter((s) => !cancelled || s.state === 'done');

  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => (
        <Row key={s.step} {...s} label={t(`vendorOrders.progress.step.${s.step}`)} time={time(s.at)} last={i === steps.length - 1 && !cancelled} />
      ))}
      {cancelled && <Row step="received" state="cancelled" label={t('status.subOrder.cancelled')} time={time(so.cancellation?.at)} last />}
    </View>
  );
}

function Row({
  step,
  state,
  label,
  time,
  detail,
  last,
}: {
  step: Step;
  state: State | 'cancelled';
  label: string;
  time?: string;
  detail?: string;
  last: boolean;
}) {
  const { t } = useTranslation();
  const done = state === 'done';
  const current = state === 'current';
  const icon = state === 'cancelled' ? 'x' : done ? 'check' : ICONS[step];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[label, t(`vendorOrders.progress.state.${state}`), time, detail].filter(Boolean).join(', ')}>
      <View style={styles.rail}>
        <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent, state === 'cancelled' && styles.dotCancelled]}>
          <Feather name={icon} size={12} color={done || current || state === 'cancelled' ? Colors.textOnPrimary : Colors.textSubtle} />
        </View>
        {!last && <View style={[styles.line, done && styles.lineDone]} />}
      </View>
      <View style={styles.text}>
        <View style={styles.head}>
          <AppText
            variant={current ? 'smallMedium' : 'small'}
            color={state === 'todo' ? Colors.textSubtle : state === 'cancelled' ? Colors.danger : current ? Colors.primary : Colors.text}
            style={styles.flex}>
            {label}
          </AppText>
          {time ? (
            <AppText variant="caption" color={Colors.textMuted}>
              {time}
            </AppText>
          ) : null}
        </View>
        {detail ? (
          <AppText variant="caption" color={step === 'paid' && done ? Colors.success : Colors.textMuted}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  rail: { alignItems: 'center', width: 24 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotCancelled: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  line: { flex: 1, width: 2, minHeight: 12, backgroundColor: Colors.border },
  lineDone: { backgroundColor: Colors.success },
  text: { flex: 1, gap: 2, paddingBottom: Spacing.md, paddingTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
