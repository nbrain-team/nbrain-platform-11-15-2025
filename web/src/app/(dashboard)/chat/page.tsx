"use client"
import { useEffect, useState } from 'react'

export default function ChatPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [token, setToken] = useState<string | null>(null)
  const [iframeSrc, setIframeSrc] = useState<string>('')
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('projectId')
    const clientId = params.get('clientId')
    const nodeId = params.get('nodeId')
    const tok = localStorage.getItem('xsourcing_token')
    
    setToken(tok)
    
    // Debug logging
    console.log('/chat page params:', { nodeId, projectId, clientId, fullUrl: window.location.href })
    
    // Build iframe URL
    const src = `/client-chat?api=${encodeURIComponent(api)}${tok ? `&t=${encodeURIComponent(tok)}` : ''}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}${clientId ? `&clientId=${encodeURIComponent(clientId)}` : ''}${nodeId ? `&nodeId=${encodeURIComponent(nodeId)}` : ''}`
    
    console.log('Iframe src:', src)
    setIframeSrc(src)
  }, [api])

  if (!iframeSrc) {
    return <div className="flex h-[70vh] items-center justify-center text-[var(--color-text-muted)]">Loading...</div>
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-0 shadow-card">
      <iframe
        key={iframeSrc}
        title="Agent Ideator"
        src={iframeSrc}
        className="h-[70vh] w-full rounded-xl"
      />
    </div>
  )
}


