/**
 * Design tokens taken from the Figma (purple brand, rounded cards, pill buttons).
 * Use these everywhere instead of hardcoded values.
 */
export const Colors = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primarySoft: '#F3EEFF',
  primaryBorder: '#D9CCFD',
  gradient: ['#7C5CFC', '#A78BFA'] as const,

  text: '#1F1F29',
  textMuted: '#6B6B80',
  // Text colours keep at least 4.5:1 on white (WCAG AA) — read outdoors on low-end screens
  textSubtle: '#73738A',
  textOnPrimary: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#F8F8FB',
  border: '#E4E4EC',
  overlay: 'rgba(17, 17, 26, 0.45)',

  success: '#15803D',
  successSoft: '#E8F7EE',
  /** Icons and accents only — too light for text; use warningText */
  warning: '#F59E0B',
  warningText: '#B45309',
  warningSoft: '#FEF4E2',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#EAF1FE',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  sheet: 28,
  pill: 999,
} as const;

/** DM Sans weights loaded in the root layout. */
export const Fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const Typography = {
  h1: { fontFamily: Fonts.bold, fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 18 },
  button: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Tap targets never smaller than this (accessibility, gloves, small phones). */
export const MinTouch = 44;
/** Content stays readable on tablets and the wide web preview. */
export const MaxContentWidth = 560;
