/**
 * Theme Variables Utilities
 *
 * This file provides consistent CSS variable references for use with Tailwind's
 * arbitrary value syntax. Instead of hard-coding colors, use these utilities
 * to reference theme CSS variables.
 *
 * Usage:
 *   import { tv } from '@/lib/theme-variables'
 *
 *   <button className={`${tv.bgPrimary} ${tv.textWhite} hover:${tv.bgPrimaryHover}`}>
 *     Click me
 *   </button>
 *
 * Or use the raw CSS variable references:
 *   <div className="bg-[var(--color-primary)]">
 */

// CSS Variable references for Tailwind arbitrary values
export const tv = {
  // Background colors
  bgPrimary: 'bg-[var(--color-primary)]',
  bgSecondary: 'bg-[var(--color-secondary)]',
  bgAccent: 'bg-[var(--color-accent)]',
  bgBackground: 'bg-[var(--color-background)]',
  bgSurface: 'bg-[var(--color-surface)]',
  bgSuccess: 'bg-[var(--color-success)]',
  bgWarning: 'bg-[var(--color-warning)]',
  bgError: 'bg-[var(--color-error)]',
  bgInfo: 'bg-[var(--color-info)]',

  // Text colors
  textPrimary: 'text-[var(--color-primary)]',
  textSecondary: 'text-[var(--color-secondary)]',
  textAccent: 'text-[var(--color-accent)]',
  textDefault: 'text-[var(--color-text)]',
  textMuted: 'text-[var(--color-text-secondary)]',
  textHeading: 'text-[var(--color-heading)]',
  textLink: 'text-[var(--color-link)]',
  textLinkHover: 'text-[var(--color-link-hover)]',
  textSuccess: 'text-[var(--color-success)]',
  textWarning: 'text-[var(--color-warning)]',
  textError: 'text-[var(--color-error)]',
  textInfo: 'text-[var(--color-info)]',
  textWhite: 'text-white',

  // Border colors
  borderDefault: 'border-[var(--color-border)]',
  borderPrimary: 'border-[var(--color-primary)]',
  borderSecondary: 'border-[var(--color-secondary)]',
  borderAccent: 'border-[var(--color-accent)]',

  // Ring colors (for focus states)
  ringPrimary: 'ring-[var(--color-primary)]',
  ringSecondary: 'ring-[var(--color-secondary)]',

  // Font families
  fontHeading: 'font-[var(--font-heading)]',
  fontBody: 'font-[var(--font-body)]',
  fontMono: 'font-[var(--font-mono)]',

  // Hover states (combine with hover:)
  hoverBgPrimary: 'hover:bg-[var(--color-primary)]',
  hoverBgSecondary: 'hover:bg-[var(--color-secondary)]',
  hoverTextPrimary: 'hover:text-[var(--color-primary)]',
  hoverTextLinkHover: 'hover:text-[var(--color-link-hover)]',

  // Focus states
  focusRingPrimary: 'focus:ring-[var(--color-primary)]',
  focusRingSecondary: 'focus:ring-[var(--color-secondary)]',
} as const

// Raw CSS variable names for inline styles or custom use
export const cssVars = {
  // Colors
  colorPrimary: 'var(--color-primary)',
  colorSecondary: 'var(--color-secondary)',
  colorAccent: 'var(--color-accent)',
  colorBackground: 'var(--color-background)',
  colorSurface: 'var(--color-surface)',
  colorText: 'var(--color-text)',
  colorTextSecondary: 'var(--color-text-secondary)',
  colorHeading: 'var(--color-heading)',
  colorLink: 'var(--color-link)',
  colorLinkHover: 'var(--color-link-hover)',
  colorBorder: 'var(--color-border)',
  colorSuccess: 'var(--color-success)',
  colorWarning: 'var(--color-warning)',
  colorError: 'var(--color-error)',
  colorInfo: 'var(--color-info)',

  // Typography
  fontHeading: 'var(--font-heading)',
  fontBody: 'var(--font-body)',
  fontMono: 'var(--font-mono)',
  fontSizeBase: 'var(--font-size-base)',
  lineHeight: 'var(--line-height)',

  // Layout
  containerWidth: 'var(--container-width)',
  sidebarWidth: 'var(--sidebar-width)',
  headerHeight: 'var(--header-height)',
  footerHeight: 'var(--footer-height)',
} as const

/**
 * Helper to create inline style objects using CSS variables
 *
 * Usage:
 *   <div style={themeStyle({ backgroundColor: 'primary', color: 'text' })}>
 */
export function themeStyle(styles: {
  backgroundColor?: keyof typeof colorMap
  color?: keyof typeof colorMap
  borderColor?: keyof typeof colorMap
}): React.CSSProperties {
  const result: React.CSSProperties = {}

  if (styles.backgroundColor) {
    result.backgroundColor = colorMap[styles.backgroundColor]
  }
  if (styles.color) {
    result.color = colorMap[styles.color]
  }
  if (styles.borderColor) {
    result.borderColor = colorMap[styles.borderColor]
  }

  return result
}

const colorMap = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  text: 'var(--color-text)',
  textSecondary: 'var(--color-text-secondary)',
  heading: 'var(--color-heading)',
  link: 'var(--color-link)',
  linkHover: 'var(--color-link-hover)',
  border: 'var(--color-border)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
} as const
