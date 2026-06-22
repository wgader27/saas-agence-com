import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2, Bot, User, Maximize2, Minimize2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function MarkdownText({ text }: { text: string }) {
  // Simple inline markdown rendering
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <p key={i} className="font-bold text-sm">{line.slice(2)}</p>
        if (line.startsWith('## ')) return <p key={i} className="font-semibold text-sm">{line.slice(3)}</p>
        if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-xs flex gap-1.5"><span>•</span><span>{line.slice(2)}</span></p>
        if (line.startsWith('```')) return null
        if (!line.trim()) return <div key={i} className="h-1" />
        // Bold and code inline
        const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
        return (
          <p key={i} className="text-xs leading-relaxed">
            {parts.map((part, j) => {
              if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={j} className="bg-[var(--bg-muted)] px-1 py-0.5 rounded font-mono text-[11px]">{part.slice(1, -1)}</code>
              }
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>
              }
              return part
            })}
          </p>
        )
      })}
    </div>
  )
}

export function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const data = await api.post<{ content: string }>('/ai/ask', {
        message: text,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Désolé, une erreur est survenue. Vérifiez que la clé API Gemini est configurée dans le `.env`.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-[var(--shadow-lg)] flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
            : 'bg-[var(--primary)] text-white hover:scale-105',
        )}
        title="Assistant IA"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div className={cn(
          'fixed z-40 bottom-20 right-6 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] flex flex-col overflow-hidden transition-all duration-200',
          expanded ? 'w-[560px] h-[640px]' : 'w-[380px] h-[520px]',
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Assistant IA</p>
                <p className="text-[10px] text-[var(--text-muted)]">Gemini · Données en temps réel</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} title="Effacer la conversation"
                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Réduire' : 'Agrandir'}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors">
                {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!messages.length && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-[var(--text)] mb-1">Assistant Encore Design</p>
                <p className="text-xs text-[var(--text-muted)]">Je connais vos clients, accès et notes. Posez-moi n'importe quelle question.</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Donne-moi le numéro de téléphone du client Elitegroup',
                    'Quels sont les accès hébergement disponibles ?',
                    'Résume les dernières notes d\'équipe',
                  ].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="w-full text-left text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  msg.role === 'user' ? 'bg-[var(--primary)]' : 'bg-gradient-to-br from-[var(--primary)] to-[#6D28D9]')}>
                  {msg.role === 'user'
                    ? <User className="w-3 h-3 text-white" />
                    : <Bot className="w-3 h-3 text-white" />}
                </div>
                <div className={cn('max-w-[85%] px-3 py-2 rounded-[var(--radius-lg)] text-xs',
                  msg.role === 'user'
                    ? 'bg-[var(--primary)] text-white rounded-tr-sm'
                    : 'bg-[var(--bg-subtle)] border border-[var(--border)] rounded-tl-sm')}>
                  {msg.role === 'assistant'
                    ? <MarkdownText text={msg.content} />
                    : <p className="text-xs leading-relaxed">{msg.content}</p>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="px-3 py-2 rounded-[var(--radius-lg)] rounded-tl-sm bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[var(--border)] shrink-0">
            <div className="flex items-end gap-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2 focus-within:border-[var(--primary)] transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message… (Entrée pour envoyer)"
                rows={1}
                className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none resize-none max-h-24 leading-relaxed"
                style={{ height: 'auto' }}
                onInput={e => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 96)}px`
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">Shift+Entrée pour une nouvelle ligne</p>
          </div>
        </div>
      )}
    </>
  )
}
