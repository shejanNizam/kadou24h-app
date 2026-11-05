import type { TFunction } from 'i18next';

import type { WalletEvent, WalletTransaction } from './types';

type Rule = [RegExp, string, (m: RegExpMatchArray, tx: WalletTransaction) => Record<string, string>];

/** The text of each wallet event (walletHistory.note.*) */
const EVENT_KEYS: Record<WalletEvent, string> = {
  sale_held: 'saleHeld',
  sale_released: 'saleReleased',
  commission: 'commission',
  sale_cancelled: 'saleCancelled',
  sale_changed: 'saleChanged',
  checkout_failed: 'checkoutFailed',
  refund: 'refund',
  delivery_fee: 'deliveryFee',
  cash_collected: 'cashCollected',
  cash_offset: 'cashOffset',
  cash_settled: 'cashSettled',
  withdrawal: 'withdrawal',
  withdrawal_fee: 'withdrawalFee',
  withdrawal_rejected: 'withdrawalRejected',
};

/**
 * Wallet lines written before the server sent `event` only have an English note
 * ("Escrow released for sub-order AP12-1"): these are the notes it wrote, each
 * shown in the user's language (client, 2026-10-30). A note typed by the team,
 * or one not listed here, is shown as written.
 */
const RULES: Rule[] = [
  [/^Escrow held for sub-order (\S+)$/, 'saleHeld', (m) => ({ order: m[1] })],
  [/^Escrow released for sub-order (\S+)$/, 'saleReleased', (m) => ({ order: m[1] })],
  [/^Platform commission for sub-order (\S+)$/, 'commission', (m) => ({ order: m[1] })],
  [/^Escrow reversed for cancelled sub-order (\S+)$/, 'saleCancelled', (m) => ({ order: m[1] })],
  [/^Escrow (?:reduced|increased) due to sub-order items modification \((\S+)\)$/, 'saleChanged', (m) => ({ order: m[1] })],
  [/^Checkout failed — escrow hold undone$/, 'checkoutFailed', () => ({})],
  [/^Refund deduction for (\S+): (.*)$/s, 'refund', (m) => ({ order: m[1], reason: m[2] })],
  [/^Delivery fee earned for leg #(\d+)/, 'deliveryFee', (m, tx) => ({ leg: m[1], order: tx.subOrderNumber ?? '' })],
  [/^COD cash collected for (\S+)$/, 'cashCollected', (m) => ({ order: m[1] })],
  [/^Offset COD cash owed against available earnings$/, 'cashOffset', () => ({})],
  [/^COD cash settlement confirmed \((\w+)\)$/, 'cashSettled', (m) => ({ method: m[1] })],
  [/^Withdrawal request (\S+) \(net payout\)$/, 'withdrawal', (m) => ({ ref: m[1] })],
  [/^Fee for withdrawal request (\S+)$/, 'withdrawalFee', (m) => ({ ref: m[1] })],
  [/^Reversal of rejected withdrawal (\S+): (.*)$/s, 'withdrawalRejected', (m) => ({ ref: m[1], reason: m[2] })],
];

/** One wallet line in the user's language */
export function describeTransaction(tx: WalletTransaction, t: TFunction): string | undefined {
  const key = tx.event && EVENT_KEYS[tx.event];
  if (key) return describe(key, { ...stringify(tx.eventParams), order: String(tx.eventParams?.order ?? tx.subOrderNumber ?? '') }, t);
  if (!tx.note) return undefined;
  for (const [pattern, key, params] of RULES) {
    const m = tx.note.match(pattern);
    if (!m) continue;
    return describe(key, params(m, tx), t);
  }
  return tx.note;
}

const stringify = (params?: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]));

function describe(key: string, values: Record<string, string>, t: TFunction): string {
  if (key === 'cashSettled') values.method = t(`cash.method.${values.method}`, { defaultValue: values.method });
  if (key === 'deliveryFee' && !values.order) return t('walletHistory.note.deliveryFeeNoOrder', values);
  if (key === 'refund' && !values.reason) return t('walletHistory.note.refundNoReason', values);
  return t(`walletHistory.note.${key}`, values);
}
