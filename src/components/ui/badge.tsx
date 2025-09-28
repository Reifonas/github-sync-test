import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/40 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:scale-105",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md hover:scale-105",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md hover:scale-105",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md hover:scale-105",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md hover:scale-105",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-md hover:scale-105",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted/80 hover:border-border/60 hover:scale-105",
        ghost:
          "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:scale-105",
        gradient:
          "border-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white hover:opacity-90 shadow-md hover:shadow-lg hover:scale-105",
        modern:
          "border border-border/40 bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90 hover:border-primary/30 shadow-glass hover:scale-105",
      },
      size: {
        sm: "rounded-md px-1.5 py-0.5 text-xs sm:px-2",
        default: "rounded-lg px-2 py-0.5 text-xs sm:px-2.5 sm:py-1",
        lg: "rounded-lg px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm",
        xl: "rounded-xl px-3 py-1.5 text-sm sm:px-4 sm:py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ className, variant, size, dot = false, pulse = false, children, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size }),
        pulse && "animate-pulse",
        dot && "relative",
        className
      )} 
      {...props}
    >
      {dot && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }