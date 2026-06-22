import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, FileText, Lock, Users, Trash2, Tag,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  Heading1, Heading2, Link2, Image, Code, Quote,
  Download, Save, Eye, EyeOff, ChevronLeft, X, Check,
  Share2, UserCheck,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import ImageExt from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import DOMPurify from 'dompurify'
import { api } from '@/lib/api'
import type { Note, Tag as TagType } from '@/lib/api'
import { formatDate, truncate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Empty } from '@/components/ui/empty'
import { useAuthStore } from '@/store/auth'

type VisibilityFilter = 'all' | 'prive' | 'equipe'

const COLORS = ['#000000', '#374151', '#DC2626', '#D97706', '#16A34A', '#2563EB', '#7C3AED', '#DB2777']
const HIGHLIGHTS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#E9D5FF', '#FECACA', '#FED7AA']

function ToolbarBtn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)]'
      )}
    >
      {children}
    </button>
  )
}

function TipTapToolbar({ editor, onInsertImage }: { editor: ReturnType<typeof useEditor>; onInsertImage: () => void }) {
  const [colorOpen, setColorOpen] = useState(false)
  const [hlOpen, setHlOpen] = useState(false)

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('URL du lien:')
    if (url) editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
    else editor.chain().focus().unsetLink().run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
      <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
        <Bold className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
        <Italic className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
        <UnderlineIcon className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
        <Heading1 className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Gauche">
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centre">
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Droite">
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste">
        <List className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
        <Quote className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
        <Code className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      {/* Couleur texte */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setColorOpen(v => !v); setHlOpen(false) }}
          className="p-1.5 rounded hover:bg-[var(--bg-muted)] transition-colors"
          title="Couleur du texte"
        >
          <span className="text-xs font-bold text-[var(--text)]" style={{ textDecoration: 'underline', textDecorationColor: editor.getAttributes('textStyle').color ?? '#000' }}>A</span>
        </button>
        {colorOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-md)] flex gap-1 flex-wrap w-28">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false) }}
                className="w-5 h-5 rounded-full border border-[var(--border)] hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
            <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false) }}
              className="w-5 h-5 rounded-full border border-[var(--border)] bg-gradient-to-br from-white to-black flex items-center justify-center hover:scale-110 transition-transform">
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Surlignage */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setHlOpen(v => !v); setColorOpen(false) }}
          className="p-1.5 rounded hover:bg-[var(--bg-muted)] transition-colors"
          title="Surligner"
        >
          <span className="text-xs font-bold" style={{ backgroundColor: '#FEF08A', padding: '0 2px' }}>HL</span>
        </button>
        {hlOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-md)] flex gap-1 flex-wrap w-24">
            {HIGHLIGHTS.map(c => (
              <button key={c} type="button" onClick={() => { editor.chain().focus().setHighlight({ color: c }).run(); setHlOpen(false) }}
                className="w-5 h-5 rounded border border-[var(--border)] hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
            <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setHlOpen(false) }}
              className="w-5 h-5 rounded border border-[var(--border)] flex items-center justify-center hover:scale-110 transition-transform">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <ToolbarBtn active={editor.isActive('link')} onClick={setLink} title="Lien">
        <Link2 className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={false} onClick={onInsertImage} title="Image">
        <Image className="w-3.5 h-3.5" />
      </ToolbarBtn>
    </div>
  )
}

function NoteEditor({ note, allTags, onClose, onSave, onTagToggle, onShare }: {
  note: Note | null
  allTags: TagType[]
  onClose: () => void
  onSave: (data: { titre: string; contenu: string; visibilite: Note['visibilite'] }) => void
  onTagToggle: (tagId: number, active: boolean) => void
  onShare: (userIds: number[]) => void
}) {
  const { user } = useAuthStore()
  const [titre, setTitre] = useState(note?.titre ?? '')
  const [visibilite, setVisibilite] = useState<Note['visibilite']>(note?.visibilite ?? 'equipe')
  const [saved, setSaved] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)

  const { data: colleagues = [] } = useQuery({
    queryKey: ['colleagues'],
    queryFn: () => api.get<{ id: number; prenom: string; nom: string; email: string }[]>('/users/colleagues'),
    enabled: showSharePanel,
  })

  const [selectedShareIds, setSelectedShareIds] = useState<number[]>(note?.sharedWithIds ?? [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      ImageExt,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Commencez à écrire votre note…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: note?.contenu ?? '',
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  })

  const handleInsertImage = () => {
    const url = window.prompt('URL de l\'image:')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  const handleSave = () => {
    if (!titre.trim()) return
    onSave({ titre, contenu: editor?.getHTML() ?? '', visibilite })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const text = editor?.getText() ?? ''
    const blob = new Blob([`${titre}\n${'='.repeat(titre.length)}\n\n${text}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titre.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleShareUser = (uid: number) => {
    setSelectedShareIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const canEdit = !note || note.auteurId === user?.id || user?.roles.includes('ROLE_ADMIN')
  const isOwner = !note || note.auteurId === user?.id
  const activeTagIds = new Set(note?.tags.map(t => t.id) ?? [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
        <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          value={titre}
          onChange={e => setTitre(e.target.value)}
          placeholder="Titre de la note…"
          disabled={!canEdit}
          className="flex-1 text-base font-semibold text-[var(--text)] bg-transparent outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
        />
        <div className="flex items-center gap-2">
          {/* Visibilité */}
          {canEdit && (
            <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
              {(['equipe', 'prive'] as const).map(v => (
                <button key={v} type="button" onClick={() => setVisibilite(v)}
                  className={cn('flex items-center gap-1 px-2 py-1 text-xs transition-colors',
                    visibilite === v ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]')}>
                  {v === 'equipe' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {v === 'equipe' ? 'Équipe' : 'Privée'}
                </button>
              ))}
            </div>
          )}

          {/* Tag picker */}
          {note && canEdit && allTags.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowTagPicker(v => !v); setShowSharePanel(false) }}
                title="Tags"
                className={cn('p-1.5 rounded hover:bg-[var(--bg-muted)] transition-colors', showTagPicker && 'bg-[var(--primary-subtle)] text-[var(--primary)]')}
              >
                <Tag className="w-4 h-4" />
              </button>
              {showTagPicker && (
                <div className="absolute top-full right-0 mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-48 py-1.5">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-3 py-1">Tags</p>
                  {allTags.map(t => {
                    const active = activeTagIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => { onTagToggle(t.id, active); setShowTagPicker(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.couleur }} />
                        <span className="flex-1 text-left">{t.nom}</span>
                        {active && <Check className="w-3 h-3 text-[var(--primary)]" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Share button — only for own private notes */}
          {note && isOwner && (visibilite === 'prive' || note.visibilite === 'partage') && (
            <div className="relative">
              <button
                onClick={() => { setShowSharePanel(v => !v); setShowTagPicker(false) }}
                title="Partager avec des collaborateurs"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors',
                  showSharePanel || note.visibilite === 'partage'
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]',
                )}
              >
                {note.visibilite === 'partage' ? <UserCheck className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {note.visibilite === 'partage' ? 'Partagée' : 'Partager'}
              </button>
              {showSharePanel && (
                <div className="absolute top-full right-0 mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-56 py-1.5">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-3 py-1.5">
                    Partager avec
                  </p>
                  {colleagues.filter(c => c.id !== user?.id).map(c => {
                    const selected = selectedShareIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleShareUser(c.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                          selected ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'text-[var(--text)] hover:bg-[var(--bg-muted)]',
                        )}
                      >
                        <Avatar name={`${c.prenom} ${c.nom}`} size="xs" />
                        <span className="flex-1 text-left truncate">{c.prenom} {c.nom}</span>
                        {selected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    )
                  })}
                  <div className="px-3 pt-2 pb-1.5 border-t border-[var(--border)] mt-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => { onShare(selectedShareIds); setShowSharePanel(false) }}
                    >
                      {selectedShareIds.length === 0 ? 'Arrêter le partage' : `Partager (${selectedShareIds.length})`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={handleExport} title="Exporter en TXT"
            className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <Download className="w-4 h-4" />
          </button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={handleSave}>
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Enregistré' : 'Enregistrer'}
            </Button>
          )}
        </div>
      </div>

      {/* Active tags bar */}
      {note && note.tags.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-wrap">
          {note.tags.map(t => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer hover:opacity-75 transition-opacity"
              style={{ backgroundColor: t.couleur + '25', color: t.couleur, border: `1px solid ${t.couleur}40` }}
              onClick={() => canEdit && onTagToggle(t.id, true)}
              title="Retirer ce tag"
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: t.couleur }} />
              {t.nom}
              {canEdit && <X className="w-2.5 h-2.5 ml-0.5" />}
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {canEdit && <TipTapToolbar editor={editor} onInsertImage={handleInsertImage} />}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="tiptap-editor h-full" />
      </div>
    </div>
  )
}

export function Notes() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [activeNote, setActiveNote] = useState<Note | null | 'new'>(null as never)
  const [tagDialog, setTagDialog] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get<Note[]>('/notes'),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagType[]>('/tags'),
  })

  const create = useMutation({
    mutationFn: (payload: { titre: string; contenu: string; visibilite: Note['visibilite'] }) =>
      api.post<Note>('/notes', payload),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setActiveNote(note)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; titre: string; contenu: string; visibilite: Note['visibilite'] }) =>
      api.patch(`/notes/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setActiveNote(null as never)
    },
  })

  const createTag = useMutation({
    mutationFn: (payload: { nom: string; couleur: string }) => api.post('/tags', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setTagDialog(false); setNewTagName('') },
  })

  const addTag = useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: number; tagId: number }) =>
      api.post<Note>(`/notes/${noteId}/tags/${tagId}`),
    onSuccess: (updatedNote) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setActiveNote(updatedNote)
    },
  })

  const removeTag = useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: number; tagId: number }) =>
      api.delete<Note>(`/notes/${noteId}/tags/${tagId}`),
    onSuccess: (updatedNote) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setActiveNote(updatedNote)
    },
  })

  const shareNote = useMutation({
    mutationFn: ({ noteId, userIds }: { noteId: number; userIds: number[] }) =>
      api.post<Note>(`/notes/${noteId}/share`, { userIds }),
    onSuccess: (updatedNote) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setActiveNote(updatedNote)
    },
  })

  const handleSave = useCallback((data: { titre: string; contenu: string; visibilite: Note['visibilite'] }) => {
    if (activeNote === 'new' as never || activeNote === null) {
      create.mutate(data)
    } else {
      update.mutate({ id: (activeNote as Note).id, ...data })
    }
  }, [activeNote, create, update])

  const handleTagToggle = useCallback((tagId: number, isActive: boolean) => {
    const note = activeNote as Note
    if (!note?.id) return
    if (isActive) {
      removeTag.mutate({ noteId: note.id, tagId })
    } else {
      addTag.mutate({ noteId: note.id, tagId })
    }
  }, [activeNote, addTag, removeTag])

  const handleShare = useCallback((userIds: number[]) => {
    const note = activeNote as Note
    if (!note?.id) return
    shareNote.mutate({ noteId: note.id, userIds })
  }, [activeNote, shareNote])

  const filtered = notes.filter(n => {
    const matchSearch = n.titre.toLowerCase().includes(search.toLowerCase())
    const matchVis = visibility === 'all' || n.visibilite === visibility
    return matchSearch && matchVis
  })

  if (activeNote !== null) {
    return (
      <div className="h-full flex flex-col -m-6">
        <NoteEditor
          note={activeNote === 'new' as never ? null : activeNote as Note}
          allTags={tags}
          onClose={() => setActiveNote(null as never)}
          onSave={handleSave}
          onTagToggle={handleTagToggle}
          onShare={handleShare}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 max-w-sm">
          <Input
            placeholder="Rechercher une note…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
        <div className="flex items-center border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
          {(['all', 'equipe', 'prive'] as const).map(v => (
            <button key={v} onClick={() => setVisibility(v)}
              className={cn('px-3 h-9 text-xs font-medium transition-colors flex items-center gap-1.5',
                visibility === v ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]')}>
              {v === 'equipe' && <Users className="w-3 h-3" />}
              {v === 'prive' && <Lock className="w-3 h-3" />}
              {v === 'all' ? 'Toutes' : v === 'equipe' ? 'Équipe' : 'Privées'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTagDialog(v => !v)}>
            <Tag className="w-3.5 h-3.5" />
            Tags
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveNote('new' as never)}>
            <Plus className="w-3.5 h-3.5" />
            Nouvelle note
          </Button>
        </div>
      </div>

      {/* Tags manager */}
      {tagDialog && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] border border-[var(--border)]">
          <div className="flex flex-wrap gap-2 flex-1">
            {tags.map(t => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: t.couleur + '20', color: t.couleur, border: `1px solid ${t.couleur}40` }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: t.couleur }} />
                {t.nom}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={newTagColor} onChange={e => setNewTagColor(e.target.value)} type="color"
              className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer" />
            <Input placeholder="Nom du tag" value={newTagName} onChange={e => setNewTagName(e.target.value)} />
            <Button variant="primary" size="sm" onClick={() => createTag.mutate({ nom: newTagName, couleur: newTagColor })}
              loading={createTag.isPending}>Créer</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <Empty
          icon={<FileText className="w-10 h-10" />}
          title="Aucune note"
          description="Créez votre première note pour partager des informations avec l'équipe."
          action={<Button variant="primary" size="sm" onClick={() => setActiveNote('new' as never)}><Plus className="w-3.5 h-3.5" />Nouvelle note</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(note => {
            const canEdit = note.auteurId === user?.id || user?.roles.includes('ROLE_ADMIN')
            return (
              <div
                key={note.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all duration-150 group"
                onClick={() => setActiveNote(note)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={note.visibilite === 'prive' ? 'default' : note.visibilite === 'partage' ? 'warning' : 'primary'}>
                    {note.visibilite === 'prive' && <Lock className="w-2.5 h-2.5 mr-1 inline" />}
                    {note.visibilite === 'equipe' && <Users className="w-2.5 h-2.5 mr-1 inline" />}
                    {note.visibilite === 'partage' && <Share2 className="w-2.5 h-2.5 mr-1 inline" />}
                    {note.visibilite === 'prive' ? 'Privée' : note.visibilite === 'equipe' ? 'Équipe' : 'Partagée'}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!canEdit && <EyeOff className="w-3 h-3 text-[var(--text-muted)]" title="Lecture seule" />}
                    {canEdit && (
                      <button onClick={e => { e.stopPropagation(); remove.mutate(note.id) }}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-2 leading-snug">{note.titre}</h3>
                <div
                  className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(truncate(note.contenu, 200)) }}
                />
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: t.couleur + '20', color: t.couleur }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: t.couleur }} />
                        {t.nom}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={note.auteurNom} size="xs" />
                    <p className="text-[10px] text-[var(--text-muted)]">{note.auteurNom}</p>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">{formatDate(note.updatedAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
