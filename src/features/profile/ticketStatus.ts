import type { StatusTone } from '@/components/ui/StatusPill';

import type { TicketStatus, TicketType, TicketUrgency } from './api';

export const TICKET_TONE: Record<TicketStatus, StatusTone> = {
  open: 'blue',
  in_progress: 'amber',
  resolved: 'green',
  closed: 'grey',
};

export const TICKET_TYPES: TicketType[] = [
  'order_issue',
  'payment_dispute',
  'account_access',
  'rider_conduct',
  'vendor_inquiry',
  'app_bug',
  'general',
  'other',
];

export const TICKET_URGENCIES: TicketUrgency[] = ['low', 'medium', 'high', 'critical'];
