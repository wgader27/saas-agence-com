import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Shield, UserCog, Crown } from 'lucide-react'
import { api } from '@/lib/api'
import type { User } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'

interface AdminUser extends User {
  createdAt: string
}

type UserForm = {
  email: string
  prenom: string
  nom: string
  password: string
  isAdmin: boolean
}

const EMPTY_FORM: UserForm = { email: '', prenom: '', nom: '', password: '', isAdmin: false }

function UserFormFields({ form, setForm, isEdit }: {
  form: UserForm
  setForm: (fn: (f: UserForm) => UserForm) => void
  isEdit?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Prénom *" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required />
        <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
      </div>
      <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
      <Input
        label={isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas modifier)' : 'Mot de passe *'}
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        required={!isEdit}
      />
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-subtle)]">
        <input
          type="checkbox"
          id="isAdmin"
          checked={form.isAdmin}
          onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
          className="w-4 h-4 rounded accent-[var(--primary)] cursor-pointer"
        />
        <label htmlFor="isAdmin" className="flex items-center gap-2 cursor-pointer">
          <Crown className="w-4 h-4 text-[var(--warning)]" />
          <div>
            <p className="text-xs font-medium text-[var(--text)]">Administrateur</p>
            <p className="text-[10px] text-[var(--text-muted)]">Accès complet : gestion utilisateurs, suppression de données</p>
          </div>
        </label>
      </div>
    </div>
  )
}

export function Admin() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/users'),
  })

  const create = useMutation({
    mutationFn: (payload: UserForm) => api.post('/users', {
      ...payload,
      roles: payload.isAdmin ? ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] : ['ROLE_EMPLOYEE'],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setCreateOpen(false); setForm(EMPTY_FORM) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UserForm) => api.patch(`/users/${id}`, {
      prenom: payload.prenom,
      nom: payload.nom,
      email: payload.email,
      ...(payload.password ? { password: payload.password } : {}),
      roles: payload.isAdmin ? ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] : ['ROLE_EMPLOYEE'],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditUser(null) },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setDeleteConfirm(null) },
  })

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setForm({
      email: u.email,
      prenom: u.prenom,
      nom: u.nom,
      password: '',
      isAdmin: u.roles.includes('ROLE_ADMIN'),
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--warning-subtle)] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[var(--text)]">Administration</h1>
            <p className="text-xs text-[var(--text-muted)]">Gestion des utilisateurs du panel</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
          <Plus className="w-3.5 h-3.5" />Ajouter un utilisateur
        </Button>
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] animate-pulse" />)}
        </div>
      ) : !users.length ? (
        <Empty icon={<UserCog className="w-10 h-10" />} title="Aucun utilisateur" />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-[var(--border)]">
            {users.map(u => {
              const isAdmin = u.roles.includes('ROLE_ADMIN')
              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors group">
                  <Avatar name={`${u.prenom} ${u.nom}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text)]">{u.prenom} {u.nom}</p>
                      {isAdmin && (
                        <Badge variant="warning">
                          <Crown className="w-2.5 h-2.5 mr-1 inline" />Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                  </div>
                  {u.createdAt && (
                    <p className="text-xs text-[var(--text-muted)] hidden sm:block">
                      Depuis {formatDate(u.createdAt)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(u)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(u)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Stat */}
      <p className="text-xs text-[var(--text-muted)]">
        {users.length} utilisateur{users.length > 1 ? 's' : ''} ·{' '}
        {users.filter(u => u.roles.includes('ROLE_ADMIN')).length} admin{users.filter(u => u.roles.includes('ROLE_ADMIN')).length > 1 ? 's' : ''}
      </p>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent title="Ajouter un utilisateur" size="md">
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); create.mutate(form) }}>
            <UserFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={create.isPending}>Créer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent title={`Modifier — ${editUser?.prenom} ${editUser?.nom}`} size="md">
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (editUser) update.mutate({ id: editUser.id, ...form })
          }}>
            <UserFormFields form={form} setForm={setForm} isEdit />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={update.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent title="Supprimer cet utilisateur ?" size="sm">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Supprimer définitivement <strong>{deleteConfirm?.prenom} {deleteConfirm?.nom}</strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleteConfirm && remove.mutate(deleteConfirm.id)}>
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
