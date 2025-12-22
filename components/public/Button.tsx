/**
 * Button Component
 * Based on Barren theme .main-btn styles
 *
 * Primary: Green (#6ac045) background
 * Secondary: White background with green border
 * Outline: Transparent with border
 */

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      rounded-md
    `

    const variants = {
      primary: `
        bg-[#6ac045] text-white border-2 border-[#6ac045]
        hover:bg-[#7ad254] hover:border-[#7ad254]
        focus:ring-[#6ac045]
      `,
      secondary: `
        bg-white text-[#1d1d1d] border-2 border-[#efefef]
        hover:border-[#6ac045] hover:text-[#6ac045]
        focus:ring-[#6ac045]
      `,
      outline: `
        bg-transparent text-[#6ac045] border-2 border-[#6ac045]
        hover:bg-[#6ac045] hover:text-white
        focus:ring-[#6ac045]
      `,
      ghost: `
        bg-transparent text-[#717171]
        hover:bg-[#f1f2f3] hover:text-[#000]
        focus:ring-[#6ac045]
        border-0
      `,
      danger: `
        bg-[#EF4444] text-white border-2 border-[#EF4444]
        hover:bg-[#DC2626] hover:border-[#DC2626]
        focus:ring-[#EF4444]
      `,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
