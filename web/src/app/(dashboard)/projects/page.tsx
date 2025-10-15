"use client"
import { useEffect, useMemo, useState } from "react"

type Project = { id: number; name: string; status: string; eta: string | null }
type RoadmapNode = { 
  id: number
  node_type: string
  title: string
  description: string
  status: string
  project_id: number | null
  position_x: number
  position_y: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [roadmapNodes, setRoadmapNodes] = useState<RoadmapNode[]>([])
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  useEffect(() => {
    (async () => {
      try {
        // Fetch regular projects
        const res = await fetch(`${api}/client/projects`, { headers: authHeaders }).then(r => r.json())
        if (res?.ok && Array.isArray(res.projects)) setProjects(res.projects)
        
        // Fetch roadmap nodes
        const roadmapRes = await fetch(`${api}/roadmap`, { headers: authHeaders }).then(r => r.json())
        if (roadmapRes?.ok && roadmapRes.roadmap?.nodes) {
          const projectNodes = roadmapRes.roadmap.nodes.filter((n: RoadmapNode) => n.node_type === 'project')
          setRoadmapNodes(projectNodes)
        }
      } catch (e) {
        console.error('Failed to load projects:', e)
      }
    })()
  }, [api, authHeaders])
  
  // Projects in production are those with status "In production"
  const projectsInProduction = projects.filter(p => p.status === 'In production')
  
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Projects</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Manage your planned and scoped AI projects</p>
        </div>
        <a href="/roadmap" className="btn-primary">+ Add to Ecosystem</a>
      </div>
      
      {/* Projects in Production */}
      <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Projects in Production</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Active projects currently being developed</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {projectsInProduction.length} Active
          </span>
        </div>
        <div className="divide-y">
          {projectsInProduction.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              No Projects in Production
            </div>
          ) : (
            projectsInProduction.map(p => (
              <div key={p.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] group">
                <a href={`/projects/PRJ-${String(p.id).padStart(4,'0')}`} className="font-medium text-[var(--color-text)]">
                  {p.name.replace(/^Draft:\s*/i,'')}
                </a>
                <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                  <div>PRJ-{String(p.id).padStart(4,'0')}</div>
                  <div className="h-2 w-56 flex-none shrink-0 rounded bg-[var(--color-surface-alt)]">
                    <div className="h-2 rounded bg-blue-500" style={{ width: '60%' }} />
                  </div>
                  <span className="text-xs whitespace-nowrap w-40 truncate overflow-hidden flex-none shrink-0">{p.status}</span>
                </div>
                <div className="text-right">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">Active</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Scoped Projects - Projects that have been defined through AI */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Scoped Projects</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Projects with AI-generated specifications ready for development</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            {roadmapNodes.filter(n => n.project_id).length} Projects
          </span>
        </div>
        <div className="divide-y">
          {roadmapNodes.filter(n => n.project_id).length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              No scoped projects yet. Create a planned project and use AI to scope it!
            </div>
          ) : (
            roadmapNodes.filter(n => n.project_id).map(node => {
              const project = projects.find(p => p.id === node.project_id)
              return (
                <div key={node.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] group">
                  <a href={`/projects/PRJ-${String(node.project_id).padStart(4,'0')}`} className="font-medium text-[var(--color-text)]">
                    {node.title}
                  </a>
                  <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                    <div>PRJ-{String(node.project_id).padStart(4,'0')}</div>
                    {project && (
                      <>
                        <div className="h-2 w-56 flex-none shrink-0 rounded bg-[var(--color-surface-alt)]">
                          <div className="h-2 rounded bg-emerald-500" style={{ width: `${(project.status==='Draft'?10:project.status==='Pending Advisor'?30:project.status==='In production'?60:project.status==='Waiting Client Feedback'?80:project.status==='Completed'?100:50)}%` }} />
                        </div>
                        <span className="text-xs whitespace-nowrap w-40 truncate overflow-hidden flex-none shrink-0">{project.status}</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">Scoped</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Planned Projects - Just nodes without full specifications */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Planned Projects</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Project ideas waiting to be scoped with AI</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {roadmapNodes.filter(n => !n.project_id).length} Ideas
          </span>
        </div>
        <div className="divide-y">
          {roadmapNodes.filter(n => !n.project_id).length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              No planned projects. Add a project node in your <a href="/roadmap" className="text-[var(--color-primary)] underline">AI Ecosystem</a>!
            </div>
          ) : (
            roadmapNodes.filter(n => !n.project_id).map(node => (
              <div key={node.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)] group">
                <div className="font-medium text-[var(--color-text)]">
                  {node.title}
                </div>
                <div className="text-[var(--color-text-muted)]">
                  {node.description || 'No description yet'}
                </div>
                <div className="text-right flex gap-2 justify-end items-center">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">Planned</span>
                  <a 
                    href={`/chat?projectName=${encodeURIComponent(node.title)}&nodeId=${node.id}`}
                    className="rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-700)] transition"
                  >
                    Scope with AI
                  </a>
                </div>
              </div>
            ))
          )}
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


