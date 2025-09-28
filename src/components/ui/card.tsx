import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-card/95 backdrop-blur-sm border border-border/60 shadow-soft hover:shadow-medium hover:border-border/80",
        elevated: "bg-card shadow-medium hover:shadow-lg border border-border/40 hover:-translate-y-1",
        glass: "bg-card/40 backdrop-blur-md border border-border/30 shadow-soft hover:bg-card/60",
        bordered: "bg-card border-2 border-border shadow-soft hover:shadow-medium hover:border-primary/30",
        interactive: "bg-card border border-border shadow-soft hover:shadow-medium hover:border-border/80 cursor-pointer hover:scale-[1.02]",
        glow: "bg-card border border-border shadow-glow hover:shadow-glow-lg animate-pulse-soft",
        gradient: "bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 shadow-medium hover:shadow-strong backdrop-blur-sm",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hover?: boolean
  loading?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, hover = false, loading = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, size }),
          hover && "hover-lift cursor-pointer",
          loading && "loading-shimmer",
          className
        )}
        {...props}
      >
        {children}
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 p-4 pb-2 sm:p-6 sm:pb-4 lg:space-y-3', className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg sm:text-xl lg:text-2xl font-bold leading-tight tracking-tight text-foreground transition-colors',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm sm:text-base text-muted-foreground leading-relaxed text-balance', className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 pt-2 sm:p-6 sm:pt-4 gap-3 border-t border-border/50 bg-muted/10 backdrop-blur-sm', className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }