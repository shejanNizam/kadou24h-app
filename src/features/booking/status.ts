import type { TFunction } from 'i18next';

import type { StatusTone } from '@/components/ui/StatusPill';

import type { BookingStatus, PenaltyNotice } from './types';

export const BOOKING_TONE: Record<BookingStatus, StatusTone> = {
  requested: 'amber',
  accepted: 'blue',
  done: 'purple',
  completed: 'green',
  declined: 'grey',
  expired: 'grey',
  cancelled: 'red',
};

/** "lun. 27 oct. · 09:00" */
export const formatBookingDate = (iso: string, lang: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatDay = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long' });

/** "5 h", "40 min" left to answer (Hermes has no Intl.RelativeTimeFormat) */
export const timeLeft = (t: TFunction, iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('booking.timeUp');
  const minutes = Math.ceil(ms / 60_000);
  return minutes >= 60 ? t('booking.hoursLeft', { count: Math.floor(minutes / 60) }) : t('booking.minutesLeft', { count: minutes });
};

/** The client's penalty wording, shown right after a cancellation that counted. */
export const penaltyMessage = (t: TFunction, p: PenaltyNotice, lang: string) => {
  if (p.role === 'customer') {
    return p.penalty === 'limited' && p.limitedUntil
      ? t('booking.penalty.customerLimited', {
          date: formatDay(p.limitedUntil, lang),
        })
      : t('booking.penalty.customerWarning');
  }
  if (p.penalty === 'warning') return t('booking.penalty.workerWarning');
  if (p.penalty === 'less_visible' && p.lessVisibleUntil) {
    const days = Math.round((new Date(p.lessVisibleUntil).getTime() - Date.now()) / 86_400_000);
    return t('booking.penalty.workerLessVisible', {
      count: days,
      date: formatDay(p.lessVisibleUntil, lang),
    });
  }
  return t('booking.penalty.workerSuspended', {
    date: p.suspendedUntil ? formatDay(p.suspendedUntil, lang) : '',
    limit: p.limitedUntil ? formatDay(p.limitedUntil, lang) : '',
  });
};
