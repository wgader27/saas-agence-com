import { useQuery } from '@tanstack/react-query'
import {
  Globe, Users, Clock, AlertTriangle, CheckCircle,
  CalendarDays, AlertCircle, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Domain, ActivityLog, CalendarEvent } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Card } from '@/components/ui/card'
import { ExpiryBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { daysUntil, formatDate } from '@/lib/utils'

interface OverdueTask {
  id: number
  titre: string
  dateEcheance: string
  boardId: number
  boardNom: string
  columnNom: string
}

interface DashboardStats {
  totalClients: number
  totalDomaines: number
  expiringDomains: Domain[]
  recentActivity: ActivityLog[]
  overdueTasks: OverdueTask[]
  upcomingEvents: CalendarEvent[]
}

export function Dashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/dashboard'),
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const getEventDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) return "Aujourd'hui"
    if (dateStr === tomorrowStr) return 'Demain'
    return formatDate(dateStr, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            {greeting}, {user?.prenom}.
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clients"
          value={data?.totalClients}
          loading={isLoading}
          to="/clients"
        />
        <StatCard
          icon={Globe}
          label="Domaines"
          value={data?.totalDomaines}
          loading={isLoading}
          to="/domaines"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expirent bientôt"
          value={data?.expiringDomains.length}
          loading={isLoading}
          to="/domaines"
          accent={data?.expiringDomains && data.expiringDomains.length > 0 ? 'warning' : undefined}
        />
        <StatCard
          icon={AlertCircle}
          label="Tâches en retard"
          value={data?.overdueTasks.length}
          loading={isLoading}
          to="/todos"
          accent={data?.overdueTasks && data.overdueTasks.length > 0 ? 'danger' : undefined}
        />
      </div>

      {/* Row 1: Domaines + Événements à venir */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Domaines urgents */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Domaines à surveiller</h2>
            <Link to="/domaines" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <Skeleton rows={4} />
          ) : !data?.expiringDomains.length ? (
            <div className="flex items-center gap-3 py-6 text-[var(--text-muted)]">
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              <p className="text-sm">Tous les domaines sont en règle.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.expiringDomains.map(d => {
                const days = d.dateExpirationDomaine ? daysUntil(d.dateExpirationDomaine) : null
                return (
                  <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{d.nomDomaine}</p>
                      <p className="text-xs text-[var(--text-muted)]">{d.clientNom}</p>
                    </div>
                    {days !== null && <ExpiryBadge days={days} />}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Événements à venir */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Événements à venir</h2>
            <Link to="/calendrier" className="text-xs text-[var(--primary)] hover:underline">
              <CalendarDays className="w-4 h-4" />
            </Link>
          </div>
          {isLoading ? (
            <Skeleton rows={4} />
          ) : !data?.upcomingEvents.length ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Aucun événement cette semaine</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] transition-colors">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: ev.couleur }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] truncate">{ev.titre}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {getEventDateLabel(ev.date)}
                      {!ev.allDay && ev.heureDebut && ` · ${ev.heureDebut}`}
                      {ev.userNom && <span className="ml-1 opacity-60">— {ev.userNom.split(' ')[0]}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Tâches en retard + Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tâches Kanban en retard */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Tâches en retard</h2>
            <Link to="/todos" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              Tableaux <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <Skeleton rows={4} />
          ) : !data?.overdueTasks.length ? (
            <div className="flex items-center gap-3 py-6 text-[var(--text-muted)]">
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              <p className="text-sm">Aucune tâche en retard.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.overdueTasks.map(t => {
                const days = daysUntil(t.dateEcheance)
                return (
                  <Link
                    key={t.id}
                    to={`/todos/${t.boardId}`}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-[var(--radius-md)] hover:bg-[var(--danger-subtle)] transition-colors group"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate group-hover:text-[var(--danger)]">{t.titre}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {t.boardNom} · {t.columnNom}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--danger)] bg-[var(--danger-subtle)] px-1.5 py-0.5 rounded-full shrink-0">
                      {Math.abs(days)}j
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {/* Activité récente */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Activité récente</h2>
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          {isLoading ? (
            <Skeleton rows={5} />
          ) : !data?.recentActivity.length ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Aucune activité récente</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map(log => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <Avatar name={log.userNom} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text)] leading-snug">
                      <span className="font-medium">{log.userNom.split(' ')[0]}</span>{' '}
                      {log.action}{' '}
                      <span className="text-[var(--text-muted)]">{log.cible}</span>
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {formatDate(log.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-10 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] animate-pulse" />
      ))}
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, loading, to, accent,
}: {
  icon: React.ElementType
  label: string
  value: number | undefined
  loading: boolean
  to: string
  accent?: 'warning' | 'danger'
}) {
  const accentClasses = {
    warning: 'border-[var(--warning)]/30 bg-[var(--warning-subtle)]',
    danger: 'border-[var(--danger)]/30 bg-[var(--danger-subtle)]',
  }

  return (
    <Link to={to}>
      <Card
        className={`hover:border-[var(--border-strong)] transition-colors cursor-pointer ${
          accent ? accentClasses[accent] : ''
        }`}
        padding="md"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-[var(--radius-md)] ${
            accent === 'warning' ? 'bg-[var(--warning)]/10' :
            accent === 'danger' ? 'bg-[var(--danger)]/10' :
            'bg-[var(--bg-subtle)]'
          }`}>
            <Icon className={`w-4 h-4 ${
              accent === 'warning' ? 'text-[var(--warning)]' :
              accent === 'danger' ? 'text-[var(--danger)]' :
              'text-[var(--text-muted)]'
            }`} />
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-12 rounded bg-[var(--bg-subtle)] animate-pulse mb-1" />
        ) : (
          <p className="text-2xl font-semibold text-[var(--text)]">{value ?? '—'}</p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
      </Card>
    </Link>
  )
}
