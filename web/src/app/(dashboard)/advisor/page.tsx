"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Client = { id: number; name: string; email: string }
type Project = { id: number; name: string; status: string; eta: string | null }
type ScheduleRequest = { 
  id: number; 
  client_name: string; 
  client_email: string; 
  time_slot: string; 
  meeting_description: string;
  created_at: string;
}

export default function AdvisorPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [error, setError] = useState<string>("")
  
  // Add client dialog state
  const [addClientOpen, setAddClientOpen] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [websiteUrl, setWebsiteUrl] = useState<string>('')
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Completed'), [projects])
  const finishedProjects = useMemo(() => projects.filter(p => p.status === 'Completed'), [projects])

  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, scheduleRes, projectsRes] = await Promise.all([
          fetch(`${api}/advisor/clients`, { headers: authHeaders }).then(r => r.json()),
          fetch(`${api}/advisor/schedule-requests`, { headers: authHeaders }).then(r => r.json()),
          fetch(`${api}/advisor/projects`, { headers: authHeaders }).then(r => r.json())
        ])
        
        if (!clientsRes.ok) throw new Error(clientsRes.error || 'Failed loading clients')
        setClients(clientsRes.clients)
        if (clientsRes.clients?.[0]?.id) setSelected(clientsRes.clients[0].id)
        
        if (scheduleRes.ok) setScheduleRequests(scheduleRes.requests)
        
        // Load all projects across all clients
        if (projectsRes.ok) setProjects(projectsRes.projects)
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed loading data') }
    })()
  }, [api, authHeaders])

  // Refresh projects when selected client changes (for detailed client view)
  useEffect(() => {
    (async () => {
      if (!selected) return
      try {
        // Fetch all projects again to ensure we have the latest
        const res = await fetch(`${api}/advisor/projects`, { headers: authHeaders }).then(r => r.json())
        if (!res.ok) throw new Error(res.error || 'Failed loading projects')
        setProjects(res.projects)
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed loading projects') }
    })()
  }, [selected, api, authHeaders])

  const openAddClient = () => {
    setName('')
    setEmail('')
    setUsername('')
    setPassword('')
    setCompanyName('')
    setWebsiteUrl('')
    setError('')
    setAddClientOpen(true)
  }

  const submitAddClient = async () => {
    // Validate required fields
    if (!name || !email || !username || !password) {
      setError('Please fill in all required fields (name, email, username, password)')
      return
    }
    
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${api}/advisor/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify({
          name,
          email,
          username,
          password,
          companyName: companyName || undefined,
          websiteUrl: websiteUrl || undefined
        })
      }).then(r => r.json())
      
      if (!res.ok) throw new Error(res.error || 'Failed creating client')
      
      setAddClientOpen(false)
      setError('')
      
      // Refresh clients list
      const clientsRes = await fetch(`${api}/advisor/clients`, { headers: authHeaders }).then(r => r.json())
      if (clientsRes.ok) {
        setClients(clientsRes.clients)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed creating client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Advisor</h1>
        <p className="text-[var(--color-text-muted)]">Your assigned clients and their projects.</p>
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Pending Schedule Requests */}
      {scheduleRequests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-card">
          <div className="mb-3 text-lg font-semibold text-amber-900">Pending Schedule Requests</div>
          <div className="space-y-3">
            {scheduleRequests.map(req => (
              <div key={req.id} className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-[var(--color-text)]">{req.client_name}</div>
                    <div className="text-sm text-[var(--color-text-muted)]">{req.client_email}</div>
                    <div className="mt-1 text-sm font-medium text-amber-700">{req.time_slot}</div>
                    {req.meeting_description && (
                      <div className="mt-2 text-sm text-[var(--color-text-muted)]">
                        <span className="font-medium">Description:</span> {req.meeting_description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-muted)]">{new Date(req.created_at).toLocaleDateString()}</span>
                    <button 
                      className="btn-primary text-xs"
                      onClick={async ()=>{
                        const res = await fetch(`${api}/advisor/schedule-requests/${req.id}/confirm`, { method:'POST', headers: authHeaders }).then(r=>r.json()).catch(()=>null)
                        if (res && res.ok) {
                          setScheduleRequests(prev=> prev.filter(r=> r.id!==req.id))
                        } else {
                          alert(res?.error || 'Failed to confirm')
                        }
                      }}
                    >Confirm</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Assigned Clients</div>
          <button 
            onClick={openAddClient}
            className="btn-primary text-xs px-3 py-1"
          >
            + Add Client
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {clients.map(c => (
            <Link 
              key={c.id}
              href={`/advisor/clients/${c.id}`}
              onClick={() => setSelected(c.id)}
              className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition hover:shadow-md ${selected===c.id ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-white hover:bg-gray-50'}`}
            >
              {c.name}
            </Link>
          ))}
          {clients.length===0 && <div className="text-sm text-[var(--color-text-muted)]">No clients assigned.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Active Projects</div>
        {activeProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-3 items-center gap-4 border-b border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <div>Project</div>
              <div>ID / ETA</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y">
              {activeProjects.map(p => (
                <Link 
                  key={`active-${p.id}`} 
                  href={`/advisor/projects/${p.id}`}
                  className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] cursor-pointer transition block"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                    <div className="whitespace-nowrap w-40 truncate overflow-hidden flex-none shrink-0">PRJ-{String(p.id).padStart(4,'0')} {p.eta && `· ETA ${p.eta}`}</div>
                    <div className="h-2 w-56 flex-none shrink-0 rounded bg-[var(--color-surface-alt)]">
                      <div className="h-2 rounded bg-[var(--color-primary)]" style={{ width: `${(p.status==='Draft'?10:p.status==='Pending Advisor'?30:p.status==='In production'?60:p.status==='Waiting Client Feedback'?80:p.status==='Completed'?100:50)}%` }} />
                    </div>
                    <span className="text-xs whitespace-nowrap w-40 truncate overflow-hidden flex-none shrink-0">{p.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">{p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 text-sm text-[var(--color-text-muted)]">No active projects.</div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Finished Projects</div>
        {finishedProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-3 items-center gap-4 border-b border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <div>Project</div>
              <div>ID / ETA</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y">
              {finishedProjects.map(p => (
                <Link 
                  key={`finished-${p.id}`} 
                  href={`/advisor/projects/${p.id}`}
                  className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] cursor-pointer transition block"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[var(--color-text-muted)]">PRJ-{String(p.id).padStart(4,'0')} {p.eta && `· ETA ${p.eta}`}</div>
                  <div className="text-right">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 text-sm text-[var(--color-text-muted)]">No finished projects.</div>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <p className="text-sm text-[var(--color-text-muted)]">Create a new client account. You will be automatically assigned as their advisor.</p>
          </DialogHeader>
          
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="grid grid-cols-2 items-center gap-2">
              <label className="text-[var(--color-text-muted)]">Full name *</label>
              <input 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
              />
              
              <label className="text-[var(--color-text-muted)]">Email *</label>
              <input 
                type="email" 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="john@company.com"
              />
              
              <label className="text-[var(--color-text-muted)]">Username *</label>
              <input 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="johndoe"
              />
              
              <label className="text-[var(--color-text-muted)]">Password *</label>
              <input 
                type="password" 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              
              <label className="text-[var(--color-text-muted)]">Company</label>
              <input 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
              />
              
              <label className="text-[var(--color-text-muted)]">Website URL</label>
              <input 
                className="rounded-md border border-[var(--color-border)] px-3 py-2" 
                value={websiteUrl} 
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">* Required fields</div>
          </div>
          
          <DialogFooter>
            <button onClick={() => setAddClientOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submitAddClient} disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create Client'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


