import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  value: string
  label: string
}

interface SlidingTabsProps {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SlidingTabs({ tabs, value, onChange, className }: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [style, setStyle] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const el = tabRefs.current.get(value)
    const container = containerRef.current
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const tabRect = el.getBoundingClientRect()
      setStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      })
    }
  }, [value])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex bg-surface-container rounded-md p-[2px]', className)}
    >
      <div
        className="absolute top-[2px] bottom-[2px] bg-surface-container-lowest rounded-[5px] shadow-sm transition-all duration-200 ease-out"
        style={{ left: style.left, width: style.width }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          ref={(el) => { if (el) tabRefs.current.set(tab.value, el) }}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative z-10 px-3 py-0.5 rounded-[5px] text-[11px] transition-colors whitespace-nowrap',
            value === tab.value
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
