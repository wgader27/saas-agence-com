import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

interface DialogContentProps extends RadixDialog.DialogContentProps {
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function DialogContent({ title, description, size = 'md', className, children, ...props }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-in fade-in-0" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full mx-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)]',
          'shadow-[var(--shadow-lg)] animate-in fade-in-0 zoom-in-95',
          sizes[size],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div>
            {title && (
              <RadixDialog.Title className="text-base font-semibold text-[var(--text)]">
                {title}
              </RadixDialog.Title>
            )}
            {description && (
              <RadixDialog.Description className="text-xs text-[var(--text-muted)] mt-0.5">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="ml-4 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors">
            <X className="w-4 h-4" />
          </RadixDialog.Close>
        </div>
        <div className="px-6 py-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
