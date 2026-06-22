import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, Eye, EyeOff, Copy, Check, Search, ExternalLink, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { SiteAccess } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Empty } from '@/components/ui/empty'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ClientCombobox } from '@/components/ui/combobox'
import { useAuthStore } from '@/store/auth'

interface AccessWithClient extends SiteAccess {
  clientNom: string
}

type AccessForm = {
  clientId: string
  type: SiteAccess['type']
  label: string
  url: string
  login: string
  password: string
  notes: string
}

const EMPTY_FORM: AccessForm = { clientId: '', type: 'hebergement', label: '', url: '', login: '', password: '', notes: '' }

const TYPE_BADGE = { hebergement: 'warning' as const, wordpress: 'info' as const, autre: 'default' as const }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Copier">
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--primary)]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function AccessFormFields({ form, setForm, isEdit }: {
  form: AccessForm
  setForm: (fn: (f: AccessForm) => AccessForm) => void
  isEdit?: boolean
}) {
  return (
    <div className="space-y-4">
      <ClientCombobox
        label="Client *"
        required
        value={form.clientId}
        onChange={(id, nom) => setForm(f => ({ ...f, clientId: id }))}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Type</label>
        <div className="flex gap-2">
          {(['hebergement', 'wordpress', 'autre'] as const).map(t => (
            <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
              className={cn('flex-1 h-9 text-xs font-medium rounded-[var(--radius-md)] border transition-colors',
                form.type === t
                  ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]')}>
              {t === 'hebergement' ? 'Hébergement' : t === 'wordpress' ? 'WordPress' : 'Autre'}
            </button>
          ))}
        </div>
      </div>
      <Input label="Label *" placeholder="Ex: Hébergement o2switch" value={form.label}
        onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
      <Input label="URL" placeholder="https://…" value={form.url}
        onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
      <Input label="Login *" placeholder="nom@exemple.fr" value={form.login}
        onChange={e => setForm(f => ({ ...f, login: e.target.value }))} required />
      <Input label={isEdit ? 'Mot de passe (laisser vide pour ne pas modifier)' : 'Mot de passe *'}
        type="password" placeholder="••••••••" value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        required={!isEdit} />
      <Input label="Notes" placeholder="Infos complémentaires…" value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
    </div>
  )
}

function AccessCard({ access, onEdit, onDelete }: {
  access: AccessWithClient
  onEdit: (a: AccessWithClient) => void
  onDelete: (id: number) => void
}) {
  const [showPwd, setShowPwd] = useState(false)
  const { user } = useAuthStore()
  const isAdmin = user?.roles.includes('ROLE_ADMIN')

  return (
    <Card padding="md" className="space-y-3 group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={TYPE_BADGE[access.type]}>{access.type}</Badge>
            <span className="text-xs text-[var(--text-muted)] truncate">{access.clientNom}</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text)]">{access.label}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
          {access.url && (
            <a href={access.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => onEdit(access)}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button onClick={() => onDelete(access.id)}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        {access.url && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider w-14 shrink-0">URL</p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate flex-1">{access.url}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider w-14 shrink-0">Login</p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate">{access.login}</p>
          </div>
          <CopyButton text={access.login} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider w-14 shrink-0">MDP</p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate">
              {showPwd ? access.password : '••••••••••••'}
            </p>
          </div>
          <div className="flex items-center">
            <button onClick={() => setShowPwd(v => !v)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {showPwd && <CopyButton text={access.password} />}
          </div>
        </div>
        {access.notes && (
          <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1 border-t border-[var(--border)]">{access.notes}</p>
        )}
      </div>
    </Card>
  )
}

export function Acces() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | SiteAccess['type']>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editAccess, setEditAccess] = useState<AccessWithClient | null>(null)
  const [form, setForm] = useState<AccessForm>(EMPTY_FORM)

  const { data = [], isLoading } = useQuery({
    queryKey: ['accesses'],
    queryFn: () => api.get<AccessWithClient[]>('/site-accesses'),
  })

  const create = useMutation({
    mutationFn: (payload: AccessForm) => api.post('/site-accesses', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accesses'] }); setCreateOpen(false); setForm(EMPTY_FORM) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & AccessForm) => api.patch(`/site-accesses/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accesses'] }); setEditAccess(null) },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/site-accesses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesses'] }),
  })

  const openEdit = (access: AccessWithClient) => {
    setEditAccess(access)
    setForm({
      clientId: String(access.clientId),
      type: access.type,
      label: access.label,
      url: access.url ?? '',
      login: access.login,
      password: '',
      notes: access.notes ?? '',
    })
  }

  const filtered = data.filter(a => {
    const matchSearch = a.label.toLowerCase().includes(search.toLowerCase()) || a.clientNom.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.type === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-5">
      {/* Banner sécurité */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--primary-subtle)] border border-[var(--primary)]/20">
        <ShieldCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
        <p className="text-xs text-[var(--primary)]">
          <span className="font-semibold">Espace sécurisé.</span> Les mots de passe sont chiffrés avec libsodium. Toutes les consultations sont journalisées.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 max-w-sm">
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
        <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
          {(['all', 'hebergement', 'wordpress', 'autre'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 h-9 text-xs font-medium transition-colors',
                filter === f ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]')}>
              {f === 'all' ? 'Tous' : f === 'hebergement' ? 'Hébergement' : f === 'wordpress' ? 'WordPress' : 'Autre'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
            <Plus className="w-3.5 h-3.5" />Ajouter
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <Empty icon={<Lock className="w-10 h-10" />} title="Aucun accès trouvé"
          action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" />Ajouter</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <AccessCard key={a.id} access={a} onEdit={openEdit} onDelete={id => remove.mutate(id)} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">{filtered.length} accès</p>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent title="Ajouter un accès" size="md">
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); create.mutate(form) }}>
            <AccessFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={create.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editAccess} onOpenChange={v => !v && setEditAccess(null)}>
        <DialogContent title={`Modifier — ${editAccess?.label}`} size="md">
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (editAccess) update.mutate({ id: editAccess.id, ...form })
          }}>
            <AccessFormFields form={form} setForm={setForm} isEdit />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditAccess(null)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={update.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
