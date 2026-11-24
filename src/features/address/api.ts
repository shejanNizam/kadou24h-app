/**
 * Saved addresses (server: address.route.ts). Built for Guinea: no street
 * names, so the map pin + gate photo + landmark matter most.
 * "Livrer à …" (Home, checkout) is always the default address.
 */
import { api, unwrap } from '@/lib/api/api';
import type { FileRef } from '@/types/api';

export type AddressLabel = 'home' | 'office' | 'other';

export interface Address {
  _id: string;
  label: AddressLabel;
  customLabel?: string;
  fullName: string;
  phone: string;
  region?: string;
  city: string;
  commune?: string;
  neighborhood?: string;
  landmark?: string;
  directions?: string;
  location: { lat: number; lng: number };
  placePhoto?: FileRef;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, '_id' | 'isDefault'> & { isDefault?: boolean };

/** The server allows 10 per user */
export const MAX_ADDRESSES = 10;

export const addressApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query<Address[], void>({
      query: () => '/addresses',
      transformResponse: unwrap<Address[]>,
      providesTags: ['Address'],
    }),
    createAddress: build.mutation<Address, AddressInput>({
      query: (body) => ({ url: '/addresses', method: 'POST', body }),
      transformResponse: unwrap<Address>,
      invalidatesTags: ['Address'],
    }),
    updateAddress: build.mutation<Address, { id: string } & Partial<AddressInput>>({
      query: ({ id, ...body }) => ({ url: `/addresses/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<Address>,
      invalidatesTags: ['Address'],
    }),
    setDefaultAddress: build.mutation<Address, string>({
      query: (id) => ({ url: `/addresses/${id}/default`, method: 'PATCH' }),
      transformResponse: unwrap<Address>,
      invalidatesTags: ['Address'],
    }),
    deleteAddress: build.mutation<unknown, string>({
      query: (id) => ({ url: `/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Address'],
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useSetDefaultAddressMutation,
  useDeleteAddressMutation,
} = addressApi;

/** "Kipé, Ratoma" — the short line under a label */
/** Saved before the quartier became mandatory (client, 2026-11-24): to complete before ordering or booking */
export const needsNeighborhood = (a: Pick<Address, 'neighborhood'>) => !a.neighborhood?.trim();

export const addressLine = (a: Pick<Address, 'neighborhood' | 'commune' | 'city'>) =>
  [a.neighborhood, a.commune, a.city].filter(Boolean).join(', ');

/** The default address, else the first one. */
export const pickDefaultAddress = (list?: Address[]) => list?.find((a) => a.isDefault) ?? list?.[0];
