/**
 * Delivery status → colour and the rider's one next action (APP_SPEC §7.4).
 * Labels live in i18n: status.delivery.<value>, rider.step.<action>.
 */
import type { TFunction } from 'i18next';

import type { StatusTone } from '@/components/ui/StatusPill';
import type { DeliveryStatus, GeoPoint } from '@/features/orders/types';

import type { RiderDelivery } from './types';

export const DELIVERY_TONE: Record<DeliveryStatus, StatusTone> = {
  pending_assignment: 'grey',
  assigned: 'blue',
  accepted: 'blue',
  declined: 'grey',
  going_to_pickup: 'amber',
  picked_up: 'purple',
  in_transit: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

/** The rider sees a job waiting for their answer as "a trip for you" (client wording) */
export const riderStatusLabel = (status: DeliveryStatus, t: TFunction) =>
  status === 'assigned' ? t('rider.assignedToYou') : t(`status.delivery.${status}`);

/**
 * What the big bottom button does now:
 * answer (accept / decline) → leave for pickup → type the pickup code →
 * type the handover code → done.
 */
export type RiderStep = 'answer' | 'leave' | 'pickupCode' | 'handoverCode' | 'done';

export function riderStep(status: DeliveryStatus): RiderStep {
  switch (status) {
    case 'assigned':
      return 'answer';
    case 'accepted':
      return 'leave';
    case 'going_to_pickup':
      return 'pickupCode';
    case 'picked_up':
    case 'in_transit':
      return 'handoverCode';
    default:
      return 'done';
  }
}

/** Who stands on the other side of a handover */
export type Party = 'store' | 'customer' | 'carDriver' | 'motoRider';

type LegLike = Pick<RiderDelivery, 'fromKind' | 'toKind' | 'legType' | 'orderId'>;

/**
 * Who gives me the parcel: the store, or at a bus station the driver of the
 * previous leg (the moto rider for the car leg, the car driver for the last mile).
 */
export const pickupFrom = (d: LegLike): Party =>
  d.fromKind === 'vendor' ? 'store' : d.legType === 'line_haul' ? 'motoRider' : 'carDriver';

/**
 * Who I give it to: the customer (at the door, or at the destination station
 * for "station pickup" orders), else the next leg's driver at the station.
 */
export const handoverTo = (d: LegLike): Party =>
  d.toKind === 'customer' || (d.legType === 'line_haul' && d.orderId?.deliveryType === 'station_pickup')
    ? 'customer'
    : d.legType === 'first_mile'
      ? 'carDriver'
      : 'motoRider';

/** Before pickup the rider heads to the giver; after, to the receiver */
export const headingTo = (d: Pick<RiderDelivery, 'status'>) => (riderStep(d.status) === 'handoverCode' ? 'to' : 'from');

/** Cash the customer pays me at the door (COD final leg), else 0 */
export const cashToCollect = (d: Pick<RiderDelivery, 'collectsCash' | 'subOrderId'>) =>
  d.collectsCash ? (d.subOrderId?.codAmountToCollect ?? 0) : 0;

/** Google Maps directions (works without our Maps key; opens the app if installed) */
export const directionsUrl = (p: GeoPoint) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.coordinates[1]},${p.coordinates[0]}&travelmode=driving`;

/** Straight-line distance in km (good enough for "2.4 km" on a card) */
export function distanceKm(a: { lat: number; lng: number }, b: GeoPoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const [lng, lat] = b.coordinates;
  const dLat = toRad(lat - a.lat);
  const dLng = toRad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Pickup → drop distance of a leg */
export const legKm = (d: Pick<RiderDelivery, 'fromLocation' | 'toLocation'>) =>
  d.fromLocation && d.toLocation
    ? distanceKm({ lat: d.fromLocation.coordinates[1], lng: d.fromLocation.coordinates[0] }, d.toLocation)
    : undefined;
