import type { TFunction } from 'i18next';

import type { Conversation } from './types';

/** Who the other person is. In a moto-taxi chat the rider is the driver and the customer the passenger. */
export const peerLabel = (c: Pick<Conversation, 'type' | 'peer'>, t: TFunction) =>
  c.type === 'ride' ? t(`chat.peerRide.${c.peer.mode}`) : t(`chat.peer.${c.peer.mode}`);

/** What the chat is about: the ride or the order number, else its kind */
export const subjectOf = (c: Pick<Conversation, 'type' | 'rideId' | 'subOrderId'>, t: TFunction) =>
  c.rideId?.rideNumber
    ? t('chat.aboutRide', { number: c.rideId.rideNumber })
    : c.subOrderId?.subOrderNumber
      ? t('chat.aboutOrder', { number: c.subOrderId.subOrderNumber })
      : t(`chat.kind.${c.type}`);

/** A moto-taxi chat takes messages only while the ride is going on (server rule) */
export const RIDE_CHAT_OPEN = ['accepted', 'arrived', 'in_progress'];
export const rideChatClosed = (c?: Pick<Conversation, 'type' | 'rideId'>) =>
  c?.type === 'ride' && Boolean(c.rideId?.status) && !RIDE_CHAT_OPEN.includes(c.rideId!.status);
