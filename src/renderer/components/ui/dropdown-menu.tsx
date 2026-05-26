import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

function DropdownMenu({ children, ...props }: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root {...props}>{children}</DropdownMenuPrimitive.Root>
}

function DropdownMenuTrigger(props: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'bg-white border border-outline-variant/30 rounded-xl shadow-lg overflow-hidden p-1 min-w-[160px] z-50',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

interface DropdownMenuItemProps
  extends ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: string
  variant?: 'default' | 'danger'
}

const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ icon, variant = 'default', className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'w-full flex items-center gap-sm px-md py-sm rounded-lg font-label-md text-on-surface outline-none cursor-pointer transition-colors',
        variant === 'danger'
          ? 'hover:bg-error/10 text-error'
          : 'hover:bg-surface-container-low',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {icon}
        </span>
      )}
      {children}
    </DropdownMenuPrimitive.Item>
  ),
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('my-1 border-t border-outline-variant/20', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
