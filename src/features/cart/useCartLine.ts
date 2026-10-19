import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';

import { useAddToCartMutation, useGetCartQuery, useUpdateCartQtyMutation } from './api';

/** Quantity of one product in the cart + add / +1 / −1, for cards and the product page. */
export function useCartLine(productId: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: cart } = useGetCartQuery(undefined, { skip: !signedIn });
  const [add, addState] = useAddToCartMutation();
  const [update, updateState] = useUpdateCartQtyMutation();

  const line = cart?.groupedByVendor.flatMap((g) => g.items).find((i) => i.productId === productId);
  const qty = line?.qty ?? 0;
  const busy = addState.isLoading || updateState.isLoading;

  const run = (request: () => Promise<unknown>) =>
    request().catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'));

  return {
    qty,
    busy,
    /** First add (guests are asked to sign in first). */
    add: (amount = 1) =>
      requireAuth(() =>
        run(async () => {
          await add({ productId, qty: amount }).unwrap();
          toast.show(t('cart.added'));
        }),
      ),
    increment: () => run(() => update({ productId, qty: qty + 1 }).unwrap()),
    decrement: () => run(() => update({ productId, qty: Math.max(0, qty - 1) }).unwrap()),
  };
}
