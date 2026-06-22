import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

function getResolved(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(theme: Theme) {
  const resolved = getResolved(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: getResolved('system'),

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme, resolvedTheme: getResolved(theme) })
      },
    }),
    {
      name: 'encore-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)

// Init on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('encore-theme')
  const theme: Theme = stored ? (JSON.parse(stored).state?.theme ?? 'system') : 'system'
  applyTheme(theme)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useThemeStore.getState().theme
    if (current === 'system') {
      applyTheme('system')
      useThemeStore.setState({ resolvedTheme: getResolved('system') })
    }
  })
}
