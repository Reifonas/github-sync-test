import React from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'ghost' | 'filled' | 'bordered' | 'modern'
  size?: 'sm' | 'default' | 'lg'
  error?: boolean
  success?: boolean
  loading?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', size = 'default', error = false, success = false, loading = false, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            // Base styles
            'flex w-full font-medium transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30',
            // Variant styles
            {
              // Default variant
              'rounded-lg sm:rounded-xl border border-border bg-background hover:border-border/80 focus:border-primary/60 shadow-sm focus:shadow-md': variant === 'default',
              
              // Ghost variant
              'rounded-lg sm:rounded-xl border-0 bg-transparent hover:bg-muted/40 focus:bg-background/80': variant === 'ghost',
              
              // Filled variant
              'rounded-lg sm:rounded-xl border-0 bg-muted/80 hover:bg-muted/60 focus:bg-background focus:shadow-md': variant === 'filled',
              
              // Bordered variant
              'rounded-lg sm:rounded-xl border-2 border-border bg-background hover:border-primary/30 focus:border-primary shadow-sm focus:shadow-md': variant === 'bordered',
              
              // Modern variant
              'rounded-xl sm:rounded-2xl border border-border/40 bg-gradient-to-r from-background via-background/98 to-background/95 backdrop-blur-sm hover:border-primary/30 focus:border-primary/50 shadow-glass focus:shadow-strong': variant === 'modern',
            },
            // Size styles
            {
              'h-8 sm:h-9 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm': size === 'sm',
              'h-10 sm:h-11 px-3 sm:px-4 py-2 sm:py-3 text-sm': size === 'default',
              'h-12 sm:h-13 px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base': size === 'lg',
            },
            // State styles
            error && 'border-destructive focus:border-destructive focus:ring-destructive/15 bg-destructive/5',
            success && 'border-success focus:border-success focus:ring-success/15 bg-success/5',
            loading && 'pr-8 sm:pr-10',
            className
          )}
          ref={ref}
          disabled={loading || props.disabled}
          {...props}
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        )}
        
        {/* Success icon */}
        {success && !loading && (
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-success">
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        
        {/* Error icon */}
        {error && !loading && (
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-destructive">
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }