const BASE = '/api'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Erreur serveur' }))
    throw new ApiError(response.status, body.message ?? 'Erreur inconnue')
  }

  if (response.status === 204) return null as T
  return response.json()
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Erreur serveur' }))
    throw new ApiError(response.status, body.message ?? 'Erreur inconnue')
  }
  if (response.status === 204) return null as T
  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
}

export { ApiError }

/* ── Types partagés ─────────────────────────────────────── */

export interface User {
  id: number
  email: string
  prenom: string
  nom: string
  roles: string[]
}

export interface Client {
  id: number
  nom: string
  secteur: string
  contact: string
  telephone: string
  email: string
  notesGenerales: string
  createdAt: string
}

export interface SiteAccess {
  id: number
  clientId: number
  type: 'hebergement' | 'wordpress' | 'autre'
  label: string
  url: string
  login: string
  password: string
  notes: string
}

export interface Domain {
  id: number
  clientId: number
  clientNom: string
  nomDomaine: string
  registrar: string
  hebergeur: string
  dateExpirationDomaine: string | null
  dateExpirationSsl: string | null
}

export interface Note {
  id: number
  auteurId: number
  auteurNom: string
  titre: string
  contenu: string
  visibilite: 'prive' | 'equipe' | 'partage'
  tags: Tag[]
  sharedWithIds: number[]
  updatedAt: string
  createdAt: string
}

export interface Tag {
  id: number
  nom: string
  couleur: string
}

export interface Bookmark {
  id: number
  nom: string
  url: string
  faviconUrl: string | null
  categorie: string
  description: string | null
  ordre: number
}

export interface CalendarEvent {
  id: number
  userId: number
  userNom: string
  titre: string
  date: string
  allDay: boolean
  heureDebut: string | null
  heureFin: string | null
  description: string
  couleur: string
}

export interface ActivityLog {
  id: number
  userNom: string
  action: string
  cible: string
  createdAt: string
}

export interface TaskChecklistItem {
  id: number
  texte: string
  checked: boolean
  ordre: number
}

export interface TaskLabelType {
  id: number
  nom: string
  couleur: string
}

export interface TaskComment {
  id: number
  auteurId: number | null
  auteurNom: string
  auteurPrenom: string
  texte: string
  isClientComment: boolean
  createdAt: string
}

export interface TaskAttachment {
  id: number
  nomOriginal: string
  nomFichier: string
  mimeType: string | null
  taille: number
  isImage: boolean
  url: string
  uploadedBy: string | null
  createdAt: string
}

export interface BoardTask {
  id: number
  columnId: number
  titre: string
  description: string | null
  couleur: string | null
  ordre: number
  dateEcheance: string | null
  jalon: string | null
  clientValidated: boolean
  clientValidatedAt: string | null
  assignees: User[]
  labels: TaskLabelType[]
  checklist: TaskChecklistItem[]
  checklistMeta: { total: number; done: number }
  commentCount: number
  attachmentCount: number
  coverUrl?: string | null
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  createdAt: string
  updatedAt: string
}

export interface BoardColumnType {
  id: number
  nom: string
  couleur: string | null
  ordre: number
  tasks: BoardTask[]
}

export interface BoardMember {
  id: number
  user: User
  role: 'owner' | 'editor' | 'viewer'
}

export interface Board {
  id: number
  nom: string
  description: string | null
  visibilite: 'prive' | 'equipe' | 'partage'
  couleurFond: string
  proprietaire: User
  workspaceId: number | null
  workspaceNom: string | null
  clientAssocie: { id: number; nom: string } | null
  shareEnabled: boolean
  shareToken: string | null
  members: BoardMember[]
  columns: BoardColumnType[]
  labels: TaskLabelType[]
  users: User[]
  createdAt: string
}

export interface Workspace {
  id: number
  nom: string
  description: string | null
  couleur: string
  proprietaire: User
  members: { id: number; user: User; role: string; joinedAt: string }[]
  createdAt: string
}

export interface Notification {
  id: number
  type: 'comment' | 'assignment' | 'client_comment' | 'client_validated'
  titre: string
  contenu: string | null
  lienUrl: string | null
  lu: boolean
  createdAt: string
}
