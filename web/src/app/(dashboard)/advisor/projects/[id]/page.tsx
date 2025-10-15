"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
// Replacing Radix Tabs with simple local tabs to avoid hydration issues
import { ProjectCommunication } from "@/components/ProjectCommunication"
import { ProjectDocs } from "@/components/ProjectDocs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StageChangeDialog } from "@/components/StageChangeDialog"

type Idea = {
  id: string
  title: string
  summary: string
  steps: string[] | any
  client_requirements?: string[] | any
  security_considerations?: string[] | Record<string, unknown> | any
  future_enhancements?: unknown[] | any
  status?: string
}

type Project = {
  id: number
  name: string
  status: string
  eta: string | null
}

export default function AdvisorProjectDetailPage({ params }: { params: { id: string } }) {
  // Ensure params is available before using it
  const projectId = params?.id ? Number(String(params.id).replace(/[^0-9]/g,'')) : 0
  const [project, setProject] = useState<Project | null>(null)
  const [idea, setIdea] = useState<Idea | null>(null)
  const [editingEta, setEditingEta] = useState(false)
  const [etaDraft, setEtaDraft] = useState<string>("")
  const [newReq, setNewReq] = useState("")
  const [newSec, setNewSec] = useState("")
  const [newEnh, setNewEnh] = useState("")
  const [newStep, setNewStep] = useState("")
  const [saving, setSaving] = useState(false)
  const [devPackage, setDevPackage] = useState<{ id: number; name: string } | null>(null)
  const [creatingPkg, setCreatingPkg] = useState<boolean>(false)
  const [createPkgError, setCreatePkgError] = useState<string>("")
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposal, setProposal] = useState<{ name: string; cost: string; hours: string; api_fees: string; human_cost: string; human_timeline: string }>({ name: '', cost:'', hours:'', api_fees:'', human_cost:'', human_timeline:'' })
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false)
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<{ from: string; to: string } | null>(null)
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null), [])

  useEffect(() => {
    (async () => {
      try {
        // Fetch project details
        const projectRes = await fetch(`${api}/advisor/projects/${projectId}`, { headers: authHeaders }).then(r=>r.json())
        if (projectRes.ok && projectRes.project) {
          setProject(projectRes.project)
          
          // If it's a draft, just show minimal info
          if (projectRes.project.status === 'Draft') {
            setIdea({
              id: String(projectRes.project.id),
              title: projectRes.project.name,
              summary: 'This is a draft project. The client needs to complete the specification.',
              steps: [],
              client_requirements: [],
              security_considerations: [],
              future_enhancements: [],
              status: 'Draft'
            })
            return
          }
          
          // Otherwise fetch the full idea
          const ideaRes = await fetch(`${api}/agent-ideas/by-project/${projectId}`, { headers: authHeaders }).then(r=>r.json())
          if (ideaRes.ok && ideaRes.idea) {
            setIdea({ ...ideaRes.idea, status: projectRes.project.status } as Idea)
          }
        }
      } catch {}
    })()
  }, [api, authHeaders, projectId])

  // no-op

  // Fetch files to detect latest Dev Package (advisor-only zip)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${api}/projects/${projectId}/files`, { headers: authHeaders }).then(r=>r.json())
        if (r && r.ok && Array.isArray(r.files)) {
          type F = { id: number; originalname: string; filename: string; created_at: string; advisor_only?: boolean }
          const files: F[] = r.files
          const candidates = files.filter(f => (f.originalname || f.filename).includes('dev-package') && f.advisor_only === true)
          if (candidates.length > 0) {
            candidates.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            const top = candidates[0]
            setDevPackage({ id: top.id, name: top.originalname || top.filename })
          }
        }
      } catch {}
    })()
  }, [api, authHeaders, projectId])

  useEffect(()=>{ if(project) setEtaDraft(project.eta || '') }, [project])
  const saveEta = useCallback(async () => {
    if (!project) return
    setSaving(true)
    try {
      const res = await fetch(`${api}/advisor/projects/${projectId}`, { method:'PUT', headers: authHeaders, body: JSON.stringify({ eta: etaDraft }) }).then(r=>r.json())
      if (res.ok) setProject(prev=>prev?{...prev, eta: etaDraft}:prev)
      setEditingEta(false)
    } finally { setSaving(false) }
  }, [api, authHeaders, projectId, etaDraft, project])

  const renderValue = (value: unknown): JSX.Element => {
    if (value == null) return <span>—</span>
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc space-y-1 pl-6">
          {value.map((v, i) => (
            <li key={i} className="text-sm text-[var(--color-text-muted)]">
              {typeof v === 'object' ? renderValue(v) : String(v)}
            </li>
          ))}
        </ul>
      )
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      return (
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="text-sm font-medium text-[var(--color-text)]">{k}</div>
              <div className="pl-4">{renderValue(v)}</div>
            </div>
          ))}
        </div>
      )
    }
    return <span className="text-sm text-[var(--color-text-muted)]">{String(value)}</span>
  }

  const flattenToBullets = (value: unknown): string[] => {
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

  const cleanText = (s: string): string => s.replace(/\*\*+/g, '').replace(/\s+/g, ' ').trim()

  // Match client view card formatting helpers for steps
  const splitTitleBody = (value: unknown): { title: string; body: string } => {
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      const title = obj.title ?? obj.step ?? obj.name ?? 'Item'
      const body = obj.body ?? obj.description ?? obj.details ?? ''
      return { title: cleanText(title as string), body: cleanText(body as string) }
    }
    const t = cleanText(String(value))
    const idx = t.indexOf(':')
    if (idx > 0 && idx < 150) return { title: t.slice(0, idx).trim(), body: t.slice(idx + 1).trim() }
    return { title: t, body: '' }
  }

  // Enhancement item renderer for advisor view
  const renderEnhancement = (item: unknown, key: string | number) => {
    const tryParse = (s: string) => { try { return JSON.parse(s) } catch { return null } }
    let data: unknown = item
    if (typeof item === 'string') {
      const parsed = tryParse(item)
      if (parsed && typeof parsed === 'object') data = parsed
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>
      const title = String(obj.enhancement || obj.title || 'Enhancement')
      const desc = obj.description ? String(obj.description) : ''
      const impact = obj.impact ? String(obj.impact) : ''
      const effort = obj.implementation_effort ? String(obj.implementation_effort) : ''
      return (
        <li key={String(key)} className="mb-2">
          <div className="font-medium text-[var(--color-text)]">{cleanText(title)}</div>
          {desc && <div className="text-sm text-[var(--color-text-muted)]">{cleanText(desc)}</div>}
          {(impact || effort) && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {impact && <>Impact: {cleanText(impact)}</>} {impact && effort && ' · '} {effort && <>Effort: {cleanText(effort)}</>}
            </div>
          )}
        </li>
      )
    }
    return <li key={String(key)}>{cleanText(String(item))}</li>
  }

  // Match client view technical stack renderer
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

  // Idea editing state (mirror client view capabilities)
  const [editingIdea, setEditingIdea] = useState<{ field: keyof Idea | null }>({ field: null })
  const [ideaDraft, setIdeaDraft] = useState<string | string[] | Record<string, unknown> | unknown[] | null>(null)

  const startIdeaEdit = (field: keyof Idea, value: string | string[] | Record<string, unknown> | unknown[]) => {
    setEditingIdea({ field })
    setIdeaDraft(value)
  }
  const cancelIdeaEdit = () => { setEditingIdea({ field: null }); setIdeaDraft(null) }
  const saveIdeaEdit = async () => {
    if (!idea || !editingIdea.field) return
    let value: Idea[keyof Idea]
    switch (editingIdea.field) {
      case 'summary':
        value = (ideaDraft as string) || ''
        break
      case 'steps':
        value = Array.isArray(ideaDraft) ? (ideaDraft as string[]) : []
        break
      case 'client_requirements':
        value = Array.isArray(ideaDraft) ? (ideaDraft as string[]) : []
        break
      case 'security_considerations':
        value = Array.isArray(ideaDraft) ? (ideaDraft as string[]) : []
        break
      case 'future_enhancements':
        value = Array.isArray(ideaDraft) ? (ideaDraft as unknown[]) : []
        break
      case 'agent_stack':
        try { value = typeof ideaDraft === 'string' ? JSON.parse(ideaDraft as string) : (ideaDraft as Record<string, unknown>) } catch { value = {} as never }
        break
      default:
        value = ideaDraft as never
    }
    const body: Partial<Idea> = { [editingIdea.field]: value } as Partial<Idea>
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) {
      setIdea(prev => {
        if (!prev) return prev
        const updated: Idea = { ...prev }
        if (editingIdea.field === 'summary') updated.summary = value as string
        else if (editingIdea.field === 'steps') updated.steps = value as string[]
        else if (editingIdea.field === 'client_requirements') updated.client_requirements = value as string[]
        else if (editingIdea.field === 'security_considerations') updated.security_considerations = value as string[]
        else if (editingIdea.field === 'future_enhancements') updated.future_enhancements = value as unknown[]
        else if (editingIdea.field === 'agent_stack') (updated as any).agent_stack = value
        return updated
      })
      cancelIdeaEdit()
    }
  }

  const statusBtnClass = (target: string) => (
    project.status === target
      ? 'rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-50'
      : 'rounded-md border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:bg-[var(--color-surface-alt)]'
  )

  const [tab, setTab] = useState<'scope'|'build-phases'|'requirements'|'technical'|'enhancements'|'comm'|'docs'>("scope")

  // Loading state - must be after all hooks
  if (!project || !idea) return <div>Loading...</div>

  return (
    <div key={`proj-${projectId}`} className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            {project.name.replace(/^Draft:\s*/i,'')} (PRJ-{String(project.id).padStart(4, '0')})
          </h1>
          <p className="text-[var(--color-text-muted)]">Project details and progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            project.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
            project.status === 'Pending Advisor' ? 'bg-yellow-100 text-yellow-700' :
            project.status === 'Waiting Client Feedback' ? 'bg-brand-100 text-brand-700' :
            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
            'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
          }`}>{project.status}</span>
          <button
            className="rounded-md border border-[var(--color-border)] bg-white p-2 text-red-600 hover:bg-red-50"
            aria-label="Delete project"
            title="Delete project"
            onClick={async ()=>{
              if (!confirm('Delete this project permanently?')) return
              await fetch(`${api}/advisor/projects/${projectId}`, { method:'DELETE', headers: authHeaders })
              window.location.href = '/advisor'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 3h6v2h5v2H4V5h5V3zm1 6h2v9h-2V9zm4 0h2v9h-2V9z"/></svg>
          </button>
        </div>
      </header>

      {/* Stage Change Dialog */}
      {pendingStageChange && (
        <StageChangeDialog
          open={stageChangeDialogOpen}
          onOpenChange={setStageChangeDialogOpen}
          projectId={projectId}
          currentStage={pendingStageChange.from}
          newStage={pendingStageChange.to}
          onSuccess={() => {
            // Refresh project data to show updated state
            window.location.reload()
          }}
        />
      )}

      {/* Build Phase Timeline */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Project Phase</h3>
          <select 
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs"
            value={(project as any).project_stage || 'Scope'}
            onChange={(e) => {
              const newStage = e.target.value;
              const currentStage = (project as any).project_stage || 'Scope';
              
              if (newStage === currentStage) return;
              
              // Open the stage change dialog instead of directly updating
              setPendingStageChange({ from: currentStage, to: newStage });
              setStageChangeDialogOpen(true);
              
              // Reset the dropdown to current value (it will update after approval)
              e.target.value = currentStage;
            }}
          >
            <option value="Scope">Scope</option>
            <option value="Discovery">Discovery</option>
            <option value="UX/UI">UX/UI</option>
            <option value="Development">Development</option>
            <option value="Q/C">Q/C</option>
            <option value="Launch">Launch</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs font-medium">
          {['Scope','Discovery','UX/UI','Development','Q/C','Launch'].map((s, i) => {
            const currentStage = (project as any).project_stage || 'Scope';
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

      {/* Project Info Section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold">Project Information</h2>
        <div className="grid gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-muted)] w-24">Status</span>
            <span className="rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
              {project.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-muted)] w-24">ETA</span>
            {editingEta ? (
              <div className="flex items-center gap-2">
                <input className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" value={etaDraft} onChange={e=>setEtaDraft(e.target.value)} placeholder="e.g., 2 weeks" />
                <button className="btn-primary text-xs" onClick={saveEta} disabled={saving}>{saving?'Saving...':'Save'}</button>
                <button className="btn-secondary text-xs" onClick={()=>{ setEditingEta(false); setEtaDraft(project.eta || '') }}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{project.eta || 'Not set'}</span>
                <button onClick={()=>setEditingEta(true)} className="text-xs text-[var(--color-primary)] underline">Edit ETA</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-muted)] w-24">Dev Package</span>
            {devPackage ? (
              <div className="flex items-center gap-2">
                <a href={`${api}/projects/${projectId}/files/${devPackage.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`} className="text-sm text-[var(--color-primary)] underline">
                  {devPackage.name}
                </a>
                <button
                  className="text-red-600 hover:text-red-700"
                  aria-label="Delete package"
                  title="Delete package"
                  onClick={async ()=>{
                    if (!confirm(`Delete ${devPackage.name}?`)) return
                    try {
                      const r = await fetch(`${api}/projects/${projectId}/files`, { headers: authHeaders }).then(r=>r.json())
                      if (!r?.ok) return alert(r?.error || 'Could not load files')
                      type F = { id:number; originalname:string; filename:string; created_at:string; advisor_only?:boolean; mimetype?:string|null }
                      const files: F[] = r.files || []
                      const latest = files.filter(f => (f.advisor_only === true) && ((f.mimetype||'')==='application/zip' || (f.filename||'').endsWith('.zip') || (f.originalname||'').endsWith('.zip')))
                                          .sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                      if (!latest) return alert('No advisor-only dev package found to delete')
                      const del = await fetch(`${api}/advisor/projects/${projectId}/dev-package/${latest.id}`, { method:'DELETE', headers: authHeaders }).then(r=>r.json())
                      if (del?.ok) { alert('Deleted'); setDevPackage(null) }
                      else alert(del?.error || 'Delete failed')
                    } catch { alert('Delete failed') }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M9 3h6v2h5v2H4V5h5V3zm1 6h2v9h-2V9zm4 0h2v9h-2V9z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                className="text-sm text-[var(--color-primary)] underline disabled:opacity-50"
                disabled={creatingPkg}
                onClick={async ()=>{
                  setCreatePkgError("")
                  setCreatingPkg(true)
                  try {
                    const resp = await fetch(`${api}/advisor/projects/${projectId}/dev-package`, { method: 'POST', headers: authHeaders })
                    let data: any = null
                    try { data = await resp.json() } catch { const t = await resp.text(); data = { ok: false, error: t?.slice(0,200) || 'Invalid response' } }
                    if (data && data.ok) {
                      setDevPackage({ id: Number(data.fileId), name: String(data.filename) })
                    } else {
                      setCreatePkgError(String(data?.error || 'Failed to create Dev Package'))
                    }
                  } catch {
                    setCreatePkgError('Failed to create Dev Package')
                  } finally {
                    setCreatingPkg(false)
                  }
                }}
              >{creatingPkg ? 'Creating...' : 'Create Dev Package'}</button>
            )}
          </div>
          {createPkgError && <div className="text-xs text-red-600">{createPkgError}</div>}
          {/* Advisor Controls */}
          <div className="mt-2 flex flex-wrap gap-2">
            <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
              <DialogTrigger asChild>
                <button className={statusBtnClass('In production')} onClick={()=>{
                  setProposal({ name: project.name.replace(/^Draft:\s*/i,''), cost:'', hours:'', api_fees:'', human_cost:'', human_timeline:'' })
                }}>Approve</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve project – proposal</DialogTitle>
                  <DialogDescription>Set budget and timeline. This will be sent to the client for acceptance.</DialogDescription>
                </DialogHeader>
                <div className="mb-4 flex justify-end">
                  <button 
                    className="btn-secondary text-xs flex items-center gap-2"
                    disabled={loadingAiSuggestion}
                    onClick={async () => {
                      setLoadingAiSuggestion(true);
                      try {
                        const r = await fetch(`${api}/advisor/projects/${projectId}/ai-suggest-pricing`, {
                          method: 'POST',
                          headers: authHeaders
                        }).then(r=>r.json()).catch(()=>null);
                        
                        if (r && r.ok && r.suggestions) {
                          setProposal({
                            name: r.suggestions.name || proposal.name,
                            cost: r.suggestions.cost || '',
                            hours: r.suggestions.hours || '',
                            api_fees: r.suggestions.api_fees || '',
                            human_cost: r.suggestions.human_cost || '',
                            human_timeline: r.suggestions.human_timeline || ''
                          });
                        } else {
                          alert(r?.error || 'Failed to generate AI suggestions');
                        }
                      } catch (e) {
                        alert('Error generating suggestions');
                      } finally {
                        setLoadingAiSuggestion(false);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    {loadingAiSuggestion ? 'AI Analyzing...' : 'AI Suggest'}
                  </button>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 text-sm">
                  <label className="text-[var(--color-text-muted)]">Name</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.name} onChange={e=>setProposal(prev=>({...prev,name:e.target.value}))} />
                  <label className="text-[var(--color-text-muted)]">Cost of Project</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.cost} onChange={e=>setProposal(prev=>({...prev,cost:e.target.value}))} placeholder="$15,000" />
                  <label className="text-[var(--color-text-muted)]">Hours of project</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.hours} onChange={e=>setProposal(prev=>({...prev,hours:e.target.value}))} placeholder="120 hours" />
                  <label className="text-[var(--color-text-muted)]">Est. Build API Fees</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.api_fees} onChange={e=>setProposal(prev=>({...prev,api_fees:e.target.value}))} placeholder="$1,200" />
                  <label className="text-[var(--color-text-muted)]">Total Hours - Humans</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.human_timeline} onChange={e=>setProposal(prev=>({...prev,human_timeline:e.target.value}))} placeholder="500 hours" />
                  <label className="text-[var(--color-text-muted)]">Comparison cost (humans)</label>
                  <input className="rounded-md border border-[var(--color-border)] px-2 py-1" value={proposal.human_cost} onChange={e=>setProposal(prev=>({...prev,human_cost:e.target.value}))} placeholder="$65,000" />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button className="btn-secondary" onClick={()=>setProposalOpen(false)}>Cancel</button>
                  <button className="btn-primary" onClick={async ()=>{
                    const r = await fetch(`${api}/advisor/projects/${projectId}/proposal`, { method:'POST', headers: authHeaders, body: JSON.stringify(proposal) }).then(r=>r.json()).catch(()=>null)
                    if (r && r.ok) { setProposalOpen(false); setProject(p=>p?{...p,status:'Waiting Client Feedback'}:p) }
                    else alert(r?.error||'Failed')
                  }}>Send for acceptance</button>
                </div>
              </DialogContent>
            </Dialog>
            <button className={statusBtnClass('Waiting Client Feedback')} onClick={async ()=>{
              await fetch(`${api}/advisor/projects/${projectId}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({status:'Waiting Client Feedback'})});
              setProject(p=>p?{...p,status:'Waiting Client Feedback'}:p)
            }}>Need Client Input</button>
            <button className={statusBtnClass('Completed')} onClick={async ()=>{
              await fetch(`${api}/advisor/projects/${projectId}`,{method:'PUT',headers:authHeaders,body:JSON.stringify({status:'Completed'})});
              setProject(p=>p?{...p,status:'Completed'}:p)
            }}>Mark As Completed</button>
          </div>
        </div>
      </div>

      {/* Removed Radix Dialog to prevent hydration mismatches */}

      {/* Simple tabs */}
      <div className="w-full">
        <div className="grid w-full grid-cols-7 gap-1">
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='scope'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('scope')}>Detailed Scope</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='build-phases'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('build-phases')}>Build Phases</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='requirements'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('requirements')}>Requirements</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='technical'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('technical')}>Technical Stack</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='enhancements'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('enhancements')}>Enhancements</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='comm'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('comm')}>Communication</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='docs'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('docs')}>Docs</button>
        </div>

        {tab==='scope' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Executive Summary</h3>
              {editingIdea.field !== 'summary' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('summary', idea.summary || '')}>Edit</button>}
            </div>
            {editingIdea.field === 'summary' ? (
              <div className="mt-2">
                <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={4} value={(ideaDraft as string) || ''} onChange={e=>setIdeaDraft(e.target.value)} />
                <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
              </div>
            ) : (
              <div className="prose max-w-none">
                <p className="text-[var(--color-text-muted)] leading-relaxed">{idea.summary}</p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">What This Module Will Do</h3>{editingIdea.field !== 'steps' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('steps', idea.steps || [])}>Edit</button>}</div>
            <div className="mt-3 space-y-3">
              {Array.isArray(idea.steps) && idea.steps.map((s, i) => {
                const { title, body } = splitTitleBody(s)
                return (
                  <div key={`${i}-${title}`} className="rounded-lg border border-[var(--color-border)] p-3">
                    <div className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-50)] text-sm font-semibold text-[var(--color-primary)]">{i + 1}</span><span className="font-medium text-[var(--color-text)]">{title}</span></div>
                    {body && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{body}</p>}
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Deliverables: documentation, QA artifacts, and exportable assets.</p>
                  </div>
                )
              })}
              {!Array.isArray(idea.steps) && <p className="text-sm text-[var(--color-text-muted)]">No implementation steps defined.</p>}
            </div>
            {editingIdea.field === 'steps' && (
              <div className="mt-3">
                <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(ideaDraft) ? (ideaDraft as string[]).join('\n') : ''} onChange={e=>setIdeaDraft(e.target.value.split('\n').filter(Boolean))} />
                <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
              </div>
            )}
          </div>
        </div>
        )}

        {tab==='build-phases' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
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
        </div>
        )}

        {tab==='requirements' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Client Requirements</h3>{editingIdea.field !== 'client_requirements' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('client_requirements', idea.client_requirements || [])}>Edit</button>}</div>
          {editingIdea.field === 'client_requirements' ? (
            <div className="mt-3">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(ideaDraft) ? (ideaDraft as string[]).join('\n') : ''} onChange={e=>setIdeaDraft(e.target.value.split('\n').filter(Boolean))} />
              <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
            </div>
          ) : (
            <ul className="mt-2 text-[var(--color-text-muted)]">
              {Array.isArray(idea.client_requirements) ? idea.client_requirements.map((r, i) => {
                const { title, body } = splitTitleBody(r)
                return (
                  <li key={i} className="mb-3 list-none">
                    <div className="font-medium text-[var(--color-text)]">{title}</div>
                    {body && <div className="mt-1">{body}</div>}
                  </li>
                )
              }) : <li className="list-none text-sm">No requirements specified.</li>}
            </ul>
          )}
        </div>
        )}

        {tab==='technical' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Technical Stack</h3>{editingIdea.field !== 'agent_stack' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('agent_stack', JSON.stringify((idea as any).agent_stack ?? {}, null, 2))}>Edit</button>}</div>
            {editingIdea.field === 'agent_stack' ? (
              <div className="mt-3">
                <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm font-mono" rows={12} value={typeof ideaDraft === 'string' ? (ideaDraft as string) : JSON.stringify(ideaDraft, null, 2)} onChange={e=>setIdeaDraft(e.target.value)} />
                <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
              </div>
            ) : (
              <div className="mt-2 text-sm">
                {renderTechRoot((idea as unknown as { agent_stack?: Record<string, unknown> }).agent_stack)}
              </div>
            )}
          </div>
          
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Security</h3>{editingIdea.field !== 'security_considerations' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('security_considerations', Array.isArray(idea.security_considerations) ? idea.security_considerations as string[] : [])}>Edit</button>}</div>
          {editingIdea.field === 'security_considerations' ? (
            <div className="mt-3">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(ideaDraft) ? (ideaDraft as string[]).join('\n') : ''} onChange={e=>setIdeaDraft(e.target.value.split('\n').filter(Boolean))} />
              <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
            </div>
          ) : (
            <ul className="mt-2 text-[var(--color-text-muted)]">
              {Array.isArray(idea.security_considerations) ? (idea.security_considerations as string[]).map((r, i) => {
                const { title, body } = splitTitleBody(r)
                return (
                  <li key={i} className="mb-3 list-none">
                    <div className="font-medium text-[var(--color-text)]">{title}</div>
                    {body && <div className="mt-1">{body}</div>}
                  </li>
                )
              }) : <li className="list-none">—</li>}
            </ul>
          )}
          </div>
        </div>
        )}

        {tab==='enhancements' && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Enhancements</h3>{editingIdea.field !== 'future_enhancements' && <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>startIdeaEdit('future_enhancements', (idea.future_enhancements as string[] | undefined) || [])}>Edit</button>}</div>
          {editingIdea.field === 'future_enhancements' ? (
            <div className="mt-3">
              <textarea className="w-full rounded-md border border-[var(--color-border)] p-2 text-sm" rows={8} value={Array.isArray(ideaDraft) ? (ideaDraft as string[]).join('\n') : ''} onChange={e=>setIdeaDraft(e.target.value.split('\n').filter(Boolean))} />
              <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={saveIdeaEdit}>Save</button><button className="btn-secondary" onClick={cancelIdeaEdit}>Cancel</button></div>
            </div>
          ) : (
            Array.isArray(idea.future_enhancements) ? (
              <ul className="mt-2 pl-4 list-disc text-[var(--color-text-muted)]">
                {(idea.future_enhancements as unknown[]).map((r, i) => renderEnhancement(r, i))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-[var(--color-text-muted)]">—</div>
            )
          )}
        </div>
        )}

        {tab==='comm' && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card"><ProjectCommunication projectId={projectId} /></div>
        )}
        {tab==='docs' && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card"><ProjectDocs projectId={projectId} /></div>
        )}
      </div>
    </div>
  )
}
// Cache bust: Wed Sep 24 15:26:57 PDT 2025
