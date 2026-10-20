/**
 * Status → colour for vendor screens (APP_SPEC §9). Labels live in i18n.
 */
import type { StatusTone } from '@/components/ui/StatusPill';
import type { WithdrawalStatus } from '@/features/wallet/types';
import type { ApplicationStatus } from '@/types/api';

import type { MyProduct, ProductApprovalStatus } from './types';

export const APPLICATION_TONE: Record<ApplicationStatus, StatusTone> = {
  draft: 'grey',
  pending: 'amber',
  needs_changes: 'orange',
  approved: 'green',
  rejected: 'red',
  suspended: 'red',
};

export const PRODUCT_APPROVAL_TONE: Record<ProductApprovalStatus, StatusTone> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
};

export const WITHDRAWAL_TONE: Record<WithdrawalStatus, StatusTone> = {
  pending: 'amber',
  approved: 'blue',
  completed: 'green',
  rejected: 'red',
};

/** Stock at or under the store's alert level (but not sold out) */
export const isLowStock = (p: Pick<MyProduct, 'stockQty' | 'minStockAlert'>) => p.stockQty > 0 && p.stockQty <= p.minStockAlert;
