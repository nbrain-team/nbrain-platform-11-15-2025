"use client"
import { useMemo } from 'react'

export default function ChatPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null), [])
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), [])
  const projectId = params.get('projectId')
  const clientId = params.get('clientId')
  const nodeId = params.get('nodeId')
  
  // Debug logging
  console.log('/chat page params:', { nodeId, projectId, clientId, fullUrl: typeof window !== 'undefined' ? window.location.href : '' })

  const iframeSrc = `/client-chat?api=${encodeURIComponent(api)}${token ? `&t=${encodeURIComponent(token)}` : ''}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}${clientId ? `&clientId=${encodeURIComponent(clientId)}` : ''}${nodeId ? `&nodeId=${encodeURIComponent(nodeId)}` : ''}`
  
  console.log('Iframe src:', iframeSrc)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-0 shadow-card">
      <iframe
        title="Agent Ideator"
        src={iframeSrc}
        className="h-[70vh] w-full rounded-xl"
      />
    </div>
  )
}


