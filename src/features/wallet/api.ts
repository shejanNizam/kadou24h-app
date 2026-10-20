/**
 * Earnings & withdrawals (server: wallet.route.ts). Every call names the
 * wallet with `mode` (vendor | rider): one user may have both.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  EarningsSummary,
  PayoutMethod,
  PayoutMethodInput,
  SummaryRange,
  Wallet,
  WalletMode,
  WalletTransaction,
  Withdrawal,
} from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const walletApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<Wallet, WalletMode>({
      query: (mode) => ({ url: '/wallets/me', params: { mode } }),
      transformResponse: unwrap<Wallet>,
      providesTags: ['Wallet'],
    }),
    getEarningsSummary: build.query<EarningsSummary, { mode: WalletMode; range: SummaryRange }>({
      query: (params) => ({ url: '/wallets/me/summary', params }),
      transformResponse: unwrap<EarningsSummary>,
      providesTags: ['Wallet'],
    }),

    // ── Payout methods (returns the whole updated list) ────────────
    addPayoutMethod: build.mutation<PayoutMethod[], PayoutMethodInput & { mode: WalletMode }>({
      query: (body) => ({ url: '/wallets/me/payout-methods', method: 'POST', body }),
      transformResponse: unwrap<PayoutMethod[]>,
      invalidatesTags: ['Wallet'],
    }),
    updatePayoutMethod: build.mutation<PayoutMethod[], Partial<PayoutMethodInput> & { mode: WalletMode; id: string }>({
      query: ({ id, ...body }) => ({ url: `/wallets/me/payout-methods/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<PayoutMethod[]>,
      invalidatesTags: ['Wallet'],
    }),
    deletePayoutMethod: build.mutation<PayoutMethod[], { mode: WalletMode; id: string }>({
      query: ({ id, mode }) => ({ url: `/wallets/me/payout-methods/${id}`, method: 'DELETE', params: { mode } }),
      transformResponse: unwrap<PayoutMethod[]>,
      invalidatesTags: ['Wallet'],
    }),

    // ── Withdrawals & ledger ───────────────────────────────────────
    requestWithdrawal: build.mutation<Withdrawal, { mode: WalletMode; amount: number; payoutMethodId: string }>({
      query: (body) => ({ url: '/wallets/me/withdrawals', method: 'POST', body }),
      transformResponse: unwrap<Withdrawal>,
      invalidatesTags: ['Wallet'],
    }),
    getWithdrawals: build.infiniteQuery<Paginated<Withdrawal>, WalletMode, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({ url: '/wallets/me/withdrawals', params: { mode: queryArg, page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<Withdrawal>,
      providesTags: ['Wallet'],
    }),
    getTransactions: build.infiniteQuery<Paginated<WalletTransaction>, WalletMode, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({ url: '/wallets/me/transactions', params: { mode: queryArg, page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<WalletTransaction>,
      providesTags: ['Wallet'],
    }),
  }),
});

export const {
  useGetWalletQuery,
  useGetEarningsSummaryQuery,
  useAddPayoutMethodMutation,
  useUpdatePayoutMethodMutation,
  useDeletePayoutMethodMutation,
  useRequestWithdrawalMutation,
  useGetWithdrawalsInfiniteQuery,
  useGetTransactionsInfiniteQuery,
} = walletApi;
