import { useCallback, useState, createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToastData {
  id: number
  title?: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { ...data, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-sm items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-xl px-md py-2.5 shadow-lg min-w-[200px] max-w-sm animate-fade-in text-center backdrop-blur-md',
              !t.variant && 'bg-inverse-surface/80 text-inverse-on-surface',
              t.variant === 'error' && 'bg-error/80 text-on-error',
              t.variant === 'success' && 'bg-primary/80 text-on-primary',
              t.variant === 'info' && 'bg-surface-container/80 text-on-surface',
            )}
          >
            {t.title && <p className="font-label-md">{t.title}</p>}
            {t.description && <p className="text-body-sm opacity-80 mt-0.5">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export { ToastProvider, useToast }
