"use client"
import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCommunication } from "@/components/ProjectCommunication"
import { ProjectDocs } from "@/components/ProjectDocs"

type Idea = {
  id: string
  title: string
  summary: string
  steps: any
  agent_stack?: Record<string, unknown>
  client_requirements?: any
  security_considerations?: string[] | Record<string, unknown>
  future_enhancements?: unknown[]
  status?: string
}

type Project = {
  id: number
  name: string
  status: string
  project_stage?: string
}

type Credential = {
  id: number
  name: string
  type: string
  value?: string
  file_name?: string
  is_predefined?: boolean
}

export default function ProjectScopePage({ params }: { params: { id: string } }) {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [idea, setIdea] = useState<Idea | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [editing, setEditing] = useState<{ field: keyof Idea | null }>({ field: null })
  const [draft, setDraft] = useState<string | string[] | Record<string, unknown> | unknown[] | null>(null)
  const [newStep, setNewStep] = useState("")
  const [newReq, setNewReq] = useState("")
  const [newSec, setNewSec] = useState("")
  const [newEnh, setNewEnh] = useState("")
  const [proposal, setProposal] = useState<any>(null)
  const [acceptingProposal, setAcceptingProposal] = useState(false)
  const [allCredentials, setAllCredentials] = useState<Credential[]>([])
  const [projectCredentials, setProjectCredentials] = useState<Credential[]>([])
  const [showAddCred, setShowAddCred] = useState(false)
  const [rowEdit, setRowEdit] = useState<{ field: keyof Idea | null; index: number | null; title: string; body: string }>({ field: null, index: null, title: '', body: '' })
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])

  const projectNumericId = Number(String(params.id ?? '').replace(/[^0-9]/g, ''))

  // Technical stack pretty renderer with single-line bold labels
  const toTitle = (s: unknown): string => String(s)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (_: unknown, ch: string) => ch.toUpperCase())

  const renderTechEntry = (key: string, val: unknown): JSX.Element => {
    const label = <span className="font-medium text-[var(--color-text)] whitespace-nowrap">{toTitle(key)}:</span>
    if (val == null) return (
      <div key={key} className="text-sm"><span className="mr-2">{label}</span><span className="text-[var(--color-text-muted)]">—</span></div>
    )
    if (Array.isArray(val)) return (
      <div key={key} className="text-sm">
        <div>{label}</div>
        <ul className="mt-1 list-disc pl-6 text-[var(--color-text-muted)]">
          {(val as unknown[]).map((item, i) => (
            <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      </div>
    )
    if (typeof val === 'object') {
      const entries = Object.entries(val as Record<string, unknown>)
      return (
        <div key={key} className="text-sm">
          <div>{label}</div>
          <div className="mt-1 space-y-1 pl-4">
            {entries.map(([k, v]) => renderTechEntry(k, v))}
          </div>
        </div>
      )
    }
    return (
      <div key={key} className="text-sm">
        <span className="mr-2">{label}</span>
        <span className="text-[var(--color-text-muted)]">{String(val)}</span>
      </div>
    )
  }

  const renderTechRoot = (value: unknown): JSX.Element | null => {
    if (!value || typeof value !== 'object') return null
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => renderTechEntry(k, v))}
      </div>
    )
  }

  // Formatting helpers
  const cleanTextProj = (s: unknown): string => String(s)
    // strip HTML tags
    .replace(/<[^>]*>/g, '')
    // strip fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    // remove bold markers
    .replace(/\*\*+/g, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
  const splitTitleBodyProj = (value: unknown): { title: string; body: string } => {
    // JSON-like string support
    if (typeof value === 'string') {
      const str = value.trim()
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          const obj = JSON.parse(str)
          value = obj
        } catch {}
      }
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      const title = obj.title ?? obj.phase ?? obj.step ?? obj.task ?? obj.name ?? obj.enhancement ?? obj.requirement ?? 'Item'
      const body = obj.body ?? obj.description ?? obj.details ?? obj.text ?? ''
      return { title: cleanTextProj(title), body: cleanTextProj(body) }
    }
    const t = cleanTextProj(value)
    // handle "key: value" style
    const idx = t.indexOf(':')
    if (idx > 0 && idx < 150) return { title: t.slice(0, idx).trim(), body: t.slice(idx + 1).trim() }
    return { title: t, body: '' }
  }

  const splitTitleBodyProjWithDefault = (value: unknown, defaultTitle: string): { title: string; body: string } => {
    const res = splitTitleBodyProj(value)
    return { title: res.title || defaultTitle, body: res.body }
  }

  const openRowEdit = (field: keyof Idea, index: number, value: unknown) => {
    const { title, body } = splitTitleBodyProjWithDefault(value, 'Item')
    setRowEdit({ field, index, title, body })
  }
  const cancelRowEdit = () => setRowEdit({ field: null, index: null, title: '', body: '' })
  const saveRowEditItem = async () => {
    if (!idea || rowEdit.field == null || rowEdit.index == null) return
    const list = Array.isArray((idea as any)[rowEdit.field]) ? [ ...(idea as any)[rowEdit.field] ] as string[] : []
    list[rowEdit.index] = rowEdit.body ? `${rowEdit.title}: ${rowEdit.body}` : rowEdit.title
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method:'PUT', headers: authHeaders, body: JSON.stringify({ [rowEdit.field]: list }) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) {
      setIdea(prev => prev ? ({ ...prev, [rowEdit.field as string]: list } as Idea) : prev)
      cancelRowEdit()
    }
  }
  const deleteRowItem = async (field: keyof Idea, index: number) => {
    if (!idea) return
    const list = Array.isArray((idea as any)[field]) ? [ ...(idea as any)[field] ] as string[] : []
    list.splice(index, 1)
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method:'PUT', headers: authHeaders, body: JSON.stringify({ [field]: list }) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) setIdea(prev => prev ? ({ ...prev, [field as string]: list } as Idea) : prev)
  }
  const flattenToBulletsProj = (value: unknown): string[] => {
    const out: string[] = []
    const walk = (v: unknown, path: string[] = []) => {
      if (v == null) return
      if (Array.isArray(v)) v.forEach((x) => walk(x, path))
      else if (typeof v === 'object') {
        Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
          if (val != null && typeof val !== 'object') out.push(`${[...path, k].join(' / ')}: ${String(val)}`)
          else walk(val, [...path, k])
        })
      } else out.push(String(v))
    }
    walk(value)
    return out
  }

  // Render enhancement item (handles strings or JSON objects)
  const renderEnhancementItem = (item: unknown, key: string | number) => {
    const tryParse = (s: string) => { try { return JSON.parse(s) } catch { return null } }
    let data: unknown = item
    if (typeof item === 'string') {
      const parsed = tryParse(item)
      if (parsed && typeof parsed === 'object') data = parsed
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>
      const title = String(obj.title || obj.enhancement || obj.name || 'Enhancement')
      const desc = obj.description ? String(obj.description) : ''
      const impact = obj.impact ? String(obj.impact) : ''
      const effort = (obj.implementation_effort ? String(obj.implementation_effort) : '')
      return (
        <li key={String(key)} className="mb-2">
          <div className="font-medium text-[var(--color-text)]">{cleanTextProj(title)}</div>
          {desc && <div className="text-sm text-[var(--color-text-muted)]">{cleanTextProj(desc)}</div>}
          {(impact || effort) && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {impact && <>Impact: {cleanTextProj(impact)}</>} {impact && effort && ' · '} {effort && <>Effort: {cleanTextProj(effort)}</>}
            </div>
          )}
        </li>
      )
    }
    // string path (semicolon-delimited key:value pairs)
    const s = String(item)
    const getKV = (k: string) => {
      const m = s.match(new RegExp(`${k}\\s*:\\s*([^;]+)`, 'i'))
      return m ? m[1].trim() : ''
    }
    const titleFromKV = getKV('enhancement') || getKV('title') || getKV('name') || undefined
    const descFromKV = getKV('description')
    const impactFromKV = getKV('impact')
    const effortFromKV = getKV('implementation_effort')
    if (titleFromKV || descFromKV || impactFromKV || effortFromKV) {
      return (
        <li key={String(key)} className="mb-2">
          <div className="font-medium text-[var(--color-text)]">{cleanTextProj(titleFromKV || 'Enhancement')}</div>
          {descFromKV && <div className="text-sm text-[var(--color-text-muted)]">{cleanTextProj(descFromKV)}</div>}
          {(impactFromKV || effortFromKV) && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {impactFromKV && <>Impact: {cleanTextProj(impactFromKV)}</>} {impactFromKV && effortFromKV && ' · '} {effortFromKV && <>Effort: {cleanTextProj(effortFromKV)}</>}
            </div>
          )}
        </li>
      )
    }
    const { title, body } = splitTitleBodyProj(s)
    return (
      <li key={String(key)} className="mb-2">
        <div className="font-medium text-[var(--color-text)]">{title}</div>
        {body && <div className="text-sm text-[var(--color-text-muted)]">{cleanTextProj(body)}</div>}
      </li>
    )
  }

  useEffect(() => {
    (async () => {
      try {
        // First check if it's a draft project
        const projectRes = await fetch(`${api}/client/projects`, { headers: authHeaders }).then(r=>r.json())
        if (projectRes.ok && projectRes.projects) {
          const projectData = projectRes.projects.find((p: { id: number; status: string; name: string; project_stage?: string }) => p.id === projectNumericId)
          if (projectData) {
            setProject(projectData)
            
            if (projectData.status === 'Draft') {
              // It's a draft, show minimal info
              setIdea({
                id: String(projectData.id),
                title: projectData.name,
                summary: 'This is a draft project. Continue the chat to complete the specification.',
                steps: [],
                status: 'Draft'
              })
              return
            }
            
            // Otherwise fetch the full idea
            const r = await fetch(`${api}/agent-ideas/by-project/${projectNumericId}`, { headers: authHeaders }).then(r=>r.json())
            if (r.ok && r.idea) {
              setIdea({ ...r.idea, status: projectData?.status || 'In production' } as Idea)
            }
            const pr = await fetch(`${api}/client/projects/${projectNumericId}/proposal`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
            if (pr && pr.ok) setProposal(pr.proposal || null)
          }
        } else {
          // No projects found, just fetch the idea
          const r = await fetch(`${api}/agent-ideas/by-project/${projectNumericId}`, { headers: authHeaders }).then(r=>r.json())
          if (r.ok && r.idea) {
            setIdea({ ...r.idea, status: 'In production' } as Idea)
          }
        }
        
        // Fetch user credentials
        const credsRes = await fetch(`${api}/credentials`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
        if (credsRes && credsRes.ok) {
          setAllCredentials(credsRes.credentials || [])
        }
        
        // Fetch project-linked credentials
        const projCredsRes = await fetch(`${api}/projects/${projectNumericId}/credentials`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
        if (projCredsRes && projCredsRes.ok) {
          setProjectCredentials(projCredsRes.credentials || [])
        }
      } catch {}
    })()
  }, [api, authHeaders, projectNumericId])

  const startEdit = (field: keyof Idea, value: string | string[] | Record<string, unknown> | unknown[]) => { setEditing({ field }); setDraft(value) }
  const cancelEdit = () => { setEditing({ field: null }); setDraft(null) }
  const saveEdit = async () => {
    if (!idea || !editing.field) return
    let value: Idea[keyof Idea]
    switch (editing.field) {
      case 'summary':
        value = (draft as string) || ''
        break
      case 'steps':
        value = Array.isArray(draft) ? (draft as string[]) : []
        break
      case 'client_requirements':
        value = Array.isArray(draft) ? (draft as string[]) : []
        break
      case 'security_considerations':
        value = Array.isArray(draft) ? (draft as string[]) : []
        break
      case 'future_enhancements':
        value = Array.isArray(draft) ? (draft as unknown[]) : []
        break
      default:
        value = draft as never
    }
    const body: Partial<Idea> = { [editing.field]: value } as Partial<Idea>
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) {
      setIdea(prev => {
        if (!prev) return prev
        const updated: Idea = { ...prev }
        if (editing.field === 'summary') updated.summary = value as string
        else if (editing.field === 'steps') updated.steps = value as string[]
        else if (editing.field === 'client_requirements') updated.client_requirements = value as string[]
        else if (editing.field === 'security_considerations') updated.security_considerations = value as string[]
        else if (editing.field === 'future_enhancements') updated.future_enhancements = value as unknown[]
        return updated
      })
      cancelEdit()
    }
  }

  return (
    <div className="space-y-6">
      {/* Client-side Stage Graphic (Read-only) */}
      {project && project.project_stage && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Project Phase</h3>
          <div className="flex items-center justify-between text-xs font-medium">
            {['Scope','Discovery','UX/UI','Development','Q/C','Launch'].map((s, i) => {
              const currentStage = project.project_stage || 'Scope';
              const stageIndex = ['Scope','Discovery','UX/UI','Development','Q/C','Launch'].indexOf(currentStage);
              const isActive = stageIndex >= i;
              return (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded ${i===0?'':'mx-1'} ${isActive ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                  <div className={`mt-2 text-center ${isActive ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>{s}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <header className="flex items-start justify-between gap-3">
        <div>
          {editing.field === 'title' ? (
            <div className="flex items-start gap-2">
              <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-base" value={(draft as string) || String(idea?.title||'')} onChange={e=>setDraft(e.target.value)} />
              <button className="btn-primary" onClick={async()=>{ if(!idea) return; const val=String(draft||''); const r=await fetch(`${api}/agent-ideas/${idea.id}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({title:val})}).then(r=>r.json()).catch(()=>null); if(r&&r.ok){ setIdea(prev=>prev?{...prev,title:val}:prev); cancelEdit() } }}>Save</button>
              <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-[var(--color-text)]">{String(idea?.title || 'Project').replace(/^Draft:\s*/i,'')}</h1>
              <button className="btn-secondary px-2 py-1 text-xs" onClick={()=>startEdit('title', idea?.title || '')}>Edit</button>
            </div>
          )}
          {editing.field === 'summary' ? (
            <div className="mt-2 flex gap-2">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2" rows={4} value={(draft as string) || ''} onChange={e=>setDraft(e.target.value)} />
              <div className="flex flex-col gap-2">
                <button className="btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className="mt-1 max-w-3xl text-[var(--color-text-muted)]">{idea?.summary || '—'}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {idea?.status && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              idea.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
              idea.status === 'Pending Advisor' ? 'bg-yellow-100 text-yellow-700' :
              idea.status === 'Waiting Client Feedback' ? 'bg-brand-100 text-brand-700' :
              idea.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
              'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
            }`}>{idea.status}</span>
          )}
          {idea?.status === 'Draft' ? (
            <>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this draft?')) {
                    fetch(`${api}/projects/${projectNumericId}/draft`, { 
                      method: 'DELETE', 
                      headers: authHeaders 
                    }).then(() => window.location.href = '/projects')
                  }
                }}
              >
                Delete Draft
              </button>
              <button 
                className="btn-primary" 
                onClick={() => window.location.href = `/chat?projectId=${projectNumericId}`}
              >
                Continue Chat
              </button>
            </>
          ) : (
            // Client view: only show compact export and delete icons
            <div className="flex items-center gap-2">
              <button 
                className="rounded-md border border-[var(--color-border)] bg-white p-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
                aria-label="Export PDF"
                title="Export PDF"
                onClick={() => window.print()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v12h2V4h8V2zm4 4h-8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 14h-8V8h8v12zm-6-3h4v2h-4v-2zm0-4h6v2h-6v-2z"/>
                </svg>
              </button>
              <button
                className="rounded-md border border-[var(--color-border)] bg-white p-2 text-red-600 hover:bg-red-50"
                aria-label="Delete project"
                title="Delete project"
                onClick={async () => {
                  if (!confirm('Delete this project permanently?')) return
                  await fetch(`${api}/client/projects/${projectNumericId}`, { method: 'DELETE', headers: authHeaders })
                  window.location.href = '/projects'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 3h6v2h5v2H4V5h5V3zm1 6h2v9h-2V9zm4 0h2v9h-2V9z"/></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <Tabs defaultValue="scope" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="scope">Detailed Scope</TabsTrigger>
          <TabsTrigger value="build-phases">Build Phases</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="technical">Technical Stack</TabsTrigger>
          <TabsTrigger value="enhancements">Enhancements</TabsTrigger>
          <TabsTrigger value="comm">Communication</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="scope" className="space-y-6">
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Executive Summary</h3>
              {editing.field !== 'summary' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startEdit('summary', idea?.summary || '')}>Edit</button>}
            </div>
            {editing.field === 'summary' ? null : (
              <div className="prose max-w-none">
                <p className="text-[var(--color-text-muted)] leading-relaxed">{idea?.summary || '—'}</p>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <h3 className="text-lg font-semibold">What This Module Will Do</h3>
            <div className="mt-3 space-y-3">
              {(() => {
                const stepsArr = Array.isArray(idea?.steps) ? idea?.steps : (idea?.steps ? [idea?.steps] : [])
                return stepsArr.map((s, i) => {
                  const { title, body } = splitTitleBodyProj(s)
                  // Remove any leading numbers from title to avoid duplication
                  const cleanTitle = title.replace(/^[\d\.\)]+\s*/, '')
                  return (
                  <div key={`${i}-${cleanTitle}`} className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-50)] text-sm font-semibold text-[var(--color-primary)]">{i + 1}</span><span className="font-medium text-[var(--color-text)]">{cleanTitle}</span></div>
                      {body && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{body}</p>}
                      {!(rowEdit.field==='steps' && rowEdit.index===i) && (
                        <button aria-label="Edit item" title="Edit" className="mt-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] self-end" onClick={()=>openRowEdit('steps', i, s)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                      )}
                      {rowEdit.field==='steps' && rowEdit.index===i && (
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                          <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-1" placeholder="Title" value={rowEdit.title} onChange={e=>setRowEdit(prev=>({...prev,title:e.target.value}))} />
                          <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-2" placeholder="Details" value={rowEdit.body} onChange={e=>setRowEdit(prev=>({...prev,body:e.target.value}))} />
                          <div className="flex gap-2 md:col-span-3">
                            <button className="btn-primary" onClick={saveRowEditItem}>Save</button>
                            <button className="btn-secondary" onClick={cancelRowEdit}>Cancel</button>
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">Deliverables: documentation, QA artifacts, and exportable assets.</p>
                    </div>
                  )
                })
              })()}
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-1" placeholder="Add step title" value={newStep} onChange={e=>setNewStep(e.target.value)} />
                <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-2" placeholder="Add step details" value={newReq} onChange={e=>setNewReq(e.target.value)} />
                <div className="flex gap-2 md:col-span-3">
                  <button className="btn-secondary text-xs" onClick={async ()=>{ if(!idea) return; const next=[...((idea.steps as string[] | undefined)||[]), newReq?`${cleanTextProj(newStep)}: ${cleanTextProj(newReq)}`:cleanTextProj(newStep)]; const r=await fetch(`${api}/agent-ideas/${idea.id}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({steps:next})}).then(r=>r.json()).catch(()=>null); if(r&&r.ok){ setIdea(prev=>prev?{...prev,steps:next as any}:prev); setNewStep(''); setNewReq('') } }}>Add Step</button>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="build-phases" className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold">Build Phases</h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Project development breakdown by phase</p>
          <div className="mt-6 space-y-6">
            {(() => {
              const phases = (idea as any)?.build_phases || []
              if (!Array.isArray(phases) || phases.length === 0) {
                return <p className="text-[var(--color-text-muted)]">No build phases defined yet.</p>
              }
              return phases.map((phase: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">{idx + 1}</span>
                    <div>
                      <h4 className="text-lg font-semibold text-[var(--color-text)]">{phase.phase || `Phase ${idx + 1}`}</h4>
                      {phase.duration && <span className="text-xs text-[var(--color-text-muted)]">Duration: {phase.duration}</span>}
                    </div>
                  </div>
                  {phase.description && <p className="text-sm text-[var(--color-text-muted)] mb-3">{phase.description}</p>}
                  {phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold text-[var(--color-text)] mb-2">Tasks</h5>
                      <ul className="list-disc pl-6 text-sm text-[var(--color-text-muted)] space-y-1">
                        {phase.tasks.map((task: string, ti: number) => <li key={ti}>{task}</li>)}
                      </ul>
                    </div>
                  )}
                  {phase.deliverables && Array.isArray(phase.deliverables) && phase.deliverables.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--color-text)] mb-2">Deliverables</h5>
                      <ul className="list-disc pl-6 text-sm text-[var(--color-text-muted)] space-y-1">
                        {phase.deliverables.map((del: string, di: number) => <li key={di}>{del}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            })()}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Client Requirements</h3>{editing.field !== 'client_requirements' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startEdit('client_requirements', idea?.client_requirements || [])}>Edit</button>}</div>
            {editing.field === 'client_requirements' ? (
              <div className="mt-3">
                <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(draft) ? (draft as string[]).join('\n') : ''} onChange={e=>setDraft(e.target.value.split('\n').filter(Boolean))} />
                <div className="mt-2 flex gap-2">
                  <button className="btn-primary" onClick={saveEdit}>Save</button>
                  <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <ul className="mt-2 text-[var(--color-text-muted)]">
                  {(idea?.client_requirements || []).map((r, idx) => {
                    const { title, body } = splitTitleBodyProjWithDefault(r, 'Requirement')
                    return (
                      <li key={`req-${idx}`} className="mb-3 list-none">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-[var(--color-text)]">{title}</div>
                          {!(rowEdit.field==='client_requirements' && rowEdit.index===idx) && (
                            <button aria-label="Edit item" title="Edit" className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] self-start" onClick={()=>openRowEdit('client_requirements', idx, r)}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                          )}
                        </div>
                        {body && <div className="mt-1">{body}</div>}
                        {rowEdit.field==='client_requirements' && rowEdit.index===idx && (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-1" placeholder="Title" value={rowEdit.title} onChange={e=>setRowEdit(prev=>({...prev,title:e.target.value}))} />
                            <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-2" placeholder="Details" value={rowEdit.body} onChange={e=>setRowEdit(prev=>({...prev,body:e.target.value}))} />
                            <div className="flex gap-2 md:col-span-3">
                              <button className="btn-primary" onClick={saveRowEditItem}>Save</button>
                              <button className="btn-secondary" onClick={cancelRowEdit}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" placeholder="Add requirement" value={newReq} onChange={e=>setNewReq(e.target.value)} />
                  <button className="btn-secondary text-xs" onClick={async ()=>{ if(!idea) return; const next=[...(idea.client_requirements||[]), cleanTextProj(newReq)]; const r=await fetch(`${api}/agent-ideas/${idea.id}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({client_requirements:next})}).then(r=>r.json()).catch(()=>null); if(r&&r.ok){ setIdea(prev=>prev?{...prev,client_requirements:next}:prev); setNewReq('') } }}>Add</button>
                </div>
              </>
            )}
          </section>
          
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">Project Integrations</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Link credentials from your profile to this project</p>
            
            {projectCredentials.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Linked Credentials</h4>
                <ul className="space-y-2">
                  {projectCredentials.map(cred => (
                    <li key={cred.id} className="flex items-center justify-between p-2 rounded-lg border border-[var(--color-border)]">
                      <div>
                        <div className="font-medium text-sm">{cred.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{cred.type === 'file' ? `File: ${cred.file_name}` : 'API Key'}</div>
                      </div>
                      <button 
                        className="btn-secondary text-xs px-2 py-1"
                        onClick={async () => {
                          const confirmed = confirm(`Remove ${cred.name} from this project?`);
                          if (confirmed) {
                            const r = await fetch(`${api}/projects/${projectNumericId}/credentials/${cred.id}`, {
                              method: 'DELETE',
                              headers: authHeaders
                            }).then(r=>r.json()).catch(()=>null);
                            if (r && r.ok) {
                              setProjectCredentials(prev => prev.filter(c => c.id !== cred.id));
                            }
                          }
                        }}
                      >Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 items-center">
              <select 
                className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
                onChange={async (e) => {
                  const credId = Number(e.target.value);
                  if (credId && credId > 0) {
                    const r = await fetch(`${api}/projects/${projectNumericId}/credentials`, {
                      method: 'POST',
                      headers: authHeaders,
                      body: JSON.stringify({ credential_id: credId })
                    }).then(r=>r.json()).catch(()=>null);
                    if (r && r.ok) {
                      const cred = allCredentials.find(c => c.id === credId);
                      if (cred && !projectCredentials.find(c => c.id === credId)) {
                        setProjectCredentials(prev => [...prev, cred]);
                      }
                      e.target.value = '';
                    }
                  }
                }}
                defaultValue=""
              >
                <option value="">Select a credential to link...</option>
                {allCredentials.filter(c => !projectCredentials.find(pc => pc.id === c.id)).map(cred => (
                  <option key={cred.id} value={cred.id}>{cred.name} ({cred.type === 'file' ? 'File' : 'API Key'})</option>
                ))}
              </select>
              <button 
                className="btn-secondary text-xs whitespace-nowrap"
                onClick={() => window.location.href = '/profile'}
              >
                Add New Integration
              </button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <h3 className="text-lg font-semibold">Technical Stack</h3>
            <div className="flex items-center justify-between">
              <div />
              {editing.field !== 'agent_stack' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>{ setEditing({ field: 'agent_stack' }); setDraft(JSON.stringify(idea?.agent_stack ?? {}, null, 2)) }}>Edit</button>}
            </div>
            {editing.field === 'agent_stack' ? (
              <div className="mt-3">
                <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm font-mono" rows={12} value={typeof draft === 'string' ? draft as string : JSON.stringify(draft, null, 2)} onChange={e=>setDraft(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button className="btn-primary" onClick={saveEdit}>Save</button>
                  <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              idea?.agent_stack ? (
                <div className="mt-2 text-sm">
                  {renderTechRoot(idea.agent_stack)}
                </div>
              ) : (
                <p className="mt-2 text-[var(--color-text-muted)]">—</p>
              )
            )}
          </section>
          
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Security</h3>{editing.field !== 'security_considerations' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startEdit('security_considerations', Array.isArray(idea?.security_considerations) ? idea?.security_considerations as string[] : [])}>Edit</button>}</div>
          {editing.field === 'security_considerations' ? (
            <div className="mt-3">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(draft) ? (draft as string[]).join('\n') : ''} onChange={e=>setDraft(e.target.value.split('\n').filter(Boolean))} />
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-2 text-[var(--color-text-muted)]">
                {Array.isArray(idea?.security_considerations) ? (idea?.security_considerations as string[]).map((r, idx) => {
                  const { title, body } = splitTitleBodyProj(r)
                  return (
                    <li key={`sec-${idx}`} className="mb-3 list-none">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-[var(--color-text)]">{title}</div>
                        {!(rowEdit.field==='security_considerations' && rowEdit.index===idx) && (
                          <button aria-label="Edit item" title="Edit" className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] self-start" onClick={()=>openRowEdit('security_considerations', idx, r)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                        )}
                      </div>
                      {body && <div className="mt-1">{body}</div>}
                      {rowEdit.field==='security_considerations' && rowEdit.index===idx && (
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                          <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-1" placeholder="Title" value={rowEdit.title} onChange={e=>setRowEdit(prev=>({...prev,title:e.target.value}))} />
                          <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-2" placeholder="Details" value={rowEdit.body} onChange={e=>setRowEdit(prev=>({...prev,body:e.target.value}))} />
                          <div className="flex gap-2 md:col-span-3">
                            <button className="btn-primary" onClick={saveRowEditItem}>Save</button>
                            <button className="btn-secondary" onClick={cancelRowEdit}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                }) : <li className="list-none">—</li>}
              </ul>
              <div className="mt-3 flex gap-2">
                <input className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" placeholder="Add security item" value={newSec} onChange={e=>setNewSec(e.target.value)} />
                <button className="btn-secondary text-xs" onClick={async ()=>{ if(!idea) return; const arr = Array.isArray(idea.security_considerations) ? (idea.security_considerations as string[]) : flattenToBulletsProj(idea.security_considerations); const next=[...arr, cleanTextProj(newSec)]; const r=await fetch(`${api}/agent-ideas/${idea.id}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({security_considerations:next})}).then(r=>r.json()).catch(()=>null); if(r&&r.ok){ setIdea(prev=>prev?{...prev,security_considerations:next}:prev); setNewSec('') } }}>Add</button>
              </div>
            </>
          )}
          </section>
        </TabsContent>

        <TabsContent value="enhancements" className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Enhancements</h3>{editing.field !== 'future_enhancements' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startEdit('future_enhancements', (idea?.future_enhancements as string[] | undefined) || [])}>Edit</button>}</div>
          {editing.field === 'future_enhancements' ? (
            <div className="mt-3">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(draft) ? (draft as string[]).join('\n') : ''} onChange={e=>setDraft(e.target.value.split('\n').filter(Boolean))} />
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <ul className="mt-2 pl-4 text-[var(--color-text-muted)] list-disc space-y-3">
              {Array.isArray(idea?.future_enhancements) ? (idea?.future_enhancements as unknown[]).map((r, idx) => (
                <div key={`enh-${idx}`} className="group">
                  {!(rowEdit.field==='future_enhancements' && rowEdit.index===idx) ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {renderEnhancementItem(r, idx)}
                      </div>
                      <button 
                        aria-label="Edit item" 
                        title="Edit" 
                        className="flex-shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] opacity-0 group-hover:opacity-100 transition" 
                        onClick={()=>openRowEdit('future_enhancements', idx, r)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    </div>
                  ) : null}
                  {rowEdit.field==='future_enhancements' && rowEdit.index===idx && (
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-1" placeholder="Title" value={rowEdit.title} onChange={e=>setRowEdit(prev=>({...prev,title:e.target.value}))} />
                      <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm md:col-span-2" placeholder="Details" value={rowEdit.body} onChange={e=>setRowEdit(prev=>({...prev,body:e.target.value}))} />
                      <div className="flex gap-2 md:col-span-3">
                        <button className="btn-primary" onClick={saveRowEditItem}>Save</button>
                        <button className="btn-secondary" onClick={cancelRowEdit}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )) : <li>—</li>}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" placeholder="Add enhancement" value={newEnh} onChange={e=>setNewEnh(e.target.value)} />
            <button className="btn-secondary text-xs" onClick={async ()=>{ if(!idea) return; const next=[...((idea.future_enhancements as string[] | undefined) || []), cleanTextProj(newEnh)]; const r=await fetch(`${api}/agent-ideas/${idea.id}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({future_enhancements:next})}).then(r=>r.json()).catch(()=>null); if(r&&r.ok){ setIdea(prev=>prev?{...prev,future_enhancements:next}:prev); setNewEnh('') } }}>Add</button>
          </div>
        </TabsContent>

        <TabsContent value="comm" className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          {proposal && proposal.status==='pending' && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 text-base font-semibold text-amber-900">Proposal awaiting your approval</div>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div><span className="text-[var(--color-text-muted)]">Name:</span> <span className="font-medium">{proposal.name}</span></div>
                <div><span className="text-[var(--color-text-muted)]">Cost:</span> <span className="font-medium">{proposal.cost||'-'}</span></div>
                <div><span className="text-[var(--color-text-muted)]">Hours:</span> <span className="font-medium">{proposal.hours||'-'}</span></div>
                <div><span className="text-[var(--color-text-muted)]">Est. API Fees:</span> <span className="font-medium">{proposal.api_fees||'-'}</span></div>
                <div><span className="text-[var(--color-text-muted)]">Comparison human cost:</span> <span className="font-medium">{proposal.human_cost||'-'}</span></div>
                <div><span className="text-[var(--color-text-muted)]">Comparison human timeline:</span> <span className="font-medium">{proposal.human_timeline||'-'}</span></div>
              </div>
              <div className="mt-3 text-right">
                <button 
                  className="btn-primary" 
                  disabled={acceptingProposal}
                  onClick={async()=>{
                    if (acceptingProposal) return
                    setAcceptingProposal(true)
                    try {
                      const r = await fetch(`${api}/client/projects/${projectNumericId}/proposal/accept`, { method:'POST', headers: authHeaders }).then(r=>r.json()).catch(()=>null)
                      if (r && r.ok) { 
                        alert('Accepted! Moving to production.')
                        setProposal(null) // Remove proposal from UI immediately
                        window.location.reload()
                      } else {
                        alert(r?.error || 'Failed to accept')
                        setAcceptingProposal(false)
                      }
                    } catch {
                      alert('Failed to accept')
                      setAcceptingProposal(false)
                    }
                  }}
                >
                  {acceptingProposal ? 'Processing...' : 'Accept Proposal'}
                </button>
              </div>
            </div>
          )}
          <ProjectCommunication projectId={projectNumericId} />
        </TabsContent>

        <TabsContent value="docs" className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <ProjectDocs projectId={projectNumericId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// (Shared ProjectCommunication imported from components)


