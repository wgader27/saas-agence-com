import { cn } from '@/lib/utils'

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function THead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-[var(--border)]', className)} {...props}>
      {children}
    </thead>
  )
}

export function TBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-[var(--border)]', className)} {...props}>
      {children}
    </tbody>
  )
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-[var(--bg-subtle)] transition-colors duration-100', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 text-sm text-[var(--text)]', className)} {...props}>
      {children}
    </td>
  )
}
