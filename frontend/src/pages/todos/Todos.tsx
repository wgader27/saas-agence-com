import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Lock, Users, Globe, Trash2, LayoutGrid, X,
  User, UserPlus, CalendarDays, CheckSquare, ChevronDown, ChevronRight,
  Share2,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Board, Workspace, User as UserType } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'

const BG_PRESETS = [
  '#0052CC', '#5243AA', '#00875A', '#DE350B', '#FF8B00', '#344563', '#1D2125', '#0065FF',
]

function getBgStyle(couleurFond: string): React.CSSProperties {
  if (couleurFond.startsWith('http') || couleurFond.startsWith('data:')) {
    return { backgroundImage: `url(${couleurFond})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { backgroundColor: couleurFond }
}

// ── Calendar global view ──────────────────────────────────────
function WorkspaceCalendar({ boards }: { boards: Board[] }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const tasksByDate: Record<string, Array<{ titre: string; boardNom: string; couleur: string; overdue: boolean }>> = {}
  for (const board of boards) {
    for (const col of (board as any).columns ?? []) {
      for (const task of col.tasks ?? []) {
        if (!task.dateEcheance) continue
        const d = task.dateEcheance.slice(0, 10)
        if (!tasksByDate[d]) tasksByDate[d] = []
        tasksByDate[d].push({
          titre: task.titre,
          boardNom: board.nom,
          couleur: board.couleurFond,
          overdue: new Date(task.dateEcheance) < today,
        })
      }
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <button onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }} className="p-1.5 rounded hover:bg-[var(--bg-muted)]">‹</button>
        <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }} className="p-1.5 rounded hover:bg-[var(--bg-muted)]">›</button>
      </div>
      <div className="grid grid-cols-7">
        {DAYS.map(d => <div key={d} className="py-2 text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase">{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`o${i}`} className="min-h-[72px] border-b border-r border-[var(--border)] bg-[var(--bg-subtle)]" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayTasks = tasksByDate[dateStr] ?? []
          const isToday = dateStr === todayStr
          const col = (offset + i) % 7
          return (
            <div key={day} className={cn('min-h-[72px] p-1.5 border-b border-[var(--border)]', col < 6 && 'border-r')}>
              <span className={cn('w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium mb-1', isToday ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]')}>{day}</span>
              {dayTasks.slice(0, 2).map((t, idx) => (
                <div key={idx} className="text-[9px] px-1 py-0.5 rounded mb-0.5 truncate font-medium" style={{ backgroundColor: t.overdue ? '#fee2e2' : '#dcfce7', color: t.overdue ? '#dc2626' : '#16a34a' }} title={`${t.boardNom} — ${t.titre}`}>
                  {t.titre}
                </div>
              ))}
              {dayTasks.length > 2 && <p className="text-[9px] text-[var(--text-muted)]">+{dayTasks.length - 2}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Create Workspace Modal ────────────────────────────────────
function CreateWorkspaceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (ws: Workspace) => void }) {
  const [form, setForm] = useState({ nom: '', description: '', couleur: '#5243AA' })
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: () => api.post<Workspace>('/workspaces', form),
    onSuccess: ws => { qc.invalidateQueries({ queryKey: ['workspaces'] }); onCreate(ws); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Créer un espace de travail</h2>
          <button onClick={onClose} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <form className="px-5 pb-5 pt-4 space-y-4" onSubmit={e => { e.preventDefault(); create.mutate() }}>
          <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Community Management" required autoFocus />
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optionnel…" />
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Couleur</label>
            <div className="flex items-center gap-2 flex-wrap">
              {['#5243AA', '#0052CC', '#00875A', '#DE350B', '#FF8B00', '#344563'].map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, couleur: c }))}
                  className={cn('w-6 h-6 rounded-full border-2 transition-all', form.couleur === c ? 'border-[var(--text)] scale-110' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="w-6 h-6 cursor-pointer relative flex items-center justify-center" title="Couleur personnalisée">
                <input type="color" value={form.couleur} onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))} className="sr-only" />
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: form.couleur + '33' }}>
                  <Plus className="w-3 h-3 text-[var(--text-muted)]" />
                </div>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" loading={create.isPending} disabled={!form.nom.trim()}>Créer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Workspace Members Modal ───────────────────────────────────
function WorkspaceMembersModal({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isOwner = workspace.proprietaire?.id === user?.id

  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get<UserType[]>('/users') })

  const addMember = useMutation({
    mutationFn: (uid: number) => api.post(`/workspaces/${workspace.id}/members`, { userId: uid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })

  const removeMember = useMutation({
    mutationFn: (uid: number) => api.delete(`/workspaces/${workspace.id}/members/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })

  const memberIds = new Set([workspace.proprietaire?.id, ...workspace.members.map(m => m.user.id)])
  const notMembers = allUsers.filter(u => !memberIds.has(u.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Membres — {workspace.nom}</h2>
          <button onClick={onClose} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 py-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: workspace.couleur }}>
                {workspace.proprietaire?.prenom?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-[var(--text)]">{workspace.proprietaire?.prenom} {workspace.proprietaire?.nom}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Propriétaire</p>
              </div>
            </div>
            {workspace.members.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1.5 group rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)] px-1">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text)] text-xs font-semibold">
                  {m.user.prenom?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--text)]">{m.user.prenom} {m.user.nom}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{m.role}</p>
                </div>
                {isOwner && (
                  <button onClick={() => removeMember.mutate(m.user.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isOwner && notMembers.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mb-2">Inviter</p>
              {notMembers.map(u => (
                <button key={u.id} onClick={() => addMember.mutate(u.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)] text-[var(--text-secondary)] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="text-xs">{u.prenom} {u.nom}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Board Grid ────────────────────────────────────────────────
function BoardGrid({ boards, currentUserId, onOpen, onDelete }: {
  boards: Board[]
  currentUserId?: number
  onOpen: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {boards.map(b => (
        <div
          key={b.id}
          onClick={() => onOpen(b.id)}
          className="group relative h-28 rounded-[var(--radius-lg)] cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-all"
          style={getBgStyle(b.couleurFond)}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
          <div className="relative p-3 flex flex-col h-full">
            <p className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">{b.nom}</p>
            {b.clientAssocie && (
              <span className="mt-1 text-[10px] text-white/75 truncate">{b.clientAssocie.nom}</span>
            )}
            <div className="mt-auto flex items-center gap-1.5">
              {b.visibilite === 'prive' && <Lock className="w-3 h-3 text-white/70" />}
              {b.visibilite === 'equipe' && <Users className="w-3 h-3 text-white/70" />}
              {b.visibilite === 'partage' && <Globe className="w-3 h-3 text-white/70" />}
              {b.shareEnabled && (
                <span className="ml-auto flex items-center gap-0.5 text-[9px] text-white/70 bg-black/20 px-1.5 py-0.5 rounded-full">
                  <Share2 className="w-2.5 h-2.5" /> Client
                </span>
              )}
            </div>
          </div>
          {b.proprietaire?.id === currentUserId && (
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Supprimer "${b.nom}" ?`)) onDelete(b.id) }}
              className="absolute top-2 right-2 w-6 h-6 rounded opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ onCreateBoard }: { onCreateBoard: () => void }) {
  return (
    <div className="text-center py-16">
      <LayoutGrid className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
      <p className="text-sm font-medium text-[var(--text)]">Aucun tableau</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Créez votre premier tableau pour commencer</p>
      <Button className="mt-4" variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onCreateBoard}>
        Créer un tableau
      </Button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export function Todos() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeSection, setActiveSection] = useState<'all' | 'personal' | number>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal']))
  const [showCreate, setShowCreate] = useState(false)
  const [createInWorkspace, setCreateInWorkspace] = useState<'personal' | number>('personal')
  const [showCreateWs, setShowCreateWs] = useState(false)
  const [showWsMembers, setShowWsMembers] = useState<Workspace | null>(null)
  const [globalView, setGlobalView] = useState<'grid' | 'calendar'>('grid')
  const [form, setForm] = useState({ nom: '', visibilite: 'equipe' as const, couleurFond: '#0052CC' })

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get<Workspace[]>('/workspaces'),
  })

  const { data: allBoards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => api.get<Board[]>('/boards'),
  })

  const personalBoards = useMemo(() => allBoards.filter(b => !b.workspaceId), [allBoards])
  const boardsByWorkspace = useMemo(() => {
    const map = new Map<number, Board[]>()
    for (const b of allBoards) {
      if (b.workspaceId) {
        if (!map.has(b.workspaceId)) map.set(b.workspaceId, [])
        map.get(b.workspaceId)!.push(b)
      }
    }
    return map
  }, [allBoards])

  const filteredBoards = useMemo(() => {
    if (activeSection === 'all') return allBoards
    if (activeSection === 'personal') return personalBoards
    return boardsByWorkspace.get(activeSection as number) ?? []
  }, [activeSection, allBoards, personalBoards, boardsByWorkspace])

  const currentWorkspace = workspaces.find(w => w.id === activeSection) ?? null

  const createBoard = useMutation({
    mutationFn: (payload: typeof form) => api.post<Board>('/boards', {
      ...payload,
      ...(createInWorkspace !== 'personal' ? { workspaceId: createInWorkspace } : {}),
    }),
    onSuccess: board => {
      qc.invalidateQueries({ queryKey: ['boards'] })
      setShowCreate(false)
      setForm({ nom: '', visibilite: 'equipe', couleurFond: '#0052CC' })
      navigate(`/todos/${board.id}`)
    },
  })

  const deleteBoard = useMutation({
    mutationFn: (id: number) => api.delete(`/boards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })

  const deleteWorkspace = useMutation({
    mutationFn: (id: number) => api.delete(`/workspaces/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }); setActiveSection('all') },
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openCreate = (ws: 'personal' | number) => {
    setCreateInWorkspace(ws)
    setShowCreate(true)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-[var(--border)]">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Espaces</p>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {/* All boards */}
          <button
            onClick={() => setActiveSection('all')}
            className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors',
              activeSection === 'all' ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            Tous les tableaux
          </button>

          {/* Personal workspace */}
          <div className="mt-1">
            <div className="flex items-center gap-1 px-2 py-0.5 group/pers">
              <button onClick={() => toggleSection('personal')} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                {expandedSections.has('personal') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setActiveSection('personal')}
                className={cn('flex-1 flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors truncate',
                  activeSection === 'personal' ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'text-[var(--text)] hover:bg-[var(--bg-muted)]'
                )}
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">Personnel</span>
              </button>
              <button onClick={() => openCreate('personal')} className="opacity-0 group-hover/pers:opacity-100 p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-all shrink-0" title="Nouveau tableau">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {expandedSections.has('personal') && (
              <div className="ml-5 mt-0.5 space-y-0.5">
                {personalBoards.map(b => (
                  <button key={b.id} onClick={() => navigate(`/todos/${b.id}`)}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    <div className="w-2.5 h-2.5 rounded shrink-0" style={getBgStyle(b.couleurFond.startsWith('http') ? '#0052CC' : b.couleurFond)} />
                    <span className="truncate">{b.nom}</span>
                  </button>
                ))}
                {personalBoards.length === 0 && (
                  <p className="px-2 py-1 text-[10px] text-[var(--text-muted)] italic">Aucun tableau</p>
                )}
              </div>
            )}
          </div>

          {/* Team workspaces */}
          {workspaces.map(ws => {
            const wsBoards = boardsByWorkspace.get(ws.id) ?? []
            const expanded = expandedSections.has(`ws-${ws.id}`)
            const isOwner = ws.proprietaire?.id === user?.id

            return (
              <div key={ws.id} className="mt-1">
                <div className="flex items-center gap-1 px-2 py-0.5 group/ws">
                  <button onClick={() => toggleSection(`ws-${ws.id}`)} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => { setActiveSection(ws.id); if (!expanded) toggleSection(`ws-${ws.id}`) }}
                    className={cn(
                      'flex-1 flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors truncate',
                      activeSection === ws.id ? 'text-white' : 'text-[var(--text)] hover:bg-[var(--bg-muted)]'
                    )}
                    style={activeSection === ws.id ? { backgroundColor: ws.couleur } : {}}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: activeSection === ws.id ? 'rgba(255,255,255,0.5)' : ws.couleur }} />
                    <span className="truncate">{ws.nom}</span>
                  </button>
                  <div className="opacity-0 group-hover/ws:opacity-100 flex items-center gap-0.5 transition-all shrink-0">
                    <button onClick={() => setShowWsMembers(ws)} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]" title="Membres">
                      <Users className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setActiveSection(ws.id); openCreate(ws.id) }} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]" title="Nouveau tableau">
                      <Plus className="w-3 h-3" />
                    </button>
                    {isOwner && (
                      <button onClick={() => { if (confirm(`Supprimer « ${ws.nom} » ?`)) deleteWorkspace.mutate(ws.id) }} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors" title="Supprimer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="ml-5 mt-0.5 space-y-0.5 pb-1">
                    {wsBoards.map(b => (
                      <button key={b.id} onClick={() => navigate(`/todos/${b.id}`)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors"
                      >
                        <div className="w-2.5 h-2.5 rounded shrink-0" style={getBgStyle(b.couleurFond.startsWith('http') ? '#0052CC' : b.couleurFond)} />
                        <span className="truncate">{b.nom}</span>
                        {b.shareEnabled && <Share2 className="w-2.5 h-2.5 ml-auto shrink-0 text-[var(--text-muted)]" />}
                      </button>
                    ))}
                    {wsBoards.length === 0 && (
                      <p className="px-2 py-1 text-[10px] text-[var(--text-muted)] italic">Aucun tableau</p>
                    )}
                    <button onClick={() => setShowWsMembers(ws)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <Users className="w-3 h-3" />
                      Membres ({ws.members.length + 1})
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* New workspace */}
        <div className="px-3 py-2.5 border-t border-[var(--border)]">
          <button onClick={() => setShowCreateWs(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvel espace
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              {currentWorkspace ? (
                <>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: currentWorkspace.couleur }} />
                  <h2 className="text-sm font-semibold text-[var(--text)]">{currentWorkspace.nom}</h2>
                </>
              ) : activeSection === 'personal' ? (
                <>
                  <User className="w-4 h-4 text-[var(--text-muted)]" />
                  <h2 className="text-sm font-semibold text-[var(--text)]">Espace personnel</h2>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-4 h-4 text-[var(--text-muted)]" />
                  <h2 className="text-sm font-semibold text-[var(--text)]">Tous les tableaux</h2>
                </>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {filteredBoards.length} tableau{filteredBoards.length !== 1 ? 'x' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
              <button onClick={() => setGlobalView('grid')} className={cn('p-1.5 transition-colors', globalView === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]')} title="Grille">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setGlobalView('calendar')} className={cn('p-1.5 transition-colors', globalView === 'calendar' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]')} title="Calendrier">
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentWorkspace && (
              <Button variant="outline" size="sm" leftIcon={<Users className="w-3.5 h-3.5" />} onClick={() => setShowWsMembers(currentWorkspace)}>
                Membres ({currentWorkspace.members.length + 1})
              </Button>
            )}

            <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => openCreate(activeSection === 'all' || activeSection === 'personal' ? 'personal' : activeSection)}>
              Nouveau tableau
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {globalView === 'calendar' ? (
            <WorkspaceCalendar boards={filteredBoards} />
          ) : isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-[var(--radius-lg)] bg-[var(--bg-muted)] animate-pulse" />)}
            </div>
          ) : activeSection === 'all' ? (
            <div className="space-y-8">
              {personalBoards.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Personnel
                  </h3>
                  <BoardGrid boards={personalBoards} currentUserId={user?.id} onOpen={id => navigate(`/todos/${id}`)} onDelete={id => deleteBoard.mutate(id)} />
                </section>
              )}
              {workspaces.map(ws => {
                const wsBoards = boardsByWorkspace.get(ws.id) ?? []
                if (wsBoards.length === 0) return null
                return (
                  <section key={ws.id} className="space-y-3">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ws.couleur }} />
                      {ws.nom}
                    </h3>
                    <BoardGrid boards={wsBoards} currentUserId={user?.id} onOpen={id => navigate(`/todos/${id}`)} onDelete={id => deleteBoard.mutate(id)} />
                  </section>
                )
              })}
              {allBoards.length === 0 && <EmptyState onCreateBoard={() => setShowCreate(true)} />}
            </div>
          ) : filteredBoards.length === 0 ? (
            <EmptyState onCreateBoard={() => openCreate(activeSection === 'personal' ? 'personal' : activeSection as number)} />
          ) : (
            <BoardGrid boards={filteredBoards} currentUserId={user?.id} onOpen={id => navigate(`/todos/${id}`)} onDelete={id => deleteBoard.mutate(id)} />
          )}
        </div>
      </div>

      {/* ── Create board modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold">Créer un tableau</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 pt-4">
              <div className="h-20 rounded-[var(--radius-lg)] flex items-center justify-center mb-4" style={{ backgroundColor: form.couleurFond }}>
                <p className="text-white font-semibold text-sm opacity-90 drop-shadow">{form.nom || 'Nom du tableau'}</p>
              </div>
            </div>

            <form className="px-5 pb-5 space-y-4" onSubmit={e => { e.preventDefault(); createBoard.mutate(form) }}>
              <Input label="Nom du tableau *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Refonte site Elitegroup" required autoFocus />

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Couleur de fond</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {BG_PRESETS.map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, couleurFond: p }))}
                      className={cn('w-7 h-7 rounded-[var(--radius-sm)] transition-all', form.couleurFond === p && 'ring-2 ring-offset-2 ring-[var(--primary)] scale-95')}
                      style={{ backgroundColor: p }}
                    />
                  ))}
                  <label className="w-7 h-7 cursor-pointer flex items-center justify-center" title="Couleur personnalisée">
                    <input type="color" value={form.couleurFond} onChange={e => setForm(f => ({ ...f, couleurFond: e.target.value }))} className="sr-only" />
                    <div className="w-7 h-7 rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: form.couleurFond + '33' }}>
                      <Plus className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Visibilité</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'prive', icon: Lock, label: 'Privé' },
                    { value: 'equipe', icon: Users, label: 'Équipe' },
                    { value: 'partage', icon: Globe, label: 'Partagé' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button key={value} type="button" onClick={() => setForm(f => ({ ...f, visibilite: value }))}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors',
                        form.visibilite === value ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
                <Button type="submit" variant="primary" size="sm" loading={createBoard.isPending} disabled={!form.nom.trim()}>Créer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateWs && (
        <CreateWorkspaceModal onClose={() => setShowCreateWs(false)} onCreate={ws => { setActiveSection(ws.id); toggleSection(`ws-${ws.id}`) }} />
      )}

      {showWsMembers && (
        <WorkspaceMembersModal workspace={showWsMembers} onClose={() => setShowWsMembers(null)} />
      )}
    </div>
  )
}
