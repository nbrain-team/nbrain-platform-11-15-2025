"use client"
import { useEffect, useMemo, useState } from "react"

export default function AdminWebinarsPage(){
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined
  const [webinars, setWebinars] = useState<Array<{id:number; title:string; datetime:string; duration?:string; image_url?:string}>>([])
  const [selectedId, setSelectedId] = useState<number|null>(null)
  const [form, setForm] = useState<{id?:number; title:string; datetime:string; duration:string; image_url:string; description:string; file?: File|null}>({ title:'', datetime:'', duration:'', image_url:'', description:'', file: null })
  const [signups, setSignups] = useState<Array<{id:number; client_id:number; name:string; email:string; created_at:string}>>([])

  const load = async ()=>{
    const r = await fetch(`${api}/admin/webinars`, { headers: authHeaders }).then(r=>r.json())
    if (r && r.ok) setWebinars(r.webinars||[])
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Webinars</h1>
        <p className="text-[var(--color-text-muted)]">Create and manage live learning sessions</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Live Sessions</div>
          <button className="btn-secondary px-3 py-1 text-xs" onClick={()=>{ setSelectedId(null); setForm({ title:'', datetime:'', duration:'', image_url:'', description:'' }) }}>New</button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="divide-y">
              {webinars.map(w => (
                <div key={w.id} className="flex items-center justify-between p-2 text-sm hover:bg-[var(--color-surface-alt)] cursor-pointer" onClick={async()=>{
                  setSelectedId(w.id)
                  setForm(prev=>({ ...prev, id:w.id, title:w.title, datetime:w.datetime, duration:w.duration||'', image_url:w.image_url||'', description:prev.description }))
                  const r = await fetch(`${api}/admin/webinars/${w.id}/signups`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
                  setSignups(r?.ok? r.signups: [])
                }}>
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{w.datetime}{w.duration?` · ${w.duration}`:''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-[var(--color-primary)] underline" onClick={async(e)=>{e.stopPropagation(); await fetch(`${api}/admin/webinars/${w.id}`, { method:'DELETE', headers: authHeaders }).then(r=>r.json()); load();}}>Delete</button>
                  </div>
                </div>
              ))}
              {webinars.length===0 && <div className="p-2 text-sm text-[var(--color-text-muted)]">No webinars yet.</div>}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">{selectedId ? 'Edit webinar' : 'Create webinar'}</div>
            <div className="grid grid-cols-2 items-center gap-2 text-sm">
              <label className="text-[var(--color-text-muted)]">Title</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={form.title} onChange={e=>setForm(prev=>({...prev, title:e.target.value}))} />
              <label className="text-[var(--color-text-muted)]">Date & time</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={form.datetime} onChange={e=>setForm(prev=>({...prev, datetime:e.target.value}))} placeholder="e.g. Tue, Oct 14 · 9:00–9:40 AM PT" />
              <label className="text-[var(--color-text-muted)]">Duration</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={form.duration} onChange={e=>setForm(prev=>({...prev, duration:e.target.value}))} />
              <label className="text-[var(--color-text-muted)]">Image</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" type="file" accept="image/*" onChange={e=>{
                const file = e.target.files?.[0] || null
                setForm(prev=>({...prev, file}))
              }} />
              <div className="col-span-2 text-xs text-[var(--color-text-muted)]">Optionally paste an external Image URL</div>
              <input className="col-span-2 rounded-md border border-[var(--color-border)] px-3 py-2" value={form.image_url} onChange={e=>setForm(prev=>({...prev, image_url:e.target.value}))} placeholder="https://..." />
            </div>
            <div className="mt-3">
              <div className="text-sm font-medium mb-1">Description</div>
              <textarea className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" rows={4} value={form.description} onChange={e=>setForm(prev=>({...prev, description:e.target.value}))} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn-primary" onClick={async()=>{
                const method = form.id ? 'PUT':'POST'
                const url = form.id ? `${api}/admin/webinars/${form.id}` : `${api}/admin/webinars`
                const fd = new FormData()
                fd.set('title', form.title)
                fd.set('datetime', form.datetime)
                fd.set('duration', form.duration)
                fd.set('description', form.description)
                if (form.image_url) fd.set('image_url', form.image_url)
                if (form.file) fd.set('image', form.file)
                const r = await fetch(url, { method, headers: authHeaders, body: fd }).then(r=>r.json())
                if (r?.ok) { load(); alert('Saved'); }
              }}>Save</button>
              {selectedId && <span className="text-xs text-[var(--color-text-muted)]">Editing ID #{selectedId}</span>}
            </div>
            {selectedId && (
              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold">Signups</div>
                <div className="divide-y">
                  {signups.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 text-sm">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{s.email}</div>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">{new Date(s.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                  {signups.length===0 && <div className="p-2 text-sm text-[var(--color-text-muted)]">No signups yet.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

