/**
 * Orders, sub-orders (one per store) and delivery legs.
 * Mirrors kadou24h-server order.interface.ts / delivery.interface.ts.
 */
import type { FileRef } from '@/types/api';

export type DeliveryType = 'local' | 'intercity' | 'station_pickup';
export type PaymentMethod = 'cod' | 'orange_money' | 'mobile_money' | 'card';
export type OrderPaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';
export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'partially_cancelled';
export type SubOrderStatus =
  /** Online order not paid yet: the store does not see it; cancelled when paymentDueAt passes */
  | 'pending_payment'
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled';
export type DeliveryStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'accepted'
  | 'declined'
  | 'going_to_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';
export type LegType = 'local' | 'first_mile' | 'line_haul' | 'last_mile';
export type EndpointKind = 'vendor' | 'station' | 'customer';

export interface GeoPoint {
  type: 'Point';
  /** [lng, lat] */
  coordinates: [number, number];
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  city: string;
  commune?: string;
  neighborhood?: string;
  landmark?: string;
  directions?: string;
  location: GeoPoint;
  placePhoto?: FileRef;
}

export interface SubOrderItem {
  _id: string;
  productId: string;
  name: string;
  image?: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  removed: boolean;
}

export interface TimelineEntry {
  _id: string;
  status: string;
  note?: string;
  at: string;
}

export interface SubOrderModification {
  _id: string;
  removedItems: { productId: string; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  oldTotal: number;
  newTotal: number;
  refundAmount: number;
  at: string;
}

export interface OrderStore {
  _id: string;
  storeName: string;
  logo?: FileRef;
  address?: { text?: string; city?: string };
  isPlatformStore?: boolean;
}

export interface Vehicle {
  type?: string;
  color?: string;
  brand?: string;
  plateNumber?: string;
}

/** The rider as the buyer sees them: no phone (chat only). */
export interface OrderRider {
  _id: string;
  userId?: { _id: string; name: string; avatar?: FileRef };
  partnerType: 'moto' | 'transit';
  vehicle?: Vehicle;
  stats?: { ratingAvg: number; ratingCount: number; completed: number };
}

export interface DeliveryLegSummary {
  _id: string;
  subOrderId: string;
  legNumber: number;
  legType: LegType;
  status: DeliveryStatus;
  fromKind: EndpointKind;
  fromName: string;
  toKind: EndpointKind;
  toName: string;
  riderId?: string;
}

export interface SubOrder {
  _id: string;
  orderId: string;
  subOrderNumber: string;
  vendorId: OrderStore;
  currentLegId?: string;
  currentRiderId?: OrderRider | null;
  items: SubOrderItem[];
  timeline: TimelineEntry[];
  modifications: SubOrderModification[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: SubOrderStatus;
  estimatedDeliveryAt?: string;
  cancellation?: { by: 'customer' | 'vendor' | 'admin' | 'system'; reason: string; at: string };
  /** COD: what this store's rider collects */
  codAmountToCollect?: number;
  deliveredAt?: string;
  createdAt: string;
  /** Customer only: legs of this store's delivery (no PINs) */
  deliveries?: DeliveryLegSummary[];
  /** Customer only: give it to the rider at the door (absent once delivered) */
  deliveryPin?: string;
  /** Customer only */
  reviewed?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  addressSnapshot: AddressSnapshot;
  deliveryType: DeliveryType;
  destinationStationId?: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  platformFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  /** Online orders: pay before this or the order is cancelled (items back in the cart) */
  paymentDueAt?: string;
  createdAt: string;
}

/** GET /orders/my-orders row */
export interface OrderListItem extends Order {
  subOrders: Pick<SubOrder, '_id' | 'subOrderNumber' | 'vendorId' | 'status' | 'total' | 'items'>[];
}

export type RefundStatus = 'pending' | 'completed' | 'rejected';

/** Money going back after a cancellation / store change / dispute (an admin approves it) */
export interface OrderRefund {
  _id: string;
  amount: number;
  requestedAmount?: number;
  status: RefundStatus;
  source: 'cancellation' | 'modification' | 'order_fees' | 'dispute' | 'admin';
  transactionId?: string;
  rejectionReason?: string;
  processedAt?: string;
  createdAt: string;
}

export interface OrderDetails {
  order: Order;
  subOrders: SubOrder[];
  refunds?: OrderRefund[];
}

// ── Checkout ─────────────────────────────────────────────────────────
export interface CheckoutInput {
  addressId?: string;
  deliveryType: DeliveryType;
  destinationStationId?: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  /** Promo code typed at checkout */
  couponCode?: string;
}

export interface StationRoute {
  fromStationName: string;
  fromCity: string;
  toStationName: string;
  toCity: string;
  estimatedHours?: number;
}

export interface CheckoutSplit {
  vendorId: string;
  storeName: string;
  items: SubOrderItem[];
  subtotal: number;
  deliveryFee: number;
  deliveryDistanceKm?: number;
  stationRoute?: StationRoute;
  /** This store's part of the promo discount */
  discountShare?: number;
  total: number;
}

export interface CheckoutSummary {
  addressSnapshot: AddressSnapshot;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  /** Cash on delivery only up to `limit` GNF per store (a rider's cash limit); above it, pay online */
  cod: { allowed: boolean; limit: number };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    taxAmount: number;
    platformFee: number;
    discount: number;
    total: number;
  };
  /** The promo code typed: valid (with the discount) or why it can't be used (English server text) */
  coupon?: { code: string; valid: boolean; discount: number; description?: string; message?: string };
  vendorSplits: CheckoutSplit[];
}

export interface TransitStation {
  _id: string;
  name: string;
  city: string;
  region?: string;
  location: GeoPoint;
}

// ── Payments ─────────────────────────────────────────────────────────
export type PaymentPurpose = 'order' | 'subscription' | 'job_publish' | 'cv_unlock' | 'spontaneous_application';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface Payment {
  _id: string;
  purpose: PaymentPurpose;
  refId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

// ── Disputes, reviews, tracking ──────────────────────────────────────
export type DisputeStatus = 'open' | 'resolved' | 'rejected';

export interface Dispute {
  _id: string;
  orderId: string | { _id: string; orderNumber: string };
  subOrderId?: string;
  amount?: number;
  reason: string;
  adminResolution?: string;
  status: DisputeStatus;
  createdAt: string;
}

export interface TrackedDelivery {
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
  riderId?: (OrderRider & { lastLocation?: GeoPoint; lastLocationAt?: string }) | null;
  subOrderId: { _id: string; subOrderNumber: string; status: SubOrderStatus; total: number };
  orderId: { _id: string; orderNumber: string };
  /** Only for the person receiving the parcel (the buyer, on the final leg) */
  handoverPin?: string;
  isReceiver: boolean;
}

/** Leg position → [lat, lng] for maps */
export const toLatLng = (p?: GeoPoint) => (p ? { lat: p.coordinates[1], lng: p.coordinates[0] } : undefined);
