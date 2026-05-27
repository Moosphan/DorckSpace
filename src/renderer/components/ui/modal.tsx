import { type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  variant?: 'default' | 'danger'
  icon?: string
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  children?: ReactNode
}

function Modal({
  open,
  onClose,
  variant = 'default',
  icon,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  children,
}: ModalProps) {
  const iconBg = variant === 'danger' ? 'bg-error-container' : 'bg-primary-fixed'
  const iconColor = variant === 'danger' ? 'text-error' : 'text-primary'
  const confirmBtn =
    variant === 'danger'
      ? 'bg-error text-on-error hover:brightness-110'
      : 'bg-primary text-on-primary hover:brightness-110'

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md p-md space-y-md"
          onEscapeKeyDown={onClose}
        >
          <div className="flex flex-col items-center text-center space-y-md">
            {icon && (
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  iconBg,
                  iconColor,
                )}
              >
                <span className="material-symbols-outlined text-[28px] fill">{icon}</span>
              </div>
            )}
            <div className="space-y-xs">
              <Dialog.Title className="font-headline-sm text-on-surface">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-body-sm text-on-surface-variant max-w-[280px]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            {children}
          </div>
          <div className="flex gap-sm w-full pt-sm">
            <button
              onClick={onClose}
              className="flex-1 bg-surface-container-low text-on-surface font-label-md py-sm rounded-lg hover:bg-surface-container transition-colors"
            >
              {cancelText}
            </button>
            {onConfirm && (
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={cn(
                  'flex-1 font-label-md py-sm rounded-lg transition-colors',
                  confirmBtn,
                )}
              >
                {confirmText}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { Modal, type ModalProps }
