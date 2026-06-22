import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'

export function Login() {
  const { user, login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError('Trop de tentatives. Réessayez dans quelques minutes.')
        else if (err.status === 401) setError('Identifiants incorrects.')
        else setError('Une erreur est survenue.')
      } else {
        setError('Impossible de joindre le serveur.')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Left — décoratif */}
      <div className="hidden lg:flex lg:flex-1 bg-[var(--stone-900)] dark:bg-[var(--ink-950)] relative overflow-hidden items-end p-12">
        {/* Grid subtile */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(var(--cream-200) 1px, transparent 1px), linear-gradient(90deg, var(--cream-200) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Logo grand */}
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-[10px] bg-[var(--primary)] flex items-center justify-center mb-6">
            <span className="text-white font-bold text-lg tracking-tight">ED</span>
          </div>
          <p className="text-[var(--cream-50)] text-2xl font-semibold leading-snug max-w-xs">
            Encore Design<br />
            <span className="text-[var(--stone-400)] font-normal text-base">Panel interne</span>
          </p>
          <p className="text-[var(--stone-500)] text-xs mt-4 max-w-[260px] leading-relaxed">
            Espace privé réservé aux membres de l'équipe.
            Toutes les données sont chiffrées et sécurisées.
          </p>
        </div>
      </div>

      {/* Right — formulaire */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-[340px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-[7px] bg-[var(--primary)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">ED</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">Encore Design</span>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--primary-subtle)] mb-4">
              <Lock className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text)]">Connexion</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Accès réservé aux membres de l'équipe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Adresse e-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="prenom@exemple.com"
              autoComplete="email"
              required
            />

            <Input
              label="Mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="hover:text-[var(--text)] transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {error && (
              <div className="px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--danger-subtle)] border border-[var(--danger)]/20">
                <p className="text-xs text-[var(--danger)]">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" size="md" loading={isLoading} className="w-full mt-2">
              Se connecter
            </Button>
          </form>

          <p className="mt-8 text-[10px] text-[var(--text-muted)] text-center">
            Accès protégé — panel.encore-design.fr
          </p>
        </div>
      </div>
    </div>
  )
}
