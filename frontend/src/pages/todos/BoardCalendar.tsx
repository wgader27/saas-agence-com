import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, LayoutGrid, List,
  X, Clock, CheckSquare, Printer,
} from 'lucide-react'
import type { Board, BoardTask, BoardColumnType } from '@/lib/api'
import { cn } from '@/lib/utils'

/* ── Types ───────────────────────────────────────────────────── */

type CalView = 'day' | 'week' | 'month'

interface BoardCalendarProps {
  board: Board
  onCardClick: (task: BoardTask) => void
}

/* ── Helpers ─────────────────────────────────────────────────── */

const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function taskColor(task: BoardTask): string {
  if (task.couleur) return task.couleur
  if (task.labels.length > 0) return task.labels[0].couleur
  return '#8B5CF6'
}

function allTasks(board: Board): BoardTask[] {
  return board.columns.flatMap(col => col.tasks)
}

function columnForTask(board: Board, task: BoardTask): BoardColumnType | undefined {
  return board.columns.find(c => c.id === task.columnId)
}

function tasksForDay(board: Board, day: Date): BoardTask[] {
  return allTasks(board).filter(t => {
    if (!t.dateEcheance) return false
    return isSameDay(parseLocalDate(t.dateEcheance), day)
  })
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${start.getDate()} ${MONTHS_FR[start.getMonth()]} – ${end.getDate()} ${MONTHS_FR[end.getMonth()]} ${end.getFullYear()}`
}

/* ── Avatar stack ────────────────────────────────────────────── */

function AvatarStack({ assignees }: { assignees: BoardTask['assignees'] }) {
  if (assignees.length === 0) return null
  const shown = assignees.slice(0, 3)
  return (
    <div className="flex -space-x-1">
      {shown.map(a => (
        <div
          key={a.id}
          title={`${a.prenom} ${a.nom}`}
          className="w-5 h-5 rounded-full bg-[var(--primary-subtle)] border border-[var(--bg)] flex items-center justify-center text-[9px] font-semibold text-[var(--primary)] shrink-0"
        >
          {a.prenom[0]}{a.nom[0]}
        </div>
      ))}
      {assignees.length > 3 && (
        <div className="w-5 h-5 rounded-full bg-[var(--border)] border border-[var(--bg)] flex items-center justify-center text-[9px] font-medium text-[var(--text-muted)] shrink-0">
          +{assignees.length - 3}
        </div>
      )}
    </div>
  )
}

/* ── Tooltip ─────────────────────────────────────────────────── */

function TaskTooltip({ task, children }: { task: BoardTask; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={e => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setPos({ x: rect.left, y: rect.bottom + 4 })
        setVisible(true)
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="fixed z-50 max-w-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] p-3 pointer-events-none"
          style={{ left: pos.x, top: pos.y }}
        >
          <p className="text-[var(--text)] text-xs font-medium leading-snug">{task.titre}</p>
          {task.description && (
            <p className="text-[var(--text-muted)] text-xs mt-1 line-clamp-2">{task.description}</p>
          )}
          {task.dateEcheance && (
            <p className="text-[var(--text-secondary)] text-xs mt-1 flex items-center gap-1">
              <Clock size={10} />
              {parseLocalDate(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Month view ──────────────────────────────────────────────── */

function MonthView({
  board, currentDate, today, onCardClick,
}: {
  board: Board
  currentDate: Date
  today: Date
  onCardClick: (task: BoardTask) => void
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start grid from Monday
  const gridStart = startOfWeek(firstDay)
  // End grid: enough rows to cover the month
  const totalDays = Math.ceil((lastDay.getDate() + (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)) / 7) * 7
  const days: Date[] = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i))

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {WEEK_DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayTasks = tasksForDay(board, day)
          const key = day.toISOString().split('T')[0]
          const isExpanded = expandedDay === key
          const MAX_VISIBLE = 3
          const visible = isExpanded ? dayTasks : dayTasks.slice(0, MAX_VISIBLE)
          const hidden = dayTasks.length - MAX_VISIBLE

          return (
            <div
              key={i}
              className={cn(
                'border-r border-b border-[var(--border)] p-1 min-h-[100px] flex flex-col',
                !inMonth && 'opacity-40',
                isToday && 'bg-[var(--primary-subtle)]',
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-start mb-1">
                <span
                  className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
                    isToday
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text)]',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-0.5 flex-1">
                {visible.map(task => (
                  <TaskTooltip key={task.id} task={task}>
                    <button
                      onClick={() => onCardClick(task)}
                      className="w-full text-left flex items-center gap-1 rounded px-1 py-0.5 hover:opacity-80 transition-opacity group"
                      style={{ backgroundColor: taskColor(task) + '22' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: taskColor(task) }}
                      />
                      <span
                        className="text-[10px] font-medium truncate leading-tight"
                        style={{ color: taskColor(task) }}
                      >
                        {task.titre}
                      </span>
                    </button>
                  </TaskTooltip>
                ))}
                {!isExpanded && hidden > 0 && (
                  <button
                    onClick={() => setExpandedDay(key)}
                    className="text-[10px] text-[var(--primary)] hover:underline text-left px-1 mt-0.5"
                  >
                    Tout afficher ({dayTasks.length})
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setExpandedDay(null)}
                    className="text-[10px] text-[var(--text-muted)] hover:underline text-left px-1 mt-0.5"
                  >
                    Réduire
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Week view ───────────────────────────────────────────────── */

function WeekView({
  board, currentDate, today, onCardClick,
}: {
  board: Board
  currentDate: Date
  today: Date
  onCardClick: (task: BoardTask) => void
}) {
  const weekStart = startOfWeek(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={cn(
                'py-3 text-center border-r border-[var(--border)] last:border-r-0',
                isToday && 'bg-[var(--primary-subtle)]',
              )}
            >
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">
                {WEEK_DAYS_SHORT[i]}
              </span>
              <div
                className={cn(
                  'mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold',
                  isToday
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text)]',
                )}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task columns */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayTasks = tasksForDay(board, day)

          return (
            <div
              key={i}
              className={cn(
                'border-r border-[var(--border)] last:border-r-0 p-2 flex flex-col gap-2',
                isToday && 'bg-[var(--primary-subtle)]',
              )}
            >
              {dayTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-lg">·</div>
              ) : (
                dayTasks.map(task => {
                  const color = taskColor(task)
                  const col = columnForTask(board, task)
                  return (
                    <button
                      key={task.id}
                      onClick={() => onCardClick(task)}
                      className="w-full text-left rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
                    >
                      <div className="h-1 w-full" style={{ backgroundColor: color }} />
                      <div className="p-2">
                        {task.labels.length > 0 && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{
                              backgroundColor: task.labels[0].couleur + '22',
                              color: task.labels[0].couleur,
                            }}
                          >
                            {task.labels[0].nom}
                          </span>
                        )}
                        <p className="text-[var(--text)] text-xs font-semibold leading-snug line-clamp-2">
                          {task.titre}
                        </p>
                        {col && (
                          <p className="text-[var(--text-muted)] text-[10px] mt-1 truncate">{col.nom}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {task.checklistMeta.total > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                              <CheckSquare size={10} />
                              {task.checklistMeta.done}/{task.checklistMeta.total}
                            </span>
                          )}
                          <AvatarStack assignees={task.assignees} />
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Mini calendar (used in Day view) ────────────────────────── */

function MiniCalendar({
  selected, onSelect,
}: {
  selected: Date
  onSelect: (d: Date) => void
}) {
  const [nav, setNav] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1))
  const year = nav.getFullYear()
  const month = nav.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = startOfWeek(firstDay)
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const today = new Date(); today.setHours(0, 0, 0, 0)

  return (
    <div className="w-60 shrink-0">
      {/* Mini header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setNav(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-[var(--text)]">
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={() => setNav(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] text-[var(--text-muted)] font-medium py-0.5">
            {d[0]}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month
          const isTd = isSameDay(day, today)
          const isSel = isSameDay(day, selected)
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={cn(
                'w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-medium transition-colors',
                !inMonth && 'opacity-30',
                isSel && 'bg-[var(--primary)] text-white',
                !isSel && isTd && 'border border-[var(--primary)] text-[var(--primary)]',
                !isSel && !isTd && 'text-[var(--text)] hover:bg-[var(--border)]',
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Day view ────────────────────────────────────────────────── */

function DayView({
  board, currentDate, today, onCardClick, onDateChange,
}: {
  board: Board
  currentDate: Date
  today: Date
  onCardClick: (task: BoardTask) => void
  onDateChange: (d: Date) => void
}) {
  const dayTasks = tasksForDay(board, currentDate)

  return (
    <div className="flex gap-6 h-full p-4">
      {/* Mini calendar */}
      <div className="shrink-0">
        <MiniCalendar selected={currentDate} onSelect={onDateChange} />
      </div>

      {/* Divider */}
      <div className="w-px bg-[var(--border)] self-stretch" />

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Calendar size={15} className="text-[var(--primary)]" />
          Tâches du {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>

        {dayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <Calendar size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Aucune tâche pour ce jour</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dayTasks.map(task => {
              const color = taskColor(task)
              const col = columnForTask(board, task)
              return (
                <button
                  key={task.id}
                  onClick={() => onCardClick(task)}
                  className="w-full text-left flex gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 hover:shadow-[var(--shadow-md)] transition-all group"
                >
                  {/* Color bar */}
                  <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: color }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text)] leading-snug">{task.titre}</p>
                      {col && (
                        <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full shrink-0">
                          {col.nom}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{task.description}</p>
                    )}

                    {/* Labels */}
                    {task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.labels.map(l => (
                          <span
                            key={l.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: l.couleur + '22', color: l.couleur }}
                          >
                            {l.nom}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        {task.dateEcheance && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                            <Clock size={11} />
                            {parseLocalDate(task.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {task.checklistMeta.total > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                            <CheckSquare size={11} />
                            {task.checklistMeta.done}/{task.checklistMeta.total}
                          </span>
                        )}
                      </div>
                      <AvatarStack assignees={task.assignees} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── PDF Export Modal ────────────────────────────────────────── */

function PdfExportModal({
  board, onClose,
}: {
  board: Board
  onClose: () => void
}) {
  const today = new Date()
  const [dateStart, setDateStart] = useState(today.toISOString().split('T')[0])
  const [dateEnd, setDateEnd] = useState(addDays(today, 30).toISOString().split('T')[0])

  const handlePrint = () => {
    const start = new Date(dateStart + 'T00:00:00')
    const end = new Date(dateEnd + 'T23:59:59')

    const filteredTasks = allTasks(board).filter(t => {
      if (!t.dateEcheance) return false
      const d = parseLocalDate(t.dateEcheance)
      return d >= start && d <= end
    })

    const rows = filteredTasks
      .sort((a, b) => (a.dateEcheance ?? '').localeCompare(b.dateEcheance ?? ''))
      .map(t => {
        const col = columnForTask(board, t)
        const assignees = t.assignees.map(a => `${a.prenom} ${a.nom}`).join(', ') || '—'
        const due = t.dateEcheance
          ? parseLocalDate(t.dateEcheance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'
        const checklist = t.checklistMeta.total > 0
          ? `${t.checklistMeta.done}/${t.checklistMeta.total}`
          : '—'
        const status = t.clientValidated ? 'Validé' : col?.nom ?? '—'
        return `
          <tr>
            <td>${t.titre}</td>
            <td>${col?.nom ?? '—'}</td>
            <td>${assignees}</td>
            <td>${due}</td>
            <td>${checklist}</td>
            <td>${status}</td>
          </tr>`
      })
      .join('')

    const boardName = board.nom
    const rangeLabel = `${new Date(dateStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} – ${new Date(dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${boardName} — Export Calendrier</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p.range { color: #555; margin-bottom: 16px; font-size: 11px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 600; border: 1px solid #e5e7eb; }
  td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${boardName}</h1>
<p class="range">Période : ${rangeLabel} — ${filteredTasks.length} tâche(s)</p>
<table>
  <thead>
    <tr>
      <th>Tâche</th>
      <th>Colonne</th>
      <th>Assigné(s)</th>
      <th>Échéance</th>
      <th>Checklist</th>
      <th>Statut</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">Aucune tâche dans cette période</td></tr>'}</tbody>
</table>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Exporter en PDF</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Date de début</label>
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Date de fin</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--border)] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
          >
            <Printer size={14} />
            Générer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */

export function BoardCalendar({ board, onCardClick }: BoardCalendarProps) {
  const [view, setView] = useState<CalView>('month')
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
  const [showPdf, setShowPdf] = useState(false)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  function navigate(dir: -1 | 1) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'day') d.setDate(d.getDate() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  function headerLabel(): string {
    if (view === 'day') return formatDayHeader(currentDate)
    if (view === 'week') return formatWeekRange(startOfWeek(currentDate))
    return `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  const VIEW_OPTIONS: { value: CalView; label: string; icon: React.ReactNode }[] = [
    { value: 'day', label: 'Jour', icon: <List size={14} /> },
    { value: 'week', label: 'Semaine', icon: <LayoutGrid size={14} /> },
    { value: 'month', label: 'Mois', icon: <Calendar size={14} /> },
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 flex-wrap">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
            aria-label="Précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
            aria-label="Suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Period label */}
        <h2 className="text-sm font-semibold text-[var(--text)] min-w-0 truncate flex-1">
          {headerLabel()}
        </h2>

        {/* Aujourd'hui */}
        <button
          onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCurrentDate(d) }}
          className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--border)] transition-colors shrink-0"
        >
          Aujourd'hui
        </button>

        {/* View selector */}
        <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden shrink-0">
          {VIEW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                view === opt.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--border)]',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Export PDF */}
        <button
          onClick={() => setShowPdf(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors shrink-0"
        >
          <Printer size={13} />
          Exporter
        </button>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto">
        {view === 'month' && (
          <MonthView
            board={board}
            currentDate={currentDate}
            today={today}
            onCardClick={onCardClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            board={board}
            currentDate={currentDate}
            today={today}
            onCardClick={onCardClick}
          />
        )}
        {view === 'day' && (
          <DayView
            board={board}
            currentDate={currentDate}
            today={today}
            onCardClick={onCardClick}
            onDateChange={setCurrentDate}
          />
        )}
      </div>

      {/* PDF modal */}
      {showPdf && (
        <PdfExportModal board={board} onClose={() => setShowPdf(false)} />
      )}
    </div>
  )
}
