import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { Login } from '@/pages/auth/Login'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { Domaines } from '@/pages/domaines/Domaines'
import { ClientsList } from '@/pages/clients/ClientsList'
import { ClientDetail } from '@/pages/clients/ClientDetail'
import { Acces } from '@/pages/acces/Acces'
import { Notes } from '@/pages/notes/Notes'
import { Outils } from '@/pages/outils/Outils'
import { Calendrier } from '@/pages/calendrier/Calendrier'
import { Admin } from '@/pages/admin/Admin'
import { Settings } from '@/pages/settings/Settings'
import { Ia } from '@/pages/ia/Ia'
import { Todos } from '@/pages/todos/Todos'
import { BoardPage } from '@/pages/todos/Board'
import { PublicBoard } from '@/pages/share/PublicBoard'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  // Public board — no auth, no panel layout
  {
    path: '/share/:token',
    element: <PublicBoard />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'domaines', element: <Domaines /> },
          { path: 'clients', element: <ClientsList /> },
          { path: 'clients/:id', element: <ClientDetail /> },
          { path: 'acces', element: <Acces /> },
          { path: 'notes', element: <Notes /> },
          { path: 'outils', element: <Outils /> },
          { path: 'calendrier', element: <Calendrier /> },
          { path: 'ia', element: <Ia /> },
          { path: 'todos', element: <Todos /> },
          { path: 'todos/:id', element: <BoardPage /> },
          { path: 'admin', element: <Admin /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
