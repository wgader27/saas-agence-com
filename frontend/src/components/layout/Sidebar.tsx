import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Globe, Users, Lock, FileText,
  Wrench, Calendar, LogOut, Moon, Sun, Monitor,
  ChevronLeft, ChevronRight, Shield, Bot, LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { Avatar } from '@/components/ui/avatar'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/domaines',   icon: Globe,           label: 'Domaines' },
  { to: '/clients',    icon: Users,           label: 'Clients' },
  { to: '/acces',      icon: Lock,            label: 'Accès sites' },
  { to: '/notes',      icon: FileText,        label: 'Notes' },
  { to: '/outils',     icon: Wrench,          label: 'Outils' },
  { to: '/calendrier', icon: Calendar,        label: 'Calendrier' },
  { to: '/todos',      icon: LayoutGrid,      label: 'Tableaux' },
  { to: '/ia',         icon: Bot,             label: 'Assistant IA' },
]

const THEMES = [
  { value: 'light' as const, icon: Sun },
  { value: 'dark' as const, icon: Moon },
  { value: 'system' as const, icon: Monitor },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = user?.roles.includes('ROLE_ADMIN')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]',
        'transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-md)] text-xs font-medium',
                'transition-colors duration-100',
                collapsed && 'justify-center px-0 py-2.5',
                isActive
                  ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text)]',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <>
            <div className={cn('pt-2 mt-2 border-t border-[var(--sidebar-border)]', collapsed && 'mx-2')} />
            <NavLink
              to="/admin"
              title={collapsed ? 'Administration' : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-md)] text-xs font-medium',
                'transition-colors duration-100',
                collapsed && 'justify-center px-0 py-2.5',
                location.pathname.startsWith('/admin')
                  ? 'bg-[var(--warning-subtle)] text-[var(--warning)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text)]',
              )}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {!collapsed && 'Administration'}
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--sidebar-border)] px-2 py-3 space-y-1">
        {/* Theme switcher */}
        {!collapsed && (
          <div className="flex items-center gap-1 px-1 py-1 mb-1 bg-[var(--sidebar-item-hover)] rounded-[var(--radius-md)]">
            {THEMES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={value}
                className={cn(
                  'flex-1 flex items-center justify-center py-1.5 rounded-[var(--radius-sm)] transition-colors',
                  theme === value
                    ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        {/* User card → click opens settings */}
        {user && (
          <div className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-[var(--radius-md)] group/user',
            collapsed && 'justify-center px-0',
          )}>
            <button
              onClick={() => navigate('/settings')}
              title="Paramètres"
              className={cn(
                'flex items-center gap-2 flex-1 min-w-0 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--sidebar-item-hover)]',
                collapsed && 'justify-center',
              )}
            >
              <Avatar name={`${user.prenom} ${user.nom}`} size="sm" />
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-[var(--text)] truncate">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
              )}
            </button>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'absolute -right-3 top-[60px] w-6 h-6 rounded-full',
          'bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
          'flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]',
          'transition-colors z-10',
        )}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
