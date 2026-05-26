import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-container-highest',
        className,
      )}
    />
  )
}

export { Skeleton, type SkeletonProps }
