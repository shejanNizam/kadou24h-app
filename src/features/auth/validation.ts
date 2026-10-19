/**
 * Client-side auth rules — same as the server (user.validation.ts), with
 * translated messages. The server still validates everything.
 */
import type { TFunction } from 'i18next';
import { z } from 'zod';

import { isEmail, isValidPhone, toE164, toIdentifier } from '@/lib/format';

export const passwordRules = {
  length: (v: string) => v.length >= 8 && v.length <= 64,
  letter: (v: string) => /[A-Za-z]/.test(v),
  digit: (v: string) => /\d/.test(v),
};

const password = (t: TFunction) =>
  z
    .string()
    .refine((v) => passwordRules.length(v) && passwordRules.letter(v) && passwordRules.digit(v), {
      message: t('validation.password'),
    });

const phone = (t: TFunction) =>
  z.string().refine((v) => isValidPhone(toE164(v)), { message: t('validation.phone') });

export const loginSchema = (t: TFunction) =>
  z.object({
    identifier: z.string().trim().min(1, t('validation.required')).refine(
      (v) => {
        const id = toIdentifier(v);
        return id.includes('@') ? isEmail(id) : isValidPhone(id);
      },
      { message: t('validation.identifier') },
    ),
    password: z.string().min(1, t('validation.required')),
  });

export const registerSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(2, t('validation.nameShort')).max(50),
    phone: phone(t),
    email: z
      .string()
      .trim()
      .refine((v) => v === '' || isEmail(v), { message: t('validation.email') }),
    password: password(t),
    referralCode: z
      .string()
      .trim()
      .refine((v) => v === '' || v.length === 8, { message: t('validation.referral') }),
  });

export const forgotSchema = (t: TFunction) => z.object({ phone: phone(t) });

export const resetSchema = (t: TFunction) =>
  z
    .object({ newPassword: password(t), confirmPassword: z.string() })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    });

export type LoginForm = z.infer<ReturnType<typeof loginSchema>>;
export type RegisterForm = z.infer<ReturnType<typeof registerSchema>>;
export type ForgotForm = z.infer<ReturnType<typeof forgotSchema>>;
export type ResetForm = z.infer<ReturnType<typeof resetSchema>>;
