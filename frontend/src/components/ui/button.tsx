import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'link'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm active:scale-[0.98]',
  secondary: 'bg-[var(--bg-muted)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]',
  ghost:     'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)]',
  danger:    'bg-[var(--danger)] text-white hover:bg-[var(--red-600)] shadow-sm active:scale-[0.98]',
  outline:   'border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-subtle)] hover:border-[var(--text-muted)]',
  link:      'text-[var(--primary)] hover:underline p-0 h-auto',
}

const sizes: Record<Size, string> = {
  xs:      'h-6 px-2 text-xs gap-1 rounded-[var(--radius-sm)]',
  sm:      'h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-md)]',
  md:      'h-9 px-4 text-sm gap-2 rounded-[var(--radius-md)]',
  lg:      'h-10 px-5 text-sm gap-2 rounded-[var(--radius-md)]',
  'icon-xs': 'h-6 w-6 p-0 rounded-[var(--radius-sm)]',
  'icon-sm': 'h-8 w-8 p-0 rounded-[var(--radius-md)]',
  icon:    'h-9 w-9 p-0 rounded-[var(--radius-md)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'select-none cursor-pointer whitespace-nowrap',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'
