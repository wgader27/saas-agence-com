import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AiAssistant } from '@/components/ai/AiAssistant'

const TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/domaines':    'Domaines & SSL',
  '/clients':     'Clients',
  '/acces':       'Accès sites',
  '/notes':       'Notes',
  '/outils':      'Outils & Raccourcis',
  '/calendrier':  'Calendrier',
  '/ia':          'Assistant IA',
  '/todos':       'Tableaux',
  '/admin':       'Administration',
  '/settings':    'Paramètres',
}

const FULLSCREEN_ROUTES = ['/todos', '/todos/']

export function AppLayout() {
  const location = useLocation()
  const title = TITLES[location.pathname]
    ?? TITLES[Object.keys(TITLES).find(k => location.pathname.startsWith(k) && k !== '/') ?? '/']

  const isFullScreen = FULLSCREEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith('/todos/'))

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} />
        <main className={isFullScreen ? 'flex-1 overflow-hidden flex flex-col min-h-0' : 'flex-1 overflow-y-auto'}>
          {isFullScreen ? (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 h-full">
              <Outlet />
            </div>
          ) : (
            <div className="p-6 max-w-screen-xl mx-auto">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <AiAssistant />
    </div>
  )
}
