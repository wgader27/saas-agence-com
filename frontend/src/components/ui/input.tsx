import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, suffix, id, ...props }, ref) => {
    const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-[var(--text-muted)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 rounded-[var(--radius-md)] border bg-[var(--surface)] text-sm text-[var(--text)]',
              'placeholder:text-[var(--text-muted)] transition-all duration-150',
              'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)]',
              error
                ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-subtle)]'
                : 'border-[var(--border)] hover:border-[var(--border-strong)]',
              leftIcon ? 'pl-9' : 'px-3',
              rightIcon || suffix ? 'pr-9' : 'pr-3',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
          {suffix && !rightIcon && (
            <div className="absolute right-3 text-xs text-[var(--text-muted)] pointer-events-none">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--danger)] flex items-center gap-1">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-[var(--radius-md)] border bg-[var(--surface)] text-sm text-[var(--text)] px-3 py-2',
            'placeholder:text-[var(--text-muted)] transition-all duration-150 resize-y min-h-[80px]',
            'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)]',
            error
              ? 'border-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-9 px-3 rounded-[var(--radius-md)] border bg-[var(--surface)] text-sm text-[var(--text)]',
            'transition-all duration-150 cursor-pointer appearance-none',
            'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)]',
            error
              ? 'border-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
