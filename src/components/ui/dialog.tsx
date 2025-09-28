import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../utils/cn"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'modern' | 'glass'
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, size = 'default', variant = 'default' }) => {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onOpenChange) {
        onOpenChange(false)
      }
    }

    if (open) {
      setIsVisible(true)
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
      open ? "opacity-100" : "opacity-0"
    )}>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 transition-all duration-300",
          variant === 'glass' ? "backdrop-blur-md bg-black/20" : "bg-black/50",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content */}
      <div className={cn(
        "relative z-50 transition-all duration-300 transform",
        open ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        {React.cloneElement(children as React.ReactElement, { size, variant })}
      </div>
    </div>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'modern' | 'glass'
  showClose?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, size = 'default', variant = 'default', showClose = true, ...props }, ref) => {
    const DialogContext = React.createContext<{ onClose?: () => void }>({})
    
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "relative grid w-full gap-6 p-6 transition-all duration-300",
          
          // Size variants
          {
            'max-w-sm': size === 'sm',
            'max-w-lg': size === 'default',
            'max-w-2xl': size === 'lg',
            'max-w-4xl': size === 'xl',
            'max-w-[95vw] max-h-[95vh]': size === 'full',
          },
          
          // Variant styles
          {
            // Default variant
            'rounded-2xl border border-border bg-background shadow-strong': variant === 'default',
            
            // Modern variant
            'rounded-3xl border border-border/50 bg-gradient-to-br from-background to-background/95 shadow-glass backdrop-blur-sm': variant === 'modern',
            
            // Glass variant
            'rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-glass': variant === 'glass',
          },
          
          className
        )}
        {...props}
      >
        {showClose && (
          <button
            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => {
              // This will be handled by the parent Dialog component
              const event = new CustomEvent('dialog-close')
              window.dispatchEvent(event)
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        {children}
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left pb-4 border-b border-border/50",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-3 pt-4 border-t border-border/50 sm:flex-row sm:justify-end sm:gap-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold leading-tight tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}