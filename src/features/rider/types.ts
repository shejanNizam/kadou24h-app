/**
 * Rider mode (moto; bus drivers share the application and the money screens):
 * my application / profile, my delivery legs, COD cash hand-overs and the
 * stores I deliver for. Mirrors kadou24h-server rider_profile, delivery
 * (tracking + handover), wallet (cod settlements) and vendor_rider_link.
 */
import type { AddressSnapshot, DeliveryStatus, DeliveryType, EndpointKind, GeoPoint, LegType, PaymentMethod, SubOrderItem, TransitStation } from '@/features/orders/types';
import type { LinkStatus } from '@/features/vendor/types';
import type { ApplicationStatus, FileRef } from '@/types/api';

// ── Application / profile ────────────────────────────────────────────
export type PartnerType = 'moto' | 'transit';
export type VehicleType = 'motorbike' | 'bicycle' | 'car' | 'bus' | 'minibus';
export type RiderDocumentType = 'driver_license' | 'national_id' | 'vehicle_registration';

/** Same rule as the server (no bicycle bus drivers) */
export const VEHICLES_BY_PARTNER: Record<PartnerType, VehicleType[]> = {
  moto: ['motorbike', 'bicycle', 'car'],
  transit: ['bus', 'minibus', 'car'],
};
/** Same rule as the server: a motorised moto partner shows a plate; a moto-taxi also its vest */
export const safetyIdsNeeded = (partnerType?: PartnerType, vehicleType?: VehicleType) => ({
  plate: partnerType === 'moto' && (vehicleType === 'motorbike' || vehicleType === 'car'),
  vest: partnerType === 'moto' && vehicleType === 'motorbike',
});
export const RIDER_DOCS: RiderDocumentType[] =['national_id', 'driver_license', 'vehicle_registration'];

export interface RiderVehicle {
  type?: VehicleType;
  color?: string;
  brand?: string;
  plateNumber?: string;
}

export interface RiderDocument {
  _id: string;
  type: RiderDocumentType;
  file: FileRef;
  status: 'pending' | 'verified' | 'rejected';
  note?: string;
}

export interface TransitRoute {
  /** Populated on GET /riders/me */
  fromStationId: TransitStation | string;
  toStationId: TransitStation | string;
}

/** GET /riders/me: my own profile */
export interface MyRider {
  _id: string;
  userId: string;
  partnerType?: PartnerType;
  vehicle: RiderVehicle;
  vestNumber?: string;
  cityArea?: string;
  nationalIdNumber?: string;
  transitRoutes: TransitRoute[];
  documents: RiderDocument[];
  isOnline: boolean;
  lastLocation?: { lat: number; lng: number };
  activeDeliveryCount: number;
  cashLimit?: number;
  stats: { ratingAvg: number; ratingCount: number; totalDeliveries: number; completed: number; cancelled: number };
  approvalStatus: ApplicationStatus;
  reviewNote?: string;
  submittedAt?: string;
}

export interface RiderInput {
  partnerType?: PartnerType;
  vehicle?: RiderVehicle;
  vestNumber?: string;
  cityArea?: string;
  nationalIdNumber?: string;
  transitRoutes?: { fromStationId: string; toStationId: string }[];
  documents?: { type: RiderDocumentType; file: FileRef }[];
}

/** After approval: identity (type, national id, documents) is locked */
export type RiderUpdate = Pick<RiderInput, 'vestNumber' | 'cityArea' | 'transitRoutes'> & { vehicle?: Omit<RiderVehicle, 'type'> };

// ── Deliveries ───────────────────────────────────────────────────────
/** new = waiting for my answer · ongoing = accepted → in transit · completed = finished */
/** offers = open deliveries near me (first to accept); new = sent to me by a store */
export type RiderTab = 'offers' | 'new' | 'ongoing' | 'completed';

/** GET /deliveries/rider/offers row: no phone, the customer's area only until I accept */
export interface DeliveryOffer {
  _id: string;
  legType: LegType;
  legNumber: number;
  deliveryType?: DeliveryType;
  subOrderNumber?: string;
  itemCount: number;
  fromKind: EndpointKind;
  fromName: string;
  fromAddressText?: string;
  fromLocation: GeoPoint;
  toKind: EndpointKind;
  /** Station name; absent when it ends with the customer */
  toName?: string;
  toArea?: string;
  /** GNF: all of it is mine */
  fee: number;
  collectsCash: boolean;
  cashToCollect: number;
  /** Me → pickup (absent when my position is unknown) */
  pickupKm?: number;
  /** Pickup → drop-off, straight line */
  tripKm: number;
  /** A store I deliver for */
  fromMyStore: boolean;
  /** Bus: I run this route */
  servesRoute?: boolean;
  openedAt: string;
  canTake: boolean;
  blockedReason?: 'too_many' | 'cash_limit' | 'on_ride';
}

export interface OffersResult {
  isOnline: boolean;
  offers: DeliveryOffer[];
}

interface DeliverySubOrder {
  _id: string;
  subOrderNumber: string;
  total: number;
  status?: string;
  items: Pick<SubOrderItem, 'name' | 'qty' | 'removed' | 'image'>[];
  /** Cash the customer pays the rider (COD), when `collectsCash` */
  codAmountToCollect?: number;
}

interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  deliveryType?: DeliveryType;
  /** Only on the leg that ends with the customer (the server removes it otherwise) */
  addressSnapshot?: AddressSnapshot;
}

/** GET /deliveries/rider/my-deliveries row */
export interface RiderDelivery {
  _id: string;
  legNumber: number;
  legType: LegType;
  status: DeliveryStatus;
  fromKind: EndpointKind;
  fromName: string;
  fromLocation: GeoPoint;
  fromAddressText?: string;
  toKind: EndpointKind;
  toName: string;
  toLocation: GeoPoint;
  toAddressText?: string;
  /** GNF: all of it is mine */
  fee: number;
  collectsCash: boolean;
  declineReason?: string;
  pinLockedUntil?: string;
  /** Sent to me by a store: answer before this, or it goes back to the nearby riders */
  reservedUntil?: string;
  assignedAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  subOrderId: DeliverySubOrder;
  orderId: DeliveryOrder;
}

/** GET /deliveries/:id/track as the assigned rider */
export interface RiderDeliveryDetails extends RiderDelivery {
  isRider: boolean;
  /** Station relay: the code I show to the next driver, who types it to take the parcel */
  outgoingPickupPin?: string;
}

// ── COD cash ─────────────────────────────────────────────────────────
export type CodMethod = 'orange_money' | 'mobile_money' | 'cash_at_office' | 'earnings_offset';
export const COD_METHODS: CodMethod[] = ['orange_money', 'mobile_money', 'cash_at_office', 'earnings_offset'];

export interface CodSettlement {
  _id: string;
  amount: number;
  method: CodMethod;
  reference?: string;
  proofImage?: FileRef;
  status: 'pending' | 'confirmed' | 'rejected';
  rejectionReason?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface CodInput {
  amount: number;
  method: CodMethod;
  reference?: string;
  proofImage?: FileRef;
}

// ── My stores ────────────────────────────────────────────────────────
export interface StoreLink {
  _id: string;
  vendorId: {
    _id: string;
    storeName: string;
    logo?: FileRef;
    address?: { city?: string; text?: string };
    isOpen?: boolean;
    stats?: { ratingAvg: number; ratingCount: number };
  } | null;
  riderId: string;
  initiatedBy: 'vendor' | 'rider';
  status: LinkStatus;
  invitedAt: string;
  respondedAt?: string;
}
