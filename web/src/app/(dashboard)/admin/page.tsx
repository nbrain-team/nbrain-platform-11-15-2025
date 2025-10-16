"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type User = { id: number; name: string; email: string; username: string }
type ClientDetails = User & { 
  company_name?: string; 
  website_url?: string; 
  phone?: string;
  advisor?: { id: number; name: string; email: string; phone?: string } | null;
  advisors?: { id: number; name: string; email: string; phone?: string }[];
}
type AdvisorRequest = {
  id: number;
  name: string;
  email: string;
  company_url?: string;
  time_slot: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [clients, setClients] = useState<User[]>([])
  const [advisors, setAdvisors] = useState<User[]>([])
  const [advisorRequests, setAdvisorRequests] = useState<AdvisorRequest[]>([])
  // Removed from overview: webinars and email center (moved to dedicated pages)
  const [error, setError] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)
  const [addOpen, setAddOpen] = useState<boolean>(false)
  const [addRole, setAddRole] = useState<"client" | "advisor">("client")
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [websiteUrl, setWebsiteUrl] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [advisorId, setAdvisorId] = useState<string>('')
  
  // Edit client state
  const [editClientOpen, setEditClientOpen] = useState<boolean>(false)
  const [editingClient, setEditingClient] = useState<ClientDetails | null>(null)
  const [editName, setEditName] = useState<string>('')
  const [editEmail, setEditEmail] = useState<string>('')
  const [editUsername, setEditUsername] = useState<string>('')
  const [editCompanyName, setEditCompanyName] = useState<string>('')
  const [editWebsiteUrl, setEditWebsiteUrl] = useState<string>('')
  const [editPhone, setEditPhone] = useState<string>('')
  const [editAdvisorIds, setEditAdvisorIds] = useState<number[]>([])
  const [newAdvisorId, setNewAdvisorId] = useState<string>('')
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  const fetchLists = useCallback(async () => {
    setError("")
    try {
      const [c, a, r] = await Promise.all([
        fetch(`${api}/admin/clients`, { headers: authHeaders }).then(r => r.json()),
        fetch(`${api}/admin/advisors`, { headers: authHeaders }).then(r => r.json()),
        fetch(`${api}/admin/advisor-requests`, { headers: authHeaders }).then(r => r.json()),
      ])
      if (!c.ok) throw new Error(c.error || 'Failed loading clients')
      if (!a.ok) throw new Error(a.error || 'Failed loading advisors')
      if (!r.ok) throw new Error(r.error || 'Failed loading advisor requests')
      setClients(c.clients); setAdvisors(a.advisors); setAdvisorRequests(r.requests)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed loading users') }
  }, [api, authHeaders])

  useEffect(() => { fetchLists() }, [fetchLists])

  const openAdd = (role: 'client' | 'advisor') => {
    setAddRole(role)
    setName(''); setEmail(''); setUsername(''); setPassword(''); setCompanyName(''); setWebsiteUrl(''); setPhone(''); setAdvisorId('')
    setAddOpen(true)
  }

  const submitAdd = async () => {
    // Validate required fields
    if (!name || !email || !username || !password) {
      setError('Please fill in all required fields')
      return
    }
    
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = { role: addRole, name, email, username, password }
      if (addRole === 'client') {
        payload.companyName = companyName || undefined
        payload.websiteUrl = websiteUrl || undefined
        if (advisorId) payload.advisorId = Number(advisorId)
      } else if (addRole === 'advisor') {
        payload.phone = phone || undefined
      }
      const res = await fetch(`${api}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify(payload)
      }).then(r => r.json())
      if (!res.ok) throw new Error(res.error || 'Failed creating user')
      setAddOpen(false)
      setError('')
      await fetchLists()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed creating user')
    } finally { setSaving(false) }
  }

  const openEditClient = async (clientId: number) => {
    try {
      const res = await fetch(`${api}/admin/clients/${clientId}`, { headers: authHeaders }).then(r => r.json())
      if (!res.ok) throw new Error(res.error || 'Failed loading client details')
      
      const client = res.client
      setEditingClient(client)
      setEditName(client.name || '')
      setEditEmail(client.email || '')
      setEditUsername(client.username || '')
      setEditCompanyName(client.company_name || '')
      setEditWebsiteUrl(client.website_url || '')
      setEditPhone(client.phone || '')
      
      // Get assigned advisors for this client
      const advisorsRes = await fetch(`${api}/admin/clients/${clientId}/advisors`, { headers: authHeaders }).then(r => r.json())
      if (advisorsRes.ok && advisorsRes.advisors) {
        setEditAdvisorIds(advisorsRes.advisors.map((a: User) => a.id))
      } else {
        setEditAdvisorIds([])
      }
      
      setEditClientOpen(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed loading client details')
    }
  }

  const submitEditClient = async () => {
    if (!editingClient) return
    setSaving(true)
    try {
      // Update client profile
      const res = await fetch(`${api}/admin/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          username: editUsername,
          companyName: editCompanyName,
          websiteUrl: editWebsiteUrl,
          phone: editPhone
        })
      }).then(r => r.json())
      if (!res.ok) throw new Error(res.error || 'Failed updating client')
      
      // Update advisor assignments
      await fetch(`${api}/admin/clients/${editingClient.id}/advisors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify({ advisorIds: editAdvisorIds })
      })
      
      setEditClientOpen(false)
      await fetchLists()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed updating client')
    } finally { setSaving(false) }
  }
  
  const addAdvisorToClient = () => {
    if (!newAdvisorId) return
    const advisorIdNum = Number(newAdvisorId)
    if (!editAdvisorIds.includes(advisorIdNum)) {
      setEditAdvisorIds([...editAdvisorIds, advisorIdNum])
    }
    setNewAdvisorId('')
  }
  
  const removeAdvisorFromClient = (advisorId: number) => {
    setEditAdvisorIds(editAdvisorIds.filter(id => id !== advisorId))
  }

  const assignClient = async () => {
    if (!advisors.length || !clients.length) return alert('Need at least one advisor and client')
    const advisorId = Number(prompt(`Advisor id to assign? (e.g. ${advisors[0]?.id})`) || '')
    const clientId = Number(prompt(`Client id to assign? (e.g. ${clients[0]?.id})`) || '')
    if (!advisorId || !clientId) return
    const res = await fetch(`${api}/admin/assign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
      body: JSON.stringify({ advisorId, clientId })
    }).then(r => r.json())
    if (!res.ok) { alert(res.error || 'Failed'); return }
    alert('Assigned!')
  }
  
  const deleteUser = async (userId: number, role: 'client' | 'advisor') => {
    const userName = role === 'client' 
      ? clients.find(c => c.id === userId)?.name 
      : advisors.find(a => a.id === userId)?.name
    
    if (!confirm(`Delete ${role} "${userName}"? This action cannot be undone and will delete all associated data.`)) {
      return
    }
    
    try {
      const res = await fetch(`${api}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders
      }).then(r => r.json())
      
      if (!res.ok) throw new Error(res.error || 'Failed to delete user')
      
      await fetchLists()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Admin</h1>
        <p className="text-[var(--color-text-muted)]">Manage clients and advisors, and connect them.</p>
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold">Clients</div>
            <button onClick={() => openAdd('client')} className="btn-secondary px-3 py-1 text-xs">Add client</button>
          </div>
          <div className="divide-y">
            {clients.map(u => (
              <div 
                key={u.id} 
                className="grid grid-cols-[60px_1fr_1fr_80px] items-center gap-3 p-2 text-sm group hover:bg-[var(--color-surface-alt)] transition"
              >
                <div className="text-xs text-[var(--color-text-muted)]">#{u.id}</div>
                <div className="font-medium cursor-pointer" onClick={() => openEditClient(u.id)}>{u.name}</div>
                <div className="text-[var(--color-text-muted)] cursor-pointer" onClick={() => openEditClient(u.id)}>{u.email}</div>
                <div className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteUser(u.id, 'client')
                    }}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {clients.length === 0 && <div className="p-2 text-sm text-[var(--color-text-muted)]">No clients.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold">Advisors</div>
            <button onClick={() => openAdd('advisor')} className="btn-secondary px-3 py-1 text-xs">Add advisor</button>
          </div>
          <div className="divide-y">
            {advisors.map(u => (
              <div key={u.id} className="grid grid-cols-[60px_1fr_1fr_80px] items-center gap-3 p-2 text-sm group hover:bg-[var(--color-surface-alt)] transition">
                <div className="text-xs text-[var(--color-text-muted)]">#{u.id}</div>
                <div className="font-medium">{u.name}</div>
                <div className="text-[var(--color-text-muted)]">{u.email}</div>
                <div className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteUser(u.id, 'advisor')
                    }}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {advisors.length === 0 && <div className="p-2 text-sm text-[var(--color-text-muted)]">No advisors.</div>}
          </div>
        </div>
      </div>

      {/* Webinars section removed from overview - now on its own page */}

      {/* Advisor Requests section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Advisor Meeting Requests</div>
        <div className="divide-y">
          {advisorRequests.map(req => (
            <div key={req.id} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-3">
              <div>
                <div className="font-medium">{req.name}</div>
                <div className="text-sm text-[var(--color-text-muted)]">{req.email}</div>
                {req.company_url && (
                  <a href={req.company_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] underline">
                    {req.company_url}
                  </a>
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium">{req.time_slot}</div>
                <div className="text-[var(--color-text-muted)]">
                  Requested {new Date(req.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  req.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {req.status}
                </span>
              </div>
            </div>
          ))}
          {advisorRequests.length === 0 && (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">No advisor requests yet.</div>
          )}
        </div>
      </div>

      {/* Email Center removed from overview - now on its own page */}
      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add {addRole === 'client' ? 'client' : 'advisor'}</DialogTitle>
            <p className="text-sm text-[var(--color-text-muted)]">Create a new {addRole === 'client' ? 'client' : 'advisor'} account</p>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="grid grid-cols-2 items-center gap-2">
              <label className="text-[var(--color-text-muted)]">Full name</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Email</label>
              <input type="email" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Username</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Password</label>
              <input type="password" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} />
              {addRole === 'client' && <>
                <label className="text-[var(--color-text-muted)]">Company</label>
                <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={companyName} onChange={e=>setCompanyName(e.target.value)} />
                <label className="text-[var(--color-text-muted)]">Website URL</label>
                <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} />
                <label className="text-[var(--color-text-muted)]">Advisor</label>
                <select className="rounded-md border border-[var(--color-border)] px-3 py-2" value={advisorId} onChange={e=>setAdvisorId(e.target.value)}>
                  <option value="">— None —</option>
                  {advisors.map(a => <option key={a.id} value={String(a.id)}>{a.name} (#{a.id})</option>)}
                </select>
              </>}
              {addRole === 'advisor' && <>
                <label className="text-[var(--color-text-muted)]">Phone</label>
                <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} />
              </>}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setAddOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submitAdd} disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit client dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <p className="text-sm text-[var(--color-text-muted)]">Update client information and advisor assignments</p>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="grid grid-cols-2 items-center gap-2">
              <label className="text-[var(--color-text-muted)]">Full name</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editName} onChange={e=>setEditName(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Email</label>
              <input type="email" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editEmail} onChange={e=>setEditEmail(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Username</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editUsername} onChange={e=>setEditUsername(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Company</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editCompanyName} onChange={e=>setEditCompanyName(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Website URL</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editWebsiteUrl} onChange={e=>setEditWebsiteUrl(e.target.value)} />
              <label className="text-[var(--color-text-muted)]">Phone</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editPhone} onChange={e=>setEditPhone(e.target.value)} />
            </div>
            
            {/* Assigned Advisors Section */}
            <div className="mt-4 p-4 bg-[var(--color-surface-alt)] rounded-lg">
              <div className="mb-3 text-sm font-semibold text-[var(--color-text)]">Assigned Advisors</div>
              
              {/* Current advisors */}
              <div className="space-y-2 mb-3">
                {editAdvisorIds.length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)]">No advisors assigned yet</div>
                ) : (
                  editAdvisorIds.map(advisorId => {
                    const advisor = advisors.find(a => a.id === advisorId)
                    if (!advisor) return null
                    return (
                      <div key={advisorId} className="flex items-center justify-between p-2 bg-white rounded border border-[var(--color-border)]">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{advisor.name}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{advisor.email}</div>
                        </div>
                        <button
                          onClick={() => removeAdvisorFromClient(advisorId)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
              
              {/* Add new advisor */}
              <div className="flex gap-2">
                <select 
                  className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={newAdvisorId}
                  onChange={e => setNewAdvisorId(e.target.value)}
                >
                  <option value="">Select advisor to add...</option>
                  {advisors
                    .filter(a => !editAdvisorIds.includes(a.id))
                    .map(a => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} (#{a.id})
                      </option>
                    ))
                  }
                </select>
                <button
                  onClick={addAdvisorToClient}
                  disabled={!newAdvisorId}
                  className="btn-secondary text-xs px-4"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditClientOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submitEditClient} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Connect client to advisor</div>
          <button onClick={assignClient} className="btn-primary px-3 py-1 text-xs">Assign</button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">Use the Assign button to map an existing client to an advisor by ID.</p>
      </div>
    </div>
  )
}