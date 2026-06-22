import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await api.post<{ user: User }>('/auth/login', { email, password })
          set({ user: data.user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        await api.post('/auth/logout')
        set({ user: null })
      },

      checkAuth: async () => {
        set({ isLoading: true })
        try {
          const data = await api.get<{ user: User }>('/auth/me')
          set({ user: data.user, isLoading: false })
        } catch {
          set({ user: null, isLoading: false })
        }
      },
    }),
    {
      name: 'encore-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
