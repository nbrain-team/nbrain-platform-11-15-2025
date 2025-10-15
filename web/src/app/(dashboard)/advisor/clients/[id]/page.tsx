"use client"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type Client = {
  id: number
  name: string
  email: string
  company_name?: string
  website_url?: string
  phone?: string
}

type Credential = {
  id: number
  name: string
  type: 'text' | 'file'
  value?: string
  file_name?: string
  is_predefined: boolean
}

type Project = {
  id: number
  name: string
  status: string
  eta: string | null
}

export default function AdvisorClientDetailPage() {
  const params = useParams()
  const clientId = Number(params.id)
  const [client, setClient] = useState<Client | null>(null)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [loading, setLoading] = useState(true)
  
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
        setLoading(true)
        
        // Fetch client details
        const clientRes = await fetch(`${api}/advisor/clients/${clientId}`, { headers: authHeaders }).then(r => r.json())
        if (!clientRes.ok) throw new Error(clientRes.error || 'Failed loading client details')
        setClient(clientRes.client)
        
        // Fetch client credentials
        const credRes = await fetch(`${api}/advisor/clients/${clientId}/credentials`, { headers: authHeaders }).then(r => r.json())
        if (credRes.ok) {
          setCredentials(credRes.credentials)
        }
        
        // Fetch client projects
        const projRes = await fetch(`${api}/advisor/clients/${clientId}/projects`, { headers: authHeaders }).then(r => r.json())
        if (!projRes.ok) throw new Error(projRes.error || 'Failed loading projects')
        setProjects(projRes.projects)
        
      } catch (e: unknown) { 
        setError(e instanceof Error ? e.message : 'Failed loading client details') 
      } finally {
        setLoading(false)
      }
    })()
  }, [api, authHeaders, clientId])

  const copyToClipboard = async (text: string, credName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccessMessage(`Copied ${credName} to clipboard`)
      setTimeout(() => setSuccessMessage(""), 2000)
    } catch {
      setError('Failed to copy to clipboard')
      setTimeout(() => setError(""), 2000)
    }
  }

  const downloadCredentialFile = async (credId: number, fileName: string) => {
    try {
      const response = await fetch(`${api}/advisor/credentials/${clientId}/${credId}/download`, {
        headers: authHeaders
      })
      if (!response.ok) throw new Error('Failed to download file')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed downloading file')
      setTimeout(() => setError(""), 3000)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  if (!client) return <div>Client not found</div>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">{client.name}</h1>
          <p className="text-[var(--color-text-muted)]">Client Details</p>
        </div>
        <Link href="/advisor" className="text-sm text-[var(--color-primary)] underline">← Back to Advisor Dashboard</Link>
      </header>

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMessage}</div>
      )}

      {/* Client Profile Info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Profile Information</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--color-text-muted)]">Name:</span>
            <span className="ml-2 font-medium">{client.name}</span>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Email:</span>
            <a href={`mailto:${client.email}`} className="ml-2 text-[var(--color-primary)] underline">{client.email}</a>
          </div>
          {client.company_name && (
            <div>
              <span className="text-[var(--color-text-muted)]">Company:</span>
              <span className="ml-2 font-medium">{client.company_name}</span>
            </div>
          )}
          {client.website_url && (
            <div>
              <span className="text-[var(--color-text-muted)]">Website:</span>
              <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--color-primary)] underline">{client.website_url}</a>
            </div>
          )}
          {client.phone && (
            <div>
              <span className="text-[var(--color-text-muted)]">Phone:</span>
              <a href={`tel:${client.phone}`} className="ml-2 text-[var(--color-primary)] underline">{client.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Client Credentials */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Access & Credentials</div>
        {credentials.length > 0 ? (
          <div className="space-y-3">
            {credentials.map(cred => (
              <div key={cred.id} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-muted)]">{cred.name}:</span>
                  {cred.type === 'file' ? (
                    <button 
                      onClick={() => downloadCredentialFile(cred.id, cred.file_name || 'credential-file')}
                      className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-surface-alt)] transition"
                    >
                      📎 {cred.file_name || 'File uploaded'}
                    </button>
                  ) : cred.value ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono bg-[var(--color-surface-alt)] px-2 py-1 rounded">{cred.value}</span>
                      <button 
                        onClick={() => copyToClipboard(cred.value!, cred.name)}
                        className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm hover:bg-[var(--color-surface-alt)] transition"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--color-text-muted)]">Not configured</span>
                  )}
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {cred.is_predefined ? 'System' : 'Custom'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No credentials configured</p>
        )}
      </div>

      {/* Client Projects */}
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
                  key={p.id} 
                  href={`/advisor/projects/${p.id}`}
                  className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] cursor-pointer transition"
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
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.status === 'Draft' 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
                    }`}>
                      {p.status}
                    </span>
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
                  key={p.id} 
                  href={`/advisor/projects/${p.id}`}
                  className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] cursor-pointer transition"
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
    </div>
  )
}
