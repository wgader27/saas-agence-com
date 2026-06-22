import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Globe, Lock, ExternalLink, Phone, Mail,
  Building2, Calendar, Pencil, Trash2, Plus, Eye, EyeOff, Copy, Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Domain, SiteAccess } from '@/lib/api'
import { daysUntil, formatDate, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, ExpiryBadge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'

interface ClientDetailData {
  client: Client
  domains: Domain[]
  accesses: SiteAccess[]
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Copier">
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--primary)]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

const ACCESS_TYPE_BADGE = {
  wordpress: 'info' as const,
  hebergement: 'warning' as const,
  autre: 'default' as const,
}

function AccessRow({ access }: { access: SiteAccess }) {
  const [showPwd, setShowPwd] = useState(false)
  return (
    <div className="p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={ACCESS_TYPE_BADGE[access.type]}>{access.type}</Badge>
          <span className="text-sm font-medium text-[var(--text)]">{access.label}</span>
        </div>
        {access.url && (
          <a href={access.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline">
            <ExternalLink className="w-3 h-3" />
            Ouvrir
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between bg-[var(--bg-subtle)] rounded-[var(--radius-sm)] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Login</p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate">{access.login}</p>
          </div>
          <CopyBtn text={access.login} />
        </div>
        <div className="flex items-center justify-between bg-[var(--bg-subtle)] rounded-[var(--radius-sm)] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mot de passe</p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate">{showPwd ? access.password : '••••••••'}</p>
          </div>
          <div className="flex items-center">
            <button onClick={() => setShowPwd(v => !v)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {showPwd && <CopyBtn text={access.password} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles.includes('ROLE_ADMIN')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState({ nom: '', secteur: '', telephone: '', email: '', contact: '', notesGenerales: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<ClientDetailData>(`/clients/${id}`),
  })

  const update = useMutation({
    mutationFn: (payload: typeof form) => api.patch(`/clients/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); setEditOpen(false) },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/clients/${id}`),
    onSuccess: () => { navigate('/clients') },
  })

  const openEdit = () => {
    if (!data) return
    const { client } = data
    setForm({
      nom: client.nom ?? '',
      secteur: client.secteur ?? '',
      telephone: client.telephone ?? '',
      email: client.email ?? '',
      contact: client.contact ?? '',
      notesGenerales: client.notesGenerales ?? '',
    })
    setEditOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-40 bg-[var(--bg-subtle)] animate-pulse rounded-[var(--radius-md)]" />
        <div className="h-40 bg-[var(--bg-subtle)] animate-pulse rounded-[var(--radius-lg)]" />
      </div>
    )
  }

  if (!data) return null
  const { client, domains, accesses } = data

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux clients
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="w-3.5 h-3.5" />Modifier
          </Button>
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" />Supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <Card padding="md">
        <div className="flex items-start gap-4">
          <Avatar name={client.nom} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-[var(--text)]">{client.nom}</h1>
            {client.secteur && (
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">{client.secteur}</p>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">Client depuis {formatDate(client.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        {(client.telephone || client.email || client.contact) && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-4">
            {client.telephone && (
              <a href={`tel:${client.telephone}`} className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Téléphone</p>
                  <p className="text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">{client.telephone}</p>
                </div>
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Email</p>
                  <p className="text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">{client.email}</p>
                </div>
              </a>
            )}
            {client.contact && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {client.contact.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Contact</p>
                  <p className="text-sm text-[var(--text)]">{client.contact}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {client.notesGenerales && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{client.notesGenerales}</p>
          </div>
        )}
      </Card>

      {/* Domaines */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Domaines</h2>
            <Badge variant="default">{domains.length}</Badge>
          </div>
          <Link to="/domaines">
            <Button variant="ghost" size="sm">Voir tout</Button>
          </Link>
        </div>
        {!domains.length ? (
          <Card padding="md">
            <div className="text-center py-4">
              <Globe className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-xs text-[var(--text-muted)]">Aucun domaine enregistré</p>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-[var(--border)]">
              {domains.map(d => {
                const days = d.dateExpirationDomaine ? daysUntil(d.dateExpirationDomaine) : null
                return (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors">
                    <div>
                      <p className="text-sm font-mono font-medium text-[var(--text)]">{d.nomDomaine}</p>
                      <p className="text-xs text-[var(--text-muted)]">{[d.registrar, d.hebergeur].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {days !== null && <ExpiryBadge days={days} />}
                      <a href={`https://${d.nomDomaine}`} target="_blank" rel="noopener noreferrer"
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </section>

      {/* Accès */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Accès</h2>
            <Badge variant="default">{accesses.length}</Badge>
          </div>
          <Link to="/acces">
            <Button variant="ghost" size="sm"><Plus className="w-3.5 h-3.5" />Gérer</Button>
          </Link>
        </div>
        {!accesses.length ? (
          <Card padding="md">
            <div className="text-center py-4">
              <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-xs text-[var(--text-muted)]">Aucun accès enregistré</p>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-[var(--border)]">
              {accesses.map(a => <AccessRow key={a.id} access={a} />)}
            </div>
          </Card>
        )}
      </section>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent title={`Modifier — ${client.nom}`} size="md">
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); update.mutate(form) }}>
            <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
            <Input label="Secteur" value={form.secteur} onChange={e => setForm(f => ({ ...f, secteur: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Téléphone" value={form.telephone} leftIcon={<Phone className="w-3.5 h-3.5" />}
                onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
              <Input label="Email" type="email" value={form.email} leftIcon={<Mail className="w-3.5 h-3.5" />}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <Input label="Contact référent" value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
            <Textarea label="Notes générales" value={form.notesGenerales}
              onChange={e => setForm(f => ({ ...f, notesGenerales: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={update.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={v => !v && setDeleteOpen(false)}>
        <DialogContent title="Supprimer ce client ?" size="sm">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Cette action supprimera définitivement <strong>{client.nom}</strong> et toutes ses données.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
