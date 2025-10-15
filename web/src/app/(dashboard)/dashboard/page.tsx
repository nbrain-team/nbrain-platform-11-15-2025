"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ScheduleMeetingDialog } from "@/components/ScheduleMeetingDialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Project = { id: number; name: string; status: string; eta: string | null }
type RoadmapNode = { 
  id: number
  node_type: string
  title: string
  description: string
  status: string
  project_id: number | null
}

export default function DashboardOverview() {
  const [projects, setProjects] = useState<Project[]>([])
  const [roadmapNodes, setRoadmapNodes] = useState<RoadmapNode[]>([])
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set())
  const [ideas, setIdeas] = useState<Array<{ id: string; title: string; summary: string }>>([])
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null), [])
  
  const toggleDescription = (nodeId: number) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  type Webinar = { id: number; title: string; datetime: string; duration?: string; description?: string; image_url?: string }
  const [webinars, setWebinars] = useState<Webinar[]>([])

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
        setSignupMsg('You are registered. We\'ve added this to your advisor schedule and will email you details.')
        if (selectedWebinar) {
          const next = (prev=> prev.includes(String(selectedWebinar.id)) ? prev : [...prev, String(selectedWebinar.id)])(signedUpIds)
          setSignedUpIds(next)
          try { localStorage.setItem('signed_up_webinars', JSON.stringify(next)) } catch {}
        }
      }
      else setSignupMsg(res.error || 'Signup failed. Please try again later.')
    } catch {
      setSignupMsg('Signup failed. Please try again later.')
    } finally { setSigningUp(false) }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${api}/client/projects`, { headers: authHeaders }).then(r => r.json())
        if (res?.ok && Array.isArray(res.projects)) setProjects(res.projects)
        
        // Fetch roadmap nodes
        const roadmapRes = await fetch(`${api}/roadmap`, { headers: authHeaders }).then(r => r.json())
        if (roadmapRes?.ok && roadmapRes.roadmap?.nodes) {
          const projectNodes = roadmapRes.roadmap.nodes.filter((n: RoadmapNode) => n.node_type === 'project')
          setRoadmapNodes(projectNodes)
        }
        
        const ir = await fetch(`${api}/client/ideas`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
        if (ir && ir.ok && Array.isArray(ir.ideas)) setIdeas(ir.ideas)
        const wr = await fetch(`${api}/client/webinars`, { headers: authHeaders }).then(r=>r.json()).catch(()=>null)
        if (wr && wr.ok && Array.isArray(wr.webinars)) setWebinars(wr.webinars)
      } catch {}
    })()
  }, [api, authHeaders])

  // Listen for cross-page updates to signup state
  useEffect(() => {
    const refresh = () => {
      try { setSignedUpIds(JSON.parse(localStorage.getItem('signed_up_webinars') || '[]')) } catch {}
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('signed_up_webinars_updated', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('signed_up_webinars_updated', refresh as EventListener)
    }
  }, [])

  const projectsInProduction = projects.filter(p => p.status === 'In production')
  const scopedProjects = roadmapNodes.filter(n => n.project_id)
  const plannedProjects = roadmapNodes.filter(n => !n.project_id)
  
  const statusLabel = (s: string) => s
  const statusPercent = (s: string) => {
    switch (s) {
      case 'Draft': return 10
      case 'Pending Advisor': return 30
      case 'In production': return 60
      case 'Waiting Client Feedback': return 80
      case 'Completed': return 100
      default: return 50
    }
  }
  // const completed = projects.filter(p => p.status === 'Completed').map(p => ({ id: `PRJ-${String(p.id).padStart(4,'0')}`, name: p.name, finished: 'Recently' }))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-[var(--color-text-muted)]">Welcome back. This is a static mock of the client dashboard.</p>
      </header>

      {/* Primary calls to action as large buttons */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-center shadow-card">
          <div className="text-lg font-semibold text-[var(--color-text)]">Schedule AI Strategy Call</div>
          <p className="mt-1 text-[var(--color-text-muted)]">Pick a time to meet with your strategist and plan the next sprint.</p>
          <div className="mt-4">
            <ScheduleMeetingDialog />
          </div>
        </div>
        <a href="/chat" className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-50)] p-6 text-center shadow-card transition hover:bg-[var(--color-primary-50)]/80">
          <div className="text-lg font-semibold text-[var(--color-text)]">Start a New Project</div>
          <p className="mt-1 text-[var(--color-text-muted)]">Use the AI ideator to scope work and generate a proposal fast.</p>
          <button className="btn-primary mt-4">New Project</button>
        </a>
      </section>

      {/* Ideas Customized For You */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Ideas Your Advisor Thought You May Like</div>
          <a href="/client/ideas" className="text-sm text-[var(--color-primary)] underline">See All Ideas</a>
        </div>
        {ideas.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">Advisor is curating ideas for you, check back again later.</div>
        ) : (
          <div className="relative">
            <div className="flex items-stretch gap-4 overflow-hidden">
              {ideas.slice(0,3).map(i => (
                <a key={i.id} href={`/ideas/${encodeURIComponent(i.id)}`} className="min-w-0 basis-1/2 grow rounded-lg border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-surface-alt)]">
                  <div className="text-base font-semibold text-[var(--color-text)]">{i.title}</div>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{(i.summary || '').slice(0,110)}{(i.summary||'').length>110?' ...':''}</p>
                  <div className="mt-3 text-right">
                    <span className="text-xs text-[var(--color-primary)] underline">More Detail</span>
                  </div>
                </a>
              ))}
            </div>
            {ideas.length > 2 && (
              <div className="mt-4 flex items-center justify-between">
                <button className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]" onClick={()=>{
                  setIdeas(prev=> prev.length ? [...prev.slice(1), prev[0]] : prev)
                }}>←</button>
                <button className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-surface-alt)]" onClick={()=>{
                  setIdeas(prev=> prev.length ? [prev[prev.length-1], ...prev.slice(0, prev.length-1)] : prev)
                }}>→</button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Projects in Production */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
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
              <div key={p.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)]">
                <a href={`/projects/PRJ-${String(p.id).padStart(4,'0')}`} className="font-medium text-[var(--color-text)]">
                  {p.name.replace(/^Draft:\s*/i,'')}
                </a>
                <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                  <div className="h-2 w-40 rounded bg-[var(--color-surface-alt)]">
                    <div className="h-2 rounded bg-blue-500" style={{ width: '60%' }} />
                  </div>
                  <span className="text-xs">{p.status}</span>
                </div>
                <div className="text-right">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">Active</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* Scoped Projects */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Scoped Projects</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Projects with AI specifications ready for development</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            {scopedProjects.length} Projects
          </span>
        </div>
        <div className="divide-y">
          {scopedProjects.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              No scoped projects yet. <a href="/roadmap" className="text-[var(--color-primary)] underline">Add a project</a> to your AI Ecosystem!
            </div>
          ) : (
            scopedProjects.map(node => (
              <div key={node.id} className="grid grid-cols-3 items-center gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)]">
                <a href={`/projects/PRJ-${String(node.project_id).padStart(4,'0')}`} className="font-medium text-[var(--color-text)]">
                  {node.title}
                </a>
                <div className="text-[var(--color-text-muted)]">
                  PRJ-{String(node.project_id).padStart(4,'0')}
                </div>
                <div className="text-right">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">Scoped</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* Planned Projects */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Planned Projects</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Ideas waiting to be scoped</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {plannedProjects.length} Ideas
          </span>
        </div>
        <div className="divide-y">
          {plannedProjects.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              No planned projects. <a href="/roadmap" className="text-[var(--color-primary)] underline">Add one</a> to your AI Ecosystem!
            </div>
          ) : (
            plannedProjects.map(node => {
              const description = node.description || 'No description yet'
              const isExpanded = expandedDescriptions.has(node.id)
              const shouldTruncate = description.length > 133
              const displayDescription = shouldTruncate && !isExpanded 
                ? description.substring(0, 133) + '...'
                : description
              
              return (
                <div key={node.id} className="grid grid-cols-3 items-start gap-4 p-4 text-sm hover:bg-[var(--color-surface-alt)]">
                  <div className="font-medium text-[var(--color-text)]">
                    {node.title}
                  </div>
                  <div className="text-[var(--color-text-muted)]">
                    <span>{displayDescription}</span>
                    {shouldTruncate && (
                      <button
                        onClick={() => toggleDescription(node.id)}
                        className="ml-2 text-xs text-[var(--color-primary)] hover:underline font-medium"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <a 
                      href={`/chat?projectName=${encodeURIComponent(node.title)}&nodeId=${node.id}`}
                      className="rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-700)] transition"
                    >
                      Scope with AI
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Live Learning Sessions */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Live Learning Sessions</div>
          <span className="text-xs text-[var(--color-text-muted)]">Upcoming webinars</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {webinars.map(w => (
            <div key={w.id} className="flex h-full flex-col rounded-lg border border-[var(--color-border)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">{w.title}</div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">{w.datetime} · {w.duration}</div>
              <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">{w.description}</p>
              <div className="mt-auto pt-3">
                {signedUpIds.includes(w.id) ? (
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
                            <button className="btn-primary" onClick={signUpForWebinar} disabled={signingUp}>{signingUp ? 'Signing up…' : 'Sign up'}</button>
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

      {/* Recent Articles */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Recent Articles</div>
          <Link href="/learning" className="text-sm text-[var(--color-primary)] underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              id: 'prompt-libraries',
              title: "Prompt libraries for marketers",
              excerpt: "Unlock the power of AI with our curated collection of marketing prompts.",
              image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
            },
            {
              id: 'scope-ai-project',
              title: "How to scope an AI project",
              excerpt: "Learn the essential steps to define and plan your AI initiatives.",
              image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=80"
            },
            {
              id: 'reporting-automation',
              title: "Playbooks: reporting automation",
              excerpt: "Streamline your reporting process with AI-powered automation.",
              image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
            },
            {
              id: 'ai-integration-guide',
              title: "AI integration best practices",
              excerpt: "Navigate the complexities of integrating AI into your existing workflows.",
              image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80"
            },
            {
              id: 'roi-measurement',
              title: "Measuring AI ROI effectively",
              excerpt: "Track and optimize the return on your AI investments.",
              image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
            },
            {
              id: 'future-of-work',
              title: "Future of work with AI",
              excerpt: "Prepare your team for the AI-enhanced workplace of tomorrow.",
              image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80"
            }
          ].map((article) => (
            <Link key={article.id} href={`/learning/${article.id}`} className="overflow-hidden rounded-lg border border-[var(--color-border)] transition hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.image} alt={article.title} className="h-28 w-full object-cover" />
              <div className="p-3">
                <div className="text-sm font-semibold text-[var(--color-text)]">{article.title}</div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{article.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}


