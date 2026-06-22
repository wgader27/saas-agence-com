import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, X, Clock,
  Calendar as CalendarIcon, Trash2, Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import type { CalendarEvent } from '@/lib/api'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
]

interface EventFormData {
  titre: string
  date: string
  allDay: boolean
  heureDebut: string
  heureFin: string
  couleur: string
  description: string
}

const DEFAULT_FORM: EventFormData = {
  titre: '',
  date: '',
  allDay: true,
  heureDebut: '09:00',
  heureFin: '10:00',
  couleur: '#3B82F6',
  description: '',
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function Calendrier() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const today = new Date()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewUserId, setViewUserId] = useState<number | null>(null)

  const [showDialog, setShowDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventFormData>(DEFAULT_FORM)

  const { data: calendarUsers = [] } = useQuery({
    queryKey: ['calendar-users'],
    queryFn: () => api.get<Array<{ id: number; nom: string; prenom: string }>>('/calendar-events/users'),
  })

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', viewYear, viewMonth, viewUserId],
    queryFn: () => {
      const params = new URLSearchParams({
        year: String(viewYear),
        month: String(viewMonth + 1),
        ...(viewUserId ? { userId: String(viewUserId) } : {}),
      })
      return api.get<CalendarEvent[]>(`/calendar-events?${params}`)
    },
  })

  const createEvent = useMutation({
    mutationFn: (data: object) => api.post('/calendar-events', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); closeDialog() },
  })

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api.patch(`/calendar-events/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); closeDialog() },
  })

  const deleteEvent = useMutation({
    mutationFn: (id: number) => api.delete(`/calendar-events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); closeDialog() },
  })

  const { firstDayOffset, daysInMonth } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const offset = (firstDay.getDay() + 6) % 7
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate()
    return { firstDayOffset: offset, daysInMonth: dim }
  }, [viewYear, viewMonth])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  function openCreate(dateStr?: string) {
    setEditingEvent(null)
    setForm({ ...DEFAULT_FORM, date: dateStr ?? toDateStr(viewYear, viewMonth, 1) })
    setShowDialog(true)
  }

  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev)
    setForm({
      titre: ev.titre,
      date: ev.date,
      allDay: ev.allDay,
      heureDebut: ev.heureDebut ?? '09:00',
      heureFin: ev.heureFin ?? '10:00',
      couleur: ev.couleur ?? '#3B82F6',
      description: ev.description ?? '',
    })
    setShowDialog(true)
  }

  function closeDialog() {
    setShowDialog(false)
    setEditingEvent(null)
    setForm(DEFAULT_FORM)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      titre: form.titre,
      date: form.date,
      allDay: form.allDay,
      heureDebut: form.allDay ? null : form.heureDebut,
      heureFin: form.allDay ? null : form.heureFin,
      couleur: form.couleur,
      description: form.description || null,
    }
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, data: payload })
    } else {
      createEvent.mutate(payload)
    }
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []
  const isOwnCalendar = viewUserId === null || viewUserId === user?.id
  const viewingUser = viewUserId ? calendarUsers.find(u => u.id === viewUserId) : null

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[var(--text)]">Calendrier</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {viewingUser
              ? `Agenda de ${viewingUser.prenom} ${viewingUser.nom}`
              : 'Mon agenda'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* User switcher */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-md)]">
            <button
              onClick={() => setViewUserId(null)}
              className={cn(
                'px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors',
                viewUserId === null
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              Moi
            </button>
            {calendarUsers.filter(u => u.id !== user?.id).map(u => (
              <button
                key={u.id}
                onClick={() => setViewUserId(u.id)}
                className={cn(
                  'px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors',
                  viewUserId === u.id
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
              >
                {u.prenom}
              </button>
            ))}
          </div>

          {isOwnCalendar && (
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => openCreate()}>
              Ajouter
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Calendar grid */}
        <Card padding="none">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {MONTHS_FR[viewMonth]} {viewYear}
              </h2>
              <button
                onClick={() => {
                  setViewYear(today.getFullYear())
                  setViewMonth(today.getMonth())
                  setSelectedDate(todayStr)
                }}
                className="text-[10px] font-medium text-[var(--primary)] hover:underline"
              >
                Aujourd'hui
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS_FR.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayOffset }).map((_, i) => {
              const isLastCol = (i + 1) % 7 === 0
              return (
                <div
                  key={`off-${i}`}
                  className={cn(
                    'min-h-[80px] border-b border-[var(--border)] bg-[var(--bg-subtle)]',
                    !isLastCol && 'border-r',
                  )}
                />
              )
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const col = (firstDayOffset + i) % 7
              const isLastCol = col === 6
              const dayEvents = eventsByDate[dateStr] ?? []

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    'min-h-[80px] p-1.5 border-b border-[var(--border)] cursor-pointer transition-colors',
                    !isLastCol && 'border-r',
                    isSelected ? 'bg-[var(--primary-subtle)]' : 'hover:bg-[var(--bg-subtle)]',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium leading-none',
                      isToday
                        ? 'bg-[var(--primary)] text-white'
                        : isSelected
                        ? 'text-[var(--primary)] font-semibold'
                        : 'text-[var(--text-secondary)]',
                    )}>
                      {day}
                    </span>
                    {isOwnCalendar && isSelected && (
                      <button
                        onClick={e => { e.stopPropagation(); openCreate(dateStr) }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--primary)] hover:text-white text-[var(--text-muted)] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev) }}
                        className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-left truncate hover:opacity-75 transition-opacity"
                        style={{ backgroundColor: `${ev.couleur}22` }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.couleur }}
                        />
                        <span
                          className="text-[10px] font-medium truncate"
                          style={{ color: ev.couleur }}
                        >
                          {!ev.allDay && ev.heureDebut ? `${ev.heureDebut} ` : ''}
                          {ev.titre}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-[var(--text-muted)] px-1">
                        +{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Selected day */}
          <Card padding="md">
            {selectedDate ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {parseLocalDate(selectedDate).getDate()} {MONTHS_FR[parseLocalDate(selectedDate).getMonth()]}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {selectedEvents.length} événement{selectedEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {isOwnCalendar && (
                    <button
                      onClick={() => openCreate(selectedDate)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Ajouter
                    </button>
                  )}
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <CalendarIcon className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
                    <p className="text-xs text-[var(--text-muted)]">Aucun événement</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => isOwnCalendar && openEdit(ev)}
                        className={cn(
                          'flex items-start gap-2.5 p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] transition-colors',
                          isOwnCalendar && 'cursor-pointer hover:border-[var(--primary)]/40',
                        )}
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: ev.couleur }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text)] truncate">{ev.titre}</p>
                          {ev.allDay ? (
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Toute la journée</p>
                          ) : (
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {ev.heureDebut} – {ev.heureFin}
                            </p>
                          )}
                          {ev.description && (
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2">{ev.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <CalendarIcon className="w-9 h-9 text-[var(--text-muted)] mx-auto mb-2 opacity-25" />
                <p className="text-xs text-[var(--text-muted)]">Sélectionnez un jour</p>
              </div>
            )}
          </Card>

          {/* Upcoming this month */}
          <Card padding="md">
            <p className="text-xs font-semibold text-[var(--text)] mb-3">À venir ce mois</p>
            {(() => {
              const upcoming = events
                .filter(ev => ev.date >= todayStr)
                .sort((a, b) => {
                  const dateCmp = a.date.localeCompare(b.date)
                  if (dateCmp !== 0) return dateCmp
                  return (a.heureDebut ?? '').localeCompare(b.heureDebut ?? '')
                })
                .slice(0, 6)
              if (upcoming.length === 0) {
                return <p className="text-xs text-[var(--text-muted)]">Aucun événement à venir</p>
              }
              return (
                <div className="space-y-2.5">
                  {upcoming.map(ev => {
                    const d = parseLocalDate(ev.date)
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-2.5 cursor-pointer group"
                        onClick={() => {
                          setSelectedDate(ev.date)
                          if (isOwnCalendar) openEdit(ev)
                        }}
                      >
                        <div className="text-center w-8 shrink-0">
                          <p className="text-[9px] text-[var(--text-muted)] uppercase font-medium">
                            {MONTHS_FR[d.getMonth()].slice(0, 3)}
                          </p>
                          <p className="text-sm font-bold text-[var(--text)] leading-tight">{d.getDate()}</p>
                        </div>
                        <div
                          className="w-0.5 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: ev.couleur }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                            {ev.titre}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {ev.allDay ? 'Toute la journée' : `${ev.heureDebut} – ${ev.heureFin}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Card>
        </div>
      </div>

      {/* Create / Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              <button
                onClick={closeDialog}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <Input
                label="Titre"
                value={form.titre}
                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                required
                autoFocus
              />

              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />

              {/* All-day toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, allDay: !f.allDay }))}
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative shrink-0',
                    form.allDay ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    form.allDay ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )} />
                </div>
                <span className="text-xs text-[var(--text)]">Toute la journée</span>
              </label>

              {/* Time pickers */}
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Début</span>
                    </label>
                    <input
                      type="time"
                      value={form.heureDebut}
                      onChange={e => setForm(f => ({ ...f, heureDebut: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Fin</span>
                    </label>
                    <input
                      type="time"
                      value={form.heureFin}
                      onChange={e => setForm(f => ({ ...f, heureFin: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Couleur</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, couleur: c }))}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110',
                        form.couleur === c && 'ring-2 ring-offset-2 ring-[var(--border)] scale-110',
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {form.couleur === c && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Description <span className="text-[var(--text-muted)] font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Ajouter une description…"
                  className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => deleteEvent.mutate(editingEvent.id)}
                    disabled={deleteEvent.isPending}
                    className="flex items-center gap-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] px-2.5 py-1.5 rounded-[var(--radius-md)] transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={createEvent.isPending || updateEvent.isPending}
                  >
                    {editingEvent ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
