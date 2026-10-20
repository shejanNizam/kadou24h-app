/** "14:05" today, "Hier" / "lun." this week, "12 oct." before. */
export function chatTime(iso: string, lang: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const t = date.getTime();
  if (t >= startOfToday) return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (t >= startOfToday - day) return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-1, 'day');
  if (t >= startOfToday - 6 * day) return date.toLocaleDateString(lang, { weekday: 'short' });
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

/** Day separator in a thread: "Aujourd'hui", "Hier", "12 octobre" */
export function dayLabel(iso: string, lang: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (diff <= 1 && diff >= 0) {
    const label = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diff, 'day');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'long' });
}

export const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

/** 75 → "1:15" */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
