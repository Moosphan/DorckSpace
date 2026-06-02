import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

function Select({ children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
}

const SelectTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'md' }
>(({ className, children, size = 'md', ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'w-full flex items-center justify-between bg-surface-container-low border-2 border-transparent rounded-md font-label-md text-on-surface outline-none transition-all',
      'hover:bg-surface-container focus:border-primary focus:ring-0',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      size === 'sm' ? 'px-sm py-1.5 text-[12px]' : 'px-md py-sm',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
        chevron_right
      </span>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

function SelectValue(props: ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />
}

function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'bg-surface-container-lowest border border-outline-variant/30 rounded-md shadow-floating overflow-hidden z-50',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        position="popper"
        sideOffset={4}
        align="start"
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

const SelectItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { icon?: string }
>(({ className, children, icon, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex items-center gap-sm px-sm py-1 rounded font-label-md text-on-surface outline-none cursor-pointer transition-colors my-0.5',
      'hover:bg-primary-fixed data-[highlighted]:bg-primary-fixed',
      'data-[state=checked]:bg-primary-fixed data-[state=checked]:text-primary',
      className,
    )}
    {...props}
  >
    {icon && (
      <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
        {icon}
      </span>
    )}
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ml-auto">
      <span className="material-symbols-outlined text-[16px] text-primary">check</span>
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

function SelectGroup({ children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group {...props}>{children}</SelectPrimitive.Group>
}

function SelectLabel({ className, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-sm py-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider', className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn('h-px bg-outline-variant/30 my-xs', className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
}
