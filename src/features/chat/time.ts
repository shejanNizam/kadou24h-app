import i18n from '@/lib/i18n';

// No Intl.RelativeTimeFormat: Hermes (the Android app's JS engine) does not have it,
// and calling it crashed the app the moment a chat had a message from today/yesterday.

/** "14:05" today, "Hier" / "lun." this week, "12 oct." before. */
export function chatTime(iso: string, lang: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const t = date.getTime();
  if (t >= startOfToday) return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (t >= startOfToday - day) return i18n.t('chat.yesterday');
  if (t >= startOfToday - 6 * day) return date.toLocaleDateString(lang, { weekday: 'short' });
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

/** Day separator in a thread: "Aujourd'hui", "Hier", "12 octobre" */
export function dayLabel(iso: string, lang: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (diff === 0) return i18n.t('chat.today');
  if (diff === 1) return i18n.t('chat.yesterday');
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'long' });
}

export const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

/** 75 → "1:15" */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
