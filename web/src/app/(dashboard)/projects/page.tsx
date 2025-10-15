"use client"
import { useEffect, useMemo, useState } from "react"

type Project = { id: number; name: string; status: string; eta: string | null }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${api}/client/projects`, { headers: authHeaders }).then(r => r.json())
        if (res?.ok && Array.isArray(res.projects)) setProjects(res.projects)
      } catch {}
    })()
  }, [api, authHeaders])
  const alerts = [
    { id: "ALT-32", type: "Access", text: "Grant read‑only access to GA4 for PRJ‑2001." },
    { id: "ALT-33", type: "API", text: "Add OpenAI API key for reporting agent (billing at cost)." },
    { id: "ALT-34", type: "Question", text: "Confirm target KPIs for weekly deck (PRJ‑2001)." },
  ]
  const deliverables = [
    { title: "Reporting agent v1", project: "PRJ-2001", when: "2 days ago", action: "View" },
    { title: "CRM enrichment run", project: "PRJ-1980", when: "Mon", action: "Open" },
    { title: "Ops QA checklist", project: "PRJ-1001", when: "Last week", action: "Download" },
  ]
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Projects</h1>
        <a href="/chat" className="btn-primary">New Project</a>
      </div>
      {/* Alerts / Required actions */}
      <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <div className="mb-2 text-lg font-semibold">Required actions</div>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {alerts.map(a => (
            <li key={a.id} className="flex items-start gap-2 rounded-md border border-[var(--color-border)] p-3 text-sm">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
              <span className="text-[var(--color-text-muted)]">{a.text}</span>
              <button className="btn-secondary ml-auto px-3 py-1 text-xs">Resolve</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Projects in work */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <h2 className="mb-3 text-lg font-semibold">Projects In Production</h2>
        <div className="grid grid-cols-3 items-center gap-4 border-b border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <div>Project</div>
          <div>ID / ETA</div>
          <div className="text-right">Status</div>
        </div>
        <div className="divide-y">
        {projects.filter(p => p.status !== 'Completed').map(p => (
          <div key={p.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] group">
            <a href={`/projects/${encodeURIComponent(`PRJ-${String(p.id).padStart(4,'0')}`)}`} className="font-medium">
              {p.name.replace(/^Draft:\s*/i,'')}
            </a>
            <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
              <div>PRJ-{String(p.id).padStart(4,'0')}</div>
              <div className="h-2 w-56 flex-none shrink-0 rounded bg-[var(--color-surface-alt)]">
                <div className="h-2 rounded bg-[var(--color-primary)]" style={{ width: `${(p.status==='Draft'?10:p.status==='Pending Advisor'?30:p.status==='In production'?60:p.status==='Waiting Client Feedback'?80:p.status==='Completed'?100:50)}%` }} />
              </div>
              <span className="text-xs whitespace-nowrap w-40 truncate overflow-hidden flex-none shrink-0">{p.status}</span>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                p.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                p.status === 'Pending Advisor' ? 'bg-yellow-100 text-yellow-700' :
                p.status === 'Waiting Client Feedback' ? 'bg-orange-100 text-orange-700' :
                p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
              }`}>{p.status}</span>
              <button
                className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition"
                title="Delete project"
                aria-label="Delete project"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirm('Delete this project permanently?')) return;
                  await fetch(`${api}/client/projects/${p.id}`, { method: 'DELETE', headers: authHeaders });
                  setProjects(prev => prev.filter(x => x.id !== p.id));
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 3h6v2h5v2H4V5h5V3zm1 6h2v9h-2V9zm4 0h2v9h-2V9z"/></svg>
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* History / More completed work */}
      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-white shadow-card">
        <h2 className="border-b border-[var(--color-border)] p-4 text-lg font-semibold">Finished Projects</h2>
        <div className="grid grid-cols-3 items-center gap-4 border-b border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <div>Project</div>
          <div>ID / Date</div>
          <div className="text-right">Action</div>
        </div>
        <div className="divide-y">
          {projects.filter(p => p.status === 'Completed').map((p) => (
            <a key={p.id} href={`/projects/${encodeURIComponent(`PRJ-${String(p.id).padStart(4,'0')}`)}`} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)]">
              <div className="font-medium">{p.name}</div>
              <div className="text-[var(--color-text-muted)]">PRJ-{String(p.id).padStart(4,'0')} · Recently</div>
              <div className="text-right"><span className="text-[var(--color-primary)] underline">View</span></div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}


