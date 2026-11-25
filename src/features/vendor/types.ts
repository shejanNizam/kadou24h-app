/**
 * Vendor mode: my store (application + profile), my products, incoming
 * sub-orders, rider assignment and my rider network. Mirrors kadou24h-server
 * vendor_profile, product, order (vendor service), delivery (assignment) and
 * vendor_rider_link.
 */
import type { CategoryRef, Product } from '@/features/catalog/types';
import type {
  AddressSnapshot,
  DeliveryLegSummary,
  DeliveryType,
  OrderPaymentStatus,
  PaymentMethod,
  SubOrder,
  Vehicle,
} from '@/features/orders/types';
import type { ApplicationStatus, FileRef } from '@/types/api';

// ── Store / application ──────────────────────────────────────────────
export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEK_DAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export type VendorDocumentType = 'business_license' | 'national_id';
export type DocumentStatus = 'pending' | 'verified' | 'rejected';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface StoreAddress {
  text?: string;
  city?: string;
  country?: string;
  location?: LatLng;
}

export interface StoreAvailability {
  enabled: boolean;
  days: WeekDay[];
  /** "08:00" */
  openTime: string;
  closeTime: string;
}

export interface VerificationDocument {
  _id: string;
  type: VendorDocumentType;
  file: FileRef;
  status: DocumentStatus;
  note?: string;
}

/** GET /vendors/me: my own store, so phone and email are included */
export interface MyStore {
  _id: string;
  userId: string;
  storeName?: string;
  logo?: FileRef;
  businessCategoryId?: string;
  marketName?: string;
  businessPhone?: string;
  businessEmail?: string;
  address?: StoreAddress;
  documents: VerificationDocument[];
  isOpen: boolean;
  availability: StoreAvailability;
  stats: { ratingAvg: number; ratingCount: number; totalOrders: number; totalProducts: number; totalRevenue: number };
  approvalStatus: ApplicationStatus;
  reviewNote?: string;
  submittedAt?: string;
}

export interface StoreInput {
  storeName?: string;
  logo?: FileRef;
  businessCategoryId?: string;
  marketName?: string;
  businessPhone?: string;
  businessEmail?: string;
  address?: StoreAddress;
  documents?: { type: VendorDocumentType; file: FileRef }[];
}

// ── Products ─────────────────────────────────────────────────────────
export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected';

/** GET /products/my-products row: the store's own product, any approval state */
export interface MyProduct extends Omit<Product, 'vendorId' | 'categoryId'> {
  vendorId: string;
  categoryId: CategoryRef;
  subcategoryId?: CategoryRef | null;
  approvalStatus: ProductApprovalStatus;
  adminReviewNote?: string;
}

export interface ProductInput {
  name: string;
  categoryId: string;
  subcategoryId?: string | null;
  description?: string;
  price: number;
  discountPrice?: number | null;
  images: FileRef[];
  features: string[];
  inTheBox: string[];
  stockQty: number;
  minStockAlert: number;
  prepTimeMinutes: number;
  isAvailable: boolean;
}

/** Products tabs → `statusTab` */
export type ProductsTab = 'all' | 'active' | 'in_review' | 'out_of_stock';

// ── Orders ───────────────────────────────────────────────────────────
/** The store may see its customer's name and phone (client rule) */
export interface OrderCustomer {
  _id: string;
  name: string;
  /** Masked once the order is finished */
  phone?: string;
  avatar?: FileRef;
}

/** A rider as the store sees them: no phone (chat only) */
export interface StoreRider {
  _id: string;
  userId?: { _id: string; name: string; avatar?: FileRef };
  partnerType?: 'moto' | 'transit';
  vehicle?: Vehicle;
  vestNumber?: string;
  stats?: { ratingAvg: number; ratingCount: number; completed: number };
}

export interface VendorSubOrder extends Omit<SubOrder, 'vendorId' | 'currentRiderId' | 'orderId'> {
  vendorId: string;
  customerId: OrderCustomer;
  orderId: { _id: string; orderNumber: string; deliveryType: DeliveryType; paymentMethod: PaymentMethod; paymentStatus: OrderPaymentStatus };
  currentRiderId?: StoreRider | null;
  commissionRate: number;
  commissionAmount: number;
  vendorEarning: number;
  discountShare: number;
  /** The store's money: held until delivery; COD waits for the rider's cash; then released to the wallet */
  settlement: SettlementStatus;
  releasedAt?: string;
}

export type SettlementStatus = 'held' | 'awaiting_cod' | 'released' | 'refunded' | 'cancelled';

export interface VendorLeg extends Omit<DeliveryLegSummary, 'riderId'> {
  riderId?: StoreRider | null;
  /** What this partner earns for the leg (another city: moto → bus → moto) */
  fee?: number;
  pickedUpAt?: string;
  deliveredAt?: string;
  /** Open dispatch: nearby riders see it since (first to accept takes it) */
  offerOpenedAt?: string;
  /** Sent to one rider: they must accept before this */
  reservedUntil?: string;
  /** Nobody took it for a while: the store and the Kadou24h team were told */
  noRiderAlertedAt?: string;
}

export interface VendorSubOrderDetails {
  subOrder: Omit<VendorSubOrder, 'orderId'> & { orderId: string };
  parentOrder: {
    _id: string;
    orderNumber: string;
    addressSnapshot: AddressSnapshot;
    deliveryType: DeliveryType;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: OrderPaymentStatus;
  };
  deliveries: VendorLeg[];
  /** Give it to the rider at pickup (absent once picked up) */
  pickupPin?: string;
}

/** Orders tabs → server statuses (several = comma-separated) */
export const VENDOR_ORDER_TABS = {
  new: 'new',
  active: 'accepted,preparing,ready_for_pickup,in_delivery',
  done: 'delivered',
  cancelled: 'cancelled',
} as const satisfies Record<string, string>;
export type VendorOrdersTab = keyof typeof VENDOR_ORDER_TABS;

export interface ItemChange {
  productId: string;
  action: 'remove' | 'update_qty';
  newQty?: number;
}

// ── Riders ───────────────────────────────────────────────────────────
/** GET /deliveries/:id/available-riders (online, linked first) */
export interface AvailableRider {
  _id: string;
  userId: string;
  name: string;
  avatar?: string;
  partnerType: 'moto' | 'transit';
  vehicleType: string;
  vehicleBrand?: string;
  plateNumber?: string;
  isLinked: boolean;
  /** Bus leg: the driver runs this station → station route */
  servesRoute?: boolean;
  ratingAvg: number;
  totalDeliveries: number;
  activeDeliveryCount: number;
  distanceKm?: number;
}

/** Public rider card (search, links) */
export interface RiderCard {
  _id: string;
  userId?: { _id: string; name: string; avatar?: FileRef };
  partnerType: 'moto' | 'transit';
  vehicle?: Vehicle;
  cityArea?: string;
  isOnline: boolean;
  stats?: { ratingAvg: number; ratingCount: number; completed: number; totalDeliveries?: number };
}

export type LinkStatus = 'invited' | 'active' | 'declined' | 'removed';

export interface RiderLink {
  _id: string;
  vendorId: string;
  riderId: RiderCard | null;
  initiatedBy: 'vendor' | 'rider';
  status: LinkStatus;
  invitedAt: string;
  respondedAt?: string;
}
