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
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'bg-inverse-surface text-inverse-on-surface rounded-xl px-md py-sm shadow-lg min-w-[280px] max-w-sm animate-fade-in',
              t.variant === 'error' && 'bg-error text-on-error',
              t.variant === 'success' && 'bg-primary text-on-primary',
            )}
          >
            {t.title && <p className="font-label-md">{t.title}</p>}
            {t.description && <p className="text-body-sm opacity-80">{t.description}</p>}
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
