import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-medium hover:shadow-lg hover:from-primary-600 hover:to-primary-700 border border-primary/20",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive-600 text-destructive-foreground shadow-medium hover:shadow-lg hover:from-destructive-600 hover:to-destructive-700 border border-destructive/20",
        success:
          "bg-gradient-to-r from-success to-success-600 text-success-foreground shadow-medium hover:shadow-lg hover:from-success-600 hover:to-success-700 border border-success/20",
        warning:
          "bg-gradient-to-r from-warning to-warning-600 text-warning-foreground shadow-medium hover:shadow-lg hover:from-warning-600 hover:to-warning-700 border border-warning/20",
        outline:
          "border-2 border-border bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-medium",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary-600 text-secondary-foreground shadow-soft hover:shadow-medium hover:from-secondary-600 hover:to-secondary-700 border border-secondary/20",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground hover:shadow-soft backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-600 transition-colors",
        glow: "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow hover:shadow-glow-lg animate-glow border border-primary/30",
      },
      size: {
        xs: "h-7 px-2 text-xs rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base rounded-xl",
        xl: "h-14 px-8 text-lg rounded-xl",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }