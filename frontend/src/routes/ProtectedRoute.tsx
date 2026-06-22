import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useEffect } from 'react'

export function ProtectedRoute() {
  const { user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    if (!user) checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted)]">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
