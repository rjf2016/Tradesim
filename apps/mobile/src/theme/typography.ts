import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  // Headings
  h1: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
  } as TextStyle,

  h2: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  } as TextStyle,

  h3: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  } as TextStyle,

  h4: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,

  // Body
  body: {
    fontSize: 16,
    color: colors.text,
  } as TextStyle,

  bodyLarge: {
    fontSize: 18,
    color: colors.text,
  } as TextStyle,

  bodySmall: {
    fontSize: 14,
    color: colors.text,
  } as TextStyle,

  // Labels
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  } as TextStyle,

  labelSmall: {
    fontSize: 12,
    color: colors.textTertiary,
  } as TextStyle,

  // Special
  symbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,

  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,

  priceLarge: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
