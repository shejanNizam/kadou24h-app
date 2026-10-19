/**
 * Saved addresses (server: address.route.ts). Phase 3 only reads them for the
 * "Livrer à …" header; adding/editing comes with checkout (Phase 4).
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

export const addressApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query<Address[], void>({
      query: () => '/addresses',
      transformResponse: unwrap<Address[]>,
      providesTags: ['Address'],
    }),
  }),
});

export const { useGetAddressesQuery } = addressApi;

/** The default address, else the first one. */
export const pickDefaultAddress = (list?: Address[]) => list?.find((a) => a.isDefault) ?? list?.[0];
