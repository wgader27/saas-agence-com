import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, User, Send, Plus, Trash2, MessageSquare,
  Loader2, Sparkles, ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'ia_conversations'

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function titleFromMessage(msg: string): string {
  return msg.slice(0, 48) + (msg.length > 48 ? '…' : '')
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <p key={i} className="font-semibold text-sm mt-2">{line.slice(4)}</p>
        if (line.startsWith('## '))  return <p key={i} className="font-bold text-sm mt-2">{line.slice(3)}</p>
        if (line.startsWith('# '))   return <p key={i} className="font-bold text-base mt-2">{line.slice(2)}</p>
        if (line.startsWith('```')) return null
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <p key={i} className="text-sm flex gap-2">
              <span className="text-[var(--primary)] shrink-0 mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </p>
          )
        }
        if (!line.trim()) return <div key={i} className="h-1" />
        const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((part, j) => {
              if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={j} className="bg-[var(--bg-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[12px] font-mono">{part.slice(1, -1)}</code>
              }
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
              }
              return part
            })}
          </p>
        )
      })}
    </div>
  )
}

const SUGGESTIONS = [
  'Explique-moi les variables CSS custom properties',
  'Comment optimiser les Core Web Vitals d\'un site WordPress ?',
  'Rédige un email de suivi de projet client',
  'Quelles sont les bonnes pratiques de sécurité web en 2026 ?',
  'Génère une palette de couleurs moderne pour une agence créative',
]

export function Ia() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeId, setActiveId] = useState<string | null>(() => {
    const convs = loadConversations()
    return convs.length > 0 ? convs[0].id : null
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find(c => c.id === activeId) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages, loading])

  const persist = useCallback((convs: Conversation[]) => {
    setConversations(convs)
    saveConversations(convs)
  }, [])

  function newConversation() {
    const conv: Conversation = {
      id: genId(),
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [conv, ...conversations]
    persist(updated)
    setActiveId(conv.id)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function deleteConversation(id: string) {
    const updated = conversations.filter(c => c.id !== id)
    persist(updated)
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null)
    }
  }

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || loading) return

    let conv = activeConv
    let updatedConvs = conversations

    // Create new conversation if none active
    if (!conv) {
      conv = {
        id: genId(),
        title: titleFromMessage(message),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updatedConvs = [conv, ...conversations]
    }

    const newMessages: Message[] = [...conv.messages, { role: 'user', content: message }]
    const updatedConv: Conversation = {
      ...conv,
      title: conv.messages.length === 0 ? titleFromMessage(message) : conv.title,
      messages: newMessages,
      updatedAt: new Date().toISOString(),
    }

    updatedConvs = updatedConvs.map(c => c.id === updatedConv.id ? updatedConv : c)
    if (!conversations.find(c => c.id === updatedConv.id)) {
      updatedConvs = [updatedConv, ...conversations]
    }

    persist(updatedConvs)
    setActiveId(updatedConv.id)
    setInput('')
    setLoading(true)

    try {
      const data = await api.post<{ content: string }>('/ai/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      })

      const withReply: Message[] = [...newMessages, { role: 'assistant', content: data.content }]
      const finalConv: Conversation = { ...updatedConv, messages: withReply, updatedAt: new Date().toISOString() }
      const finalConvs = updatedConvs.map(c => c.id === finalConv.id ? finalConv : c)
      persist(finalConvs)
    } catch {
      const withErr: Message[] = [...newMessages, {
        role: 'assistant',
        content: '⚠️ Erreur de connexion. Vérifiez que la clé API Gemini est configurée dans `.env`.',
      }]
      const errConv: Conversation = { ...updatedConv, messages: withErr, updatedAt: new Date().toISOString() }
      persist(updatedConvs.map(c => c.id === errConv.id ? errConv : c))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return 'À l\'instant'
    if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex h-[calc(100vh-120px)] -m-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      {/* ── Sidebar conversations ── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-[var(--text)]">Assistant IA</span>
          </div>
          <button
            onClick={newConversation}
            title="Nouvelle conversation"
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
              <p className="text-xs text-[var(--text-muted)]">Aucune conversation</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  'group flex items-center gap-2 mx-2 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer transition-colors mb-0.5',
                  activeId === conv.id
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                    : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]',
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate leading-tight',
                    activeId === conv.id ? 'text-[var(--primary)]' : 'text-[var(--text)]',
                  )}>
                    {conv.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''} · {formatDate(conv.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Propulsé par <span className="font-medium text-[var(--text-secondary)]">Gemini</span>
          </p>
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {activeConv ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {activeConv.messages.length === 0 && (
                <EmptyState onSuggest={s => { setInput(s); inputRef.current?.focus() }} />
              )}

              {activeConv.messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    msg.role === 'user'
                      ? 'bg-[var(--primary)]'
                      : 'bg-gradient-to-br from-[var(--primary)] to-[#6D28D9]',
                  )}>
                    {msg.role === 'user'
                      ? <User className="w-4 h-4 text-white" />
                      : <Bot className="w-4 h-4 text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={cn(
                    'max-w-[72%] px-4 py-3 rounded-2xl',
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-white rounded-tr-sm'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border)] rounded-tl-sm',
                  )}>
                    {msg.role === 'assistant'
                      ? <MarkdownText text={msg.content} />
                      : <p className="text-sm leading-relaxed">{msg.content}</p>}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
                    <span className="text-sm text-[var(--text-muted)]">En train de réfléchir…</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-[var(--border)] px-6 py-4 bg-[var(--surface)]">
              {/* Suggestions if empty */}
              {activeConv.messages.length === 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                  {SUGGESTIONS.slice(0, 3).map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="shrink-0 px-3 py-1.5 text-xs rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-colors"
                    >
                      {s.length > 40 ? s.slice(0, 40) + '…' : s}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl px-4 py-3 focus-within:border-[var(--primary)] transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Envoyez un message…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none resize-none max-h-36 leading-relaxed"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const t = e.currentTarget
                    t.style.height = 'auto'
                    t.style.height = `${Math.min(t.scrollHeight, 144)}px`
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                Shift+Entrée pour une nouvelle ligne · Les conversations sont sauvegardées localement
              </p>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <EmptyState onSuggest={s => { send(s) }} startNew={newConversation} />
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onSuggest, startNew }: { onSuggest: (s: string) => void; startNew?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-8 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center mb-4 shadow-lg">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Comment puis-je vous aider ?</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Posez vos questions sur les clients, la technique, la rédaction ou demandez une aide créative.
      </p>

      <div className="w-full space-y-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--border)] text-left text-sm text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-all group"
          >
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
            {s}
          </button>
        ))}
      </div>

      {startNew && (
        <button
          onClick={startNew}
          className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle conversation
        </button>
      )}
    </div>
  )
}
