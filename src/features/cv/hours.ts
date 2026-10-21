import type { TFunction } from 'i18next';

import type { WorkingHours } from './types';

/** Monday first; values are 0 (Sunday) … 6 */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** "Lun – Sam · 08:00–18:00", or "Lun, Mer, Ven · …" when the days are not in a row. */
export function formatWorkingHours(t: TFunction, hours?: WorkingHours | null): string | undefined {
  if (!hours?.days.length || !hours.from || !hours.to) return undefined;
  const order = WEEK.filter((d) => hours.days.includes(d));
  const first = WEEK.indexOf(order[0]);
  const inARow = order.length > 2 && order.every((d, i) => WEEK.indexOf(d) === first + i);
  const days = inARow
    ? `${t(`worker.days.${order[0]}`)} – ${t(`worker.days.${order[order.length - 1]}`)}`
    : order.map((d) => t(`worker.days.${d}`)).join(', ');
  return `${days} · ${hours.from}–${hours.to}`;
}
