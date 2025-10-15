"use client"
import { useEffect, useMemo, useState } from "react"

type Msg = { id: number; content: string; created_at: string; author_name: string; author_role: string }

type StageChangeRequest = {
  id: number
  from_stage: string
  to_stage: string
  message: string
  attachment_name?: string
  attachment_id?: number
  advisor_name: string
  created_at: string
}

export function ProjectCommunication({ projectId }: { projectId: number }) {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [messages, setMessages] = useState<Msg[]>([])
  const [stageRequests, setStageRequests] = useState<StageChangeRequest[]>([])
  const [input, setInput] = useState("")
  const [userRole, setUserRole] = useState<string>("")
  const [processingApproval, setProcessingApproval] = useState<number | null>(null)
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null), [])

  const fetchMessages = async () => {
    try {
      const r = await fetch(`${api}/projects/${projectId}/messages`, { headers: authHeaders }).then(r=>r.json())
      if (r.ok) setMessages(r.messages)
    } catch {}
  }

  const fetchStageRequests = async () => {
    try {
      const r = await fetch(`${api}/projects/${projectId}/stage-change-requests`, { headers: authHeaders }).then(r=>r.json())
      if (r.ok) {
        console.log('[Stage Requests] Fetched:', r.requests)
        setStageRequests(r.requests || [])
      } else {
        console.log('[Stage Requests] Error:', r.error)
      }
    } catch (e) {
      console.error('[Stage Requests] Fetch failed:', e)
    }
  }

  const fetchUserRole = async () => {
    try {
      const r = await fetch(`${api}/me`, { headers: authHeaders }).then(r=>r.json())
      if (r.ok && r.user) setUserRole(r.user.role)
    } catch {}
  }

  useEffect(() => { 
    fetchMessages()
    fetchStageRequests()
    fetchUserRole()
  }, [projectId])

  const send = async () => {
    if (!input.trim()) return
    try {
      const r = await fetch(`${api}/projects/${projectId}/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ content: input.trim() }) }).then(r=>r.json())
      if (r.ok) { setInput(""); fetchMessages() }
    } catch {}
  }

  const handleApproveStage = async (approvalId: number) => {
    if (!confirm('Approve this stage change? The project will move to the next phase.')) return
    setProcessingApproval(approvalId)
    try {
      const r = await fetch(`${api}/client/projects/${projectId}/stage-change-requests/${approvalId}/approve`, {
        method: 'POST',
        headers: authHeaders
      }).then(r=>r.json())
      
      if (r.ok) {
        // Remove the approved request from UI immediately
        setStageRequests(prev => prev.filter(req => req.id !== approvalId))
        alert('Stage change approved!')
        fetchMessages()
        // Refresh the page to show updated stage
        setTimeout(() => window.location.reload(), 500)
      } else {
        alert(r.error || 'Failed to approve stage change')
        setProcessingApproval(null)
      }
    } catch {
      alert('Failed to approve stage change')
      setProcessingApproval(null)
    }
  }

  const handleRejectStage = async (approvalId: number) => {
    const reason = prompt('Please provide a reason for rejecting this stage change (optional):')
    if (reason === null) return // User cancelled
    
    setProcessingApproval(approvalId)
    try {
      const r = await fetch(`${api}/client/projects/${projectId}/stage-change-requests/${approvalId}/reject`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason })
      }).then(r=>r.json())
      
      if (r.ok) {
        // Remove the rejected request from UI immediately
        setStageRequests(prev => prev.filter(req => req.id !== approvalId))
        alert('Stage change rejected.')
        fetchMessages()
      } else {
        alert(r.error || 'Failed to reject stage change')
        setProcessingApproval(null)
      }
    } catch {
      alert('Failed to reject stage change')
      setProcessingApproval(null)
    }
  }

  console.log('[ProjectCommunication] userRole:', userRole, 'stageRequests:', stageRequests.length)

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Project Communication</h3>

      {/* Stage Change Approval Cards - Only show for clients */}
      {userRole === 'client' && stageRequests.length > 0 && (
        <div className="space-y-3">
          {stageRequests.map(req => (
            <div key={req.id} className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-amber-900">Stage Change Request</div>
                  <div className="text-xs text-amber-700">From {req.advisor_name}</div>
                </div>
                <div className="text-xs text-amber-700">{new Date(req.created_at).toLocaleString()}</div>
              </div>
              
              <div className="mb-3 rounded-md bg-white p-3">
                <div className="text-sm font-medium text-[var(--color-text)] mb-2">
                  Moving from <strong>{req.from_stage}</strong> to <strong>{req.to_stage}</strong>
                </div>
                <div className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">{req.message}</div>
                
                {req.attachment_name && req.attachment_id && (
                  <div className="mt-2">
                    <a 
                      href={`${api}/projects/${projectId}/files/${req.attachment_id}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                      className="text-sm text-[var(--color-primary)] underline flex items-center gap-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                      </svg>
                      {req.attachment_name}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleRejectStage(req.id)}
                  className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  disabled={processingApproval === req.id}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApproveStage(req.id)}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  disabled={processingApproval === req.id}
                >
                  {processingApproval === req.id ? 'Processing...' : 'Approve Stage Change'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--color-border)] p-3 bg-[var(--color-surface-alt)]">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map(m => {
              const isAdvisor = (m.author_role || '').toLowerCase() === 'advisor'
              return (
                <li key={m.id} className={`max-w-[75%] rounded-md p-3 shadow-sm ${isAdvisor ? 'ml-auto bg-[var(--color-primary-50)]' : 'mr-auto bg-white'}`}>
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                    <span>{m.author_name || 'User'} ({m.author_role || 'user'})</span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text)] whitespace-pre-wrap">{m.content}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2" placeholder="Write a message…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }} />
        <button className="btn-primary" onClick={send}>Send</button>
      </div>
    </div>
  )
}


