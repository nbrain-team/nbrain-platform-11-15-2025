"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

interface PublicIdeationChatProps {
  onClose: () => void
  onRequestSignup: () => void
}

export function PublicIdeationChat({ onClose, onRequestSignup }: PublicIdeationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  // Lightweight variety so follow-ups feel natural each time
  const followUps = useRef<string[]>([
    "Happy to dig deeper. Should I expand one of these ideas, brainstorm a few more directions, or set you up with a free account so we can scope a project with timelines and costs?",
    "Which idea would you like to refine first? I can add more detail, suggest fresh options, or create a free account to turn this into a scoped plan with estimates.",
    "Want me to elaborate on any section, generate new angles, or spin up a free account so we can scope a concrete project with pricing and delivery timelines?",
    "I can flesh out any idea, propose alternatives, or create a free account to move into detailed scoping with costs and schedule—what feels most helpful?",
    "Would you like to go deeper on one idea, explore a few new ones, or create a free account and turn this into a scoped project with ETA and budget?",
  ]).current

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load initial welcome message
  useEffect(() => {
    const loadWelcome = async () => {
      try {
        const res = await fetch(`${api}/public-ideator/start`)
        const data = await res.json()
        if (data.ok) {
          setMessages([{ role: 'assistant', content: data.message }])
        }
      } catch (e) {
        console.error('Failed to load welcome message:', e)
      }
    }
    loadWelcome()
  }, [api])

  const processStream = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')
    
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantMessage = ''
    let ctaAdded = false
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) {
              assistantMessage += data.chunk
              setMessages(prev => {
                const newMessages = [...prev]
                if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                  newMessages[newMessages.length - 1].content = assistantMessage
                } else {
                  newMessages.push({ role: 'assistant', content: assistantMessage })
                }
                return newMessages
              })
            }
            if (data.complete) {
              if (!ctaAdded) {
                ctaAdded = true
                const cta = '[Sign Up For a Free Account and have AI scope this idea in detail](#signup)'
                setTimeout(() => {
                  setMessages(prev => [...prev, { role: 'assistant', content: cta }])
                }, 200)
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    
    try {
      const response = await fetch(`${api}/public-ideator/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: messages
        })
      })
      
      if (!response.ok) throw new Error('Chat request failed')
      
      await processStream(response)
    } catch (e) {
      console.error('Chat error:', e)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, api])

  return (
    <>
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text)]">Hyah! AI — AI Ideation Agent</div>
          <div className="flex gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-[var(--color-text-muted)]">Online</span>
          </div>
        </div>
        
        <div className="space-y-3 bg-[var(--color-surface-alt)] p-4 overflow-y-auto" style={{ height: '420px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="mt-1 h-7 w-7 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-sm shadow ${
                msg.role === 'user' 
                  ? 'bg-[var(--color-primary)] text-white' 
                  : 'bg-white'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        li: ({children}) => <li>{children}</li>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        a: ({href, children}) => {
                          const h = String(href || '')
                          if (h === '#signup') {
                            return (
                              <a
                                href="#"
                                className="text-[var(--color-primary)] underline"
                                onClick={(e)=>{ e.preventDefault(); onClose(); setTimeout(()=> onRequestSignup(), 50) }}
                              >
                                {children}
                              </a>
                            )
                          }
                          return <a href={h} className="text-[var(--color-primary)] underline" target="_blank" rel="noopener noreferrer">{children}</a>
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 h-7 w-7 rounded-full bg-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start gap-2">
              <div className="mt-1 h-7 w-7 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
              <div className="rounded-lg bg-white p-3 shadow">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </div>
                  <span className="text-sm text-[var(--color-text-muted)]">Hyah! AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex items-center gap-2 border-t border-[var(--color-border)] bg-white p-3">
          <input 
            className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" 
            placeholder="Type your message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button 
            className="btn-primary px-4 py-2 text-sm"
            onClick={sendMessage}
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}
