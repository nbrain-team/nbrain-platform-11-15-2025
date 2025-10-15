"use client"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const articles = [
  {
    id: 'prompt-libraries',
    title: "Prompt libraries for marketers",
    excerpt: "Unlock the power of AI with our curated collection of marketing prompts.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    author: "Sarah Chen",
    readTime: "8 min read"
  },
  {
    id: 'scope-ai-project',
    title: "How to scope an AI project",
    excerpt: "Learn the essential steps to define and plan your AI initiatives.",
    image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=80",
    author: "Michael Rodriguez",
    readTime: "12 min read"
  },
  {
    id: 'reporting-automation',
    title: "Playbooks: reporting automation",
    excerpt: "Streamline your reporting process with AI-powered automation.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    author: "Emily Johnson",
    readTime: "10 min read"
  },
  {
    id: 'ai-integration-guide',
    title: "AI integration best practices",
    excerpt: "Navigate the complexities of integrating AI into your existing workflows.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
    author: "David Kim",
    readTime: "15 min read"
  },
  {
    id: 'roi-measurement',
    title: "Measuring AI ROI effectively",
    excerpt: "Track and optimize the return on your AI investments.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    author: "Lisa Thompson",
    readTime: "9 min read"
  },
  {
    id: 'future-of-work',
    title: "Future of work with AI",
    excerpt: "Prepare your team for the AI-enhanced workplace of tomorrow.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
    author: "James Wilson",
    readTime: "11 min read"
  }
];

export default function LearningCenterPage() {
  type Webinar = { id: number; title: string; datetime: string; duration?: string; description?: string; image_url?: string }
  const [webinars, setWebinars] = useState<Webinar[]>([])

  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null), [])
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [signingUp, setSigningUp] = useState(false)
  const [signupMsg, setSignupMsg] = useState<string>("")
  const [signedUpIds, setSignedUpIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('signed_up_webinars') || '[]') } catch { return [] }
  })

  const signUpForWebinar = async () => {
    if (!selectedWebinar) return
    setSigningUp(true)
    setSignupMsg("")
    try {
      const res = await fetch(`${api}/client/webinars/${encodeURIComponent(selectedWebinar.id)}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
      }).then(r=>r.json())
      if (res.ok) {
        setSignupMsg('You are registered. We\'ll email you details and add it to your schedule.')
        const next = (prev=> prev.includes(String(selectedWebinar.id)) ? prev : [...prev, String(selectedWebinar.id)])(signedUpIds)
        setSignedUpIds(next)
        try { localStorage.setItem('signed_up_webinars', JSON.stringify(next)) } catch {}
      }
      else setSignupMsg(res.error || 'Signup failed. Please try again later.')
    } catch {
      setSignupMsg('Signup failed. Please try again later.')
    } finally { setSigningUp(false) }
  }

  useEffect(()=>{
    (async()=>{
      try{
        const r = await fetch(`${api}/client/webinars`, { headers: token? { Authorization: `Bearer ${token}` }: undefined }).then(r=>r.json())
        if (r && r.ok) setWebinars(r.webinars || [])
      } catch {}
    })()
  },[api, token])

  // Listen for cross-page updates to signup state
  useEffect(()=>{
    const refresh = () => {
      try { setSignedUpIds(JSON.parse(localStorage.getItem('signed_up_webinars') || '[]')) } catch {}
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('signed_up_webinars_updated', refresh as EventListener)
    return ()=>{
      window.removeEventListener('storage', refresh)
      window.removeEventListener('signed_up_webinars_updated', refresh as EventListener)
    }
  }, [])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Learning Center</h1>
        <p className="text-[var(--color-text-muted)]">Resources and guides to help you get the most from AI</p>
      </header>
      {/* Live Sessions */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Live Learning Sessions</div>
          <span className="text-xs text-[var(--color-text-muted)]">Upcoming webinars</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {webinars.map(w => (
            <div key={w.id} className="flex h-full flex-col rounded-lg border border-[var(--color-border)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">{w.title}</div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">{w.datetime} · {w.duration}</div>
              <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">{w.description}</p>
              <div className="mt-auto pt-3">
                {signedUpIds.includes(String(w.id)) ? (
                  <button className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-text)]" disabled>
                    You're Signed Up
                  </button>
                ) : (
                  <Dialog open={modalOpen && selectedWebinar?.id===w.id} onOpenChange={(o)=>{ if(!o){ setModalOpen(false); setSelectedWebinar(null); setSignupMsg('') } }}>
                    <DialogTrigger asChild>
                      <button className="btn-secondary" onClick={()=>{ setSelectedWebinar(w); setModalOpen(true) }}>Details & Sign up</button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl">{selectedWebinar?.title}</DialogTitle>
                        <DialogDescription>
                          {selectedWebinar?.datetime} {selectedWebinar?.duration ? `· ${selectedWebinar.duration}` : ''}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedWebinar?.image_url || '/image-1.png'} alt={selectedWebinar?.title || 'Webinar'} className="h-48 w-full rounded-md object-cover md:h-full" />
                        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
                          <p>{selectedWebinar?.description}</p>
                          <p>
                            Questions? Email <a className="text-[var(--color-primary)] underline" href="mailto:webinars@hyah.ai">webinars@hyah.ai</a>
                          </p>
                          <div className="pt-2">
                            <button className="btn-primary" onClick={async()=>{ await signUpForWebinar(); try { window.dispatchEvent(new Event('signed_up_webinars_updated')) } catch {} }} disabled={signingUp}>{signingUp ? 'Signing up…' : 'Sign up'}</button>
                            {signupMsg && <span className="ml-3 text-xs text-[var(--color-text-muted)]">{signupMsg}</span>}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <a
            key={article.id}
            href={`/learning/${article.id}`}
            className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-card transition hover:shadow-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={article.image} 
              alt={article.title}
              className="h-48 w-full object-cover transition group-hover:scale-105"
            />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {article.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {article.excerpt}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>{article.author}</span>
                <span>{article.readTime}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
