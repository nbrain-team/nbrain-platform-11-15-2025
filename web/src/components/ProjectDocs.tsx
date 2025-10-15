"use client"
import { useCallback, useEffect, useMemo, useState } from "react"

type ProjectFile = { id: number; originalname: string; filename: string; mimetype: string | null; size: number | null; created_at: string; advisor_only?: boolean }

export function ProjectDocs({ projectId }: { projectId: number }) {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const token = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
  const auth: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined

  const [files, setFiles] = useState<ProjectFile[]>([])
  const [uploading, setUploading] = useState(false)

  const fetchFiles = useCallback(async () => {
    try {
      const r = await fetch(`${api}/projects/${projectId}/files`, { headers: auth }).then(r=>r.json())
      if (r.ok) setFiles(r.files)
    } catch {}
  }, [api, projectId, auth])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const onUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Allow advisor to mark as advisor-only via prompt (simple MVP)
      const markAdvisorOnly = window.location.pathname.startsWith('/advisor') && confirm('Make this file advisor-only (hidden from client)?')
      if (markAdvisorOnly) fd.append('advisor_only', 'true')
      const res = await fetch(`${api}/projects/${projectId}/files`, {
        method: 'POST',
        headers: auth, // do NOT set Content-Type for FormData
        body: fd
      }).then(r => r.json())
      if (res.ok) fetchFiles()
      else alert(res.error || 'Upload failed')
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Docs</h3>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-[var(--color-border)] bg-white px-3 py-1 text-sm hover:bg-[var(--color-surface-alt)]">
          {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" className="hidden" onChange={e=>onUpload(e.target.files?.[0] || null)} disabled={uploading} />
        </label>
      </div>
      <div className="rounded-md border border-[var(--color-border)]">
        {files.length === 0 ? (
          <div className="p-3 text-sm text-[var(--color-text-muted)]">No files uploaded.</div>
        ) : (
          <ul className="divide-y">
            {files.map(f => (
              <li key={f.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium text-[var(--color-text)]">{f.originalname}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{(f.mimetype || 'file')} · {new Date(f.created_at).toLocaleString()}</div>
                </div>
                <a
                  className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:bg-[var(--color-surface-alt)]"
                  href={`${api}/projects/${projectId}/files/${f.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


