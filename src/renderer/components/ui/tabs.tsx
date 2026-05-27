import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn(className)} {...props} />
}

function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex bg-surface-container-low p-1 rounded-xl', className)}
      {...props}
    />
  )
}

const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex-1 py-sm font-label-md rounded-lg transition-colors outline-none',
      'text-on-surface-variant hover:text-on-surface',
      'data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-sm data-[state=active]:text-primary',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
