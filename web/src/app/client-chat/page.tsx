"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = { role: 'user' | 'assistant'; content: string }

export default function ClientChatEmbed() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const apiBase = params.get('api') || process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const token = params.get('t') || (typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') || '' : '')
  const projectId = params.get('projectId') // For continuing from draft
  const assignClientId = params.get('clientId') // When used by advisor to create for a client
  const nodeId = params.get('nodeId') // For linking back to roadmap node
  const mode = (params.get('mode') as 'project'|'idea'|null) || 'project'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [draftProjectId, setDraftProjectId] = useState<string | null>(projectId)
  const [draftSaved, setDraftSaved] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const [maxDetail, setMaxDetail] = useState<boolean>(true)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Save draft after first AI response
  useEffect(() => {
    const saveDraft = async () => {
      if (messages.length >= 2 && messages[0].role === 'assistant' && messages[1].role === 'user' && !draftSaved) {
        // Extract potential title from first user message or use default
        const userMessage = messages[1].content;
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
        
        try {
          if (draftProjectId) {
            // Update existing draft
            await fetch(`${apiBase}/projects/${draftProjectId}/draft`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                title: `Draft: ${title}`,
                conversation_history: messages,
                ...(assignClientId ? { clientId: Number(assignClientId) } : {})
              })
            });
          } else {
            // Create new draft
            const response = await fetch(`${apiBase}/projects/draft`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                title: `Draft: ${title}`,
                conversation_history: messages,
                ...(assignClientId ? { clientId: Number(assignClientId) } : {})
              })
            });
            const data = await response.json();
            if (data.ok) {
              setDraftProjectId(data.projectId);
              setDraftSaved(true);
            }
          }
        } catch (error) {
          console.error('Error saving draft:', error);
        }
      }
    };
    
    saveDraft();
  }, [messages, apiBase, token, draftProjectId, draftSaved])

  // Auto-save draft on new messages
  useEffect(() => {
    const autoSave = async () => {
      if (draftProjectId && messages.length > 2) {
        try {
          const userMessage = messages.find(m => m.role === 'user')?.content || 'Draft Project';
          const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
          
          await fetch(`${apiBase}/projects/${draftProjectId}/draft`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              title: `Draft: ${title}`,
              conversation_history: messages,
              ...(assignClientId ? { clientId: Number(assignClientId) } : {})
            })
          });
        } catch (error) {
          console.error('Error auto-saving draft:', error);
        }
      }
    };
    
    autoSave();
  }, [messages, draftProjectId, apiBase, token])

  const processStream = async (response: Response, isInitial: boolean = false) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let assistantMessage = ''

    // Add empty assistant message to start streaming
    if (isInitial) {
      setMessages([{ role: 'assistant', content: '' }])
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    }

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                assistantMessage += data.content
                // Update the message
                if (isInitial) {
                  setMessages([{ role: 'assistant', content: assistantMessage }])
                } else {
                  setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage
                    }
                    return newMessages
                  })
                }
              }
              if (data.error) {
                console.error('Stream error:', data.error)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }
  }

  const start = useCallback(async () => {
    setLoading(true)
    try {
      // If we have a projectId, load the draft first
      if (projectId && mode !== 'idea') {
        const draftResponse = await fetch(`${apiBase}/projects/${projectId}/draft`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        
        if (draftResponse.ok) {
          const draftData = await draftResponse.json();
          if (draftData.ok && draftData.project?.conversation_history) {
            setMessages(draftData.project.conversation_history);
            setDraftProjectId(projectId);  // Set the draft project ID
            setDraftSaved(true);
            setLoading(false);
            return;
          }
        }
      }
      
      // Otherwise start fresh
      const r = await fetch(`${apiBase}/agent-ideator/chat?maxDetail=${maxDetail ? '1':'0'}`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify({ message: '', conversation_history: [] }) 
      })
      
      if (r.headers.get('content-type')?.includes('text/event-stream')) {
        await processStream(r, true)
      } else {
        const data = await r.json()
        if (data.response) setMessages([{ role: 'assistant', content: data.response }])
      }
    } finally { 
      setLoading(false) 
    }
  }, [apiBase, token, projectId, maxDetail])

  useEffect(() => { start() }, [start])

  const send = useCallback(async () => {
    if (!input.trim() || loading) return
    const user: Message = { role: 'user', content: input }
    const currentMessages = [...messages, user]
    setMessages(currentMessages)
    setInput("")
    setLoading(true)
    
    try {
      const r = await fetch(`${apiBase}/agent-ideator/chat?maxDetail=${maxDetail ? '1':'0'}`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify({ 
          message: user.content, 
          conversation_history: messages 
        }) 
      })
      
      if (r.headers.get('content-type')?.includes('text/event-stream')) {
        await processStream(r)
      } else {
        const data = await r.json()
        if (data.response) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        }
        if (data.complete && data.specification) {
          // Save the specification
          const ideaResponse = await fetch(`${apiBase}/agent-ideas`, { 
            method: 'POST', 
            headers: { 
              'Content-Type': 'application/json', 
              ...(token ? { Authorization: `Bearer ${token}` } : {}) 
            }, 
            body: JSON.stringify({
              title: data.specification.title,
              summary: data.specification.summary,
              steps: data.specification.steps,
              agent_stack: data.specification.agent_stack,
              client_requirements: data.specification.client_requirements,
              implementation_estimate: data.specification.implementation_estimate,
              security_considerations: data.specification.security_considerations,
              future_enhancements: data.specification.future_enhancements,
              build_phases: data.specification.build_phases,
              projectId: mode === 'project' ? draftProjectId : null, // no draft linkage for idea-only
              assignClientId: assignClientId ? Number(assignClientId) : undefined,
              nodeId: nodeId ? Number(nodeId) : undefined,
              mode
            }) 
          })
          
          const ideaData = await ideaResponse.json()
          console.log('Agent idea saved:', ideaData)
          
          // Show completion message
          setTimeout(() => {
            if (mode === 'idea') {
              alert('Idea saved successfully!')
              window.parent.location.href = assignClientId ? '/advisor' : '/dashboard'
            } else {
              if (nodeId) {
                alert('Project created and linked to your roadmap!')
                window.parent.location.href = '/roadmap'
              } else {
                alert('Project scope created successfully!')
                window.parent.location.href = assignClientId ? '/advisor' : '/projects'
              }
            }
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally { 
      setLoading(false) 
    }
  }, [apiBase, token, input, loading, messages, draftProjectId, maxDetail])

  return (
    <div className="grid grid-rows-[1fr_auto] h-full">
      <div className="overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[75%] rounded-md px-4 py-3 ${m.role==='user' ? 'bg-[var(--color-primary-50)] text-[var(--color-text)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
              {m.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="mb-1">{children}</li>,
                      h1: ({children}) => <h1 className="text-xl font-semibold mb-3 mt-4">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-semibold mb-2 mt-2">{children}</h3>,
                      strong: ({children}) => <strong className="font-semibold text-[var(--color-text)]">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                      code: ({children}) => <code className="bg-[var(--color-surface-alt)] px-1 py-0.5 rounded text-sm">{children}</code>,
                      pre: ({children}) => <pre className="bg-[var(--color-surface-alt)] p-3 rounded mb-3 overflow-x-auto">{children}</pre>,
                      blockquote: ({children}) => <blockquote className="border-l-3 border-[var(--color-border)] pl-3 my-3 italic">{children}</blockquote>,
                      hr: () => <hr className="my-4 border-[var(--color-border)]" />
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="inline-block rounded-md px-3 py-2 bg-[var(--color-surface-alt)]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                  <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                  <span className="inline-block w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-3 border-t border-[var(--color-border)] p-3">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input type="checkbox" checked={maxDetail} onChange={e=>setMaxDetail(e.target.checked)} />
          Max detail
        </label>
        <input className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2" placeholder="Type a message…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }} disabled={loading} />
        <button className="btn-primary" onClick={send} disabled={loading || !input.trim()}>{loading ? 'Sending…' : 'Send'}</button>
      </div>
    </div>
  )
}


