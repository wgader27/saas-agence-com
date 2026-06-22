import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Client } from '@/lib/api'

interface ClientComboboxProps {
  value: string
  onChange: (clientId: string, clientNom?: string) => void
  label?: string
  required?: boolean
  error?: string
}

export function ClientCombobox({ value, onChange, label, required, error }: ClientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedName, setSelectedName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    try {
      const data = await api.get<Client[]>(`/clients/search?q=${encodeURIComponent(q)}`)
      setClients(data)
    } catch {
      setClients([])
    }
  }, [])

  useEffect(() => {
    if (!open) return
    search(query)
  }, [query, open, search])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
      search('')
    }
  }, [open, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (client: Client) => {
    onChange(String(client.id), client.nom)
    setSelectedName(client.nom)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
    setSelectedName('')
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full h-9 px-3 flex items-center justify-between rounded-[var(--radius-md)] border bg-[var(--surface)] text-sm transition-all duration-150',
            'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)]',
            error ? 'border-[var(--danger)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]',
          )}
        >
          <span className={selectedName ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>
            {selectedName || 'Sélectionner un client…'}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <span onClick={handleClear} className="p-0.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--text-muted)] transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {clients.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[var(--text-muted)] text-center">Aucun client</li>
              ) : (
                clients.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
                    >
                      <div>
                        <span className="font-medium">{c.nom}</span>
                        {c.secteur && <span className="text-[var(--text-muted)] text-xs ml-2">{c.secteur}</span>}
                      </div>
                      {String(c.id) === value && <Check className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}
