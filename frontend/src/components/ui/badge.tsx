import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default:  'bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border)]',
  primary:  'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20',
  success:  'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/20',
  warning:  'bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning)]/20',
  danger:   'bg-[var(--danger-subtle)] text-[var(--danger)] border border-[var(--danger)]/20',
  info:     'bg-[var(--info-subtle)] text-[var(--info)] border border-[var(--info)]/20',
  outline:  'border border-[var(--border-strong)] text-[var(--text-secondary)]',
}

export function Badge({ variant = 'default', className, children, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <Badge variant="danger" dot>Expiré</Badge>
  if (days <= 14) return <Badge variant="danger" dot>{days}j</Badge>
  if (days <= 30) return <Badge variant="warning" dot>{days}j</Badge>
  return <Badge variant="success" dot>{days}j restants</Badge>
}
