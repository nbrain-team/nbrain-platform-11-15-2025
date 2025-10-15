"use client"
import { useEffect, useState } from "react";
import { IconBadge } from "@/components/IconBadge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PublicIdeationChat } from "@/components/PublicIdeationChat";
import { AdvisorRequestDialog } from "@/components/AdvisorRequestDialog";
import TopWebinarBanner from "@/components/TopWebinarBanner";
import { ClientSignupDialog } from "@/components/ClientSignupDialog";
import Link from "next/link";
import { Users, PackageCheck, Rocket, Building2, Pentagon, Scale, Headset, Handshake, Globe, Sparkles, Settings2, Cpu, MessageSquare, ClipboardList, PlayCircle, LogIn, Star, DollarSign } from "lucide-react";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const bannerText = "Live Webinar: Learn How To Use AI to Create AI — October 15, 2025"
  
  const IMAGES = {
    hero: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=60",
    accordion: "https://images.unsplash.com/photo-1559027615-5def3621f98f?auto=format&fit=crop&w=1400&q=60",
    splits: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1400&q=60",
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1400&q=60",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=60",
    ],
    cases: [
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1496302662116-35cc4f36df92?auto=format&fit=crop&w=1200&q=60",
    ],
  } as const
  return (
    <main>
      {/* Top navigation */}
      <TopWebinarBanner text={bannerText} />
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hyah-logo.png" alt="Hyah! AI" className="h-10 w-auto" />
          <nav className="flex items-center gap-6 text-sm font-semibold text-[var(--color-text)]">
            <a href="#why" className="hover:text-[var(--color-primary)]">Why Hyah! AI</a>
            <a href="#how" className="hover:text-[var(--color-primary)]">How It Works</a>
            <a href="#membership" className="hover:text-[var(--color-primary)]">Membership Details</a>
            <a href="#membership" className="hover:text-[var(--color-primary)]">Contact Us</a>
            <Link href="/login" aria-label="Login" title="Login" className="ml-2 inline-flex items-center rounded-full border border-[var(--color-border)] p-2 hover:bg-[var(--color-surface-alt)]">
              <LogIn className="size-4" />
            </Link>
          </nav>
        </div>
      </header>
      {/* Hero */}
      <section className="relative bg-white">
        <div className="container mx-auto grid grid-cols-1 gap-6 px-6 py-20 md:grid-cols-2 md:items-center md:gap-8 xl:gap-10">
          <div>
          <div className="inline-block rounded-md bg-[var(--color-primary-50)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">AI-Powered Outsourcing:</div>
          <h1 className="mt-4 max-w-[680px] text-[clamp(18px,2.4vw,40px)] font-semibold leading-tight text-[var(--color-text)]">
            <span className="block">Our Team Of Senior AI Operators</span>
            <span className="block">Become Your Instant-On Production</span>
            <span className="block">Team with Super Human Capabilities.</span>
          </h1>
          <div className="mt-4 max-w-[560px]">
            <p className="text-lg text-[var(--color-text-muted)]">Cut costs by 80–90% and finish projects in days, not months. You assign tasks, your advisor scopes them, and AI does the heavy lift. Better quality, faster turnaround, at single-digit effective rates.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* AI Ideation Agent modal */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
              <DialogTrigger asChild>
                <button className="btn-primary">Try Our AI Ideation Agent</button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl p-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>AI Ideation Agent</DialogTitle>
                </DialogHeader>
                <PublicIdeationChat onClose={() => setChatOpen(false)} onRequestSignup={() => { setSelectedPlan(null); setSignupOpen(true); }} />
              </DialogContent>
            </Dialog>

            {/* Talk to an Advisor modal */}
            <AdvisorRequestDialog />

            {/* Client Signup modal instance stays mounted for membership section triggers */}
            <ClientSignupDialog open={signupOpen} onOpenChange={setSignupOpen} initialPlan={selectedPlan} />
            </div>
          </div>
          </div>
          {/* close left column wrapper */}
          
          <div className="hidden self-stretch md:block md:justify-self-end md:pl-6 lg:pl-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-image-2.png" alt="Hero" className="w-full h-auto max-w-[480px] lg:max-w-[520px] rounded-md border border-[var(--color-border)]" />
          </div>
        </div>
      </section>

      {/* Recent Projects (auto-scrolling) */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">Recent Projects</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">A live stream of examples clients outsource to our advisor + AI production platform.</p>
          </div>

          {/* Marquee wrapper */}
          <div className="relative overflow-hidden">
            {/* gradient fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />

            <div className="marquee-track">
              {[...Array(2)].map((loop, loopIdx) => (
                <div key={loopIdx} className="marquee-row">
                  {([
                    { title: 'Weekly KPI Deck Generator', desc: 'Auto-pulls metrics, commentary, and charts into a client-ready deck.' },
                    { title: 'Lead Enrichment Agent', desc: 'Fills missing firmographics and intent data in your CRM.' },
                    { title: 'Competitor Monitoring Bot', desc: 'Tracks pricing, messaging, and launches with alerts in Slack.' },
                    { title: 'Social Variations Engine', desc: 'Turns one hero post into 25 platform‑specific variants.' },
                    { title: 'Support Triage Assistant', desc: 'Reads inbound tickets, drafts replies, and routes to the right owner.' },
                    { title: 'SEO Brief Builder', desc: 'Generates briefs with outlines, entities, and interlinking suggestions.' },
                    { title: 'Sales Call Notes → CRM', desc: 'Transcribes calls, extracts next steps, updates opportunities.' },
                    { title: 'QA for Data Pipelines', desc: 'Validates daily jobs and flags anomalies with suggested fixes.' },
                    { title: 'Campaign Asset Factory', desc: 'Batch creates ad copy, images prompts, and landing sections.' },
                    { title: 'Product Catalog Normalizer', desc: 'Cleans and standardizes attributes across marketplaces.' },
                    { title: 'Invoice Reconciliation', desc: 'Matches vendor invoices to POs, flags discrepancies for review.' },
                    { title: 'Weekly News Summarizer', desc: 'Monitors sources and emails exec-ready summaries by topic.' },
                    { title: 'Onboarding Checklist Agent', desc: 'Assembles steps and nudges owners to keep implementations moving.' },
                    { title: 'Research Dossier Builder', desc: 'Compiles company + market profiles with cited sources.' },
                    { title: 'NPS Comment Classifier', desc: 'Groups feedback by theme and suggests top actions.' },
                    { title: 'Churn Risk Signals', desc: 'Surfaces accounts at risk using usage + ticket signals.' },
                    { title: 'Data Room Organizer', desc: 'Auto-sorts files, extracts key facts, builds a quick index.' },
                    { title: 'SOW Drafting Assistant', desc: 'Turns discovery notes into a structured scope draft.' },
                    { title: 'Performance Alerts', desc: 'Watches KPIs and pings owners when thresholds are crossed.' },
                    { title: 'Recruiting Screener', desc: 'Scores applicants, drafts outreach, and schedules screens.' },
                  ] as const).map((p, i) => (
                    <div key={`${loopIdx}-${i}`} className="marquee-card">
                      <div className="text-sm font-semibold text-[var(--color-text)]">{p.title}</div>
                      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{p.desc}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      

      {/* Why AI-Powered Production Outsourcing (hero-style with stats) */}
      <section id="why" className="bg-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold leading-tight text-[var(--color-text)]">Why Choose Hyah! AI</h2>
          <p className="mx-auto mt-3 max-w-3xl text-[var(--color-text-muted)]">Advisor‑led planning with AI execution gives you speed, quality, and cost efficiency without changing your stack.</p>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
            {([
              { value: '90%', label: 'Lower delivery costs' },
              { value: '5×', label: 'Faster turnaround' },
              { value: '2×', label: 'Quality uplift' },
              { value: '24/7', label: 'Always‑on pipeline' },
            ] as const).map((s, i) => (
              <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-center shadow-card">
                <div className="text-4xl font-bold text-[var(--color-primary)]">{s.value}</div>
                <div className="mt-2 text-sm font-medium text-[var(--color-text)]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Comparison grid from compare.csv */}
          <ComparisonGrid />
        </div>
      </section>

      

      {/* (Removed) Member Benefits grid here to avoid duplication; now shown lower on the page */}

      {/* Single testimonial band with background (moved above How Our Members Get To Work) */}
      <section
        className="relative py-16 text-center"
        style={{
          backgroundImage: 'url(/outsourcing_background.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-4xl px-6">
          <p className="text-2xl font-semibold leading-relaxed text-white">
            “It’s like a Costco membership for senior level production of everything — 90% less cost, 500% faster, and 2× better quality.”
          </p>
          <div className="mt-4 text-white/90">— Debbie Tetz<br />Ad TV Media</div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative bg-white py-16">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">How Our Members Get To Work</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">A simple, advisor‑led flow that turns ideas into outcomes in days.</p>
          </div>

          <div className="relative mt-8 md:mt-10">
            {/* Curved dotted connectors between steps (desktop only) */}
            <svg
              className="pointer-events-none absolute inset-x-0 -top-3 hidden h-40 w-full md:block"
              viewBox="0 0 1200 200"
              preserveAspectRatio="none"
            >
              <path d="M180 120 Q 360 40 540 80" fill="none" stroke="rgba(17,17,17,0.5)" strokeWidth="2" strokeDasharray="4 8" />
              <path d="M660 120 Q 840 180 1020 100" fill="none" stroke="rgba(17,17,17,0.5)" strokeWidth="2" strokeDasharray="4 8" />
            </svg>

            {/* Step cards simplified to icon + title, with more spacing */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-14">
              {([
                { icon: MessageSquare, title: 'Tell Us About Your Project' },
                { icon: ClipboardList, title: 'We Assess & Scope It' },
                { icon: PlayCircle, title: 'You Sign Off & We Get To Work' },
              ] as const).map(({ icon: Icon, title }, i) => (
                <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-card">
                  <div className="mx-auto mb-5 inline-flex items-center justify-center rounded-xl bg-[var(--color-primary-50)] p-5">
                    <IconBadge icon={Icon} size={48} />
                  </div>
                  <div className="text-base font-semibold text-[var(--color-text)]">{title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed steps matching the three cards */}
      <section className="bg-white">
        <div className="container mx-auto space-y-10 px-6 pt-6 pb-16">
        {([
          {
            title: 'Tell Us About Your Project',
            image: '/image-1.png',
            desc: 'Share goals, context, constraints, and examples. Your advisor turns intent into a clear brief.',
            bullets: ['Links and docs welcome', 'Define what success looks like', 'Note approvals and timelines'],
          },
          {
            title: 'We Assess & Scope It',
            image: '/image-2.png',
            desc: 'We design the fastest path to value: workflows, guardrails, QA, and milestones.',
            bullets: ['Identify automation opportunities', 'Pick tools that fit your stack', 'Set delivery checkpoints'],
          },
          {
            title: 'You Sign Off & We Get To Work',
            image: '/image-3.png',
            desc: 'Production starts same‑week. AI executes with human oversight and measurable outputs.',
            bullets: ['Track progress in your dashboard', 'Review deliverables as they land', 'Iterate quickly on feedback'],
          },
        ] as const).map((step, row) => (
          <div
            key={step.title}
            className={`relative grid grid-cols-1 items-center gap-8 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-card md:grid-cols-2 ${row % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}
          >
            <span className="absolute -top-4 left-6 inline-flex h-9 rounded-full bg-[var(--color-primary-50)] px-3 text-xs font-bold text-[var(--color-primary)]">
              <span className="self-center">Step {row + 1}</span>
            </span>
            <div className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.image}
                alt={step.title}
                className="h-64 w-full rounded-xl object-cover ring-1 ring-black/10 md:h-72"
                style={{
                  transform: 'none',
                  boxShadow:
                    '0 24px 48px rgba(16,24,40,0.25), 0 8px 16px rgba(16,24,40,0.15)',
                }}
              />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-[var(--color-text)]">{step.title}</h3>
              <p className="mt-2 text-[var(--color-text-muted)]">{step.desc}</p>
              <ul className="mt-4 list-disc space-y-1 pl-6 text-[var(--color-text-muted)]">
                {step.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        </div>
      </section>

      {/* Testimonial placeholder */}
      <section className="container mx-auto grid grid-cols-1 gap-8 px-6 py-16 md:grid-cols-2">
        <div className="card p-6">
          <p className="text-lg italic text-[var(--color-text)]">“Our reporting process went from days to hours. Costs dropped by 85%, and the quality of insights actually improved.”</p>
        </div>
        <div className="card p-6">
          <p className="text-lg italic text-[var(--color-text)]">“Managed AI made us rethink how we get work done.”</p>
        </div>
      </section>

      

      {/* Capabilities lists - removed per request */}

      {/* Case Studies */}
      <section className="bg-[var(--color-surface-alt)] py-16" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
        <div className="container mx-auto px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">Case Studies</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">A snapshot of outcomes delivered by advisor‑led, AI‑powered production.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Social Media Automation",
                client: "Retail Brand",
                desc: "Built a content pipeline and posting agent that scaled to 200 campaigns.",
                our: { hours: 48, cost: "$3,600" },
                traditional: { hours: 320, cost: "$48,000" },
              },
              {
                title: "Client Reporting at Scale",
                client: "Agency",
                desc: "Automated data pulls, insights, and formatted decks across portfolios.",
                our: { hours: 36, cost: "$2,700" },
                traditional: { hours: 180, cost: "$18,000" },
              },
              {
                title: "CRM Data Enrichment",
                client: "SaaS",
                desc: "Real‑time lead enrichment and alerts, improving follow‑up and win rates.",
                our: { hours: 30, cost: "$2,250" },
                traditional: { hours: 140, cost: "$14,000" },
              },
              {
                title: "Ops Workflow Automation",
                client: "E‑commerce",
                desc: "Replaced manual ops handoffs with multi‑agent workflows and QA gates.",
                our: { hours: 60, cost: "$4,500" },
                traditional: { hours: 400, cost: "$60,000" },
              },
              // New additional case studies
              {
                title: "Email Personalization",
                client: "Fintech",
                desc: "Dynamic content and scoring increased CTR by 28%.",
                our: { hours: 24, cost: "$1,800" },
                traditional: { hours: 110, cost: "$11,000" },
              },
              {
                title: "Forecasting Dashboard",
                client: "Logistics",
                desc: "Unified demand signals and predictive ETAs for planners.",
                our: { hours: 44, cost: "$3,300" },
                traditional: { hours: 260, cost: "$26,000" },
              },
              {
                title: "Knowledge Base Assistant",
                client: "Support",
                desc: "Auto‑drafted answers cut handle time by 35%.",
                our: { hours: 32, cost: "$2,400" },
                traditional: { hours: 180, cost: "$18,000" },
              },
            ].map((c, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IMAGES.cases[i]} alt="Case study" className="h-40 w-full object-cover shadow-lg" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-sm text-[var(--color-text-muted)]">{c.client}</div>
                  <div className="mt-1 min-h-[48px] text-[var(--color-text)] font-semibold">{c.title}</div>
                  <p className="mt-2 min-h-[60px] text-sm text-[var(--color-text-muted)]">{c.desc}</p>

                  <div className="mt-auto pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
                        <div className="text-[var(--color-text)] font-semibold">Our way</div>
                        <div className="mt-1 text-[var(--color-text-muted)]">{c.our.hours} hrs</div>
                        <div className="text-[var(--color-text)]">{c.our.cost}</div>
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
                        <div className="text-[var(--color-text)] font-semibold">Traditional</div>
                        <div className="mt-1 text-[var(--color-text-muted)]">{c.traditional.hours} hrs</div>
                        <div className="text-[var(--color-text)]">{c.traditional.cost}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Large embedded form moved to last section before footer */}

      {/* Membership plans */}
      <section id="membership" className="bg-[var(--color-primary-50)] py-16">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">Membership</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">Pick the plan that matches your runway. Upgrade anytime as your needs grow.</p>
          </div>
          <p className="mt-4 text-center text-sm text-[var(--color-text)]">No credit card needed for signup. Invoicing will be setup once you have your onboarding call with your advisor</p>

          <PricingGridFromCSV />

          <div className="mt-8 text-center">
            <button className="btn-primary" onClick={() => { setSelectedPlan(null); setSignupOpen(true); }}>Sign Up (No Credit Card Required)</button>
          </div>

          {/* Member Benefits grid (replaces details list) */}
          <div className="mx-auto mt-10 max-w-6xl">
            <div className="mb-6 text-center text-2xl font-semibold text-[var(--color-text)]">Member Benefits</div>
            <MemberBenefitsGrid />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-primary-50)] py-16">
        <div className="container mx-auto px-6">
          <div className="card mx-auto max-w-2xl p-6">
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">Discover a faster, cheaper, smarter way to work.</h3>
            <p className="mt-2 text-[var(--color-text-muted)]">Start today — share your email and we’ll send details, examples, and pricing.</p>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2" placeholder="Your work email" />
              <button className="btn-primary">Get Details by Email</button>
            </form>
          </div>
        </div>
      </section>

      

      {/* Footer */}
      <footer className="border-t bg-[var(--color-navy)] py-12 text-white">
        <div className="container mx-auto px-6">
          {/* Top section with logo and main navigation */}
          <div className="flex flex-col items-center justify-between gap-8 pb-8 md:flex-row">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hyah-logo.png" alt="Hyah AI" className="h-10 w-auto brightness-0 invert" />
              
              {/* Main navigation links */}
              <nav className="flex flex-wrap items-center justify-center gap-6 text-sm md:justify-start">
                <a href="#why" className="text-white/80 hover:text-white">Why Hyah! AI</a>
                <a href="#how" className="text-white/80 hover:text-white">How It Works</a>
                <a href="#membership" className="text-white/80 hover:text-white">Membership Details</a>
                <a href="#" className="text-white/80 hover:text-white">Contact Us</a>
              </nav>
            </div>
            
            {/* Contact info */}
            <div className="text-sm">
              <a href="mailto:hello@hyah.ai" className="text-white/80 hover:text-white">hello@hyah.ai</a>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-white/20"></div>
          
          {/* Bottom section with copyright */}
          <div className="flex flex-col items-center justify-between gap-4 pt-8 text-sm md:flex-row">
            <div className="text-white/60">© {new Date().getFullYear()} Hyah! AI, Inc. All rights reserved.</div>
            <div className="flex items-center gap-6 text-white/60">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ComparisonGrid() {
  const [rows, setRows] = useState<Array<string[]>>([])
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/compare.csv', { cache: 'no-store' })
        const text = await r.text()
        const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
        const parseLine = (line: string): string[] => {
          const out: string[] = []
          let cur = ''
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
              if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue }
              inQuotes = !inQuotes; continue
            }
            if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue }
            cur += ch
          }
        out.push(cur.trim());
        return out.map(s => s.replace(/^\"|\"$/g,'').trim())
        }
        const parsed = lines.map(parseLine)
        setRows(parsed)
      } catch {}
    })()
  }, [])

  if (rows.length === 0) return null
  const [rawHeader, ...data] = rows
  const columns = rawHeader.map((h, i) => (h.toLowerCase() === 'consistency' ? 'Quality' : h))

  const renderBars = (cell: string) => {
    const muted = 'text-[var(--color-border)]'
    const active = 'text-[var(--color-primary)]'
    const cap = 4
    if (!cell) return <span className={muted}>—</span>
    const ch = cell.trim()[0]
    if (ch !== '*' && ch !== '$') return <span className="text-[var(--color-text)]">{cell}</span>
    const count = Math.min(cap, cell.trim().length)
    const symbol = ch
    const Icon = symbol === '*' ? Star : DollarSign
    return (
      <span className="inline-flex gap-0.5">
        {Array.from({ length: cap }).map((_, i) => (
          <Icon key={i} className={`h-4 w-4 ${i < count ? active : muted}`} />
        ))}
      </span>
    )
  }

  return (
    <div className="mx-auto mt-10 max-w-6xl overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-card text-left">
      <div className="mb-3 text-left text-lg font-semibold text-[var(--color-text)]">How We Compare</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--color-text-muted)]">
            {columns.map((c, i) => (
              <th key={i} className={`py-2 ${i===0?'min-w-[160px] pr-2':''} ${i>0 && i<columns.length-1 ? 'pr-6' : ''}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, ri) => (
            <tr key={ri} className="border-t border-[var(--color-border)]">
              {r.map((cell, ci) => {
                const cellClass = `py-3 ${ci===0 ? 'pr-2' : ci<columns.length-1 ? (ci===1 ? 'pl-1 pr-6' : 'pr-6') : 'pl-2'} align-top text-[var(--color-text)]`
                return (
                  <td key={ci} className={cellClass}>
                    {ci === 0 ? <span className="font-medium">{cell}</span> : renderBars(cell)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PricingGridFromCSV() {
  const [rows, setRows] = useState<Array<string[]>>([])
  useEffect(()=>{
    ;(async()=>{
      try{
        const r = await fetch('/services-new-2.csv', { cache: 'no-store' })
        const text = await r.text()
        const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
        const parseLine = (line: string): string[] => {
          const out: string[] = []
          let cur = ''
          let inQ = false
          for (let i=0;i<line.length;i++){
            const ch = line[i]
            if (ch==='"') { if (inQ && line[i+1]==='"'){ cur+='"'; i++; continue } inQ=!inQ; continue }
            if (ch===',' && !inQ) { out.push(cur.trim()); cur=''; continue }
            cur += ch
          }
          out.push(cur.trim());
          return out.map(s=>s.replace(/^\"|\"$/g,'').trim())
        }
        const parsed = lines.map(parseLine).filter(r=>r.length>0)
        setRows(parsed)
      } catch {}
    })()
  },[])

  if (rows.length < 3) return null
  // Expecting three columns: header row (plan names), price row, and subsequent feature rows
  const [headerRow, priceRow, ...featureRows] = rows
  const planNames = headerRow
  const prices = priceRow

  // Build tiers: index 0 is empty label; columns 1..n are plans
  const tiers = planNames.slice(0, 3).map((_v, i) => {
    const name = planNames[i] || ''
    const price = (prices[i] || '').replace('/Yearly','/Year').replace('/Lifetime','/lifetime')
    const period = price.includes('/Year') || price.includes('/year') ? '/year' : (price.toLowerCase().includes('lifetime') ? '/lifetime' : '')
    const priceOnly = price.replace('/year','').replace('/lifetime','')
    const bullets: string[] = []
    for (const fr of featureRows) {
      const cell = fr[i] || ''
      if (cell) bullets.push(cell)
    }
    return { name, price: priceOnly || name, period, bullets }
  })

  return (
    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
      {tiers.map((tier, idx)=> (
        <div key={idx} className={`flex h-full flex-col rounded-xl border bg-white p-6 shadow-card ${idx===1 ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
          <div className="mb-3 h-6">
            {idx===1 && (
              <div className="inline-block rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">Most popular</div>
            )}
            {idx===2 && (
              <div className="inline-block rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">Only 12 Spots Left</div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-[var(--color-text)]">{tier.price}</div>
            <div className="text-[var(--color-text-muted)]">{tier.period}</div>
          </div>
          <ul className="mt-4 flex-1 space-y-2 text-[var(--color-text)]">
            {tier.bullets.map((b, bi)=> (
              <li key={bi} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[var(--color-text-muted)]">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function MemberBenefitsGrid() {
  const [items, setItems] = useState<Array<{ title: string; desc: string }>>([])
  useEffect(()=>{
    ;(async()=>{
      try{
        const r = await fetch('/member-benefits.csv', { cache: 'no-store' })
        const text = await r.text()
        const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
        const parseLine = (line: string): string[] => {
          const out: string[] = []
          let cur = ''
          let inQ = false
          for (let i=0;i<line.length;i++){
            const ch = line[i]
            if (ch==='"') { if (inQ && line[i+1]==='"'){ cur+='"'; i++; continue } inQ=!inQ; continue }
            if (ch===',' && !inQ) { out.push(cur.trim()); cur=''; continue }
            cur += ch
          }
          out.push(cur.trim());
          return out
        }
        const parsed = lines.map(parseLine).map(([title, desc])=>({ title, desc }))
        setItems(parsed)
      } catch {}
    })()
  },[])

  // map benefit titles to icons (fallback Sparkles)
  const pickIcon = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes('instant') || t.includes('adoption')) return Rocket
    if (t.includes('cost') || t.includes('savings') || t.includes('pay')) return Scale
    if (t.includes('human') || t.includes('advisor') || t.includes('partnership') || t.includes('collaboration')) return Headset
    if (t.includes('quality')) return PackageCheck
    if (t.includes('scalable') || t.includes('infinitely')) return Users
    if (t.includes('learn') || t.includes('by doing')) return Sparkles
    if (t.includes('private') || t.includes('secure') || t.includes('own')) return ShieldIcon
    if (t.includes('advanced')) return Cpu
    if (t.includes('always up to date') || t.includes('updated')) return Settings2
    if (t.includes('works') || t.includes('projects') || t.includes('task-agnostic') || t.includes('simple') || t.includes('complex')) return Building2
    return Sparkles
  }

  // lightweight Shield icon using lucide classes via inline svg to avoid extra import
  const ShieldIcon = (props: any) => (<svg viewBox="0 0 24 24" className={props.className || 'h-6 w-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {items.map((it, idx)=>{
        const Icon = pickIcon(it.title)
        return (
          <div key={idx} className="flex items-start gap-4 rounded-lg border border-[var(--color-border)] bg-white p-6">
            <IconBadge icon={Icon as any} size={56} boxed />
            <div>
              <div className="text-[var(--color-text)] font-semibold">{it.title}</div>
              <p className="mt-1 text-[var(--color-text-muted)]">{it.desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
