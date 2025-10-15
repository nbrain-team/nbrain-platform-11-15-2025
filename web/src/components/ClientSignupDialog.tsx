"use client"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function generateTimeSlots(): string[] {
  const slots: string[] = []
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() + 1)
  let slotsAdded = 0
  const currentDate = new Date(startDate)
  while (slotsAdded < 4 && currentDate < new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) {
    const dow = currentDate.getDay()
    if (dow !== 0 && dow !== 6) {
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow]
      const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][currentDate.getMonth()]
      const date = currentDate.getDate()
      const time = slotsAdded % 2 === 0 ? '10:00 AM PT' : '2:00 PM PT'
      slots.push(`${dayName}, ${month} ${date} — ${time}`)
      slotsAdded++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return slots
}

export type ClientSignupDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialPlan?: string | null
}

export function ClientSignupDialog({ open, onOpenChange, initialPlan }: ClientSignupDialogProps) {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [plan, setPlan] = useState<string>(initialPlan || '')
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    websiteUrl: '',
    phone: '',
    username: '',
    password: '',
    confirm: '',
    time_slot: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { if (initialPlan) setPlan(initialPlan) }, [initialPlan])

  const disabled = useMemo(() => {
    return !form.name || !form.email || !form.username || !form.password || form.password !== form.confirm || !form.time_slot
  }, [form])

  const handleSubmit = async () => {
    if (disabled) return
    setSubmitting(true)
    try {
      const res = await fetch(`${api}/public/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          username: form.username,
          password: form.password,
          companyName: form.companyName,
          websiteUrl: form.websiteUrl,
          phone: form.phone,
          plan: plan || 'Undecided',
          time_slot: form.time_slot
        })
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          window.location.href = '/login'
        }, 1500)
      } else {
        alert(data.error || 'Signup failed')
      }
    } catch {
      alert('Signup failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create your Hyah! AI account</DialogTitle>
          <DialogDescription>Tell us a bit about you and pick a time for onboarding. No credit card needed.</DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-3">
            {/* Plan selection removed; user decides later */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Full name *</div>
                <Input placeholder="Jane Doe" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Email *</div>
                <Input type="email" placeholder="jane@company.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Company</div>
                <Input placeholder="Acme Inc." value={form.companyName} onChange={e=>setForm(p=>({...p,companyName:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Website URL</div>
                <Input placeholder="https://example.com" value={form.websiteUrl} onChange={e=>setForm(p=>({...p,websiteUrl:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Phone</div>
                <Input placeholder="(555) 555‑1234" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Username *</div>
                <Input placeholder="jane.doe" value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Password *</div>
                <Input type="password" placeholder="Create a password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} disabled={submitting} />
              </div>
              <div>
                <div className="text-sm font-medium">Confirm *</div>
                <Input type="password" placeholder="Re-enter password" value={form.confirm} onChange={e=>setForm(p=>({...p,confirm:e.target.value}))} disabled={submitting} />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Schedule onboarding *</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {generateTimeSlots().map(slot => (
                  <label key={slot} className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2 text-sm hover:bg-[var(--color-surface-alt)]">
                    <input type="radio" name="onboarding" value={slot} checked={form.time_slot===slot} onChange={e=>setForm(p=>({...p,time_slot:e.target.value}))} className="accent-[var(--color-primary)]" disabled={submitting} />
                    {slot}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2 text-sm hover:bg-[var(--color-surface-alt)] sm:col-span-2">
                  <input type="radio" name="onboarding" value="Other / Advisor will send available times" checked={form.time_slot==='Other / Advisor will send available times'} onChange={e=>setForm(p=>({...p,time_slot:e.target.value}))} className="accent-[var(--color-primary)]" disabled={submitting} />
                  Other / Advisor will send available times
                </label>
              </div>
            </div>

            <button className="btn-primary w-full" onClick={handleSubmit} disabled={disabled || submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>

            <p className="text-center text-xs text-[var(--color-text-muted)]">No credit card needed for signup. Invoicing will be setup once you have your onboarding call with your advisor.</p>
          </div>
        ) : (
          <div className="py-8 text-center text-[var(--color-text)]">Account created. Redirecting to login…</div>
        )}

      </DialogContent>
    </Dialog>
  )
}


