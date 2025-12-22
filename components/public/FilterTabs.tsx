/**
 * FilterTabs Component
 * Based on Barren theme .filter-tag and .controls styles
 *
 * Used for filtering events by category, date, etc.
 */

'use client'

import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterTabsProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  variant?: 'pills' | 'underline' | 'buttons'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function FilterTabs({
  options,
  value,
  onChange,
  variant = 'pills',
  size = 'md',
  fullWidth = false,
  className,
}: FilterTabsProps) {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-5 py-2.5',
  }

  const baseStyles = 'font-medium transition-all duration-200 whitespace-nowrap'

  const variantStyles = {
    pills: {
      container: 'flex flex-wrap gap-2',
      inactive: 'bg-[#f1f2f3] text-[#717171] rounded-full hover:bg-[#e8f7f7] hover:text-[#6ac045]',
      active: 'bg-[#6ac045] text-white rounded-full',
    },
    underline: {
      container: 'flex border-b border-[#efefef]',
      inactive: 'text-[#717171] border-b-2 border-transparent hover:text-[#6ac045] -mb-px',
      active: 'text-[#6ac045] border-b-2 border-[#6ac045] -mb-px',
    },
    buttons: {
      container: 'flex flex-wrap gap-2',
      inactive: 'bg-white text-[#717171] border-2 border-[#efefef] rounded-md hover:border-[#6ac045] hover:text-[#6ac045]',
      active: 'bg-white text-[#6ac045] border-2 border-[#6ac045] rounded-md',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        styles.container,
        fullWidth && 'w-full',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            baseStyles,
            sizeClasses[size],
            value === option.value ? styles.active : styles.inactive,
            fullWidth && variant !== 'underline' && 'flex-1'
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                'ml-1.5 text-xs',
                value === option.value ? 'opacity-80' : 'text-[#a0a0a0]'
              )}
            >
              ({option.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default FilterTabs
