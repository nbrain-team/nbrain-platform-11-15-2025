"use client"
import { useEffect, useMemo, useState } from "react"

type Client = { id: number; name: string }

export default function AdvisorCreateProjectPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string>("")
  // selection: '' | 'client' | 'prebuilt'
  const [selection, setSelection] = useState<''|'client'|'prebuilt'>('')

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${api}/advisor/clients`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then(r=>r.json())
        if (r.ok) setClients(r.clients)
      } catch {}
    })()
  }, [api, token])

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Create New Project Idea</h1>
        <p className="text-[var(--color-text-muted)]">Pick the type of idea to create, then use the chat assistant to generate a full spec.</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <label className="text-sm">Type</label>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-2"><input type="radio" name="sel" value="client" checked={selection==='client'} onChange={()=>setSelection('client')} /> Idea Specific To a Client</label>
          <label className="inline-flex items-center gap-2"><input type="radio" name="sel" value="prebuilt" checked={selection==='prebuilt'} onChange={()=>setSelection('prebuilt')} /> Pre-Built Project Idea (save to Library)</label>
        </div>

        {selection==='client' && (
          <div className="mt-4">
            <label className="text-sm">Select Client</label>
            <select className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={clientId} onChange={e=>setClientId(e.target.value)}>
              <option value="">— Choose a client —</option>
              {clients.map(c => (<option key={c.id} value={String(c.id)}>{c.name} (ID {c.id})</option>))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-0 shadow-card">
        {(selection==='client' && clientId) || selection==='prebuilt' ? (
          <iframe
            title="Advisor Project Ideator"
            src={`/client-chat?api=${encodeURIComponent(api)}${token ? `&t=${encodeURIComponent(token)}` : ''}${selection==='client' && clientId ? `&clientId=${encodeURIComponent(clientId)}` : ''}&mode=idea`}
            className="h-[70vh] w-full rounded-xl"
          />
        ) : (
          <div className="p-6 text-sm text-[var(--color-text-muted)]">Select a type above {selection==='client' ? 'and a client' : ''} to begin.</div>
        )}
      </div>
    </div>
  )
}


