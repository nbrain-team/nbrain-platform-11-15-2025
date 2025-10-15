"use client"
import { useEffect, useMemo, useState } from "react"

type Project = { id: number; name: string; status: string; eta: string | null }

export default function ClientCompletedProjectsPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined

  const [projects, setProjects] = useState<Project[]>([])
  const completed = useMemo(() => projects.filter(p => p.status === 'Completed'), [projects])

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${api}/client/projects`, { headers: authHeaders }).then(r => r.json())
        if (r?.ok && Array.isArray(r.projects)) setProjects(r.projects)
      } catch {}
    })()
  }, [api, authHeaders])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Completed Projects</h1>
        <p className="text-[var(--color-text-muted)]">All projects you’ve completed.</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        {completed.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">No completed projects yet.</div>
        ) : (
          <div>
            <div className="grid grid-cols-3 items-center gap-4 border-b border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <div>Project</div>
              <div>ID</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y">
              {completed.map(p => (
                <a key={p.id} href={`/projects/${encodeURIComponent(`PRJ-${String(p.id).padStart(4,'0')}`)}`} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)]">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[var(--color-text-muted)]">PRJ-{String(p.id).padStart(4,'0')}</div>
                  <div className="text-right">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{p.status}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


