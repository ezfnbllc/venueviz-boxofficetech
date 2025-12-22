/**
 * HeroBanner Component
 * Based on Barren theme .hero-banner styles
 *
 * Full-width hero section for homepage
 */

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface HeroBannerProps {
  title: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  backgroundImage?: string
  backgroundOverlay?: boolean
  alignment?: 'left' | 'center' | 'right'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HeroBanner({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  backgroundImage,
  backgroundOverlay = true,
  alignment = 'center',
  size = 'md',
  className,
}: HeroBannerProps) {
  const sizes = {
    sm: 'py-16 md:py-24',
    md: 'py-24 md:py-32',
    lg: 'py-32 md:py-48',
  }

  const alignments = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        backgroundImage ? 'bg-cover bg-center' : 'bg-gradient-to-r from-[#1d1d1d] to-[#2d2d2d]',
        sizes[size],
        className
      )}
    >
      {/* Background Image */}
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt="Hero background"
            fill
            className="object-cover"
            priority
          />
          {backgroundOverlay && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div
          className={cn(
            'flex flex-col max-w-3xl mx-auto',
            alignments[alignment]
          )}
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            {title}
          </h1>

          {subtitle && (
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
              {subtitle}
            </p>
          )}

          {(ctaText || secondaryCtaText) && (
            <div className={cn(
              'flex flex-wrap gap-4',
              alignment === 'center' ? 'justify-center' : '',
              alignment === 'right' ? 'justify-end' : ''
            )}>
              {ctaText && ctaHref && (
                <Link href={ctaHref}>
                  <Button variant="primary" size="lg">
                    {ctaText}
                    <svg
                      className="w-5 h-5 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Button>
                </Link>
              )}

              {secondaryCtaText && secondaryCtaHref && (
                <Link href={secondaryCtaHref}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-[#1d1d1d]"
                  >
                    {secondaryCtaText}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}

export default HeroBanner
