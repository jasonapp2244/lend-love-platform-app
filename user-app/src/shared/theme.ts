/**
 * Lend Love™ Brand Theme
 * Source of truth for colors, typography, spacing — shared between mobile + admin.
 */

export const brandColors = {
  // Primary — Lend Green
  primary: '#3D9A2E',
  primaryLight: '#5DBF3F',
  primaryDark: '#236E16',

  // Secondary — Lend Gold
  secondary: '#F5A800',
  secondaryDark: '#C88700',

  // Danger — Heart Red
  danger: '#D32F2F',
  dangerLight: '#E57373',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface Theme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  danger: string;
  dangerLight: string;
  white: string;
  black: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  successTint: string;
  warningTint: string;
  dangerTint: string;
}

export const darkTheme: Theme = {
  ...brandColors,
  bgBase: '#0D0D0D',
  bgSurface: '#1A1A1A',
  bgElevated: '#242424',
  border: '#2E2E2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#5A5A5A',
  success: '#3D9A2E',
  warning: '#F5A800',
  successTint: '#1A3A1A',
  warningTint: '#3A2E0A',
  dangerTint: '#3A0A0A',
};

export const lightTheme: Theme = {
  ...brandColors,
  bgBase: '#F4F6F4',
  bgSurface: '#FFFFFF',
  bgElevated: '#EEFAEA',
  border: '#D8E8D8',
  textPrimary: '#121212',
  textSecondary: '#555555',
  textMuted: '#9E9E9E',
  success: '#3D9A2E',
  warning: '#F5A800',
  successTint: '#E8F5E9',
  warningTint: '#FFF8E1',
  dangerTint: '#FFEBEE',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  numeric: { fontSize: 24, fontWeight: '700' as const, lineHeight: 28 },
} as const;
