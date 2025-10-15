"use client"
import { useEffect, useMemo, useState } from "react"

 type Message = {
  id: number
  project_id: number
  user_id: number | null
  content: string
  created_at: string
  project_name: string
  client_id: number
  client_name: string
  author_name: string | null
  author_role: string | null
}

export default function AdvisorCommunicationsPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined

  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<{ projectId: string; clientId: string; search: string }>({ projectId: '', clientId: '', search: '' })
  const [replyForProject, setReplyForProject] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${api}/advisor/messages`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then(r=>r.json())
      if (r.ok) setMessages(r.messages)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchMessages() }, [])

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (filter.projectId && String(m.project_id) !== filter.projectId) return false
      if (filter.clientId && String(m.client_id) !== filter.clientId) return false
      if (filter.search && !m.content.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
  }, [messages, filter])

  const groupedByProject = useMemo(() => {
    const map = new Map<number, { projectName: string; clientName: string; items: Message[] }>()
    for (const m of filtered) {
      if (!map.has(m.project_id)) map.set(m.project_id, { projectName: m.project_name, clientName: m.client_name, items: [] })
      map.get(m.project_id)!.items.push(m)
    }
    return Array.from(map.entries()).map(([projectId, v]) => ({ projectId, ...v }))
  }, [filtered])

  const sendReply = async (projectId: number) => {
    const content = (replyForProject[projectId] || '').trim()
    if (!content) return
    try {
      await fetch(`${api}/advisor/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ projectId, content }) }).then(r=>r.json())
      setReplyForProject(prev => ({ ...prev, [projectId]: '' }))
      await fetchMessages()
    } catch {}
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Communications</h1>
        <p className="text-[var(--color-text-muted)]">All messages across your clients and projects.</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Filter by Project ID" value={filter.projectId} onChange={e=>setFilter(prev=>({...prev, projectId: e.target.value}))} />
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Filter by Client ID" value={filter.clientId} onChange={e=>setFilter(prev=>({...prev, clientId: e.target.value}))} />
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
                  <div className="text-xs text-[var(--color-text-muted)]">Client: {group.clientName}</div>
                </div>
                <a href={`/advisor/projects/${group.projectId}`} className="text-sm text-[var(--color-primary)] underline">Open Project</a>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--color-border)] p-3 bg-[var(--color-surface-alt)]">
                <ul className="space-y-3">
                  {group.items.map(m => {
                    const isAdvisor = (m.author_role || '').toLowerCase() === 'advisor'
                    return (
                      <li key={m.id} className={`max-w-[75%] rounded-md p-3 text-sm shadow-sm ${isAdvisor ? 'ml-auto bg-[var(--color-primary-50)]' : 'mr-auto bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-[var(--color-text)]">{m.author_name || 'System'} <span className="text-xs text-[var(--color-text-muted)]">· {m.author_role || 'unknown'}</span></div>
                          <div className="text-xs text-[var(--color-text-muted)]">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                        <div className="mt-1 text-[var(--color-text)]">{m.content}</div>
                      </li>
                    )
                  })}
                </ul>
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
