"use client"
import { useEffect, useMemo, useState } from "react"

type Idea = { id: string; title: string; summary: string }
type Client = { id: number; name: string }

export default function PrebuiltProjectsPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignClientId, setAssignClientId] = useState<number | "">("")
  const [busy, setBusy] = useState(false)
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])

  useEffect(()=>{
    (async()=>{
      try{
        const r = await fetch(`${api}/advisor/ideas`, { headers: authHeaders }).then(r=>r.json())
        if (r && r.ok && Array.isArray(r.ideas)) setIdeas(r.ideas)
      } catch {}
    })()
  },[api, authHeaders])

  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch(`${api}/advisor/clients`, { headers: authHeaders }).then(r=>r.json())
        if (r && r.ok && Array.isArray(r.clients)) setClients(r.clients)
      } catch {}
    })()
  },[api, authHeaders])

  const toggle = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const assign = async () => {
    if (!assignClientId || selectedIds.size === 0) return alert('Pick a client and at least one idea')
    setBusy(true)
    try {
      for (const id of selectedIds) {
        try {
          // fetch full prebuilt idea to copy all tab contents
          const detail = await fetch(`${api}/ideas/${encodeURIComponent(id)}`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
          const idea = detail?.idea || ideas.find(x => x.id === id)
          if (!idea) continue
          const payload: Record<string, unknown> = {
            title: (idea as any).title,
            summary: (idea as any).summary,
            steps: (idea as any).steps || [],
            agent_stack: (idea as any).agent_stack || {},
            client_requirements: (idea as any).client_requirements || [],
            implementation_estimate: (idea as any).implementation_estimate || { elsewhere_cost: 8*125*40, our_hours: 40, our_cost: 125*40, timeline: '1-2 weeks' },
            security_considerations: (idea as any).security_considerations || [],
            future_enhancements: (idea as any).future_enhancements || [],
            assignClientId,
            mode: 'idea'
          }
          await fetch(`${api}/agent-ideas`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) })
        } catch {}
      }
      alert('Assigned to client. They will see them under Project Ideas.')
      setSelectedIds(new Set())
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Pre-Built Projects</h1>
        <p className="text-[var(--color-text-muted)]">Select ideas and assign them to a client.</p>
      </header>

      <div className="flex items-center gap-3">
        <select className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" value={assignClientId} onChange={e=>setAssignClientId(Number(e.target.value) || "")}>
          <option value="">Select client…</option>
          {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <button className="btn-primary text-sm" disabled={busy || !assignClientId || selectedIds.size===0} onClick={assign}>{busy?'Assigning…':'Assign Selected'}</button>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map(p => (
            <div key={p.id} className="flex h-full flex-col rounded-lg border border-[var(--color-border)] p-4">
              <div className="text-base font-semibold text-[var(--color-text)]">{p.title}</div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{p.summary}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={()=>toggle(p.id)} /> Select</label>
                <a className="btn-secondary text-xs" href={`/ideas/${encodeURIComponent(p.id)}`}>See Details</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


