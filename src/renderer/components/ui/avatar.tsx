import { cn } from '@/lib/utils'

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
} as const

type Size = keyof typeof sizeStyles

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: Size
  border?: boolean
  className?: string
}

function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  border = false,
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-primary-container text-on-primary-container font-bold shrink-0',
        sizeStyles[size],
        border && 'border-2 border-primary',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{fallback || alt?.[0]?.toUpperCase() || '?'}</span>
      )}
    </div>
  )
}

export { Avatar, type AvatarProps }
