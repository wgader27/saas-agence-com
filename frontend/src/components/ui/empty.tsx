import { cn } from '@/lib/utils'

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 text-[var(--text-muted)] opacity-40">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      {description && <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
