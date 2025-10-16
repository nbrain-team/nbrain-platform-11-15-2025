"use client"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    try {
      const token = localStorage.getItem("xsourcing_token")
      if (!token) return
      // rudimentary decode to extract role (JWT payload is middle part)
      const payload = JSON.parse(atob(token.split(".")[1] || ""))
      setRole(payload?.role ?? null)
      setName(payload?.name ?? null)
    } catch {}
  }, [])

  const logout = () => {
    try {
      localStorage.removeItem("xsourcing_token")
      document.cookie = "xsourcing_token=; Max-Age=0; Path=/;"
    } catch {}
    window.location.href = "/"
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[208px_1fr]">
      <aside className="flex flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hyah-logo.png" alt="nBrain" className="mb-6 w-auto" style={{ height: '34px', objectFit: 'contain' }} />
          <nav className="space-y-2 text-sm">
          <Link className="block rounded-md px-3 py-2 hover:bg-white" href={role === 'admin' ? '/admin' : role === 'advisor' ? '/advisor' : '/dashboard'}>Dashboard</Link>
          {role === 'client' && (
            <>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/projects">Projects</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/roadmap">Your AI Ecosystem</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/change-requests">Change Requests</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/client/communications">Communications</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/learning">Learning Center</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/client/completed">Completed Projects</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/client/ideas">Project Ideas</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/chat">AI Ideator</Link>
            </>
          )}
          {role === 'advisor' && (
            <>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/advisor/communications">Communications</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/advisor/create-project">Create new project</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/change-requests">Submit Change Requests</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/roadmap">Client Ecosystems</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/advisor/prebuilt">Pre-Built Projects</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/schedule">Schedule</Link>
            </>
          )}
          {role === 'admin' && (
            <>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/admin">Admin</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/admin/webinars">Webinars</Link>
              <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/admin/email">Email Center</Link>
            </>
          )}
          </nav>
        </div>
        <div className="text-sm">
          <Link className="block rounded-md px-3 py-2 hover:bg-white" href="/profile">Profile & settings</Link>
          <button onClick={logout} className="mt-2 block w-full rounded-md px-3 py-2 text-left hover:bg-white">Logout</button>
        </div>
      </aside>
      <main className="p-6">
        <div className="mb-4 flex items-center justify-end gap-3">
          {role && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {role === 'client' && `Signed in as client: ${name ?? ''}`}
              {role === 'advisor' && `Signed in as advisor: ${name ?? ''}`}
              {role === 'admin' && 'Signed in as Admin'}
            </span>
          )}
          <button onClick={logout} className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold shadow-card">Logout</button>
        </div>
        {children}
      </main>
    </div>
  )
}


