import type { TFunction } from 'i18next';

import type { WalletTransaction } from './types';

type Rule = [RegExp, string, (m: RegExpMatchArray, tx: WalletTransaction) => Record<string, string>];

/**
 * The server writes each wallet line's note in English ("Escrow released for
 * sub-order AP12-1"). These are the notes it writes; each is shown in the user's
 * language instead (client, 2026-10-30). A note typed by the team, or one not
 * listed here, is shown as written.
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

export function describeTransaction(tx: WalletTransaction, t: TFunction): string | undefined {
  if (!tx.note) return undefined;
  for (const [pattern, key, params] of RULES) {
    const m = tx.note.match(pattern);
    if (!m) continue;
    const values = params(m, tx);
    if (key === 'cashSettled') values.method = t(`cash.method.${values.method}`, { defaultValue: values.method });
    if (key === 'deliveryFee' && !values.order) return t('walletHistory.note.deliveryFeeNoOrder', values);
    return t(`walletHistory.note.${key}`, values);
  }
  return tx.note;
}
