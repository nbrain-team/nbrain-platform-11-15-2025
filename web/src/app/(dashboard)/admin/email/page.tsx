"use client"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AdminEmailCenterPage(){
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
  const authHeaders: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' } : undefined
  const [templates, setTemplates] = useState<Array<{id:number; name:string; subject:string; body:string; key?:string; is_system?:boolean}>>([])
  const [sequences, setSequences] = useState<Array<{id:number; name:string; description?:string; trigger?:string; is_active:boolean}>>([])
  const [steps, setSteps] = useState<Array<{id:number; sequence_id:number; step_order:number; delay_minutes:number; template_id:number|null; notes?:string}>>([])
  const [editingTemplate, setEditingTemplate] = useState<{id?:number; name:string; key:string; subject:string; body:string; is_system?:boolean}>({ name:'', key:'', subject:'', body:'' })
  const [settings, setSettings] = useState<any>(null)

  const load = async ()=>{
    const [t,s,es] = await Promise.all([
      fetch(`${api}/admin/email/templates`, { headers: authHeaders }).then(r=>r.json()),
      fetch(`${api}/admin/email/sequences`, { headers: authHeaders }).then(r=>r.json()),
      fetch(`${api}/admin/email/settings`, { headers: authHeaders }).then(r=>r.json()),
    ])
    if (t?.ok) setTemplates(t.templates||[])
    if (s?.ok) { setSequences(s.sequences||[]); setSteps(s.steps||[]) }
    if (es?.ok) setSettings(es.settings||null)
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Email Center</h1>
        <p className="text-[var(--color-text-muted)]">Manage templates and messaging</p>
      </header>

      {/* Templates (cards) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ['Welcome to Hyah! AI','signup_welcome'],
          ['Password Reset','password_reset'],
          ['Project Completed','project_completed'],
        ].map(([title, key]) => {
          const t = templates.find(x=>x.key===key) || { id:0, name:title as string, key: key as string, subject:'', body:'' }
          return (
            <div key={key as string} className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">{title}</div>
                <button className="text-xs text-[var(--color-primary)] underline" onClick={()=>setEditingTemplate({ id:t.id, name:title as string, key:key as string, subject:t.subject||'', body:t.body||'' })}>Edit</button>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] truncate">{t.subject || 'No subject yet'}</div>
              <div className="mt-2 line-clamp-3 text-xs text-[var(--color-text-muted)]">{t.body || 'No content yet.'}</div>
            </div>
          )
        })}
      </section>

      {/* Edit Template Modal */}
      <Dialog open={!!editingTemplate.name} onOpenChange={(o)=>{ if(!o) setEditingTemplate({ name:'', key:'', subject:'', body:'' }) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Template – {editingTemplate.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 items-center gap-2 text-sm">
            <label className="text-[var(--color-text-muted)]">Subject</label>
            <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={editingTemplate.subject} onChange={e=>setEditingTemplate(prev=>({...prev, subject:e.target.value}))} />
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-muted)]">Supports Markdown (bold, lists) and merge fields like {'{{name}}'}.</div>
          <textarea className="mt-2 h-56 w-full rounded-md border border-[var(--color-border)] p-3 text-sm font-mono" value={editingTemplate.body} onChange={e=>setEditingTemplate(prev=>({...prev, body:e.target.value}))} />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="btn-secondary" onClick={()=>setEditingTemplate({ name:'', key:'', subject:'', body:'' })}>Cancel</button>
            <button className="btn-primary" onClick={async()=>{
              const method = editingTemplate.id ? 'PUT':'POST'
              const url = editingTemplate.id ? `${api}/admin/email/templates/${editingTemplate.id}` : `${api}/admin/email/templates`
              const r = await fetch(url, { method, headers:{ 'Content-Type':'application/json', ...(authHeaders||{}) }, body: JSON.stringify(editingTemplate) }).then(r=>r.json());
              if (r?.ok) { setEditingTemplate({ name:'', key:'', subject:'', body:'' }); load(); }
            }}>Save</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMTP settings gear */}
      <div className="flex items-center justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <button className="rounded-full border border-[var(--color-border)] bg-white p-2 shadow-card" title="SMTP Settings">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v2"></path><path d="M12 21v2"></path><path d="M4.22 4.22l1.42 1.42"></path><path d="M18.36 18.36l1.42 1.42"></path><path d="M1 12h2"></path><path d="M21 12h2"></path><path d="M4.22 19.78l1.42-1.42"></path><path d="M18.36 5.64l1.42-1.42"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>SMTP Settings</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 items-center gap-2 text-sm">
              <label className="text-[var(--color-text-muted)]">Host</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.smtp_host||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), smtp_host:e.target.value }))} />
              <label className="text-[var(--color-text-muted)]">Port</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.smtp_port||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), smtp_port:e.target.value }))} />
              <label className="text-[var(--color-text-muted)]">Username</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.smtp_username||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), smtp_username:e.target.value }))} />
              <label className="text-[var(--color-text-muted)]">Password</label>
              <input type="password" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.smtp_password||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), smtp_password:e.target.value }))} />
              <label className="text-[var(--color-text-muted)]">From name</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.from_name||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), from_name:e.target.value }))} />
              <label className="text-[var(--color-text-muted)]">From email</label>
              <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={settings?.from_email||''} onChange={e=>setSettings((prev:any)=>({ ...(prev||{}), from_email:e.target.value }))} />
            </div>
            <div className="mt-2 text-right">
              <button className="btn-primary" onClick={async()=>{
                const r = await fetch(`${api}/admin/email/settings`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(authHeaders||{}) }, body: JSON.stringify(settings||{}) }).then(r=>r.json()); if (r?.ok) alert('Saved');
              }}>Save</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Broadcast */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-3 text-lg font-semibold">Send Broadcast</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid grid-cols-2 items-center gap-2 text-sm">
            <label className="text-[var(--color-text-muted)]">Audience</label>
            <select id="aud" className="rounded-md border border-[var(--color-border)] px-3 py-2">
              <option value="advisor">All advisors</option>
              <option value="client">All clients</option>
            </select>
            <label className="text-[var(--color-text-muted)]">Subject</label>
            <input id="subj" className="rounded-md border border-[var(--color-border)] px-3 py-2" />
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">Supports Markdown and basic HTML; attachments are optional.</div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <textarea id="body" className="min-h-40 w-full rounded-md border border-[var(--color-border)] p-3 text-sm" placeholder="Write your message..." />
          <input id="attach" type="file" multiple className="text-sm" />
          <div className="text-right">
            <button className="btn-primary" onClick={async()=>{
              const role = (document.getElementById('aud') as HTMLSelectElement).value
              const subject = (document.getElementById('subj') as HTMLInputElement).value
              const body = (document.getElementById('body') as HTMLTextAreaElement).value
              const attachments: string[] = []
              const files = (document.getElementById('attach') as HTMLInputElement).files
              if (files) {
                for (let i=0;i<files.length;i++) attachments.push(files[i].name)
              }
              const r = await fetch(`${api}/admin/email/send-broadcast`, { method:'POST', headers: authHeaders, body: JSON.stringify({ role, subject, body, attachments }) }).then(r=>r.json())
              if (r?.ok) alert(`Queued ${r.count} emails`); else alert(r?.error || 'Failed')
            }}>Send</button>
          </div>
        </div>
      </section>
    </div>
  )
}

