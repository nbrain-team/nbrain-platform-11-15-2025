"use client"
import { useEffect, useMemo, useState } from "react"

type Message = {
  id: number
  project_id: number
  user_id: number | null
  content: string
  created_at: string
  project_name: string
  author_name: string | null
  author_role: string | null
}

export default function ClientCommunicationsPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined

  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<{ projectId: string; search: string }>({ projectId: '', search: '' })
  const [replyForProject, setReplyForProject] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)

  function formatProposalIfAny(content: string): { node: JSX.Element; canAccept: boolean } {
    // If content begins with PROPOSAL, split to nice grid
    const trimmed = (content || '').trim()
    if (!trimmed.toUpperCase().startsWith('PROPOSAL')) return { node: <>{content}</>, canAccept: false }
    // Extract key-value lines
    const lines = trimmed.split(/\n+/).slice(1)
    const fields: Array<{ label: string; value: string }> = []
    for (const line of lines) {
      const idx = line.indexOf(':')
      if (idx > -1) {
        const label = line.slice(0, idx).trim()
        const value = line.slice(idx + 1).trim()
        if (label && value) fields.push({ label, value })
      }
    }
    return {
      node: (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {fields.map((f, i) => (
            <div key={`${i}-${f.label}`}>
              <span className="text-[var(--color-text-muted)]">{f.label}:</span> <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      ),
      canAccept: true
    }
  }

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${api}/client/messages`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then(r=>r.json())
      if (r.ok) setMessages(r.messages)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchMessages() }, [])

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (filter.projectId && String(m.project_id) !== filter.projectId) return false
      if (filter.search && !m.content.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
  }, [messages, filter])

  const groupedByProject = useMemo(() => {
    const map = new Map<number, { projectName: string; items: Message[] }>()
    for (const m of filtered) {
      if (!map.has(m.project_id)) map.set(m.project_id, { projectName: m.project_name, items: [] })
      map.get(m.project_id)!.items.push(m)
    }
    return Array.from(map.entries()).map(([projectId, v]) => ({ projectId, ...v }))
  }, [filtered])

  const sendReply = async (projectId: number) => {
    const content = (replyForProject[projectId] || '').trim()
    if (!content) return
    try {
      await fetch(`${api}/client/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ projectId, content }) }).then(r=>r.json())
      setReplyForProject(prev => ({ ...prev, [projectId]: '' }))
      await fetchMessages()
    } catch {}
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Communications</h1>
        <p className="text-[var(--color-text-muted)]">All messages across your projects.</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Filter by Project ID" value={filter.projectId} onChange={e=>setFilter(prev=>({...prev, projectId: e.target.value}))} />
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm md:col-span-2" placeholder="Search message text" value={filter.search} onChange={e=>setFilter(prev=>({...prev, search: e.target.value}))} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)]">Loading…</div>
      ) : groupedByProject.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card text-sm text-[var(--color-text-muted)]">No messages.</div>
      ) : (
        <div className="space-y-4">
          {groupedByProject.map(group => (
            <div key={group.projectId} className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm text-[var(--color-text-muted)]">Project</div>
                  <div className="text-base font-semibold text-[var(--color-text)]">{group.projectName} (PRJ-{String(group.projectId).padStart(4,'0')})</div>
                </div>
                <a href={`/projects/${encodeURIComponent(`PRJ-${String(group.projectId).padStart(4,'0')}`)}`} className="text-sm text-[var(--color-primary)] underline">Open Project</a>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                {group.items.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No messages yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {group.items.map(m => {
                      const isAdvisor = (m.author_role || '').toLowerCase() === 'advisor'
                      const formatted = formatProposalIfAny(m.content)
                      return (
                        <li key={m.id} className={`max-w-[75%] rounded-md p-3 shadow-sm ${isAdvisor ? 'ml-auto bg-[var(--color-primary-50)]' : 'mr-auto bg-white'}`}>
                          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                            <span>{m.author_name || 'User'} ({m.author_role || 'user'})</span>
                            <span>{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-sm text-[var(--color-text)] whitespace-pre-wrap">{formatted.node}</div>
                          {formatted.canAccept && (
                            <div className="mt-3 text-right">
                              <button className="btn-primary text-xs" onClick={async()=>{
                                const r = await fetch(`${api}/client/projects/${group.projectId}/proposal/accept`, { method:'POST', headers: authHeaders }).then(r=>r.json()).catch(()=>null)
                                if (r && r.ok) { alert('Accepted! Moving to production.'); fetchMessages() }
                                else alert(r?.error || 'Failed to accept')
                              }}>Accept Proposal</button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder="Type a reply to this project…"
                  value={replyForProject[group.projectId] || ''}
                  onChange={e=>setReplyForProject(prev=>({...prev, [group.projectId]: e.target.value}))}
                />
                <button className="btn-primary text-sm" onClick={()=>sendReply(group.projectId)} disabled={!replyForProject[group.projectId]}>Send</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


