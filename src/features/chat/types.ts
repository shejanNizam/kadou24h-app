/** Chat — mirrors kadou24h-server chat.interface.ts (+ the app-facing `peer`). */
import type { AppMode, FileRef } from '@/types/api';

export type ConversationType = 'order' | 'buyer_seller' | 'worker' | 'job_application' | 'ride';
export type MessageType = 'text' | 'voice' | 'image' | 'system';
export type ModerationStatus = 'clean' | 'masked' | 'blocked';

/** What a chat is about — the server works out the other person */
export type StartConversation =
  | { type: 'buyer_seller'; vendorId: string }
  | { type: 'worker'; workerProfileId: string }
  /** From a booking: the customer and the worker can write to each other */
  | { type: 'worker'; bookingId: string }
  | { type: 'order'; subOrderId: string; with: 'vendor' | 'rider' | 'customer' }
  | { type: 'job_application'; applicationId: string }
  /** Moto-taxi: the passenger ↔ the rider who took the ride (messages only while it is going on) */
  | { type: 'ride'; rideId: string };

export interface Conversation {
  _id: string;
  type: ConversationType;
  orderId?: string;
  subOrderId?: { _id: string; subOrderNumber: string; orderId?: string; status?: string } | null;
  applicationId?: string;
  workerProfileId?: string;
  rideId?: { _id: string; rideNumber: string; status: string } | null;
  /** Voice notes: every chat except job applications (server decides) */
  allowVoice: boolean;
  lastMessage?: { text?: string; type: MessageType; senderId?: string; at: string };
  updatedAt: string;
  myMode: AppMode;
  myUnread: number;
  /** I blocked the other person (they are never told) */
  blockedByMe?: boolean;
  /** The other person (a store shows as the store). Never a phone. */
  peer: { userId: string; mode: AppMode; name: string; avatar?: FileRef; vendorId?: string };
}

export interface Message {
  _id: string;
  conversationId: string;
  /** Populated in lists; a plain id in socket events; null for system notices */
  senderId: { _id: string; name: string; avatar?: FileRef } | string | null;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaDurationSec?: number;
  moderationStatus: ModerationStatus;
  createdAt: string;
  /** Local only: still sending */
  pending?: boolean;
}

export const senderIdOf = (m: Message) => (m.senderId && typeof m.senderId === 'object' ? m.senderId._id : m.senderId);
