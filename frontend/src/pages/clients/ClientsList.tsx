import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, ChevronRight, Phone, Mail, Pencil, Trash2, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Client } from '@/lib/api'
import { formatDate, truncate, cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Empty } from '@/components/ui/empty'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Avatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'

type ClientForm = {
  nom: string
  secteur: string
  telephone: string
  email: string
  contact: string
  notesGenerales: string
}

const EMPTY_FORM: ClientForm = { nom: '', secteur: '', telephone: '', email: '', contact: '', notesGenerales: '' }

function ClientFormFields({ form, setForm }: {
  form: ClientForm
  setForm: (fn: (f: ClientForm) => ClientForm) => void
}) {
  return (
    <div className="space-y-4">
      <Input label="Nom *" placeholder="Nom de l'entreprise ou du client" value={form.nom}
        onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
      <Input label="Secteur" placeholder="E-commerce, Restauration…" value={form.secteur}
        onChange={e => setForm(f => ({ ...f, secteur: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Téléphone" placeholder="+33 6 00 00 00 00" value={form.telephone}
          leftIcon={<Phone className="w-3.5 h-3.5" />}
          onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
        <Input label="Email" type="email" placeholder="contact@exemple.fr" value={form.email}
          leftIcon={<Mail className="w-3.5 h-3.5" />}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <Input label="Contact référent" placeholder="Prénom Nom du contact" value={form.contact}
        onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
      <Textarea label="Notes générales" placeholder="Stack technique, informations importantes…" value={form.notesGenerales}
        onChange={e => setForm(f => ({ ...f, notesGenerales: e.target.value }))} />
    </div>
  )
}

export function ClientsList() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles.includes('ROLE_ADMIN')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  })

  const create = useMutation({
    mutationFn: (payload: ClientForm) => api.post('/clients', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & ClientForm) => api.patch(`/clients/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setEditClient(null)
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setDeleteConfirm(null)
    },
  })

  const openEdit = (client: Client, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditClient(client)
    setForm({
      nom: client.nom,
      secteur: client.secteur ?? '',
      telephone: client.telephone ?? '',
      email: client.email ?? '',
      contact: client.contact ?? '',
      notesGenerales: client.notesGenerales ?? '',
    })
  }

  const filtered = data.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.secteur ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input placeholder="Rechercher un client…" value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
        <div className="ml-auto">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5" />Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent title="Nouveau client" size="md">
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); create.mutate(form) }}>
                <ClientFormFields form={form} setForm={setForm} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="primary" loading={create.isPending}>Créer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <Empty
          icon={<Users className="w-10 h-10" />}
          title="Aucun client trouvé"
          description="Ajoutez votre premier client pour commencer."
          action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" />Nouveau client</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`}>
              <Card padding="md" className="h-full hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-150 cursor-pointer group relative">
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => openEdit(client, e)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(client) }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={client.nom} size="md" />
                  <div className="min-w-0 flex-1 pr-12">
                    <h3 className="text-sm font-semibold text-[var(--text)] truncate">{client.nom}</h3>
                    {client.secteur && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        <p className="text-xs text-[var(--text-muted)] truncate">{client.secteur}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(client.telephone || client.email) && (
                  <div className="space-y-1 mb-3">
                    {client.telephone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-[var(--primary)] shrink-0" />
                        <span className="text-xs text-[var(--text-secondary)] truncate">{client.telephone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-[var(--primary)] shrink-0" />
                        <span className="text-xs text-[var(--text-secondary)] truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {client.notesGenerales && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {truncate(client.notesGenerales, 80)}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)]">Depuis {formatDate(client.createdAt)}</p>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">{filtered.length} client{filtered.length > 1 ? 's' : ''}</p>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={v => !v && setEditClient(null)}>
        <DialogContent title={`Modifier — ${editClient?.nom}`} size="md">
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (editClient) update.mutate({ id: editClient.id, ...form })
          }}>
            <ClientFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditClient(null)}>Annuler</Button>
              <Button type="submit" variant="primary" loading={update.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent title="Supprimer ce client ?" size="sm">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Cette action supprimera définitivement <strong>{deleteConfirm?.nom}</strong> et toutes ses données associées (domaines, accès).
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
