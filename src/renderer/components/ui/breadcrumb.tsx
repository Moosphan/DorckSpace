import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

function Breadcrumb({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-xs text-on-surface-variant', className)}>
      {children}
    </nav>
  )
}

interface BreadcrumbItemProps {
  children?: ReactNode
  icon?: string
  href?: string
  active?: boolean
  className?: string
}

function BreadcrumbItem({ children, icon, href, active, className }: BreadcrumbItemProps) {
  const content = (
    <>
      {icon && !children && (
        <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      )}
      {children && (
        <span
          className={cn(
            'font-label-md',
            active ? 'text-primary' : 'hover:text-on-surface transition-colors',
          )}
        >
          {children}
        </span>
      )}
    </>
  )

  return (
    <>
      <a
        href={href || '#'}
        className={cn('flex items-center', className)}
        onClick={(e) => {
          if (!href) e.preventDefault()
        }}
      >
        {content}
      </a>
      {!active && (
        <span className="material-symbols-outlined text-[16px] opacity-40">chevron_right</span>
      )}
    </>
  )
}

export { Breadcrumb, BreadcrumbItem }
