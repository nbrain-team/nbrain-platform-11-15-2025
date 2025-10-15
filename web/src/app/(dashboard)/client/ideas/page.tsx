"use client"
import { useEffect, useMemo, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Idea = { id: string; title: string; summary: string; implementation_estimate?: any }

export default function ClientIdeasPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Idea | null>(null)
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch(`${api}/client/ideas`, { headers: authHeaders }).then(r=>r.json())
        if (r && r.ok && Array.isArray(r.ideas)) setIdeas(r.ideas)
      } catch {}
    })()
  },[api, authHeaders])

  const truncate = (text: string, n: number) => {
    if (!text) return ''
    const t = text.trim()
    return t.length > n ? t.slice(0, n) + ' ...' : t
  }

  const convert = async (id: string) => {
    try {
      const r = await fetch(`${api}/client/ideas/${encodeURIComponent(id)}/convert`, { method:'POST', headers: authHeaders }).then(r=>r.json())
      if (r && r.ok) {
        alert('Converted to project!')
        window.location.href = '/projects'
      } else alert(r?.error || 'Failed')
    } catch { alert('Failed') }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Project Ideas</h1>
        <p className="text-[var(--color-text-muted)]">Ideas your advisor thought you may like.</p>
      </header>
      {ideas.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card text-sm text-[var(--color-text-muted)]">No ideas yet.</div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map(i => (
              <div key={i.id} className="relative flex h-full flex-col rounded-lg border border-[var(--color-border)] p-4">
                <button aria-label="Delete idea" title="Delete idea" className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]" onClick={async()=>{
                  if(!confirm('Remove this idea from your list?')) return;
                  try {
                    const r = await fetch(`${api}/client/ideas/${encodeURIComponent(i.id)}`, { method:'DELETE', headers: authHeaders }).then(r=>r.json()).catch(()=>null)
                    if (r && r.ok) setIdeas(prev=>prev.filter(x=>x.id!==i.id))
                    else alert(r?.error || 'Failed to delete')
                  } catch { alert('Failed to delete') }
                }}>
                  {/* simple X icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/></svg>
                </button>
                <div className="text-base font-semibold text-[var(--color-text)]">{i.title}</div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{truncate(i.summary, 220)}</p>
                <div className="mt-auto flex items-center justify-end gap-2 pt-3">
                  <a className="btn-secondary text-xs" href={`/ideas/${encodeURIComponent(i.id)}`}>See Details</a>
                  <button className="btn-primary text-xs" onClick={()=>convert(i.id)}>Move To Production</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>Advisor-selected idea</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--color-text)]">{active?.summary}</p>
            {active?.implementation_estimate && (
              <div className="rounded-md border border-[var(--color-border)] p-3">
                <div className="font-medium text-[var(--color-text)]">Pricing Comparison</div>
                <div className="mt-1 text-[var(--color-text-muted)]">
                  Elsewhere: ${active.implementation_estimate.elsewhere_cost?.toLocaleString?.() || active.implementation_estimate.elsewhere_cost}<br/>
                  Our platform: ${active.implementation_estimate.our_cost?.toLocaleString?.()} · Timeline: {active.implementation_estimate.timeline}
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <a href="/client/ideas" className="btn-secondary text-xs" onClick={()=>setOpen(false)}>See All Details</a>
              <button className="btn-primary text-xs" onClick={()=>{ if(active) convert(active.id) }}>Push To Production</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


