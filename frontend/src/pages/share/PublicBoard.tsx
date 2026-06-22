import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle, Clock, CheckSquare, MessageSquare, Paperclip,
  Send, Download, X, Check, Sun, Moon, LayoutGrid, List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PUBLIC_BASE = '/api/public/board'

async function publicGet<T>(token: string, path = ''): Promise<T> {
  const r = await fetch(`${PUBLIC_BASE}/${token}${path}`)
  if (!r.ok) throw new Error('Erreur')
  return r.json()
}

async function publicPost<T>(token: string, path: string, body: object): Promise<T> {
  const r = await fetch(`${PUBLIC_BASE}/${token}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error('Erreur')
  return r.json()
}

async function publicDelete<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${PUBLIC_BASE}/${token}${path}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Erreur')
  return null as T
}

interface PublicTask {
  id: number
  titre: string
  description: string | null
  couleur: string | null
  dateEcheance: string | null
  jalon: string | null
  clientValidated: boolean
  clientValidatedAt: string | null
  labels: { id: number; nom: string; couleur: string }[]
  checklist: { id: number; texte: string; checked: boolean }[]
  checklistMeta: { total: number; done: number }
  comments: { id: number; auteurNom: string; auteurPrenom: string; texte: string; isClientComment: boolean; createdAt: string }[]
  attachments: { id: number; nomOriginal: string; mimeType: string | null; isImage: boolean; url: string; taille: number }[]
}

interface PublicColumn {
  id: number
  nom: string
  couleur: string | null
  tasks: PublicTask[]
}

interface PublicBoardData {
  id: number
  nom: string
  couleurFond: string
  agence: string
  columns: PublicColumn[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
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

function isBgImage(fond: string): boolean {
  return fond.startsWith('http') || fond.startsWith('data:') || fond.startsWith('/api/')
}

function TaskDetail({
  task, token, clientName, onClose, onRefresh, dark,
}: {
  task: PublicTask
  token: string
  clientName: string
  onClose: () => void
  onRefresh: () => void
  dark: boolean
}) {
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [validating, setValidating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date()
  const progress = task.checklistMeta.total > 0
    ? Math.round((task.checklistMeta.done / task.checklistMeta.total) * 100)
    : 0

  const sendComment = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await publicPost(token, `/tasks/${task.id}/comments`, { texte: comment.trim(), auteurNom: clientName })
      setComment('')
      onRefresh()
    } finally {
      setSending(false)
    }
  }

  const toggleValidate = async () => {
    setValidating(true)
    try {
      if (task.clientValidated) {
        await publicDelete(token, `/tasks/${task.id}/validate`)
      } else {
        await publicPost(token, `/tasks/${task.id}/validate`, { auteurNom: clientName })
      }
      onRefresh()
    } finally {
      setValidating(false)
    }
  }

  const surface = dark ? '#1e1e2e' : '#ffffff'
  const textPrimary = dark ? '#e2e8f0' : '#111827'
  const textSecondary = dark ? '#94a3b8' : '#6b7280'
  const borderColor = dark ? '#334155' : '#e5e7eb'
  const bgMuted = dark ? '#0f172a' : '#f9fafb'
  const inputBg = dark ? '#2d3748' : '#ffffff'
  const inputBorder = dark ? '#4a5568' : '#d1d5db'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden mb-8"
        style={{ backgroundColor: surface, border: `1px solid ${borderColor}` }}
      >
        {task.couleur && <div className="h-1.5" style={{ backgroundColor: task.couleur }} />}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: textPrimary }}>{task.titre}</h2>
              {task.jalon && (
                <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: dark ? '#1e3a5f' : '#eff6ff', color: dark ? '#93c5fd' : '#1d4ed8' }}>
                  🏁 {task.jalon}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
              style={{ color: textSecondary, backgroundColor: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = bgMuted)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {task.labels.map(l => (
                <span key={l.id} className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: l.couleur }}>
                  {l.nom}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          {task.dateEcheance && (
            <div className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg mb-4 font-medium"
              style={{
                backgroundColor: isOverdue ? (dark ? '#4a1942' : '#fef2f2') : (dark ? '#14532d' : '#f0fdf4'),
                color: isOverdue ? (dark ? '#f87171' : '#dc2626') : (dark ? '#4ade80' : '#15803d'),
              }}>
              <Clock className="w-4 h-4" />
              {isOverdue ? 'En retard — ' : 'Échéance : '}
              {formatDate(task.dateEcheance)}
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: bgMuted }}>
              <p className="text-sm whitespace-pre-wrap" style={{ color: textSecondary }}>{task.description}</p>
            </div>
          )}

          {/* Checklist */}
          {task.checklist.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: textPrimary }}>
                  <CheckSquare className="w-4 h-4" /> Checklist
                </span>
                <span className="text-xs" style={{ color: textSecondary }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: dark ? '#334155' : '#e5e7eb' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#22c55e' : '#3b82f6' }}
                />
              </div>
              <div className="space-y-2">
                {task.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.checked ? '#22c55e' : 'transparent', borderColor: item.checked ? '#22c55e' : (dark ? '#4a5568' : '#d1d5db') }}>
                      {item.checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm" style={{ color: item.checked ? textSecondary : textPrimary, textDecoration: item.checked ? 'line-through' : 'none' }}>
                      {item.texte}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: textPrimary }}>
                <Paperclip className="w-4 h-4" /> Pièces jointes
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {task.attachments.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg transition-colors"
                    style={{ backgroundColor: bgMuted, border: `1px solid ${borderColor}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}
                  >
                    {a.isImage ? (
                      <img src={a.url} alt={a.nomOriginal} className="w-10 h-10 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }}>
                        <Download className="w-4 h-4" style={{ color: dark ? '#60a5fa' : '#3b82f6' }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: textPrimary }}>{a.nomOriginal}</p>
                      <p className="text-[10px]" style={{ color: textSecondary }}>{formatBytes(a.taille)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Client validation */}
          <div className="p-4 rounded-xl border-2 mb-4 transition-colors"
            style={{
              borderColor: task.clientValidated ? '#86efac' : borderColor,
              borderStyle: task.clientValidated ? 'solid' : 'dashed',
              backgroundColor: task.clientValidated ? (dark ? '#14532d' : '#f0fdf4') : 'transparent',
            }}>
            {task.clientValidated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: dark ? '#4ade80' : '#15803d' }}>
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-semibold">Validé par le client</p>
                    {task.clientValidatedAt && <p className="text-xs opacity-75">{formatDate(task.clientValidatedAt)}</p>}
                  </div>
                </div>
                <button onClick={toggleValidate} disabled={validating}
                  className="text-xs underline opacity-75 hover:opacity-100"
                  style={{ color: dark ? '#4ade80' : '#15803d' }}>
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: textSecondary }}>Cette tâche est-elle terminée à votre goût ?</p>
                <button onClick={toggleValidate} disabled={validating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#22c55e' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#22c55e')}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {validating ? 'En cours…' : 'Valider'}
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: textPrimary }}>
              <MessageSquare className="w-4 h-4" />
              Commentaires ({task.comments.length})
            </h3>

            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {task.comments.map(c => (
                <div key={c.id} className={cn('flex gap-2.5', c.isClientComment && 'flex-row-reverse')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: c.isClientComment ? (dark ? '#1e3a5f' : '#dbeafe') : (dark ? '#1e2d40' : '#f3f4f6'), color: c.isClientComment ? (dark ? '#93c5fd' : '#1d4ed8') : textSecondary }}>
                    {c.auteurPrenom.charAt(0).toUpperCase()}
                  </div>
                  <div className={cn('flex-1 max-w-[80%]', c.isClientComment && 'items-end flex flex-col')}>
                    <div className="rounded-xl px-3 py-2"
                      style={{ backgroundColor: c.isClientComment ? '#3b82f6' : (dark ? '#2d3748' : '#f3f4f6'), color: c.isClientComment ? '#ffffff' : textPrimary }}>
                      <p className="text-xs font-medium mb-0.5 opacity-70">{c.auteurNom}</p>
                      <p className="text-sm whitespace-pre-wrap">{c.texte}</p>
                    </div>
                    <p className="text-[10px] mt-1 px-1" style={{ color: textSecondary }}>{timeAgo(c.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                placeholder="Votre commentaire… (Entrée pour envoyer)"
                rows={2}
                className="flex-1 px-3 py-2 text-sm rounded-xl resize-none outline-none focus:ring-1 focus:ring-blue-400"
                style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
              />
              <button onClick={sendComment} disabled={!comment.trim() || sending}
                className="p-2.5 text-white rounded-xl disabled:opacity-50 transition-colors self-end"
                style={{ backgroundColor: '#3b82f6' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PublicBoard() {
  const { token } = useParams<{ token: string }>()
  const [clientName, setClientName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [selectedTask, setSelectedTask] = useState<PublicTask | null>(null)
  const [dark, setDark] = useState(false)
  const [view, setView] = useState<'board' | 'list'>('board')

  useEffect(() => {
    const saved = localStorage.getItem('encore-client-name')
    if (saved) setClientName(saved)
    const savedDark = localStorage.getItem('encore-client-dark')
    if (savedDark === '1') setDark(true)
  }, [])

  const toggleDark = () => {
    setDark(v => {
      localStorage.setItem('encore-client-dark', !v ? '1' : '0')
      return !v
    })
  }

  const { data: board, isLoading, error, refetch } = useQuery({
    queryKey: ['public-board', token],
    queryFn: () => publicGet<PublicBoardData>(token!),
    enabled: !!token,
    staleTime: 10000,
  })

  const saveName = () => {
    const name = nameInput.trim()
    if (!name) return
    localStorage.setItem('encore-client-name', name)
    setClientName(name)
  }

  const freshTask = selectedTask && board
    ? board.columns.flatMap(c => c.tasks).find(t => t.id === selectedTask.id) ?? selectedTask
    : null

  // Theme tokens
  const bg = dark ? '#0f172a' : '#f8fafc'
  const surface = dark ? '#1e293b' : '#ffffff'
  const textPrimary = dark ? '#e2e8f0' : '#111827'
  const textSecondary = dark ? '#94a3b8' : '#6b7280'
  const borderColor = dark ? '#334155' : '#e5e7eb'
  const bgMuted = dark ? '#0f172a' : '#f1f5f9'
  const inputBg = dark ? '#1e293b' : '#ffffff'
  const inputBorder = dark ? '#475569' : '#d1d5db'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: bgMuted }}>
            <X className="w-8 h-8" style={{ color: textSecondary }} />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: textPrimary }}>Tableau non disponible</h1>
          <p className="mt-2" style={{ color: textSecondary }}>Ce lien n'est plus actif ou a expiré.</p>
        </div>
      </div>
    )
  }

  const hasBgImage = isBgImage(board.couleurFond)
  const allTasks = board.columns.flatMap(c => c.tasks)
  const done = allTasks.filter(t => t.clientValidated).length

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>
      {/* Header */}
      <header
        className="shrink-0"
        style={hasBgImage
          ? { backgroundImage: `url(${board.couleurFond})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: board.couleurFond }
        }
      >
        <div className="py-5 px-6" style={{ backgroundColor: hasBgImage ? 'rgba(0,0,0,0.45)' : 'transparent' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-bold text-xs">ED</span>
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium">Encore Design</p>
                  <h1 className="text-white font-bold text-lg leading-tight">{board.nom}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button onClick={toggleDark}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors"
                  title={dark ? 'Mode clair' : 'Mode sombre'}>
                  {dark ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-lg overflow-hidden bg-white/20">
                  <button onClick={() => setView('board')}
                    className={cn('p-2 transition-colors', view === 'board' ? 'bg-white/30' : 'hover:bg-white/10')}>
                    <LayoutGrid className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => setView('list')}
                    className={cn('p-2 transition-colors', view === 'list' ? 'bg-white/30' : 'hover:bg-white/10')}>
                    <List className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Client name */}
                {clientName && (
                  <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 backdrop-blur-sm">
                    <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium">{clientName}</span>
                    <button onClick={() => { localStorage.removeItem('encore-client-name'); setClientName(null) }}
                      className="text-white/60 hover:text-white text-sm ml-1">×</button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {allTasks.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/70 text-xs">{done}/{allTasks.length} tâches validées</span>
                  <span className="text-white/70 text-xs">{Math.round((done / allTasks.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/20">
                  <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${(done / allTasks.length) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Name prompt */}
      {!clientName && (
        <div className="max-w-md mx-auto mt-8 px-4 w-full">
          <div className="rounded-2xl shadow-md p-6" style={{ backgroundColor: surface, border: `1px solid ${borderColor}` }}>
            <h2 className="font-semibold mb-1" style={{ color: textPrimary }}>Bienvenue 👋</h2>
            <p className="text-sm mb-4" style={{ color: textSecondary }}>Entrez votre prénom pour commenter et valider les tâches.</p>
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="Votre prénom…"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-400"
                style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                autoFocus
              />
              <button onClick={saveName} disabled={!nameInput.trim()}
                className="px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#3b82f6' }}>
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {view === 'board' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {board.columns.map(col => (
              <div key={col.id} className="w-72 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  {col.couleur && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.couleur }} />}
                  <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>{col.nom}</h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: bgMuted, color: textSecondary }}>{col.tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.map(task => {
                    const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date()
                    const coverImg = task.attachments.find(a => a.isImage)?.url
                    return (
                      <div key={task.id} onClick={() => setSelectedTask(task)}
                        className="rounded-xl overflow-hidden cursor-pointer transition-all"
                        style={{
                          backgroundColor: surface,
                          border: `1px solid ${task.clientValidated ? '#86efac' : borderColor}`,
                          borderLeftWidth: task.couleur ? '4px' : undefined,
                          borderLeftColor: task.couleur ?? undefined,
                          backgroundColor: task.clientValidated ? (dark ? '#14532d22' : '#f0fdf4') : surface,
                        } as React.CSSProperties}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = task.clientValidated ? '#86efac' : borderColor)}
                      >
                        {/* Cover image */}
                        {coverImg && (
                          <div className="w-full h-24 overflow-hidden">
                            <img src={coverImg} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-3">
                          {task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {task.labels.map(l => <span key={l.id} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: l.couleur }} />)}
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium leading-snug" style={{ color: textPrimary }}>{task.titre}</p>
                            {task.clientValidated && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#22c55e' }} />}
                          </div>
                          {task.jalon && (
                            <span className="mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ color: dark ? '#93c5fd' : '#1d4ed8', backgroundColor: dark ? '#1e3a5f' : '#eff6ff' }}>
                              🏁 {task.jalon}
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.dateEcheance && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: isOverdue ? (dark ? '#4a1942' : '#fee2e2') : (dark ? '#14532d' : '#dcfce7'),
                                  color: isOverdue ? (dark ? '#f87171' : '#dc2626') : (dark ? '#4ade80' : '#15803d'),
                                }}>
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {task.checklistMeta.total > 0 && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: bgMuted, color: textSecondary }}>
                                <CheckSquare className="w-2.5 h-2.5" />
                                {task.checklistMeta.done}/{task.checklistMeta.total}
                              </span>
                            )}
                            {task.comments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: textSecondary }}>
                                <MessageSquare className="w-2.5 h-2.5" /> {task.comments.length}
                              </span>
                            )}
                            {task.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: textSecondary }}>
                                <Paperclip className="w-2.5 h-2.5" /> {task.attachments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {col.tasks.length === 0 && (
                    <div className="rounded-xl p-4 text-center" style={{ border: `1px dashed ${borderColor}` }}>
                      <p className="text-xs" style={{ color: textSecondary }}>Aucune tâche</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {allTasks.map(task => {
              const isOverdue = task.dateEcheance && new Date(task.dateEcheance) < new Date()
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
                  style={{ backgroundColor: surface, border: `1px solid ${borderColor}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}
                >
                  {task.couleur && <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: task.couleur }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>{task.titre}</p>
                    {task.jalon && <p className="text-xs mt-0.5" style={{ color: dark ? '#93c5fd' : '#1d4ed8' }}>🏁 {task.jalon}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.dateEcheance && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: isOverdue ? (dark ? '#4a1942' : '#fee2e2') : (dark ? '#14532d' : '#dcfce7'),
                          color: isOverdue ? (dark ? '#f87171' : '#dc2626') : (dark ? '#4ade80' : '#15803d'),
                        }}>
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {task.clientValidated && <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />}
                  </div>
                </div>
              )
            })}
            {allTasks.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: textSecondary }}>Aucune tâche</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 py-6 text-center" style={{ borderTop: `1px solid ${borderColor}` }}>
        <p className="text-xs" style={{ color: textSecondary }}>
          Partagé par <span className="font-medium" style={{ color: textPrimary }}>{board.agence}</span> · Accès sécurisé
        </p>
      </footer>

      {/* Task detail modal */}
      {freshTask && clientName && (
        <TaskDetail
          task={freshTask}
          token={token!}
          clientName={clientName}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => refetch()}
          dark={dark}
        />
      )}

      {/* Name prompt modal (when clicking a task without being logged) */}
      {freshTask && !clientName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl" style={{ backgroundColor: surface, border: `1px solid ${borderColor}` }}>
            <h2 className="font-semibold mb-3" style={{ color: textPrimary }}>Entrez votre prénom pour continuer</h2>
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="Votre prénom…"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-400"
                style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                autoFocus
              />
              <button onClick={saveName} disabled={!nameInput.trim()}
                className="px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                style={{ backgroundColor: '#3b82f6' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
