/**
 * ThemeStyles - Server Component for Theme CSS Injection
 *
 * This component fetches the resolved theme for a promoter and injects
 * the generated CSS variables into the page. It runs on the server side
 * for optimal performance and SEO.
 *
 * Usage:
 *   <ThemeStyles promoterSlug="bot" />
 *
 * The CSS is injected as a <style> tag with CSS custom properties that
 * can be used throughout the page via var(--color-primary), etc.
 */

import { generateThemeCSSBySlug } from '@/lib/services/promoterThemeService'

interface ThemeStylesProps {
  promoterSlug: string
}

export async function ThemeStyles({ promoterSlug }: ThemeStylesProps) {
  // Generate CSS on the server
  const css = await generateThemeCSSBySlug(promoterSlug)

  return (
    <style
      id={`theme-${promoterSlug}`}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}

/**
 * ThemeStylesClient - Client-side wrapper for dynamic theme updates
 *
 * Use this component if you need to update theme styles dynamically
 * on the client side (e.g., live preview in admin).
 */
export function ThemeStylesClient({ css, id }: { css: string; id: string }) {
  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}
