"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function TopWebinarBanner({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  const submit = async () => {
    if (!name || !email) return alert('Please enter your name and email')
    try {
      setSubmitting(true)
      await fetch(`${api}/public/webinar-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, webinar: 'Learn How To Use AI to Create AI — 2025-10-15' })
      }).catch(()=>{})
      alert("Thanks! You're signed up. We'll email details and the join link.")
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full bg-[var(--color-primary-50)] border-b border-[var(--color-border)] text-[var(--color-text)]">
      <div className="container mx-auto flex items-center justify-center gap-3 px-6 py-2 text-sm">
        <span className="font-medium">{text}</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
              Learn More & Sign Up
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Learn How To Use AI to Create AI</DialogTitle>
              <DialogDescription>October 15, 2025</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image-1.png" alt="Webinar" className="h-48 w-full rounded-md object-cover ring-1 ring-black/10" />
              <div className="text-sm text-[var(--color-text-muted)]">
                <p>
                  Join our live session to see how we use AI to design, scope, and build
                  AI-powered products quickly. We cover agent patterns, data flows, UI/UX,
                  and deployment with practical examples.
                </p>
                <ul className="mt-2 list-disc pl-5">
                  <li>Step-by-step agent architecture</li>
                  <li>Prompting and evaluation tips</li>
                  <li>Live Q&A</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
            </div>
            <div className="mt-3 text-right">
              <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Sign Up'}</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


