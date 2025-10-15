"use client"
import { useState, useMemo } from 'react'
import { Node } from 'reactflow'

type RoadmapSidebarProps = {
  node: Node
  onClose: () => void
  onDelete: (nodeId: string) => void
  onUpdate?: (nodeId: string, updates: Record<string, unknown>) => void
}

export function RoadmapSidebar({ node, onClose, onDelete, onUpdate }: RoadmapSidebarProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(node.data.title || '')
  const [editDescription, setEditDescription] = useState(node.data.description || '')
  const [saving, setSaving] = useState(false)
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])
  
  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${api}/roadmap/nodes/${node.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
        }),
      })
      
      const data = await res.json()
      if (data.ok && onUpdate) {
        onUpdate(node.id, { title: editTitle, description: editDescription })
        setIsEditing(false)
      } else {
        alert('Failed to save changes')
      }
    } catch (e) {
      console.error('Save error:', e)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }
  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return { label: 'Project', color: 'text-emerald-700 bg-emerald-50' }
      case 'idea': return { label: 'Idea', color: 'text-purple-700 bg-purple-50' }
      case 'department': return { label: 'Department', color: 'text-blue-700 bg-blue-50' }
      default: return { label: type, color: 'text-gray-700 bg-gray-50' }
    }
  }

  const typeInfo = getNodeTypeLabel(node.type || 'unknown')

  return (
    <div className="w-80 rounded-xl border border-[var(--color-border)] bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
        <h3 className="font-semibold text-[var(--color-text)]">Node Details</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] font-medium transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>
            {node.type !== 'category' && node.type !== 'subcategory' && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  rows={4}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditTitle(node.data.title || '')
                  setEditDescription(node.data.description || '')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-lg font-semibold text-[var(--color-text)]">{node.data.title || node.data.name}</h4>
            </div>

            {node.data.description && node.type !== 'category' && node.type !== 'subcategory' && (
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">{node.data.description}</p>
              </div>
            )}
          </>
        )}

        {!isEditing && (
          <>
            {node.data.status && node.type !== 'category' && node.type !== 'subcategory' && (
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Status</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{node.data.status}</div>
              </div>
            )}

            {node.data.estimated_roi && (
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Estimated ROI</div>
                <div className="text-sm font-medium text-emerald-600">${Number(node.data.estimated_roi).toLocaleString()}</div>
              </div>
            )}

            {node.data.estimated_timeline && (
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Timeline</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{node.data.estimated_timeline}</div>
              </div>
            )}

            {node.data.ai_adoption_score !== undefined && (
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] mb-2">AI Adoption Score</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${node.data.ai_adoption_score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{node.data.ai_adoption_score}%</span>
                </div>
              </div>
            )}
          </>
        )}

        {!isEditing && (
          <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
            {node.data.project_id && (
            <a 
              href={`/projects/PRJ-${String(node.data.project_id).padStart(4, '0')}`}
              className="block w-full rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90 transition"
            >
              View Project Details
            </a>
          )}
          
          {node.type === 'project' && !node.data.project_id && (
            <a 
              href={`/chat?projectName=${encodeURIComponent(node.data.title)}&nodeId=${node.id}`}
              className="block w-full rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--color-primary-700)] transition"
            >
              Create Project with AI
            </a>
          )}
          
          {node.data.idea_id && (
            <a 
              href={`/ideas/${node.data.idea_id}`}
              className="block w-full rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90 transition"
            >
              View Idea Details
            </a>
          )}

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this node?')) {
                  onDelete(node.id)
                }
              }}
              className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              Delete Node
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

