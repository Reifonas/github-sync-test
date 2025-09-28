import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

const Select: React.FC<SelectProps> = ({ value, onValueChange, children, disabled }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, disabled, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          'flex h-10 sm:h-11 w-full items-center justify-between rounded-lg sm:rounded-xl border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium transition-all duration-300 hover:border-border/80 focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30 shadow-sm hover:shadow-md focus:shadow-md focus:border-primary/60',
          open && 'border-primary/60 shadow-md',
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className={cn(
          'h-4 w-4 opacity-60 transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </button>
    )
  }
)

SelectTrigger.displayName = 'SelectTrigger'

const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  const { open } = React.useContext(SelectContext)

  if (!open) return null

  return (
    <div className="absolute top-full left-0 z-50 w-full mt-2 bg-card/95 backdrop-blur-md border border-border/60 rounded-lg sm:rounded-xl shadow-strong animate-fade-in">
      <div className="max-h-60 overflow-auto py-2 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children, onSelect }) => {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)

  const handleSelect = () => {
    onValueChange?.(value)
    onSelect?.(value)
    setOpen(false)
  }

  const isSelected = selectedValue === value

  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-md mx-2 px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 hover:bg-muted/80 focus:bg-muted/80 active:scale-[0.98]',
        isSelected && 'bg-primary/10 text-primary hover:bg-primary/15'
      )}
      onClick={handleSelect}
    >
      {children}
      {isSelected && (
        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  )
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext)

  return (
    <span className={cn(
      'block truncate transition-colors duration-200',
      !value && 'text-muted-foreground/60'
    )}>
      {value || placeholder}
    </span>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }