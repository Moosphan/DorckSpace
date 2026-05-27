import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variantStyles = {
  default:
    'bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-ambient',
  glass: 'glass-card rounded-2xl',
  bento: 'bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-sm',
  hero: 'bg-primary text-on-primary rounded-lg',
  interactive:
    'bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-ambient hover:-translate-y-1 hover:shadow-ambient-hover transition-all cursor-pointer',
} as const

type Variant = keyof typeof variantStyles

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-md', variantStyles[variant], className)}
        {...props}
      />
    )
  },
)
Card.displayName = 'Card'

function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-md', className)}>{children}</div>
}

function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('font-headline-sm text-headline-sm', className)}>{children}</h3>
}

function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>
}

export { Card, CardHeader, CardTitle, CardContent, type CardProps }
