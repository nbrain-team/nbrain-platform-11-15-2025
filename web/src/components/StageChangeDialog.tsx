"use client"
import { useState, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type StageChangeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  currentStage: string
  newStage: string
  onSuccess: () => void
}

export function StageChangeDialog({ open, onOpenChange, projectId, currentStage, newStage, onSuccess }: StageChangeDialogProps) {
  const [message, setMessage] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please enter a message for the client")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('from_stage', currentStage)
      formData.append('to_stage', newStage)
      formData.append('message', message)
      
      if (attachment) {
        formData.append('attachment', attachment)
      }

      const response = await fetch(
        `${api}/advisor/projects/${projectId}/stage-change-request`,
        {
          method: 'POST',
          headers: authHeaders ? { Authorization: authHeaders.Authorization as string } : {},
          body: formData
        }
      )

      const data = await response.json()

      if (data.ok) {
        setMessage("")
        setAttachment(null)
        onOpenChange(false)
        onSuccess()
        alert(`Stage change request sent! The client will need to approve before the project moves to ${newStage}.`)
      } else {
        setError(data.error || 'Failed to submit stage change request')
      }
    } catch (e) {
      setError('Failed to submit stage change request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Stage Change</DialogTitle>
          <DialogDescription>
            Moving project from <strong>{currentStage}</strong> to <strong>{newStage}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status change confirmation */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
            <div className="text-sm text-[var(--color-text-muted)]">
              This stage change requires client approval before taking effect.
            </div>
          </div>

          {/* Message for client */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Message to Client *
            </label>
            <textarea
              className="w-full rounded-md border border-[var(--color-border)] p-3 text-sm min-h-[120px]"
              placeholder="Explain the progress and why the project is ready to move to the next stage..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              This message will appear in the client communication thread with an approval button.
            </div>
          </div>

          {/* Attachment upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Attachment (optional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm px-3 py-2"
              >
                {attachment ? 'Change File' : 'Upload File'}
              </button>
              {attachment && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <span>{attachment.name}</span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send for Approval'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

