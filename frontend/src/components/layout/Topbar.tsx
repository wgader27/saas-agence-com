import { Search, Bell, MessageSquare, UserPlus, CheckCircle, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Client, Domain, Note, Notification } from '@/lib/api'

interface SearchResult {
  type: 'client' | 'domain' | 'note'
  id: number
  title: string
  subtitle: string
  path: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const NOTIF_ICON: Record<string, React.ElementType> = {
  comment: MessageSquare,
  assignment: UserPlus,
  client_comment: MessageSquare,
  client_validated: CheckCircle,
}

const NOTIF_COLOR: Record<string, string> = {
  comment: 'text-[var(--primary)] bg-[var(--primary-subtle)]',
  assignment: 'text-[var(--success)] bg-[var(--success-subtle)]',
  client_comment: 'text-[var(--warning)] bg-[var(--warning-subtle)]',
  client_validated: 'text-[var(--success)] bg-[var(--success-subtle)]',
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteNotif = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const notifications = data?.notifications ?? []

  const handleClick = (notif: Notification) => {
    if (!notif.lu) markRead.mutate(notif.id)
    if (notif.lienUrl) {
      navigate(notif.lienUrl)
      onClose()
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--text)]">Notifications</span>
        <div className="flex items-center gap-2">
          {(data?.unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[10px] text-[var(--primary)] hover:underline"
            >
              Tout lire
            </button>
          )}
          <button onClick={onClose} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text)]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
            <p className="text-xs text-[var(--text-muted)]">Aucune notification</p>
          </div>
        ) : (
          notifications.map(notif => {
            const Icon = NOTIF_ICON[notif.type] ?? Bell
            const color = NOTIF_COLOR[notif.type] ?? 'text-[var(--text-muted)] bg-[var(--bg-muted)]'
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={cn(
                  'group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors',
                  notif.lu ? 'hover:bg-[var(--bg-subtle)]' : 'bg-[var(--primary-subtle)]/30 hover:bg-[var(--primary-subtle)]/50',
                )}
              >
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text)] leading-snug">{notif.titre}</p>
                  {notif.contenu && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{notif.contenu}</p>
                  )}
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.lu && <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif.mutate(notif.id) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                    title="Supprimer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function Topbar({ title }: { title?: string }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30000,
    staleTime: 10000,
  })
  const unreadCount = notifData?.unreadCount ?? 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 10)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{ clients: Client[]; domains: Domain[]; notes: Note[] }>(
          `/search?q=${encodeURIComponent(query)}`
        )
        const mapped: SearchResult[] = [
          ...data.clients.map(c => ({ type: 'client' as const, id: c.id, title: c.nom, subtitle: c.secteur, path: `/clients/${c.id}` })),
          ...data.domains.map(d => ({ type: 'domain' as const, id: d.id, title: d.nomDomaine, subtitle: d.clientNom, path: `/domaines` })),
          ...data.notes.map(n => ({ type: 'note' as const, id: n.id, title: n.titre, subtitle: n.auteurNom, path: `/notes/${n.id}` })),
        ]
        setResults(mapped)
        setSelected(0)
      } catch {
        setResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const typeLabel: Record<string, string> = { client: 'Client', domain: 'Domaine', note: 'Note' }

  const handleSelect = useCallback((path: string) => {
    navigate(path)
    setSearchOpen(false)
    setQuery('')
  }, [navigate])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) handleSelect(results[selected].path)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, results, selected, handleSelect])

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg)] shrink-0">
        <h1 className="text-sm font-semibold text-[var(--text)]">{title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 10) }}
            className={cn(
              'flex items-center gap-2 h-8 px-3 rounded-[var(--radius-md)] border border-[var(--border)]',
              'bg-[var(--bg-subtle)] text-[var(--text-muted)] text-xs hover:border-[var(--border-strong)]',
              'transition-colors duration-150',
            )}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Rechercher…</span>
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[10px] font-mono">⌘K</kbd>
          </button>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className={cn(
                'relative w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] transition-colors',
                notifOpen
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]',
              )}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
          </div>
        </div>
      </header>

      {/* Search modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24"
          onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false) }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-xl mx-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher clients, domaines, notes…"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[10px] font-mono text-[var(--text-muted)]">Échap</kbd>
            </div>
            {results.length > 0 ? (
              <ul className="py-1 max-h-72 overflow-y-auto">
                {results.map((r, i) => (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => handleSelect(r.path)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        i === selected ? 'bg-[var(--primary-subtle)]' : 'hover:bg-[var(--bg-subtle)]',
                      )}
                    >
                      <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider w-14 shrink-0">
                        {typeLabel[r.type]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{r.title}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{r.subtitle}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.length >= 2 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Aucun résultat pour « {query} »</p>
            ) : (
              <p className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">Tapez au moins 2 caractères</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
