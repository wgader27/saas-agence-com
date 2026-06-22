import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Globe, RefreshCw, Search, Pencil, Trash2, ExternalLink, AlertTriangle, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import type { Domain } from '@/lib/api'
import { daysUntil, formatDate, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExpiryBadge } from '@/components/ui/badge'
import { Table, THead, TBody, Tr, Th, Td } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Empty } from '@/components/ui/empty'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ClientCombobox } from '@/components/ui/combobox'
import { useAuthStore } from '@/store/auth'

type SortKey = 'domaine' | 'ssl' | 'client'

type DomainForm = {
  clientId: string
  nomDomaine: string
  registrar: string
  hebergeur: string
  dateExpirationDomaine: string
  dateExpirationSsl: string
}

const EMPTY_FORM: DomainForm = {
  clientId: '', nomDomaine: '', registrar: '', hebergeur: '',
  dateExpirationDomaine: '', dateExpirationSsl: '',
}

function DomainFormFields({ form, setForm }: {
  form: DomainForm
  setForm: (fn: (f: DomainForm) => DomainForm) => void
}) {
  return (
    <div className="space-y-4">
      <ClientCombobox label="Client" value={form.clientId}
        onChange={id => setForm(f => ({ ...f, clientId: id }))} />
      <Input label="Nom de domaine *" placeholder="exemple.fr" value={form.nomDomaine}
        onChange={e => setForm(f => ({ ...f, nomDomaine: e.target.value }))} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Registrar" placeholder="OVH, Gandi…" value={form.registrar}
          onChange={e => setForm(f => ({ ...f, registrar: e.target.value }))} />
        <Input label="Hébergeur" placeholder="o2switch, OVH…" value={form.hebergeur}
          onChange={e => setForm(f => ({ ...f, hebergeur: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Expiration domaine" type="date" value={form.dateExpirationDomaine}
          onChange={e => setForm(f => ({ ...f, dateExpirationDomaine: e.target.value }))} />
        <Input label="Expiration SSL" type="date" value={form.dateExpirationSsl}
          onChange={e => setForm(f => ({ ...f, dateExpirationSsl: e.target.value }))} />
      </div>
    </div>
  )
}

export function Domaines() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles.includes('ROLE_ADMIN')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('domaine')
  const [createOpen, setCreateOpen] = useState(false)
  const [editDomain, setEditDomain] = useState<Domain | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Domain | null>(null)
  const [form, setForm] = useState<DomainForm>(EMPTY_FORM)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get<Domain[]>('/domains'),
    staleTime: 0,
  })

  const refresh = useMutation({
    mutationFn: () => api.post<{ domains: Domain[] }>('/domains/refresh'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domains'] }),
  })

  // Auto-refresh SSL on every page mount
  useEffect(() => {
    refresh.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: (payload: DomainForm) => api.post('/domains', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['domains'] }); setCreateOpen(false); setForm(EMPTY_FORM) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & DomainForm) => api.patch(`/domains/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['domains'] }); setEditDomain(null) },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/domains/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['domains'] }); setDeleteConfirm(null) },
  })

  const openEdit = (d: Domain) => {
    setEditDomain(d)
    setForm({
      clientId: String(d.clientId ?? ''),
      nomDomaine: d.nomDomaine,
      registrar: d.registrar ?? '',
      hebergeur: d.hebergeur ?? '',
      dateExpirationDomaine: d.dateExpirationDomaine?.split('T')[0] ?? '',
      dateExpirationSsl: d.dateExpirationSsl?.split('T')[0] ?? '',
    })
  }

  const filtered = data
    .filter(d => d.nomDomaine.toLowerCase().includes(search.toLowerCase()) || d.clientNom.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'domaine') {
        const da = a.dateExpirationDomaine ? daysUntil(a.dateExpirationDomaine) : 9999
        const db = b.dateExpirationDomaine ? daysUntil(b.dateExpirationDomaine) : 9999
        return da - db
      }
      if (sort === 'ssl') {
        const da = a.dateExpirationSsl ? daysUntil(a.dateExpirationSsl) : 9999
        const db = b.dateExpirationSsl ? daysUntil(b.dateExpirationSsl) : 9999
        return da - db
      }
      return a.clientNom.localeCompare(b.clientNom)
    })

  const urgents = filtered.filter(d => {
    const days = d.dateExpirationDomaine ? daysUntil(d.dateExpirationDomaine) : null
    const sslDays = d.dateExpirationSsl ? daysUntil(d.dateExpirationSsl) : null
    return (days !== null && days <= 30) || (sslDays !== null && sslDays <= 30)
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <Input placeholder="Rechercher un domaine…" value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
            {(['domaine', 'ssl', 'client'] as SortKey[]).map(k => (
              <button key={k} onClick={() => setSort(k)}
                className={cn('px-3 h-9 text-xs font-medium transition-colors',
                  sort === k ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]')}>
                {k === 'domaine' ? 'Exp. domaine' : k === 'ssl' ? 'Exp. SSL' : 'Client'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refresh.mutate()} loading={refresh.isPending} title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
            <Plus className="w-3.5 h-3.5" />Ajouter
          </Button>
        </div>
      </div>

      {/* Alerte urgents */}
      {urgents.length > 0 && (
        <Card padding="sm" className="border-[var(--warning)]/40 bg-[var(--warning-subtle)]">
          <div className="flex items-center gap-2.5 px-1">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
            <p className="text-xs text-[var(--warning)]">
              <span className="font-semibold">{urgents.length} domaine{urgents.length > 1 ? 's' : ''}</span>{' '}
              expire{urgents.length > 1 ? 'nt' : ''} dans moins de 30 jours.
            </p>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] animate-pulse" />
            ))}
          </div>
        ) : !filtered.length ? (
          <Empty icon={<Globe className="w-10 h-10" />} title="Aucun domaine trouvé"
            action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" />Ajouter</Button>} />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Domaine</Th>
                <Th>Client</Th>
                <Th>Registrar</Th>
                <Th>Hébergeur</Th>
                <Th>Exp. domaine</Th>
                <Th>Exp. SSL</Th>
                <Th></Th>
              </Tr>
            </THead>
            <TBody>
              {filtered.map(d => {
                const domainDays = d.dateExpirationDomaine ? daysUntil(d.dateExpirationDomaine) : null
                const sslDays = d.dateExpirationSsl ? daysUntil(d.dateExpirationSsl) : null
                return (
                  <Tr key={d.id} className="group">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-[var(--text)]">{d.nomDomaine}</span>
                        <a href={`https://${d.nomDomaine}`} target="_blank" rel="noopener noreferrer"
                          className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors opacity-0 group-hover:opacity-100">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{d.clientNom || '—'}</Td>
                    <Td className="text-[var(--text-secondary)]">{d.registrar || '—'}</Td>
                    <Td className="text-[var(--text-secondary)]">{d.hebergeur || '—'}</Td>
                    <Td>
                      {domainDays !== null ? (
                        <div className="flex items-center gap-2">
                          <ExpiryBadge days={domainDays} />
                          <span className="text-xs text-[var(--text-muted)]">
                            {d.dateExpirationDomaine ? formatDate(d.dateExpirationDomaine) : ''}
                          </span>
                        </div>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </Td>
                    <Td>
                      {sslDays !== null ? (
                        <div className="flex items-center gap-2">
                          {sslDays > 30 ? (
                            <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                              <Shield className="w-3 h-3" />{sslDays}j
                            </span>
                          ) : (
                            <ExpiryBadge days={sslDays} />
                          )}
                        </div>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => openEdit(d)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirm(d)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {filtered.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">{filtered.length} domaine{filtered.length > 1 ? 's' : ''}</p>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent title="Ajouter un domaine" size="md">
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); create.mutate(form) }}>
            <DomainFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={create.isPending}>Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDomain} onOpenChange={v => !v && setEditDomain(null)}>
        <DialogContent title={`Modifier — ${editDomain?.nomDomaine}`} size="md">
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (editDomain) update.mutate({ id: editDomain.id, ...form }) }}>
            <DomainFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditDomain(null)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={update.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent title="Supprimer ce domaine ?" size="sm">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Supprimer définitivement <strong>{deleteConfirm?.nomDomaine}</strong> ?
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
