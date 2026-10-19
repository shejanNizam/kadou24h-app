/**
 * Formatting helpers. Money is always integer GNF: "125 000 GNF".
 */
import { config } from './config';

const NBSP = ' ';

/** 125000 → "125 000 GNF" (non-breaking spaces so it never wraps). */
export const formatGNF = (amount: number | null | undefined): string => {
  const value = Math.round(amount ?? 0);
  const digits = Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${value < 0 ? '-' : ''}${digits}${NBSP}GNF`;
};

/** Whatever the user typed → E.164 (+224…). Guinea is the default country. */
export const toE164 = (input: string): string => {
  const cleaned = input.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  const country = config.defaultCountryCode.slice(1);
  if (cleaned.startsWith(country) && cleaned.length === country.length + 9) return `+${cleaned}`;
  return `${config.defaultCountryCode}${cleaned}`;
};

/** Same rule as the server (international format), plus 9 digits for Guinea. */
export const isValidPhone = (e164: string): boolean => {
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) return false;
  if (e164.startsWith('+224')) return e164.length === 13;
  return true;
};

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Login accepts a phone or an email. */
export const toIdentifier = (input: string): string =>
  input.includes('@') ? input.trim().toLowerCase() : toE164(input);

/** "620123456" → "620 12 34 56" while typing a Guinean number. */
export const formatNationalPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

/** 75 → "01:15" */
export const formatCountdown = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
