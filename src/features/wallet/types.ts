/**
 * Wallet: balances, payout methods, withdrawals, ledger. One wallet per earning
 * mode (vendor / rider). Mirrors kadou24h-server wallet.interface.ts and
 * wallet.summary.service.ts. All amounts are whole GNF.
 */
import type { FileRef } from '@/types/api';

export type WalletMode = 'vendor' | 'rider';
export type PayoutMethodType = 'orange_money' | 'mobile_money' | 'bank';
export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type TransactionType =
  | 'earning_held'
  | 'earning_held_reversed'
  | 'earning_released'
  | 'commission'
  | 'withdrawal'
  | 'withdrawal_fee'
  | 'withdrawal_reversal'
  | 'refund_deduction'
  | 'cod_collected'
  | 'cod_settled'
  | 'cod_offset'
  | 'adjustment';

export interface PayoutMethod {
  _id: string;
  type: PayoutMethodType;
  accountName: string;
  /** Phone number for Orange Money / Mobile Money */
  accountNumber: string;
  bankName?: string;
  isDefault: boolean;
}

export interface Wallet {
  _id: string;
  ownerMode: WalletMode;
  heldBalance: number;
  availableBalance: number;
  totalEarned: number;
  totalCommission: number;
  totalWithdrawn: number;
  cashOwed: number;
  payoutMethods: PayoutMethod[];
}

export type SummaryRange = '7d' | '30d' | '6m' | '12m';

export interface EarningsBucket {
  /** YYYY-MM-DD (7d / 30d) or YYYY-MM (6m / 12m) */
  key: string;
  earnings: number;
  count: number;
}

export interface EarningsSummary {
  mode: WalletMode;
  range: SummaryRange;
  balances: {
    availableBalance: number;
    heldBalance: number;
    totalEarned: number;
    totalCommission: number;
    totalWithdrawn: number;
    withdrawable: number;
    /** Vendor: orders still running */
    inEscrow?: number;
    /** Vendor: delivered COD orders whose cash the rider still holds */
    awaitingCod?: number;
    /** Rider */
    cashOwed?: number;
    cashLimit?: number;
    /** Rider: declared hand-overs waiting for an admin (still inside cashOwed) */
    cashDeclared?: number;
  };
  counts: { newOrders?: number; activeOrders?: number; newRequests?: number; activeDeliveries?: number };
  series: EarningsBucket[];
  today: { earnings: number; count: number };
  period: { from: string; to: string; earnings: number; count: number };
}

export interface Withdrawal {
  _id: string;
  requestNumber: string;
  ownerMode: WalletMode;
  amount: number;
  fee: number;
  netAmount: number;
  payoutMethodSnapshot: { type: PayoutMethodType; accountName: string; accountNumber: string; bankName?: string };
  status: WithdrawalStatus;
  rejectionReason?: string;
  transactionId?: string;
  receiptImage?: FileRef;
  processedAt?: string;
  createdAt: string;
}

export interface WalletTransaction {
  _id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  subOrderId?: string;
  subOrderNumber?: string;
  /** English text, for the team: shown only when there is no `event` (older lines) */
  note?: string;
  /** What the line is (wallet.interface.ts WalletEvent), described in the user's language */
  event?: WalletEvent;
  eventParams?: Record<string, string | number>;
  createdAt: string;
}

export type WalletEvent =
  | 'sale_held'
  | 'sale_released'
  | 'commission'
  | 'sale_cancelled'
  | 'sale_changed'
  | 'checkout_failed'
  | 'refund'
  | 'delivery_fee'
  | 'cash_collected'
  | 'cash_offset'
  | 'cash_settled'
  | 'withdrawal'
  | 'withdrawal_fee'
  | 'withdrawal_rejected';

export interface WithdrawalFee {
  method: PayoutMethodType;
  type: 'fixed' | 'percent';
  value: number;
}

export interface PayoutMethodInput {
  type: PayoutMethodType;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  isDefault?: boolean;
}

export const MIN_WITHDRAWAL = 5000;
export const MAX_PAYOUT_METHODS = 5;

/** Same rule as the server (wallet.service requestWithdrawal); shown live, the server decides */
export const withdrawalFee = (amount: number, type: PayoutMethodType, fees: WithdrawalFee[] = []) => {
  const rule = fees.find((f) => f.method === type);
  if (!rule || amount <= 0) return 0;
  return rule.type === 'percent' ? Math.round(amount * (rule.value / 100)) : rule.value;
};
