import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variantStyles = {
  high: 'bg-secondary-container text-on-secondary-container',
  medium: 'bg-primary-fixed text-on-primary-fixed-variant',
  low: 'bg-surface-variant text-on-surface-variant',
  urgent:
    'bg-secondary-container/20 text-on-secondary-fixed-variant border border-secondary-container/30',
  new: 'bg-primary-fixed text-on-primary-fixed-variant',
  error: 'bg-error-container text-on-error-container border border-error/20',
  archived: 'bg-surface-container text-on-surface-variant',
  status: '', // uses color prop
} as const

type Variant = keyof typeof variantStyles

interface BadgeProps {
  variant?: Variant
  color?: string
  children: ReactNode
  className?: string
}

function Badge({ variant = 'medium', color, children, className }: BadgeProps) {
  const base = 'inline-flex items-center gap-[3px] rounded-full px-2 py-[2px] text-[10px] font-bold leading-none'

  if (variant === 'status' && color) {
    return (
      <span className={cn(base, 'bg-surface-container', className)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', `bg-${color}`)} />
        {children}
      </span>
    )
  }

  return (
    <span className={cn(base, variantStyles[variant], className)}>{children}</span>
  )
}

function BadgeDot({ color = 'primary' }: { color?: string }) {
  return <span className={cn('w-1.5 h-1.5 rounded-full', `bg-${color}`)} />
}

export { Badge, BadgeDot, type BadgeProps }
