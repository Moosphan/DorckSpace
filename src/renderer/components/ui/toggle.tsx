import { forwardRef, type ButtonHTMLAttributes } from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cn } from '@/lib/utils'

interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex items-center justify-between">
        {label && <span className="font-label-md text-on-surface">{label}</span>}
        <TogglePrimitive.Root
          ref={ref}
          className={cn(
            'relative inline-flex items-center cursor-pointer',
            className,
          )}
          {...props}
        >
          <div
            className={cn(
              'w-11 h-6 rounded-full transition-colors',
              props.pressed ? 'bg-primary' : 'bg-outline-variant/40',
            )}
          />
          <div
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-surface-container-lowest shadow transition-transform',
              props.pressed ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </TogglePrimitive.Root>
      </div>
    )
  },
)
Toggle.displayName = 'Toggle'

export { Toggle, type ToggleProps }
