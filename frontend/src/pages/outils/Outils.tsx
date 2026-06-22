import { useState } from 'react'
import {
  Plus, Search, ExternalLink, Link2, Palette, Image, QrCode, Type,
  Contrast, Ratio, Trash2, Pencil, X, Hash, Code2, FileJson, Zap,
  Globe, Wrench, LayoutGrid,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Bookmark as BookmarkType } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'

/* ── Outils intégrés ─────────────────────────────────────── */

const TOOLS = [
  { id: 'contrast', icon: Contrast, label: 'Contrast Checker', description: 'Vérifier le ratio WCAG', category: 'Accessibilité' },
  { id: 'qrcode', icon: QrCode, label: 'QR Code', description: 'Générer un QR code depuis une URL', category: 'Utilitaires' },
  { id: 'ratio', icon: Ratio, label: 'Aspect Ratio', description: 'Calculer les dimensions proportionnelles', category: 'Utilitaires' },
  { id: 'palette', icon: Palette, label: 'Palette', description: 'Picker de couleurs avancé', category: 'Design' },
  { id: 'cssunits', icon: Type, label: 'CSS Units', description: 'Convertir px → rem → em', category: 'Dev' },
  { id: 'base64', icon: FileJson, label: 'Base64', description: 'Encoder / décoder en Base64', category: 'Dev' },
  { id: 'hash', icon: Hash, label: 'Hash générateur', description: 'Générer des hashes SHA / MD5', category: 'Dev' },
  { id: 'regex', icon: Code2, label: 'Regex tester', description: 'Tester des expressions régulières', category: 'Dev' },
  { id: 'favicon', icon: Image, label: 'Favicon URL', description: 'Récupérer le favicon d\'un site', category: 'Assets' },
  { id: 'password', icon: Zap, label: 'Password Gen', description: 'Générer un mot de passe sécurisé', category: 'Sécurité' },
]

function QrTool() {
  const [url, setUrl] = useState('')
  const qrUrl = url ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200&margin=10` : null
  return (
    <div className="space-y-4">
      <Input label="URL" placeholder="https://exemple.fr" value={url} onChange={e => setUrl(e.target.value)} />
      {qrUrl && (
        <div className="flex flex-col items-center gap-3">
          <img src={qrUrl} alt="QR Code" className="w-40 h-40 border border-[var(--border)] rounded-[var(--radius-md)]" />
          <a href={qrUrl} download="qrcode.png"><Button variant="outline" size="sm">Télécharger</Button></a>
        </div>
      )}
    </div>
  )
}

function ContrastTool() {
  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#FFFFFF')

  function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  }
  function luminance([r, g, b]: number[]) { return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const [lA, lB] = [luminance(hexToRgb(fg)), luminance(hexToRgb(bg))]
  const [light, dark] = lA > lB ? [lA, lB] : [lB, lA]
  const r = parseFloat(((light + 0.05) / (dark + 0.05)).toFixed(2))
  const level = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Échec'
  const levelColor = r >= 4.5 ? 'var(--success)' : r >= 3 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Texte</label>
          <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer" />
          <p className="text-xs font-mono text-[var(--text-muted)]">{fg}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Fond</label>
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer" />
          <p className="text-xs font-mono text-[var(--text-muted)]">{bg}</p>
        </div>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 flex items-center justify-between" style={{ backgroundColor: bg, color: fg }}>
        <p className="text-sm font-medium">Aperçu du texte</p>
        <p className="text-xs">Aa Bb Cc 123</p>
      </div>
      <div className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)]">
        <p className="text-sm text-[var(--text)]">Ratio : <strong>{r}:1</strong></p>
        <span className="text-sm font-semibold" style={{ color: levelColor }}>{level}</span>
      </div>
    </div>
  )
}

function RatioTool() {
  const [w, setW] = useState('1920')
  const [h, setH] = useState('1080')
  const [newW, setNewW] = useState('1280')
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a
  const g = gcd(+w, +h)
  const ratioStr = `${+w / g}:${+h / g}`
  const newH = Math.round((+newW * +h) / +w)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Largeur (px)" type="number" value={w} onChange={e => setW(e.target.value)} />
        <Input label="Hauteur (px)" type="number" value={h} onChange={e => setH(e.target.value)} />
      </div>
      <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-center">
        <p className="text-[var(--primary)] font-mono text-xl font-bold">{ratioStr}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Ratio d'aspect</p>
      </div>
      <div className="border-t border-[var(--border)] pt-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Calculer proportionnellement</p>
        <div className="flex items-end gap-3">
          <Input label="Nouvelle largeur" type="number" value={newW} onChange={e => setNewW(e.target.value)} />
          <div className="pb-0.5">
            <p className="text-xs text-[var(--text-muted)] mb-1.5">Hauteur calculée</p>
            <div className="h-9 px-3 flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-sm">{newH}px</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CssUnitsTool() {
  const [px, setPx] = useState('16')
  const [base, setBase] = useState('16')
  const rem = (+px / +base).toFixed(4)
  const em = (+px / +base).toFixed(4)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Valeur (px)" type="number" value={px} onChange={e => setPx(e.target.value)} />
        <Input label="Base (font-size root)" type="number" value={base} onChange={e => setBase(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] text-center">
          <p className="font-mono text-lg font-bold text-[var(--primary)]">{rem}rem</p>
          <p className="text-xs text-[var(--text-muted)]">REM</p>
        </div>
        <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] text-center">
          <p className="font-mono text-lg font-bold text-[var(--primary)]">{em}em</p>
          <p className="text-xs text-[var(--text-muted)]">EM</p>
        </div>
      </div>
    </div>
  )
}

function Base64Tool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  let output = ''
  try {
    output = mode === 'encode' ? btoa(input) : atob(input)
  } catch { output = 'Erreur de décodage' }
  return (
    <div className="space-y-3">
      <div className="flex border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden w-fit">
        {(['encode', 'decode'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
              mode === m ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]')}>
            {m === 'encode' ? 'Encoder' : 'Décoder'}
          </button>
        ))}
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)}
        placeholder={mode === 'encode' ? 'Texte à encoder…' : 'Base64 à décoder…'}
        rows={3}
        className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-sm font-mono text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none" />
      {output && (
        <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] border border-[var(--border)] font-mono text-xs text-[var(--text-secondary)] break-all">{output}</div>
      )}
    </div>
  )
}

function PasswordTool() {
  const [length, setLength] = useState(20)
  const [useSymbols, setUseSymbols] = useState(true)
  const [pwd, setPwd] = useState('')
  const gen = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + (useSymbols ? '!@#$%^&*()-_=+[]{}|;:,.<>?' : '')
    setPwd(Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input label="Longueur" type="number" value={String(length)} onChange={e => setLength(+e.target.value)} />
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-5 cursor-pointer">
          <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="rounded" />
          Symboles
        </label>
      </div>
      <Button variant="primary" size="sm" onClick={gen}>Générer</Button>
      {pwd && (
        <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] border border-[var(--border)] font-mono text-sm text-[var(--text)] break-all select-all">{pwd}</div>
      )}
    </div>
  )
}

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  qrcode: QrTool,
  contrast: ContrastTool,
  ratio: RatioTool,
  cssunits: CssUnitsTool,
  base64: Base64Tool,
  password: PasswordTool,
}

/* ── Raccourcis CoreControl-style ────────────────────────── */

type BmForm = { nom: string; url: string; categorie: string; description: string; faviconUrl: string }
const EMPTY_BM: BmForm = { nom: '', url: '', categorie: '', description: '', faviconUrl: '' }

/* ── BookmarkForm (must live OUTSIDE Outils to avoid remount on re-render) ── */
function BookmarkForm({
  form, setForm, categories, editBm, onSubmit, loading, onCancel,
}: {
  form: BmForm
  setForm: React.Dispatch<React.SetStateAction<BmForm>>
  categories: string[]
  editBm: BookmarkType | null
  onSubmit: (f: BmForm) => void
  loading: boolean
  onCancel: () => void
}) {
  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      <Input label="Nom *" placeholder="Ex: Figma" value={form.nom}
        onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
      <Input label="URL *" placeholder="https://…" value={form.url}
        onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
      <Input label="Catégorie" placeholder="Design, Dev, Inspi…" value={form.categorie}
        onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} />
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button key={cat} type="button"
              onClick={() => setForm(f => ({ ...f, categorie: cat }))}
              className={cn('px-2 py-1 rounded-full text-xs transition-colors',
                form.categorie === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text)]')}>
              {cat}
            </button>
          ))}
        </div>
      )}
      <Input label="Description (optionnel)" placeholder="Courte description…" value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Logo / Icône — URL image <span className="text-[var(--text-muted)] font-normal">(optionnel — favicon auto-détecté si vide)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://…/logo.png"
            value={form.faviconUrl}
            onChange={e => setForm(f => ({ ...f, faviconUrl: e.target.value }))}
            className="flex-1 px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          <label
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors shrink-0"
            title="Uploader une image"
          >
            <Image className="w-3.5 h-3.5" />
            <span>Uploader</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => setForm(f => ({ ...f, faviconUrl: reader.result as string }))
                reader.readAsDataURL(file)
              }}
            />
          </label>
        </div>
        {form.faviconUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img src={form.faviconUrl} alt="" className="w-8 h-8 rounded object-contain border border-[var(--border)] bg-[var(--bg-subtle)]"
              onError={e => (e.currentTarget.style.opacity = '0.3')} />
            <span className="text-[10px] text-[var(--text-muted)]">Aperçu</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, faviconUrl: '' }))}
              className="text-[10px] text-[var(--danger)] hover:underline ml-auto">Supprimer</button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {editBm ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}

function getFaviconUrl(bm: BookmarkType): string {
  if (bm.faviconUrl) return bm.faviconUrl
  if (!bm.url) return ''
  try {
    const hostname = new URL(bm.url).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
  } catch {
    return ''
  }
}

function BookmarkCard({
  bm, onEdit, onDelete,
}: { bm: BookmarkType; onEdit: (b: BookmarkType) => void; onDelete: () => void }) {
  const [imgError, setImgError] = useState(false)
  const faviconSrc = getFaviconUrl(bm)

  return (
    <div className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-4 hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-md)] transition-all duration-150">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
          {faviconSrc && !imgError ? (
            <img
              src={faviconSrc}
              alt=""
              className="w-7 h-7 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Globe className="w-5 h-5 text-[var(--text-muted)]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{bm.nom}</p>
          <a
            href={bm.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mt-0.5 group/link"
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{bm.url.replace(/^https?:\/\//, '')}</span>
          </a>
          {bm.categorie && (
            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] font-medium">
              {bm.categorie}
            </span>
          )}
        </div>
      </div>

      {bm.description && (
        <p className="mt-2.5 text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">{bm.description}</p>
      )}

      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(bm)}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)] transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */

type MainView = 'tools' | 'bookmarks'

export function Outils() {
  const qc = useQueryClient()
  const [mainView, setMainView] = useState<MainView>('tools')

  // Tools state
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [toolSearch, setToolSearch] = useState('')

  // Bookmarks state
  const [bmDialog, setBmDialog] = useState(false)
  const [editBm, setEditBm] = useState<BookmarkType | null>(null)
  const [bmForm, setBmForm] = useState<BmForm>(EMPTY_BM)
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [bmSearch, setBmSearch] = useState('')

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get<BookmarkType[]>('/bookmarks'),
  })

  const createBm = useMutation({
    mutationFn: (payload: BmForm) => api.post('/bookmarks', {
      ...payload,
      faviconUrl: payload.faviconUrl || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookmarks'] }); setBmDialog(false); setBmForm(EMPTY_BM) },
  })

  const updateBm = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & BmForm) => api.patch(`/bookmarks/${id}`, {
      ...payload,
      faviconUrl: payload.faviconUrl || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookmarks'] }); setEditBm(null) },
  })

  const deleteBm = useMutation({
    mutationFn: (id: number) => api.delete(`/bookmarks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })

  const openEdit = (bm: BookmarkType) => {
    setEditBm(bm)
    setBmForm({
      nom: bm.nom,
      url: bm.url,
      categorie: bm.categorie,
      description: (bm as unknown as { description?: string }).description ?? '',
      faviconUrl: bm.faviconUrl ?? '',
    })
  }

  const activeTool = TOOLS.find(t => t.id === activeToolId)
  const ActiveComponent = activeToolId ? TOOL_COMPONENTS[activeToolId] : null

  const filteredTools = TOOLS.filter(t =>
    t.label.toLowerCase().includes(toolSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(toolSearch.toLowerCase())
  )

  const categories = ['all', ...Array.from(new Set(bookmarks.map(b => b.categorie).filter(Boolean)))]

  const filteredBm = bookmarks.filter(b => {
    const matchCat = selectedCat === 'all' || b.categorie === selectedCat
    const matchSearch = !bmSearch || b.nom.toLowerCase().includes(bmSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const groupedBm = filteredBm.reduce<Record<string, BookmarkType[]>>((acc, bm) => {
    const cat = bm.categorie || 'Sans catégorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(bm)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* ── View switcher ── */}
      <div className="flex items-center gap-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] p-1 w-fit">
        <button
          onClick={() => setMainView('tools')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all',
            mainView === 'tools'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]',
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          Outils dev / design
        </button>
        <button
          onClick={() => setMainView('bookmarks')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all',
            mainView === 'bookmarks'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]',
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Sites & Raccourcis
        </button>
      </div>

      {/* ── Outils ── */}
      {mainView === 'tools' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Outils intégrés</h2>
            <div className="w-52">
              <Input placeholder="Rechercher…" value={toolSearch} onChange={e => setToolSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredTools.map(tool => {
              const Icon = tool.icon
              const isActive = activeToolId === tool.id
              return (
                <button key={tool.id} onClick={() => setActiveToolId(isActive ? null : tool.id)}
                  className={cn('text-left p-4 rounded-[var(--radius-lg)] border transition-all duration-150',
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--primary-subtle)] shadow-[var(--shadow-sm)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]')}>
                  <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center mb-3',
                    isActive ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]')}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className={cn('text-xs font-semibold mb-0.5 leading-snug',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--text)]')}>
                    {tool.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-snug">{tool.description}</p>
                </button>
              )
            })}
          </div>

          {activeTool && ActiveComponent && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text)]">{activeTool.label}</h3>
                <button onClick={() => setActiveToolId(null)} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ActiveComponent />
            </Card>
          )}
          {activeTool && !TOOL_COMPONENTS[activeTool.id] && (
            <Card padding="md" className="text-center py-8">
              <p className="text-xs text-[var(--text-muted)]">Cet outil sera disponible prochainement.</p>
            </Card>
          )}
        </section>
      )}

      {/* ── Sites & Raccourcis ── */}
      {mainView === 'bookmarks' && (
        <section className="space-y-5">
          {/* Top bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-48 max-w-sm">
              <Input
                placeholder="Rechercher un site…"
                value={bmSearch}
                onChange={e => setBmSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
            <div className="ml-auto">
              <Button variant="primary" size="sm" onClick={() => { setBmForm(EMPTY_BM); setBmDialog(true) }}>
                <Plus className="w-3.5 h-3.5" />
                Ajouter un site
              </Button>
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCat(cat)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    selectedCat === cat
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text)]')}>
                  {cat === 'all' ? 'Tous' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!bookmarks.length ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-7 h-7 text-[var(--text-muted)] opacity-50" />
              </div>
              <p className="text-sm font-medium text-[var(--text)] mb-1">Aucun raccourci</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">Ajoutez vos sites et outils préférés pour y accéder rapidement</p>
              <Button variant="primary" size="sm" onClick={() => { setBmForm(EMPTY_BM); setBmDialog(true) }}>
                <Plus className="w-3.5 h-3.5" />Ajouter un site
              </Button>
            </div>
          ) : filteredBm.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">Aucun résultat pour « {bmSearch} »</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBm).map(([cat, bms]) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{cat}</h3>
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-muted)] px-1.5 py-0.5 rounded-full">{bms.length}</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {bms.map(bm => (
                      <BookmarkCard
                        key={bm.id}
                        bm={bm}
                        onEdit={openEdit}
                        onDelete={() => deleteBm.mutate(bm.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create dialog */}
      <Dialog open={bmDialog} onOpenChange={v => !v && setBmDialog(false)}>
        <DialogContent title="Ajouter un site">
          <BookmarkForm
            form={bmForm}
            setForm={setBmForm}
            categories={categories.filter(c => c !== 'all')}
            editBm={null}
            onSubmit={f => createBm.mutate(f)}
            loading={createBm.isPending}
            onCancel={() => { setBmDialog(false); setBmForm(EMPTY_BM) }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editBm} onOpenChange={v => !v && setEditBm(null)}>
        <DialogContent title={`Modifier — ${editBm?.nom}`}>
          <BookmarkForm
            form={bmForm}
            setForm={setBmForm}
            categories={categories.filter(c => c !== 'all')}
            editBm={editBm}
            onSubmit={f => editBm && updateBm.mutate({ id: editBm.id, ...f })}
            loading={updateBm.isPending}
            onCancel={() => setEditBm(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
