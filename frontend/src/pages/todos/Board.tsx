import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, MoreHorizontal, Calendar, CheckSquare, Tag,
  ChevronLeft, Lock, Users, Globe, Trash2, Pencil, Check,
  LayoutGrid, List, CalendarDays, AlignLeft, Clock,
  Settings, Copy, Image as ImageIcon, UserPlus, Crown,
  MessageSquare, Paperclip, Send, Download, Share2, CheckCircle,
  Link, RefreshCw, GripVertical, Upload,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Board, BoardTask, BoardColumnType, TaskChecklistItem, TaskLabelType, User as UserType, TaskComment, TaskAttachment } from '@/lib/api'
import { BoardCalendar } from './BoardCalendar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'

const COLORS = ['#0052CC', '#5243AA', '#00875A', '#DE350B', '#FF8B00', '#344563', '#1D2125', '#0065FF']
const BG_PRESETS = ['#0052CC', '#5243AA', '#00875A', '#DE350B', '#FF8B00', '#344563', '#1D2125', '#0065FF']

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const currentYear = new Date().getFullYear()
  if (date.getFullYear() === currentYear) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

type View = 'board' | 'list' | 'calendar'

function getBgStyle(couleurFond: string, opacity = 1): React.CSSProperties {
  if (couleurFond.startsWith('http') || couleurFond.startsWith('data:') || couleurFond.startsWith('/api/')) {
    return {
      backgroundImage: `url(${couleurFond})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (opacity < 1) {
    return { backgroundColor: couleurFond + Math.round(opacity * 255).toString(16).padStart(2, '0') }
  }
  return { backgroundColor: couleurFond }
}

// ── Column three-dot menu ────────────────────────────────────
function ColumnMenu({
  col, boardId, onRename, onRefresh,
}: { col: BoardColumnType; boardId: number; onRename: () => void; onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [panelTop, setPanelTop] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelTop(Math.min(rect.bottom + 4, window.innerHeight - 220))
    }
    setOpen(v => !v)
  }

  const setColor = async (color: string | null) => {
    await api.patch(`/boards/${boardId}/columns/${col.id}`, { couleur: color })
    onRefresh()
    setOpen(false)
  }

  const deleteCol = async () => {
    if (!confirm(`Supprimer la colonne « ${col.nom} » et toutes ses cartes ?`)) return
    await api.delete(`/boards/${boardId}/columns/${col.id}`)
    onRefresh()
    setOpen(false)
  }

  const COL_COLORS = ['#0052CC', '#5243AA', '#00875A', '#DE350B', '#FF8B00', '#344563', '#61BD4F', '#FF78CB']

  return (
    <div>
      <button
        ref={btnRef}
        onClick={openPanel}
        className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] opacity-0 group-hover/col:opacity-100 transition-all"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-52 py-1.5"
          style={{ top: panelTop, right: 16 }}
        >
          <div className="px-3 pb-1.5 border-b border-[var(--border)] mb-1">
            <p className="text-[11px] font-semibold text-[var(--text)] truncate">{col.nom}</p>
          </div>
          <button
            onClick={() => { onRename(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Renommer
          </button>
          <div className="px-3 py-2">
            <p className="text-[10px] text-[var(--text-muted)] mb-1.5 font-medium uppercase tracking-wide">Couleur</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setColor(null)}
                className={cn('w-5 h-5 rounded border-2 transition-all hover:scale-110', !col.couleur ? 'border-[var(--primary)] scale-110' : 'border-[var(--border)]')}
                style={{ background: 'linear-gradient(135deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(225deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(315deg,#ccc 25%,transparent 25%),linear-gradient(45deg,#ccc 25%,transparent 25%)', backgroundSize: '8px 8px', backgroundColor: '#f5f5f5' }}
                title="Aucune"
              />
              {COL_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('w-5 h-5 rounded border-2 transition-all hover:scale-110', col.couleur === c ? 'border-white scale-110 ring-1 ring-[var(--primary)]' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="mx-3 my-1 border-t border-[var(--border)]" />
          <button
            onClick={deleteCol}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer la colonne
          </button>
        </div>
      )}
    </div>
  )
}

// ── Card action panel (Trello-style fixed right panel) ───────
function CardMenu({
  task, boardId, onRefresh, onOpen,
}: { task: BoardTask; boardId: number; onRefresh: () => void; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const [panelTop, setPanelTop] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelTop(Math.min(rect.top, window.innerHeight - 320))
    }
    setOpen(v => !v)
  }

  const quickPatch = async (field: object) => {
    await api.patch(`/boards/${boardId}/tasks/${task.id}`, field)
    onRefresh()
    setOpen(false)
  }

  const duplicate = async () => {
    await api.post(`/boards/${boardId}/tasks/${task.id}/duplicate`, {})
    onRefresh()
    setOpen(false)
  }

  const deleteTask = async () => {
    if (!confirm(`Supprimer « ${task.titre} » ?`)) return
    await api.delete(`/boards/${boardId}/tasks/${task.id}`)
    onRefresh()
    setOpen(false)
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={openPanel}
        className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-muted)] opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-56 py-2"
          style={{ top: panelTop, right: 16 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 pb-2 border-b border-[var(--border)] mb-1.5">
            <p className="text-[11px] font-semibold text-[var(--text)] truncate">{task.titre}</p>
          </div>

          <button
            onClick={() => { onOpen(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Ouvrir la carte
          </button>
          <button
            onClick={duplicate}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Dupliquer
          </button>

          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />

          {/* Quick color picker */}
          <div className="px-3 pb-2">
            <p className="text-[10px] text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">Couleur de la carte</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                onClick={() => quickPatch({ couleur: null })}
                className={cn('w-5 h-5 rounded border-2 transition-all hover:scale-110 shrink-0', !task.couleur ? 'border-[var(--primary)] scale-110' : 'border-[var(--border)]')}
                style={{ background: 'linear-gradient(135deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(225deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(315deg,#ccc 25%,transparent 25%),linear-gradient(45deg,#ccc 25%,transparent 25%)', backgroundSize: '8px 8px', backgroundColor: '#f5f5f5' }}
                title="Aucune"
              />
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => quickPatch({ couleur: c })}
                  className={cn('w-5 h-5 rounded border-2 transition-all hover:scale-110 shrink-0', task.couleur === c ? 'border-white scale-110 ring-1 ring-[var(--primary)]' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="w-5 h-5 cursor-pointer shrink-0" title="Couleur personnalisée">
                <input type="color" defaultValue={task.couleur || '#000000'} onChange={e => quickPatch({ couleur: e.target.value })} className="sr-only" />
                <div className="w-5 h-5 rounded border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors">
                  <Plus className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                </div>
              </label>
            </div>
          </div>

          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />

          <button
            onClick={deleteTask}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer la carte
          </button>
        </div>
      )}
    </div>
  )
}

// ── Card (sortable) ─────────────────────────────────────────
function TaskCard({
  task, boardId, onClick, overlay = false, onRefresh,
}: { task: BoardTask; boardId: number; onClick?: () => void; overlay?: boolean; onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(task.couleur ? { borderLeftColor: task.couleur } : {}),
  }

  const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date() && !overlay
  const now = new Date()
  const due = task.dateEcheance ? new Date(task.dateEcheance) : null
  const dueSoon = due && !isOverdue && (due.getTime() - now.getTime()) < 86_400_000 * 2

  const toggleItem = async (item: TaskChecklistItem, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.patch(`/boards/${boardId}/tasks/${task.id}/checklist/${item.id}`, { checked: !item.checked })
    onRefresh()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] cursor-pointer select-none overflow-hidden',
        'hover:border-[var(--border-focus)] hover:shadow-sm transition-all',
        overlay && 'shadow-xl rotate-1 border-[var(--primary)]',
        task.couleur && 'border-l-4',
      )}
    >
      {/* Cover image (first attachment photo) */}
      {task.coverUrl && (
        <div className="w-full h-28 overflow-hidden">
          <img src={task.coverUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="px-3 py-2.5">
      {/* Label strips — only rendered when there are labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {task.labels.map(l => (
            <span key={l.id} className="h-2 w-8 rounded-full shrink-0" style={{ backgroundColor: l.couleur }} title={l.nom} />
          ))}
        </div>
      )}

      <p className="text-xs font-medium text-[var(--text)] leading-snug">{task.titre}</p>

      {/* Jalon */}
      {task.jalon && (
        <span className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--primary-subtle)] text-[var(--primary)]">
          🏁 {task.jalon}
        </span>
      )}

      {/* Checklist preview — first 3 items, clickable */}
      {task.checklist.length > 0 && (
        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
          {task.checklist.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-1.5">
              <button
                onClick={e => toggleItem(item, e)}
                className={cn(
                  'w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  item.checked
                    ? 'bg-[var(--success)] border-[var(--success)]'
                    : 'border-[var(--border)] hover:border-[var(--primary)]',
                )}
              >
                {item.checked && <Check className="w-2 h-2 text-white" />}
              </button>
              <span className={cn('text-[10px] truncate', item.checked && 'line-through text-[var(--text-muted)]')}>
                {item.texte}
              </span>
            </div>
          ))}
          {task.checklist.length > 3 && (
            <p className="text-[10px] text-[var(--text-muted)] pl-5">+{task.checklist.length - 3} autres…</p>
          )}
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {/* Date badge */}
        {task.dateEcheance && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            isOverdue
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : dueSoon
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          )}>
            <Clock className="w-2.5 h-2.5" />
            {formatDueDate(task.dateEcheance)}
          </span>
        )}

        {/* Checklist ratio */}
        {task.checklistMeta.total > 0 && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            task.checklistMeta.done === task.checklistMeta.total
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-[var(--bg-muted)] text-[var(--text-muted)]',
          )}>
            <CheckSquare className="w-2.5 h-2.5" />
            {task.checklistMeta.done}/{task.checklistMeta.total}
          </span>
        )}

        {/* Attachments */}
        {(task.attachmentCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
            <Paperclip className="w-2.5 h-2.5" />
            {task.attachmentCount}
          </span>
        )}

        {/* Comments */}
        {(task.commentCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
            <MessageSquare className="w-2.5 h-2.5" />
            {task.commentCount}
          </span>
        )}

        {/* Client validated */}
        {task.clientValidated && (
          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        )}

        {/* Assignees */}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1 ml-auto">
            {task.assignees.slice(0, 3).map(u => (
              <Avatar key={u.id} name={`${u.prenom} ${u.nom}`} size="xs" />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Column ──────────────────────────────────────────────────
function Column({
  col, boardId, users, labels, onCardClick, onRefresh,
}: {
  col: BoardColumnType
  boardId: number
  users: UserType[]
  labels: TaskLabelType[]
  onCardClick: (task: BoardTask) => void
  onRefresh: () => void
}) {
  const qc = useQueryClient()
  const { setNodeRef, isOver, attributes, listeners } = useSortable({
    id: `col-${col.id}`,
    data: { type: 'column', col },
  })

  const [addingTask, setAddingTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(col.nom)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const createTask = useMutation({
    mutationFn: (titre: string) => api.post(`/boards/${boardId}/tasks`, { columnId: col.id, titre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board', boardId] }); setNewTitle(''); setAddingTask(false) },
  })


  useEffect(() => {
    if (addingTask) setTimeout(() => inputRef.current?.focus(), 50)
  }, [addingTask])

  useEffect(() => {
    if (editingName) setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [editingName])

  const saveColName = async () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== col.nom) {
      await api.patch(`/boards/${boardId}/columns/${col.id}`, { nom: trimmed })
      onRefresh()
    }
    setEditingName(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group/col flex flex-col w-64 shrink-0 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] border border-[var(--border)]',
        'transition-colors max-h-full',
        isOver && 'border-[var(--primary)] bg-[var(--primary-subtle)]',
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] opacity-0 group-hover/col:opacity-100 cursor-grab active:cursor-grabbing shrink-0 transition-all"
          tabIndex={-1}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {col.couleur && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.couleur }} />}
          {editingName ? (
            <input
              ref={nameInputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveColName()
                if (e.key === 'Escape') { setEditingName(false); setEditName(col.nom) }
              }}
              onBlur={saveColName}
              className="text-xs font-semibold text-[var(--text)] bg-[var(--surface)] border border-[var(--primary)] rounded px-1.5 py-0.5 outline-none w-full"
            />
          ) : (
            <span
              className="text-xs font-semibold text-[var(--text)] cursor-pointer hover:text-[var(--primary)] transition-colors truncate"
              onClick={() => { setEditingName(true); setEditName(col.nom) }}
              title="Cliquer pour renommer"
            >
              {col.nom}
            </span>
          )}
          {!editingName && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-muted)] px-1.5 py-0.5 rounded-full shrink-0">
              {col.tasks.length}
            </span>
          )}
        </div>
        {!editingName && (
          <ColumnMenu
            col={col}
            boardId={boardId}
            onRename={() => { setEditingName(true); setEditName(col.nom) }}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* Tasks */}
      <SortableContext items={col.tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[40px]">
          {col.tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              boardId={boardId}
              onClick={() => onCardClick(task)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add task */}
      <div className="px-2 pb-2">
        {addingTask ? (
          <div className="space-y-1.5">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTitle.trim()) createTask.mutate(newTitle.trim())
                if (e.key === 'Escape') setAddingTask(false)
              }}
              placeholder="Titre de la tâche…"
              className="w-full px-2.5 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
            />
            <div className="flex gap-1">
              <button
                onClick={() => newTitle.trim() && createTask.mutate(newTitle.trim())}
                className="flex-1 py-1.5 text-xs bg-[var(--primary)] text-white rounded-[var(--radius-sm)] font-medium"
              >
                Ajouter
              </button>
              <button
                onClick={() => setAddingTask(false)}
                className="px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-muted)] rounded-[var(--radius-sm)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une carte
          </button>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

function timeAgo(str: string): string {
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Task Detail Modal ────────────────────────────────────────
function TaskModal({
  task, board, onClose,
}: { task: BoardTask; board: Board; onClose: () => void }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'attachments'>('content')
  const [titre, setTitre] = useState(task.titre)
  const [desc, setDesc] = useState(task.description ?? '')
  const [date, setDate] = useState(task.dateEcheance ?? '')
  const [jalon, setJalon] = useState(task.jalon ?? '')
  const [couleur, setCouleur] = useState(task.couleur ?? '')
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch full task detail (with comments + attachments)
  const { data: taskDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['task-detail', board.id, task.id],
    queryFn: () => api.get<BoardTask>(`/boards/${board.id}/tasks/${task.id}`),
    staleTime: 5000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['board', board.id] })
    refetchDetail()
  }

  const saveField = async (field: object) => {
    setSaving(true)
    await api.patch(`/boards/${board.id}/tasks/${task.id}`, field)
    invalidate()
    setSaving(false)
  }

  const toggleAssignee = async (uid: number) => {
    const current = task.assignees.map(u => u.id)
    const next = current.includes(uid) ? current.filter(i => i !== uid) : [...current, uid]
    await saveField({ assigneeIds: next })
  }

  const toggleLabel = async (lid: number) => {
    const current = task.labels.map(l => l.id)
    const next = current.includes(lid) ? current.filter(i => i !== lid) : [...current, lid]
    await saveField({ labelIds: next })
  }

  const addChecklist = async () => {
    if (!newItem.trim()) return
    await api.post(`/boards/${board.id}/tasks/${task.id}/checklist`, { texte: newItem.trim() })
    setNewItem('')
    invalidate()
  }

  const toggleChecklist = async (item: TaskChecklistItem) => {
    await api.patch(`/boards/${board.id}/tasks/${task.id}/checklist/${item.id}`, { checked: !item.checked })
    invalidate()
  }

  const deleteChecklist = async (item: TaskChecklistItem) => {
    await api.delete(`/boards/${board.id}/tasks/${task.id}/checklist/${item.id}`)
    invalidate()
  }

  const deleteTask = async () => {
    if (!confirm('Supprimer cette tâche ?')) return
    await api.delete(`/boards/${board.id}/tasks/${task.id}`)
    qc.invalidateQueries({ queryKey: ['board', board.id] })
    onClose()
  }

  const sendComment = async () => {
    if (!comment.trim()) return
    setSendingComment(true)
    try {
      await api.post(`/boards/${board.id}/tasks/${task.id}/comments`, { texte: comment.trim() })
      setComment('')
      invalidate()
    } finally {
      setSendingComment(false)
    }
  }

  const deleteComment = async (cid: number) => {
    await api.delete(`/boards/${board.id}/tasks/${task.id}/comments/${cid}`)
    invalidate()
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.upload(`/boards/${board.id}/tasks/${task.id}/attachments`, fd)
      invalidate()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const deleteAttachment = async (aid: number) => {
    if (!confirm('Supprimer cette pièce jointe ?')) return
    await api.delete(`/boards/${board.id}/tasks/${task.id}/attachments/${aid}`)
    invalidate()
  }

  const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date()
  const progress = task.checklistMeta.total > 0
    ? Math.round((task.checklistMeta.done / task.checklistMeta.total) * 100)
    : 0

  const comments = taskDetail?.comments ?? []
  const attachments = taskDetail?.attachments ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-2xl">
        {task.couleur && <div className="h-2 rounded-t-[var(--radius-xl)]" style={{ backgroundColor: task.couleur }} />}

        <div className="flex gap-4 p-5">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <input
                value={titre}
                onChange={e => setTitre(e.target.value)}
                onBlur={() => titre !== task.titre && saveField({ titre })}
                className="flex-1 text-base font-semibold text-[var(--text)] bg-transparent outline-none hover:bg-[var(--bg-muted)] focus:bg-[var(--bg-muted)] rounded px-1 -ml-1"
              />
              <button onClick={onClose} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-3">
              Dans <span className="font-medium text-[var(--text)]">{board.columns.find(c => c.id === task.columnId)?.nom}</span>
            </p>

            {/* Client validated badge */}
            {task.clientValidated && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--success-subtle)] text-[var(--success)] text-xs font-medium mb-3">
                <CheckCircle className="w-3.5 h-3.5" />
                Validé par le client
              </div>
            )}

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {task.labels.map(l => (
                  <span key={l.id} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: l.couleur }}>
                    {l.nom}
                  </span>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-0.5 border-b border-[var(--border)] mb-4">
              {([
                { key: 'content', label: 'Contenu' },
                { key: 'comments', label: `Commentaires${comments.length > 0 ? ` (${comments.length})` : ''}` },
                { key: 'attachments', label: `Pièces jointes${attachments.length > 0 ? ` (${attachments.length})` : ''}` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                    activeTab === tab.key
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Content */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)] mb-1.5">
                    <AlignLeft className="w-3.5 h-3.5" />Description
                  </label>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    onBlur={() => desc !== (task.description ?? '') && saveField({ description: desc })}
                    rows={3}
                    placeholder="Ajouter une description…"
                    className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                  />
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--text)]" />
                    <span className="text-xs font-semibold text-[var(--text)]">Checklist</span>
                    {task.checklistMeta.total > 0 && <span className="text-[10px] text-[var(--text-muted)] ml-auto">{progress}%</span>}
                  </div>
                  {task.checklistMeta.total > 0 && (
                    <div className="h-1.5 bg-[var(--bg-muted)] rounded-full mb-3 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-[var(--success)]' : 'bg-[var(--primary)]')} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {task.checklist.map(item => (
                      <div key={item.id} className="flex items-center gap-2 group/item">
                        <button
                          onClick={() => toggleChecklist(item)}
                          className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors', item.checked ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--border)] hover:border-[var(--primary)]')}
                        >
                          {item.checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <span className={cn('text-xs flex-1', item.checked && 'line-through text-[var(--text-muted)]')}>{item.texte}</span>
                        <button onClick={() => deleteChecklist(item)} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addChecklist()}
                        placeholder="Ajouter un élément…"
                        className="flex-1 text-xs px-2.5 py-1.5 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      />
                      <button onClick={addChecklist} className="px-2.5 py-1.5 text-xs bg-[var(--primary)] text-white rounded-[var(--radius-md)] font-medium">
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Comments */}
            {activeTab === 'comments' && (
              <div className="space-y-3">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">Aucun commentaire</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className={cn('flex gap-2.5 group/cm', c.isClientComment && 'flex-row-reverse')}>
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0', c.isClientComment ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' : 'bg-[var(--primary-subtle)] text-[var(--primary)]')}>
                        {c.auteurPrenom.charAt(0).toUpperCase()}
                      </div>
                      <div className={cn('flex-1 max-w-[85%]', c.isClientComment && 'items-end flex flex-col')}>
                        <div className={cn('rounded-[var(--radius-md)] px-3 py-2', c.isClientComment ? 'bg-[var(--warning-subtle)]' : 'bg-[var(--bg-subtle)]')}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold text-[var(--text)]">{c.auteurNom}</span>
                            {c.isClientComment && <span className="text-[9px] text-[var(--warning)] bg-[var(--warning-subtle)] px-1 py-0.5 rounded">Client</span>}
                          </div>
                          <p className="text-xs text-[var(--text)] whitespace-pre-wrap">{c.texte}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 px-1">
                          <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(c.createdAt)}</span>
                          {!c.isClientComment && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="opacity-0 group-hover/cm:opacity-100 text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                    placeholder="Écrire un commentaire… (Entrée pour envoyer)"
                    rows={2}
                    className="flex-1 text-xs px-2.5 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                  />
                  <button
                    onClick={sendComment}
                    disabled={!comment.trim() || sendingComment}
                    className="px-2.5 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-md)] disabled:opacity-50 self-end"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Attachments */}
            {activeTab === 'attachments' && (
              <div className="space-y-3">
                <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} accept="*/*" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[var(--border)] rounded-[var(--radius-md)] text-xs text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {uploading ? 'Envoi en cours…' : 'Ajouter une pièce jointe (max 20 Mo)'}
                </button>

                {attachments.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-2">Aucune pièce jointe</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {attachments.map(a => (
                    <div key={a.id} className="group/att relative bg-[var(--bg-subtle)] rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
                      {a.isImage ? (
                        <img src={a.url} alt={a.nomOriginal} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center bg-[var(--bg-muted)]">
                          <Paperclip className="w-6 h-6 text-[var(--text-muted)]" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] font-medium text-[var(--text)] truncate">{a.nomOriginal}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-[var(--text-muted)]">{formatBytes(a.taille)}</span>
                          <div className="flex gap-1">
                            <a href={a.url} target="_blank" rel="noreferrer" className="p-0.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                              <Download className="w-3 h-3" />
                            </a>
                            <button onClick={() => deleteAttachment(a.id)} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-44 shrink-0 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Membres</p>
              <div className="space-y-1">
                {board.users.map(u => {
                  const isAssigned = task.assignees.some(a => a.id === u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] text-xs transition-colors',
                        isAssigned ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]',
                      )}
                    >
                      <Avatar name={`${u.prenom} ${u.nom}`} size="xs" />
                      <span className="truncate">{u.prenom}</span>
                      {isAssigned && <Check className="w-3 h-3 ml-auto shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Étiquettes</p>
              <div className="space-y-1">
                {board.labels.map(l => {
                  const active = task.labels.some(x => x.id === l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] text-xs transition-colors', active ? 'ring-1 ring-[var(--border-focus)]' : 'hover:opacity-80')}
                      style={{ backgroundColor: l.couleur + '33' }}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.couleur }} />
                      <span className="truncate text-[var(--text)]">{l.nom}</span>
                      {active && <Check className="w-3 h-3 ml-auto shrink-0 text-[var(--text)]" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Échéance</p>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); saveField({ dateEcheance: e.target.value || null }) }}
                className={cn('w-full px-2.5 py-1.5 text-xs border rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)] transition-colors', isOverdue ? 'border-[var(--danger)] text-[var(--danger)]' : 'border-[var(--border)]')}
              />
              {isOverdue && <p className="text-[10px] text-[var(--danger)] mt-1">En retard !</p>}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Jalon</p>
              <input
                type="text"
                value={jalon}
                onChange={e => setJalon(e.target.value)}
                onBlur={() => saveField({ jalon: jalon || null })}
                placeholder="Ex: Sprint 1"
                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Couleur carte</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={() => { setCouleur(''); saveField({ couleur: null }) }}
                  className={cn('w-5 h-5 rounded border-2 transition-all shrink-0', !couleur ? 'border-[var(--primary)]' : 'border-transparent hover:border-[var(--border)]')}
                  style={{ background: 'linear-gradient(135deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(225deg,#ccc 25%,transparent 25%) -4px 0,linear-gradient(315deg,#ccc 25%,transparent 25%),linear-gradient(45deg,#ccc 25%,transparent 25%)', backgroundSize: '8px 8px', backgroundColor: '#f5f5f5' }}
                  title="Aucune"
                />
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCouleur(c); saveField({ couleur: c }) }}
                    className={cn('w-5 h-5 rounded border-2 transition-all shrink-0', couleur === c ? 'border-white scale-110 ring-1 ring-[var(--primary)]' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="w-5 h-5 cursor-pointer shrink-0" title="Couleur personnalisée">
                  <input type="color" value={couleur || '#000000'} onChange={e => { setCouleur(e.target.value); saveField({ couleur: e.target.value }) }} className="sr-only" />
                  <div className="w-5 h-5 rounded border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors" style={couleur && !COLORS.includes(couleur) ? { backgroundColor: couleur } : {}}>
                    {(!couleur || COLORS.includes(couleur)) && <Plus className="w-2.5 h-2.5 text-[var(--text-muted)]" />}
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={deleteTask}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] rounded-[var(--radius-md)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer la tâche
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Board Settings Panel ─────────────────────────────────────
function BoardSettings({
  board, boardId, onClose, onRefresh, onDelete,
}: {
  board: Board
  boardId: number
  onClose: () => void
  onRefresh: () => void
  onDelete: () => void
}) {
  const { user } = useAuthStore()
  const [nom, setNom] = useState(board.nom)
  const [visibilite, setVisibilite] = useState(board.visibilite)
  const [couleurFond, setCouleurFond] = useState(
    (board.couleurFond.startsWith('http') || board.couleurFond.startsWith('data:') || board.couleurFond.startsWith('/api/')) ? '#0052CC' : board.couleurFond
  )
  const [imageUrl, setImageUrl] = useState(
    (board.couleurFond.startsWith('http') || board.couleurFond.startsWith('data:') || board.couleurFond.startsWith('/api/')) ? board.couleurFond : ''
  )
  const [saving, setSaving] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const [newLabelNom, setNewLabelNom] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#61BD4F')
  const qc = useQueryClient()

  const isOwnerOrAdmin = board.proprietaire?.id === user?.id || user?.roles.includes('ROLE_ADMIN')

  const save = async () => {
    setSaving(true)
    await api.patch(`/boards/${boardId}`, {
      nom,
      visibilite,
      couleurFond: imageUrl.trim() || couleurFond,
    })
    onRefresh()
    setSaving(false)
  }

  const uploadBgImage = async (file: File) => {
    setUploadingBg(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.upload<{ couleurFond: string }>(`/boards/${boardId}/background-image`, fd)
      setImageUrl(res.couleurFond)
      onRefresh()
    } finally {
      setUploadingBg(false)
    }
  }

  const addMember = async (uid: number) => {
    await api.post(`/boards/${boardId}/members`, { userId: uid, role: 'editor' })
    onRefresh()
  }

  const removeMember = async (uid: number) => {
    await api.delete(`/boards/${boardId}/members/${uid}`)
    onRefresh()
  }

  const createLabel = async () => {
    if (!newLabelNom.trim()) return
    await api.post(`/boards/${boardId}/labels`, { nom: newLabelNom.trim(), couleur: newLabelColor })
    setNewLabelNom('')
    qc.invalidateQueries({ queryKey: ['board', boardId] })
  }

  const deleteLabel = async (labelId: number) => {
    await api.delete(`/boards/${boardId}/labels/${labelId}`)
    qc.invalidateQueries({ queryKey: ['board', boardId] })
  }

  const notMembers = board.users.filter(u =>
    u.id !== board.proprietaire?.id &&
    !board.members.some(m => m.user.id === u.id)
  )

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute right-0 top-0 h-full w-80 bg-[var(--surface)] border-l border-[var(--border)] shadow-[var(--shadow-xl)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--text)]">Paramètres du tableau</h2>
          <button onClick={onClose} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Board name */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Nom du tableau</label>
            <div className="flex gap-2">
              <input
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
              <Button size="sm" variant="primary" onClick={save} loading={saving}>OK</Button>
            </div>
          </div>

          {/* Background */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-3">Fond du tableau</label>
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              {BG_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { setCouleurFond(p); setImageUrl('') }}
                  className={cn('w-8 h-8 rounded-[var(--radius-md)] transition-all shrink-0', couleurFond === p && !imageUrl && 'ring-2 ring-offset-1 ring-[var(--primary)] scale-95')}
                  style={{ backgroundColor: p }}
                />
              ))}
              <label className="w-8 h-8 cursor-pointer shrink-0" title="Couleur personnalisée">
                <input type="color" value={couleurFond} onChange={e => { setCouleurFond(e.target.value); setImageUrl('') }} className="sr-only" />
                <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors" style={!BG_PRESETS.includes(couleurFond) && !imageUrl ? { backgroundColor: couleurFond } : {}}>
                  {(BG_PRESETS.includes(couleurFond) || imageUrl) && <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </div>
              </label>
            </div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1.5">Image de fond</label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                placeholder="https://… ou charger un fichier →"
                value={imageUrl.startsWith('/api/') ? '' : imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
              />
              <label className="cursor-pointer" title="Charger une image">
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadBgImage(f); e.target.value = '' }}
                />
                <div className={cn('p-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors', uploadingBg && 'opacity-50')}>
                  {uploadingBg ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </div>
              </label>
              {imageUrl && (
                <button onClick={() => { setImageUrl(''); save() }} className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)]" title="Supprimer l'image">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {imageUrl && (
              <div className="h-16 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] mb-2" style={getBgStyle(imageUrl)} />
            )}
            <Button className="w-full" size="sm" variant="outline" onClick={save} loading={saving}>
              Appliquer
            </Button>
          </div>

          {/* Share link */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-3">Lien client public</label>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text)]">Partage activé</span>
              <button
                onClick={async () => { await api.post(`/boards/${boardId}/share`); onRefresh() }}
                className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0', board.shareEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}
              >
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', board.shareEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
            {board.shareEnabled && board.shareToken && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    readOnly
                    value={`${window.location.origin}/share/${board.shareToken}`}
                    className="flex-1 px-2 py-1.5 text-[10px] border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-subtle)] text-[var(--text-muted)] outline-none"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/${board.shareToken}`).then(() => alert('Lien copié !'))}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--primary)] transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a href={`/share/${board.shareToken}`} target="_blank" rel="noreferrer" className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--primary)] transition-colors" title="Ouvrir">
                    <Link className="w-3.5 h-3.5" />
                  </a>
                </div>
                <button
                  onClick={async () => { if (confirm('Régénérer le lien ? L\'ancien ne fonctionnera plus.')) { await api.post(`/boards/${boardId}/share/regenerate`); onRefresh() } }}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Régénérer le lien
                </button>
              </div>
            )}
            {!board.shareEnabled && (
              <p className="text-[10px] text-[var(--text-muted)]">Activez le partage pour générer un lien sécurisé accessible aux clients.</p>
            )}
          </div>

          {/* Visibility */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Visibilité</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'prive', icon: Lock, label: 'Privé' },
                { value: 'equipe', icon: Users, label: 'Équipe' },
                { value: 'partage', icon: Globe, label: 'Partagé' },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => { setVisibilite(value); setTimeout(save, 0) }}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors',
                    visibilite === value
                      ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-3">Membres</label>

            {/* Owner */}
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5">
              <Avatar name={`${board.proprietaire?.prenom} ${board.proprietaire?.nom}`} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{board.proprietaire?.prenom} {board.proprietaire?.nom}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[var(--warning)] bg-[var(--warning-subtle)] px-1.5 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" /> Propriétaire
              </span>
            </div>

            {/* Current members */}
            {board.members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 group/member rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)]">
                <Avatar name={`${m.user.prenom} ${m.user.nom}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text)] truncate">{m.user.prenom} {m.user.nom}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{m.role}</p>
                </div>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => removeMember(m.user.id)}
                    className="opacity-0 group-hover/member:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                    title="Retirer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add members (non-members) */}
            {isOwnerOrAdmin && notMembers.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-[var(--text-muted)] mb-2">Inviter un membre</p>
                {notMembers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addMember(u.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)] text-[var(--text-secondary)] transition-colors group/add"
                  >
                    <Avatar name={`${u.prenom} ${u.nom}`} size="xs" />
                    <span className="text-xs flex-1 text-left truncate">{u.prenom} {u.nom}</span>
                    <UserPlus className="w-3 h-3 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="p-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-3">Étiquettes</label>
            <div className="space-y-1.5 mb-3">
              {board.labels.map(l => (
                <div key={l.id} className="flex items-center gap-2 group/lbl">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: l.couleur }} />
                  <span className="text-xs flex-1 text-[var(--text)]">{l.nom}</span>
                  <button
                    onClick={() => deleteLabel(l.id)}
                    className="opacity-0 group-hover/lbl:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newLabelColor}
                onChange={e => setNewLabelColor(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer shrink-0"
              />
              <input
                placeholder="Nom de l'étiquette…"
                value={newLabelNom}
                onChange={e => setNewLabelNom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createLabel()}
                className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={createLabel}
                className="p-1.5 rounded bg-[var(--primary)] text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Danger zone */}
          {isOwnerOrAdmin && (
            <div className="p-4">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Zone dangereuse</label>
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--danger)] border border-[var(--danger)] hover:bg-[var(--danger-subtle)] rounded-[var(--radius-md)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer ce tableau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── List View ────────────────────────────────────────────────
function ListView({ board, onCardClick }: { board: Board; onCardClick: (t: BoardTask) => void }) {
  const allTasks = board.columns.flatMap(c => c.tasks.map(t => ({ ...t, colNom: c.nom })))
  const today = new Date()

  return (
    <div className="space-y-2">
      {allTasks.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-8">Aucune tâche</p>}
      {allTasks.map(t => {
        const overdue = t.dateEcheance && new Date(t.dateEcheance) < today
        return (
          <div
            key={t.id}
            onClick={() => onCardClick(t)}
            className="flex items-center gap-4 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] hover:border-[var(--border-focus)] cursor-pointer transition-colors"
          >
            {t.couleur && <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: t.couleur }} />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text)] truncate">{t.titre}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{(t as typeof t & { colNom: string }).colNom}</p>
            </div>
            {t.labels.slice(0, 3).map(l => <span key={l.id} className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: l.couleur }} />)}
            {t.dateEcheance && (
              <span className={cn('text-[10px] px-2 py-1 rounded font-medium shrink-0', overdue ? 'bg-[var(--danger-subtle)] text-[var(--danger)]' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]')}>
                {new Date(t.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {t.checklistMeta.total > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">{t.checklistMeta.done}/{t.checklistMeta.total}</span>
            )}
            {t.assignees.length > 0 && (
              <div className="flex -space-x-1 shrink-0">
                {t.assignees.slice(0, 2).map(u => <Avatar key={u.id} name={`${u.prenom} ${u.nom}`} size="xs" />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Board Page ──────────────────────────────────────────
export function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const boardId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [view, setView] = useState<View>('board')
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)
  const [localColumns, setLocalColumns] = useState<BoardColumnType[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const newColRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => api.get<Board>(`/boards/${boardId}`),
    enabled: !!boardId,
  })

  useEffect(() => {
    if (board) setLocalColumns(board.columns)
  }, [board])

  useEffect(() => {
    if (addingColumn) setTimeout(() => newColRef.current?.focus(), 50)
  }, [addingColumn])

  const moveTasksMutation = useMutation({
    mutationFn: (moves: Array<{ taskId: number; columnId: number; ordre: number }>) =>
      api.post(`/boards/${boardId}/tasks/move`, { moves }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })

  const addColumn = useMutation({
    mutationFn: (nom: string) => api.post(`/boards/${boardId}/columns`, { nom }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['board', boardId] })

  function handleDragStart(e: DragStartEvent) {
    if (e.active.data.current?.type === 'task') {
      setActiveTask(e.active.data.current.task)
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over || !board) return

    const taskId = active.id as string
    const overId = over.id as string

    // Handle column reordering
    if (active.data.current?.type === 'column') {
      const fromIdx = localColumns.findIndex(c => `col-${c.id}` === taskId)
      const toIdx   = localColumns.findIndex(c => `col-${c.id}` === overId)
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        const newCols = arrayMove(localColumns, fromIdx, toIdx)
        setLocalColumns(newCols)
        newCols.forEach((col, idx) => api.patch(`/boards/${boardId}/columns/${col.id}`, { ordre: idx }))
      }
      return
    }

    let sourceColId: number | null = null
    let sourceTaskIndex = -1
    for (const col of localColumns) {
      const idx = col.tasks.findIndex(t => `task-${t.id}` === taskId)
      if (idx !== -1) { sourceColId = col.id; sourceTaskIndex = idx; break }
    }
    if (sourceColId === null) return

    let destColId!: number
    let destTaskIndex!: number

    if (overId.startsWith('col-')) {
      destColId = parseInt(overId.replace('col-', ''))
      destTaskIndex = localColumns.find(c => c.id === destColId)?.tasks.length ?? 0
    } else {
      let found = false
      for (const col of localColumns) {
        const idx = col.tasks.findIndex(t => `task-${t.id}` === overId)
        if (idx !== -1) { destColId = col.id; destTaskIndex = idx; found = true; break }
      }
      if (!found) return
    }

    const newCols = localColumns.map(col => {
      let tasks = [...col.tasks]
      if (col.id === sourceColId) tasks.splice(sourceTaskIndex, 1)
      return { ...col, tasks }
    })

    const movedTask = localColumns.find(c => c.id === sourceColId)?.tasks[sourceTaskIndex]
    if (!movedTask) return

    const finalCols = newCols.map(col => {
      if (col.id === destColId) {
        const tasks = [...col.tasks]
        tasks.splice(destTaskIndex, 0, { ...movedTask, columnId: destColId })
        return { ...col, tasks }
      }
      return col
    })

    setLocalColumns(finalCols)
    const moves = finalCols.flatMap(col =>
      col.tasks.map((t, idx) => ({ taskId: t.id, columnId: col.id, ordre: idx }))
    )
    moveTasksMutation.mutate(moves)
  }

  const handleDeleteBoard = async () => {
    if (!confirm(`Supprimer le tableau « ${board?.nom} » ? Cette action est irréversible.`)) return
    await api.delete(`/boards/${boardId}`)
    navigate('/todos')
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!board) return <div className="text-center py-16 text-sm text-[var(--text-muted)]">Tableau introuvable.</div>

  const canEdit = board.proprietaire?.id === user?.id ||
    board.members.some(m => m.user.id === user?.id && m.role !== 'viewer') ||
    board.visibilite === 'equipe'

  const bgStyle = getBgStyle(board.couleurFond, 0.15)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <button onClick={() => navigate('/todos')} className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Board color/image indicator */}
        <div
          className="w-6 h-6 rounded shrink-0 overflow-hidden border border-black/10"
          style={board.couleurFond.startsWith('http') || board.couleurFond.startsWith('data:') || board.couleurFond.startsWith('/api/')
            ? getBgStyle(board.couleurFond)
            : { backgroundColor: board.couleurFond }}
        />
        <h1 className="text-sm font-semibold text-[var(--text)] truncate">{board.nom}</h1>

        <div className="flex items-center gap-1 ml-1">
          {board.visibilite === 'prive' && <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          {board.visibilite === 'equipe' && <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          {board.visibilite === 'partage' && <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        </div>

        {/* Member avatars */}
        {board.members.length > 0 && (
          <div className="flex -space-x-2 ml-1">
            <div className="w-6 h-6 rounded-full ring-2 ring-[var(--surface)] overflow-hidden">
              <Avatar name={`${board.proprietaire?.prenom} ${board.proprietaire?.nom}`} size="xs" />
            </div>
            {board.members.slice(0, 4).map(m => (
              <div key={m.id} className="w-6 h-6 rounded-full ring-2 ring-[var(--surface)] overflow-hidden">
                <Avatar name={`${m.user.prenom} ${m.user.nom}`} size="xs" />
              </div>
            ))}
            {board.members.length > 4 && (
              <div className="w-6 h-6 rounded-full ring-2 ring-[var(--surface)] bg-[var(--bg-muted)] flex items-center justify-center text-[9px] font-semibold text-[var(--text-muted)]">
                +{board.members.length - 4}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
            {([
              { v: 'board', icon: LayoutGrid },
              { v: 'list', icon: List },
              { v: 'calendar', icon: CalendarDays },
            ] as const).map(({ v, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'p-1.5 transition-colors',
                  view === v ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(v => !v)}
            className={cn(
              'p-1.5 rounded-[var(--radius-md)] border border-[var(--border)] transition-colors',
              showSettings ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]',
            )}
            title="Paramètres"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 overflow-x-auto flex-1 items-start" style={bgStyle}>
            <SortableContext items={localColumns.map(c => `col-${c.id}`)}>
              {localColumns.map(col => (
                <Column
                  key={col.id}
                  col={col}
                  boardId={boardId}
                  users={board.users}
                  labels={board.labels}
                  onCardClick={t => setSelectedTask(t)}
                  onRefresh={refresh}
                />
              ))}
            </SortableContext>

            {canEdit && (
              addingColumn ? (
                <div className="w-64 shrink-0 bg-[var(--bg-subtle)] border border-[var(--primary)] rounded-[var(--radius-lg)] p-3 space-y-2">
                  <input
                    ref={newColRef}
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newColName.trim()) {
                        addColumn.mutate(newColName.trim())
                        setNewColName('')
                        setAddingColumn(false)
                      }
                      if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') }
                    }}
                    placeholder="Nom de la colonne…"
                    className="w-full px-2.5 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        if (newColName.trim()) { addColumn.mutate(newColName.trim()); setNewColName('') }
                        setAddingColumn(false)
                      }}
                      className="flex-1 py-1.5 text-xs bg-[var(--primary)] text-white rounded-[var(--radius-sm)] font-medium"
                    >
                      Ajouter
                    </button>
                    <button
                      onClick={() => { setAddingColumn(false); setNewColName('') }}
                      className="px-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] rounded-[var(--radius-sm)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-64 shrink-0 flex items-center gap-2 px-4 py-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-medium">Ajouter une colonne</span>
                </button>
              )
            )}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} boardId={boardId} overlay onRefresh={() => {}} />}
          </DragOverlay>
        </DndContext>
      ) : view === 'list' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <ListView board={{ ...board, columns: localColumns }} onCardClick={t => setSelectedTask(t)} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <BoardCalendar board={{ ...board, columns: localColumns }} onCardClick={t => setSelectedTask(t)} />
        </div>
      )}

      {/* Task modal */}
      {selectedTask && board && (
        <TaskModal
          task={board.columns.flatMap(c => c.tasks).find(t => t.id === selectedTask.id) ?? selectedTask}
          board={board}
          onClose={() => { setSelectedTask(null); refresh() }}
        />
      )}

      {/* Settings panel */}
      {showSettings && board && (
        <BoardSettings
          board={board}
          boardId={boardId}
          onClose={() => setShowSettings(false)}
          onRefresh={refresh}
          onDelete={handleDeleteBoard}
        />
      )}
    </div>
  )
}
