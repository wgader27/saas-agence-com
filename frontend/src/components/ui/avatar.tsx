import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
}

const hues = [
  'bg-[#DBEAFE] text-[#1D4ED8]',
  'bg-[#EDE9FE] text-[#6D28D9]',
  'bg-[#FCE7F3] text-[#BE185D]',
  'bg-[#D1FAE5] text-[#065F46]',
  'bg-[#FEF3C7] text-[#92400E]',
  'bg-[#FFE4E6] text-[#9F1239]',
]

function colorFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % hues.length
  return hues[h]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', sizes[size], className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'rounded-full inline-flex items-center justify-center font-semibold shrink-0',
        colorFromName(name),
        sizes[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  )
}
