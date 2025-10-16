"use client"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ChangeRequest = {
  id: number
  project_name: string
  project_url: string | null
  status: string
  created_at: string
  task_count?: number
  archived?: boolean
}

type ChangeRequestTask = {
  id: number
  module_name: string
  issue_description: string
  file_path: string | null
  file_name: string | null
  completed: boolean
}

type Project = {
  id: number
  name: string
  client_id?: number
}

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null)
  const [tasks, setTasks] = useState<ChangeRequestTask[]>([])
  
  // Create request form
  const [useExistingProject, setUseExistingProject] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [customProjectName, setCustomProjectName] = useState("")
  const [projectUrl, setProjectUrl] = useState("")
  const [clients, setClients] = useState<{id: number, name: string}[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [isAdvisor, setIsAdvisor] = useState(false)
  
  // Add task form
  const [moduleName, setModuleName] = useState("")
  const [issueDescription, setIssueDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])

  useEffect(() => {
    // Check if advisor
    const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setIsAdvisor(payload.role === 'advisor')
        
        // Load clients if advisor
        if (payload.role === 'advisor') {
          fetch(`${api}/advisor/clients`, { headers: authHeaders })
            .then(r => r.json())
            .then(data => {
              if (data.ok && data.clients) {
                setClients(data.clients)
              }
            })
            .catch(console.error)
        }
      } catch (e) {
        console.error('Failed to decode token:', e)
      }
    }
    
    loadRequests()
    loadProjects()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await fetch(`${api}/change-requests`, { headers: authHeaders }).then(r => r.json())
      if (res.ok) setRequests(res.requests)
    } catch (e) {
      console.error('Failed to load requests:', e)
    }
  }

  const loadProjects = async () => {
    try {
      // Determine user role from token
      const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
      if (!token) return
      
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isAdvisor = payload.role === 'advisor'
      
      // Use appropriate endpoint based on role
      const endpoint = isAdvisor ? `${api}/advisor/projects` : `${api}/client/projects`
      const res = await fetch(endpoint, { headers: authHeaders }).then(r => r.json())
      
      if (res.ok) setProjects(res.projects)
    } catch (e) {
      console.error('Failed to load projects:', e)
    }
  }

  const createRequest = async () => {
    try {
      // For advisors, client is required
      if (isAdvisor && !selectedClientId) {
        alert('Please select a client')
        return
      }
      
      const projectName = selectedProjectId
        ? projects.find(p => p.id === selectedProjectId)?.name
        : customProjectName

      if (!projectName) {
        alert('Please select a project or enter a project name')
        return
      }

      const res = await fetch(`${api}/change-requests`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          projectId: selectedProjectId || null,
          projectName,
          projectUrl,
          clientId: isAdvisor ? selectedClientId : null
        })
      }).then(r => r.json())

      if (res.ok) {
        setSelectedRequest(res.request.id)
        setShowCreateDialog(false)
        loadRequests()
        // Reset form
        setSelectedProjectId(null)
        setCustomProjectName("")
        setProjectUrl("")
        setSelectedClientId(null)
      }
    } catch (e) {
      console.error('Failed to create request:', e)
    }
  }
  
  // Filter projects for selected client (advisor view)
  const filteredProjects = isAdvisor && selectedClientId
    ? projects.filter(p => p.client_id === selectedClientId)
    : projects

  const loadRequestTasks = async (requestId: number) => {
    try {
      const res = await fetch(`${api}/change-requests/${requestId}`, { headers: authHeaders }).then(r => r.json())
      if (res.ok) {
        setTasks(res.tasks)
        setSelectedRequest(requestId)
      }
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
  }

  const addTask = async () => {
    if (!selectedRequest || !moduleName || !issueDescription) {
      alert('Please fill in all required fields')
      return
    }

    try {
      let fileData = null
      if (selectedFile) {
        const reader = new FileReader()
        fileData = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(selectedFile)
        })
      }

      const res = await fetch(`${api}/change-requests/${selectedRequest}/tasks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          moduleName,
          issueDescription,
          fileName: selectedFile?.name,
          fileData
        })
      }).then(r => r.json())

      if (res.ok) {
        loadRequestTasks(selectedRequest)
        // Reset form
        setModuleName("")
        setIssueDescription("")
        setSelectedFile(null)
      }
    } catch (e) {
      console.error('Failed to add task:', e)
    }
  }

  const deleteTask = async (taskId: number) => {
    if (!selectedRequest || !confirm('Delete this task?')) return

    try {
      await fetch(`${api}/change-requests/${selectedRequest}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      loadRequestTasks(selectedRequest)
    } catch (e) {
      console.error('Failed to delete task:', e)
    }
  }

  const archiveRequest = async (requestId: number) => {
    try {
      await fetch(`${api}/change-requests/${requestId}/archive`, {
        method: 'PUT',
        headers: authHeaders
      })
      loadRequests()
      if (selectedRequest === requestId) {
        setSelectedRequest(null)
      }
    } catch (e) {
      console.error('Failed to archive:', e)
    }
  }

  const unarchiveRequest = async (requestId: number) => {
    try {
      await fetch(`${api}/change-requests/${requestId}/unarchive`, {
        method: 'PUT',
        headers: authHeaders
      })
      loadRequests()
    } catch (e) {
      console.error('Failed to unarchive:', e)
    }
  }

  const downloadMarkdown = async (requestId: number) => {
    try {
      const res = await fetch(`${api}/change-requests/${requestId}/export`, {
        headers: authHeaders
      })
      
      if (!res.ok) {
        alert('Failed to download: ' + (await res.text()))
        return
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `change-request-${requestId}.md`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error('Download error:', e)
      alert('Failed to download package')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Submit Change Requests</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Document QC issues and generate Cursor-friendly packages for your development team</p>
        </div>
        <button onClick={() => setShowCreateDialog(true)} className="btn-primary">
          + Create New Request
        </button>
      </div>

      {/* Active Change Requests */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Active Requests</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.filter(r => !r.archived).map(request => (
            <div
              key={request.id}
              className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card hover:shadow-xl transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 
                  className="font-semibold text-[var(--color-text)] cursor-pointer flex-1"
                  onClick={() => loadRequestTasks(request.id)}
                >
                  {request.project_name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    request.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {request.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      archiveRequest(request.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                    title="Archive"
                  >
                    Archive
                  </button>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {new Date(request.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          
          {requests.filter(r => !r.archived).length === 0 && (
            <div className="col-span-full rounded-xl border-2 border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-muted)]">
              No active change requests. Click "Create New Request" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Archived Requests */}
      {requests.filter(r => r.archived).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Archived Requests</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.filter(r => r.archived).map(request => (
              <div
                key={request.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-6 shadow-card opacity-75 hover:opacity-100 transition group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 
                    className="font-semibold text-[var(--color-text)] cursor-pointer flex-1"
                    onClick={() => loadRequestTasks(request.id)}
                  >
                    {request.project_name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700">
                      Archived
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unarchiveRequest(request.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                      title="Unarchive"
                    >
                      Unarchive
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected request - task management */}
      {selectedRequest && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              {requests.find(r => r.id === selectedRequest)?.project_name} - Tasks
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => downloadMarkdown(selectedRequest)}
                className="rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-700)]"
              >
                Download Cursor Package
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-4 mb-6">
            {tasks.map((task, index) => (
              <div key={task.id} className="rounded-lg border border-[var(--color-border)] p-4 bg-[var(--color-surface-alt)]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-50)] text-xs font-semibold text-[var(--color-primary)]">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">{task.module_name}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] ml-8">{task.issue_description}</p>
                    {task.file_name && (
                      <div className="mt-2 ml-8 text-xs text-[var(--color-text-muted)]">
                        File: {task.file_name}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new task form */}
          <div className="rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-50)] p-4">
            <h3 className="font-semibold text-[var(--color-text)] mb-3">Add New Task/Issue</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Module / Function Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={moduleName}
                  onChange={e => setModuleName(e.target.value)}
                  placeholder="e.g., Profile Page, Login Component, API Endpoint"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Describe Issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Describe what's wrong and what should be fixed..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Upload Screenshot or File (Optional)
                </label>
                <input
                  type="file"
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              <button onClick={addTask} className="btn-primary w-full">
                Add Task to Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create request dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Change Request</DialogTitle>
            <p className="text-sm text-[var(--color-text-muted)]">Select a project and add QC tasks with screenshots</p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Client selector for advisors */}
            {isAdvisor && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={selectedClientId || ''}
                  onChange={e => setSelectedClientId(Number(e.target.value))}
                >
                  <option value="">Choose a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Project selector or custom name */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Select Project (Optional)
              </label>
              <select
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={selectedProjectId || ''}
                onChange={e => {
                  const val = e.target.value
                  setSelectedProjectId(val ? Number(val) : null)
                  if (val) setCustomProjectName("")
                }}
                disabled={isAdvisor && !selectedClientId}
              >
                <option value="">Or enter custom project name below...</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    PRJ-{String(p.id).padStart(4, '0')} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Or Enter Project Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={customProjectName}
                onChange={e => {
                  setCustomProjectName(e.target.value)
                  if (e.target.value) setSelectedProjectId(null)
                }}
                placeholder="Enter project name if not in list above"
                disabled={!!selectedProjectId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Project URL (Optional)
              </label>
              <input
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={projectUrl}
                onChange={e => setProjectUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={createRequest} className="btn-primary flex-1">
                Create Request
              </button>
              <button onClick={() => setShowCreateDialog(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

