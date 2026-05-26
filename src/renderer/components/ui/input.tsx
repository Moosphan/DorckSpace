import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, className, ...props }, ref) => {
    return (
      <div className="space-y-xs">
        {label && (
          <label className="font-label-sm text-on-surface-variant px-sm">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-xl px-md py-sm font-body-md text-body-md text-on-surface placeholder-on-surface-variant/60 outline-none transition-all',
              icon && 'pl-10',
              error && 'border-error',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-body-sm text-error px-sm">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input, type InputProps }
