"use client"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

type Idea = {
  id: string
  title: string
  summary: string
  steps?: any
  agent_stack?: Record<string, unknown>
  client_requirements?: any
  implementation_estimate?: any
  security_considerations?: any
  future_enhancements?: any
}

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>()
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [idea, setIdea] = useState<Idea | null>(null)
  const [tab, setTab] = useState<'scope'|'technical'|'requirements'|'security'|'enhancements'>('scope')
  const [rowEdit, setRowEdit] = useState<{ field: keyof Idea | null; index: number | null; title: string; body: string }>({ field: null, index: null, title: '', body: '' })
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch(`${api}/ideas/${encodeURIComponent(params.id)}`, { headers: authHeaders }).then(r=>r.json())
        if (r && r.ok && r.idea) {
          const sanitize = (it: any): Idea => {
            const tryParse = (val: any, fallback: any) => {
              if (val == null) return fallback
              if (typeof val === 'string') { try { const p = JSON.parse(val); return p ?? fallback } catch { return fallback } }
              return val
            }
            const steps = tryParse(it.steps, [])
            const agent_stack = tryParse(it.agent_stack, {})
            const client_requirements = tryParse(it.client_requirements, [])
            const implementation_estimate = tryParse(it.implementation_estimate, null)
            const security_considerations = tryParse(it.security_considerations, [])
            const future_enhancements = tryParse(it.future_enhancements, [])
            return { ...it, steps, agent_stack, client_requirements, implementation_estimate, security_considerations, future_enhancements }
          }
          setIdea(sanitize(r.idea))
        }
      } catch {}
    })()
  },[api, authHeaders, params.id])

  if (!idea) return <div className="text-sm text-[var(--color-text-muted)]">Loading…</div>

  const cleanText = (s: string): string => s
    .replace(/<[^>]*>/g,'')
    .replace(/```[\s\S]*?```/g,'')
    .replace(/~~~[\s\S]*?~~~/g,'')
    .replace(/\*\*+/g,'')
    .replace(/\s+/g,' ')
    .trim()

  const splitTitleBody = (s: string): { title: string; body: string } => {
    const t = cleanText(s)
    const idx = t.indexOf(':')
    if (idx > 0 && idx < 150) return { title: t.slice(0, idx).trim(), body: t.slice(idx + 1).trim() }
    return { title: `Step`, body: t }
  }

  const splitWithDefault = (v: any, def: string): { title: string; body: string } => {
    if (typeof v === 'string') return splitTitleBody(v)
    if (v && typeof v === 'object') {
      const title = v.title || v.name || v.requirement || def
      const body = v.description || v.details || v.body || ''
      return { title: cleanText(String(title)), body: cleanText(String(body)) }
    }
    return { title: def, body: cleanText(String(v)) }
  }

  const renderStep = (s: unknown, i: number) => {
    if (s == null) return null
    if (typeof s === 'string') {
      const str = s.trim()
      // Attempt to parse JSON-like strings
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          const obj = JSON.parse(str)
          const title = obj.title || obj.phase || obj.name || obj.task || `Step ${i+1}`
          const body = obj.description || obj.details || ''
          const tasks = obj.sub_tasks || obj.subtasks || obj.tasks || []
          return (
            <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="font-medium text-[var(--color-text)]">{cleanText(String(title))}</div>
              {body && <div className="mt-1 text-sm text-[var(--color-text-muted)]">{cleanText(String(body))}</div>}
              {Array.isArray(tasks) && tasks.length>0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-muted)]">
                  {tasks.map((t:any, idx:number)=>{
                    if (typeof t === 'string') {
                      try { const o = JSON.parse(t); return <li key={idx}>{o.task ? `${cleanText(String(o.task))}: ${o.details?cleanText(String(o.details)):''}` : cleanText(String(t))}</li> } catch { return <li key={idx}>{cleanText(String(t))}</li> }
                    }
                    if (t && typeof t === 'object') {
                      const ti = (t.task || t.title || t.name) ? cleanText(String(t.task || t.title || t.name)) : ''
                      const de = t.details || t.description ? cleanText(String(t.details || t.description)) : ''
                      const txt = ti || de ? `${ti}${ti && de ? ': ' : ''}${de}` : cleanText(JSON.stringify(t))
                      return <li key={idx}>{txt}</li>
                    }
                    return <li key={idx}>{cleanText(String(t))}</li>
                  })}
                </ul>
              )}
            </div>
          )
        } catch {}
      }
      const { title, body } = splitTitleBody(str)
      return (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="font-medium text-[var(--color-text)]">{cleanText(title)}</div>
          {body && <div className="mt-1 text-sm text-[var(--color-text-muted)]">{cleanText(body)}</div>}
        </div>
      )
    }
    if (typeof s === 'object') {
      const obj = s as Record<string, any>
      const title = obj.title || obj.phase || `Step ${i+1}`
      const body = obj.description || ''
      const tasks: any[] = obj.sub_tasks || obj.subtasks || obj.tasks || []
      return (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="font-medium text-[var(--color-text)]">{cleanText(String(title))}</div>
          {body && <div className="mt-1 text-sm text-[var(--color-text-muted)]">{cleanText(String(body))}</div>}
          {Array.isArray(tasks) && tasks.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-muted)]">
              {tasks.map((t, idx)=> {
                if (typeof t==='string') return <li key={idx}>{cleanText(t)}</li>
                if (t && typeof t === 'object') {
                  const ti = (t.task || t.title || t.name) ? cleanText(String(t.task || t.title || t.name)) : ''
                  const de = t.details || t.description ? cleanText(String(t.details || t.description)) : ''
                  const txt = ti || de ? `${ti}${ti && de ? ': ' : ''}${de}` : cleanText(JSON.stringify(t))
                  return <li key={idx}>{txt}</li>
                }
                return <li key={idx}>{cleanText(String(t))}</li>
              })}
            </ul>
          )}
        </div>
      )
    }
    return (
      <div key={i} className="rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]">{String(s)}</div>
    )
  }

  const normalizeToArray = (v: any): any[] => {
    if (v == null) return []
    if (Array.isArray(v)) return v
    return [v]
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

  const openRowEdit = (field: keyof Idea, index: number, value: unknown) => {
    const { title, body } = splitWithDefault(value, 'Item')
    setRowEdit({ field, index, title, body })
  }
  const cancelRowEdit = () => setRowEdit({ field: null, index: null, title: '', body: '' })
  const saveRowEditItem = async () => {
    if (!idea || rowEdit.field == null || rowEdit.index == null) return
    const list = Array.isArray((idea as any)[rowEdit.field]) ? [ ...(idea as any)[rowEdit.field] ] as string[] : []
    list[rowEdit.index] = rowEdit.body ? `${rowEdit.title}: ${rowEdit.body}` : rowEdit.title
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    const headers = t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method:'PUT', headers, body: JSON.stringify({ [rowEdit.field]: list }) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) {
      setIdea(prev => prev ? ({ ...prev, [rowEdit.field as string]: list } as Idea) : prev)
      cancelRowEdit()
    }
  }
  const deleteRowItem = async (field: keyof Idea, index: number) => {
    if (!idea) return
    const list = Array.isArray((idea as any)[field]) ? [ ...(idea as any)[field] ] as string[] : []
    list.splice(index, 1)
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    const headers = t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
    const res = await fetch(`${api}/agent-ideas/${idea.id}`, { method:'PUT', headers, body: JSON.stringify({ [field]: list }) }).then(r=>r.json()).catch(()=>null)
    if (res && res.ok) setIdea(prev => prev ? ({ ...prev, [field as string]: list } as Idea) : prev)
  }

  const renderTechEntry = (key: string, val: unknown): JSX.Element => {
    const toTitle = (s: unknown): string => String(s).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (_: unknown, ch: string) => ch.toUpperCase())
    const label = <span className="font-medium text-[var(--color-text)] whitespace-nowrap">{toTitle(key)}:</span>
    if (val == null) return (
      <div key={key} className="text-sm"><span className="mr-2">{label}</span><span className="text-[var(--color-text-muted)]">—</span></div>
    )
    if (Array.isArray(val)) return (
      <div key={key} className="text-sm">
        <div>{label}</div>
        <ul className="mt-1 list-disc pl-6 text-[var(--color-text-muted)]">
          {val.map((item, i) => (
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">{idea.title}</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">{idea.summary}</p>
        </div>
      </header>

      <div className="w-full">
        <div className="grid w-full grid-cols-5 gap-1">
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='scope'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('scope')}>Detailed Scope</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='technical'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('technical')}>Technical Stack</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='requirements'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('requirements')}>Requirements</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='security'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('security')}>Security</button>
          <button className={`rounded-md px-3 py-2 text-sm ${tab==='enhancements'?'bg-[var(--color-primary-50)] text-[var(--color-primary)]':'hover:bg-[var(--color-surface-alt)]'}`} onClick={()=>setTab('enhancements')}>Enhancements</button>
        </div>

        {tab==='scope' && (
          <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            {normalizeToArray(idea.steps).length > 0 ? (
              <div className="space-y-2">
                {normalizeToArray(idea.steps).map((s: unknown, i: number)=> (
                  <div key={`s-${i}`} className="relative pb-7">
                    {renderStep(s, i)}
                    {!(rowEdit.field==='steps' && rowEdit.index===i) && (
                      <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('steps', i, s)}>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)]">—</div>
            )}
          </section>
        )}

        {tab==='technical' && (
          <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            {idea.agent_stack ? (
              <div className="space-y-2">
                {Object.entries(idea.agent_stack as Record<string, unknown>).map(([k,v]) => renderTechEntry(k, v))}
              </div>
            ) : <div className="text-sm text-[var(--color-text-muted)]">—</div>}
          </section>
        )}

        {tab==='requirements' && (
          <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            {normalizeToArray(idea.client_requirements).length ? (
              <ul className="text-sm text-[var(--color-text-muted)]">
                {normalizeToArray(idea.client_requirements).map((r, i)=> {
                  if (typeof r === 'string') {
                    const { title, body } = splitWithDefault(r, 'Requirement')
                    return (
                    <li key={i} className="mb-2 list-none relative pb-6">
                        <div className="font-medium text-[var(--color-text)]">{cleanText(title)}</div>
                        {body && <div className="mt-1">{cleanText(body)}</div>}
                      {!(rowEdit.field==='client_requirements' && rowEdit.index===i) && (
                        <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('client_requirements', i, r)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                      )}
                        {rowEdit.field==='client_requirements' && rowEdit.index===i && (
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
                  }
                  const { title, body } = splitWithDefault(r, 'Requirement')
                  return (
                    <li key={i} className="mb-2 list-none relative pb-6">
                      <div className="font-medium text-[var(--color-text)]">{title}</div>
                      {body && <div className="mt-1">{body}</div>}
                      {!(rowEdit.field==='client_requirements' && rowEdit.index===i) && (
                        <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('client_requirements', i, r)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                      )}
                      {rowEdit.field==='client_requirements' && rowEdit.index===i && (
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
            ) : <div className="text-sm text-[var(--color-text-muted)]">—</div>}
          </section>
        )}

        {tab==='security' && (
          <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            {normalizeToArray(idea.security_considerations).length ? (
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                {normalizeToArray(idea.security_considerations).map((r,i)=> {
                  const text = typeof r==='string' ? r : flattenToBullets(r).join('; ')
                  // Derive title from enhancement/title/name if present
                  const match = text.match(/(?:title|enhancement|name)\s*:\s*([^;]+)/i)
                  const title = match ? match[1].trim() : text.split(':')[0]
                  const descMatch = text.match(/description\s*:\s*([^;]+)/i)
                  const body = descMatch ? descMatch[1].trim() : (text.includes(':') ? text.split(':').slice(1).join(':').trim() : '')
                  return (
                    <li key={i} className="list-none relative pb-6">
                      <div className="font-medium text-[var(--color-text)]">{cleanText(title)}</div>
                      {body && <div className="mt-1">{cleanText(body)}</div>}
                      {!(rowEdit.field==='security_considerations' && rowEdit.index===i) && (
                        <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('security_considerations', i, r)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                      )}
                      {rowEdit.field==='security_considerations' && rowEdit.index===i && (
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
            ) : <div className="text-sm text-[var(--color-text-muted)]">—</div>}
          </section>
        )}

        {tab==='enhancements' && (
          <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            {normalizeToArray(idea.future_enhancements).length ? (
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                {normalizeToArray(idea.future_enhancements).map((r: any, i: number)=> {
                  // For strings, try JSON parse first, then semicolon key:value extraction
                  if (typeof r === 'string') {
                    const s = r.trim()
                    if (s.startsWith('{') && s.endsWith('}')) {
                      try {
                        const obj = JSON.parse(s)
                        const title = obj.title || obj.enhancement || obj.name || 'Enhancement'
                        const desc = obj.description || ''
                        const impact = obj.impact || ''
                        const effort = obj.implementation_effort || ''
                        return (
                        <li key={i} className="list-none relative pb-6">
                            <div className="font-medium text-[var(--color-text)]">{cleanText(String(title))}</div>
                            {desc && <div className="mt-1">{cleanText(String(desc))}</div>}
                            {(impact || effort) && <div className="mt-0.5 text-xs">{impact?`Impact: ${cleanText(String(impact))}`:''}{impact&&effort?' · ':''}{effort?`Effort: ${cleanText(String(effort))}`:''}</div>}
                          {!(rowEdit.field==='future_enhancements' && rowEdit.index===i) && (
                            <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('future_enhancements', i, r)}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                          )}
                          </li>
                        )
                      } catch {}
                    }
                    const getKV = (k: string) => { const m = s.match(new RegExp(`${k}\\s*:\\s*([^;]+)`, 'i')); return m ? m[1].trim() : '' }
                    const titleKV = getKV('enhancement') || getKV('title') || getKV('name')
                    const descKV = getKV('description')
                    const impactKV = getKV('impact')
                    const effortKV = getKV('implementation_effort')
                    if (titleKV || descKV || impactKV || effortKV) {
                      return (
                        <li key={i} className="list-none relative pb-6">
                          <div className="font-medium text-[var(--color-text)]">{cleanText(titleKV || 'Enhancement')}</div>
                          {descKV && <div className="mt-1">{cleanText(descKV)}</div>}
                          {(impactKV || effortKV) && <div className="mt-0.5 text-xs">{impactKV?`Impact: ${cleanText(impactKV)}`:''}{impactKV&&effortKV?' · ':''}{effortKV?`Effort: ${cleanText(effortKV)}`:''}</div>}
                          {!(rowEdit.field==='future_enhancements' && rowEdit.index===i) && (
                            <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('future_enhancements', i, r)}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                          )}
                        </li>
                      )
                    }
                    const { title, body } = splitTitleBody(s)
                    return (
                       <li key={i} className="list-none relative pb-6">
                        <div className="font-medium text-[var(--color-text)]">{cleanText(title)}</div>
                        {body && <div className="mt-1">{cleanText(body)}</div>}
                        {!(rowEdit.field==='future_enhancements' && rowEdit.index===i) && (
                          <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('future_enhancements', i, r)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                        )}
                      </li>
                    )
                  }
                  // object
                  const title = r.title || r.enhancement || r.name || 'Enhancement'
                  const desc = r.description || ''
                  const impact = r.impact || ''
                  const effort = r.implementation_effort || ''
                  return (
                    <li key={i} className="list-none relative pb-6">
                      <div className="font-medium text-[var(--color-text)]">{cleanText(String(title))}</div>
                      {desc && <div className="mt-1">{cleanText(String(desc))}</div>}
                      {(impact || effort) && <div className="mt-0.5 text-xs">{impact?`Impact: ${cleanText(String(impact))}`:''}{impact&&effort?' · ':''}{effort?`Effort: ${cleanText(String(effort))}`:''}</div>}
                      {!(rowEdit.field==='future_enhancements' && rowEdit.index===i) && (
                        <button aria-label="Edit item" title="Edit" className="absolute bottom-1 right-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={()=>openRowEdit('future_enhancements', i, r)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : <div className="text-sm text-[var(--color-text-muted)]">—</div>}
          </section>
        )}
      </div>
    </div>
  )
}


