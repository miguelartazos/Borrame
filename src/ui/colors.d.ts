/**
 * Color token definitions for SwipeClean
 * These colors are imported from colors.json
 */
export interface ColorTokens {
  /** Main app background - darkest level */
  bg: string;
  /** Card background - elevated surfaces */
  card: string;
  /** Surface background - secondary elevated surfaces */
  surface: string;
  /** Primary text color - high contrast */
  textPrimary: string;
  /** Secondary text color - medium contrast */
  textSecondary: string;
  /** Divider lines and borders */
  line: string;
  /** Primary brand color - orange (WCAG issue with white text) */
  primary: string;
  /** Muted primary - lighter orange */
  primaryMuted: string;
  /** Success state - green (WCAG issue with white text) */
  success: string;
  /** Danger/delete state - red (WCAG issue with white text) */
  danger: string;
  /** Transparent color */
  transparent: string;
  /** Pure white */
  white: string;
  /** Pure black */
  black: string;
}

declare const colors: ColorTokens;
export default colors;
