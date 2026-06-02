import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface WaveformProps {
  data: number[]
  progress: number // 0-1
  height?: number
  barWidth?: number
  barGap?: number
  color?: string
  progressColor?: string
  backgroundColor?: string
  onClick?: (position: number) => void
  className?: string
}

export function Waveform({
  data,
  progress,
  height = 32,
  barWidth = 2,
  barGap = 1,
  color = 'var(--color-outline-variant)',
  progressColor = 'var(--color-primary)',
  backgroundColor = 'transparent',
  onClick,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const totalBarWidth = barWidth + barGap
    const barsCount = Math.floor(width / totalBarWidth)
    const step = data.length / barsCount

    ctx.clearRect(0, 0, width, height)

    for (let i = 0; i < barsCount; i++) {
      const dataIndex = Math.floor(i * step)
      const value = data[dataIndex] || 0
      const barHeight = Math.max(2, value * height * 0.9)
      const x = i * totalBarWidth
      const y = (height - barHeight) / 2

      const isPast = (i / barsCount) < progress
      ctx.fillStyle = isPast ? progressColor : color
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 1)
      ctx.fill()
    }
  }, [data, progress, height, barWidth, barGap, color, progressColor])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const position = (e.clientX - rect.left) / rect.width
    onClick(Math.max(0, Math.min(1, position)))
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full cursor-pointer', className)}
      style={{ height: `${height}px`, background: backgroundColor }}
      onClick={handleClick}
    />
  )
}
