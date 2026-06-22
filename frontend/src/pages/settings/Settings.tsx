import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { User, Lock, Check, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'

export function Settings() {
  const { user, setUser } = useAuthStore()
  const [profileForm, setProfileForm] = useState({
    prenom: user?.prenom ?? '',
    nom: user?.nom ?? '',
  })
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const updateProfile = useMutation({
    mutationFn: (payload: { prenom: string; nom: string }) => api.patch('/users/me', payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser as typeof user)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 2500)
    },
  })

  const updatePassword = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/me', payload),
    onSuccess: () => {
      setPwdSuccess(true)
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwdSuccess(false), 2500)
      setPwdError('')
    },
    onError: (err: Error) => {
      setPwdError(err.message)
    },
  })

  const handlePwdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    updatePassword.mutate({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold text-[var(--text)]">Paramètres du compte</h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Gérez votre profil et votre mot de passe</p>
      </div>

      {/* Profile */}
      <Card padding="md">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[var(--border)]">
          <User className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Profil</h2>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <Avatar name={`${user.prenom} ${user.nom}`} size="lg" />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{user.prenom} {user.nom}</p>
            <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={e => { e.preventDefault(); updateProfile.mutate(profileForm) }}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={profileForm.prenom}
              onChange={e => setProfileForm(f => ({ ...f, prenom: e.target.value }))} required />
            <Input label="Nom" value={profileForm.nom}
              onChange={e => setProfileForm(f => ({ ...f, nom: e.target.value }))} required />
          </div>
          <Input label="Email" value={user.email} disabled hint="L'email ne peut pas être modifié ici" />
          <div className="flex items-center justify-between pt-2">
            {profileSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                <Check className="w-3.5 h-3.5" />Profil mis à jour
              </p>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm" loading={updateProfile.isPending}>
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Password */}
      <Card padding="md">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[var(--border)]">
          <Lock className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Mot de passe</h2>
        </div>

        <form className="space-y-4" onSubmit={handlePwdSubmit}>
          <Input label="Mot de passe actuel" type="password" placeholder="••••••••"
            value={pwdForm.currentPassword}
            onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          <Input label="Nouveau mot de passe" type="password" placeholder="••••••••"
            value={pwdForm.newPassword}
            onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required
            hint="Minimum 8 caractères" />
          <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••"
            value={pwdForm.confirmPassword}
            onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} required
            error={pwdError} />

          <div className="flex items-center justify-between pt-2">
            {pwdSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                <Check className="w-3.5 h-3.5" />Mot de passe mis à jour
              </p>
            )}
            {pwdError && !pwdSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--danger)]">
                <AlertCircle className="w-3.5 h-3.5" />{pwdError}
              </p>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="primary" size="sm" loading={updatePassword.isPending}>
                Changer le mot de passe
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}
