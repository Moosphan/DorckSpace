import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  showLabel?: boolean
  className?: string
}

function Progress({ value, max = 100, showLabel = false, className }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('space-y-xs', className)}>
      <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}

export { Progress, type ProgressProps }
