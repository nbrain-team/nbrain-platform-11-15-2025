"use client"
import { useEffect, useMemo, useState } from "react"

type Me = {
  id: number
  role: "admin" | "advisor" | "client"
  name: string
  email: string
  username: string
  company_name?: string | null
  website_url?: string | null
  phone?: string | null
}

type Credential = {
  id: number
  name: string
  type: 'text' | 'file'
  value?: string
  file_name?: string
  is_predefined: boolean
  created_at: string
}

type Advisor = {
  id: number
  name: string
  email: string
  phone?: string
}

export default function ProfilePage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    const t = localStorage.getItem('xsourcing_token')
    return t ? { Authorization: `Bearer ${t}` } : undefined
  }, [])

  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [username, setUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [advisor, setAdvisor] = useState<Advisor | null>(null)
  const [copySuccess, setCopySuccess] = useState("")
  
  // Credentials state
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [editingCredential, setEditingCredential] = useState<number | null>(null)
  const [credentialValues, setCredentialValues] = useState<{[key: number]: string}>({})
  const [showAddCredential, setShowAddCredential] = useState(false)
  const [newCredentialName, setNewCredentialName] = useState("")
  const [newCredentialType, setNewCredentialType] = useState<'text' | 'file'>('text')
  const [newCredentialValue, setNewCredentialValue] = useState("")
  const [newCredentialFile, setNewCredentialFile] = useState<File | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Load user profile
        const r = await fetch(`${api}/me`, { headers: authHeaders }).then(r => r.json())
        if (!r.ok) throw new Error(r.error || 'Failed loading profile')
        const u: Me = r.user
        setMe(u)
        setName(u.name || "")
        setCompany(u.company_name || "")
        setEmail(u.email || "")
        setPhone(u.phone || "")
        setUsername(u.username || "")
        
        // Load credentials and advisor for client users
        if (u.role === 'client') {
          const credRes = await fetch(`${api}/credentials`, { headers: authHeaders }).then(r => r.json())
          if (credRes.ok) {
            setCredentials(credRes.credentials)
            // Initialize credential values
            const values: {[key: number]: string} = {}
            credRes.credentials.forEach((cred: Credential) => {
              if (cred.value) values[cred.id] = cred.value
            })
            setCredentialValues(values)
          }
          
          // Fetch assigned advisor
          const advisorRes = await fetch(`${api}/client/advisor`, { headers: authHeaders }).then(r => r.json())
          if (advisorRes.ok) {
            setAdvisor(advisorRes.advisor)
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed loading profile')
      }
    }
    load()
  }, [api, authHeaders])

  const save = async () => {
    if (!me) return
    setSaving(true)
    setError("")
    try {
      // Check password confirmation if changing password
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Passwords do not match")
      }
      
      const body: { name: string; email: string; phone: string; companyName: string; username: string; password?: string } = { name, email, phone, companyName: company, username }
      if (newPassword) {
        body.password = newPassword
      }
      
      const r = await fetch(`${api}/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify(body)
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error || 'Failed saving')
      
      // Clear password fields on success
      if (newPassword) {
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed saving')
    } finally { setSaving(false) }
  }

  const saveCredential = async (credId: number) => {
    try {
      const value = credentialValues[credId]
      const r = await fetch(`${api}/credentials/${credId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify({ type: 'text', value })
      }).then(r => r.json())
      if (!r.ok) throw new Error(r.error || 'Failed saving credential')
      setEditingCredential(null)
      // Update local state
      setCredentials(prev => prev.map(c => c.id === credId ? {...c, value} : c))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed saving credential')
    }
  }

  const addCredential = async () => {
    try {
      const body: {
        name: string;
        type: string;
        value?: string;
        file_data?: string;
        file_name?: string;
      } = {
        name: newCredentialName,
        type: newCredentialType
      }
      
      if (newCredentialType === 'text') {
        body.value = newCredentialValue
      } else if (newCredentialFile) {
        const fileData = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '')
          reader.readAsDataURL(newCredentialFile)
        })
        body.file_data = fileData
        body.file_name = newCredentialFile.name
      }
      
      const r = await fetch(`${api}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders || {}) },
        body: JSON.stringify(body)
      }).then(r => r.json())
      
      if (!r.ok) throw new Error(r.error || 'Failed adding credential')
      
      // Reload credentials
      const credRes = await fetch(`${api}/credentials`, { headers: authHeaders }).then(r => r.json())
      if (credRes.ok) {
        setCredentials(credRes.credentials)
        const values: {[key: number]: string} = {}
        credRes.credentials.forEach((cred: Credential) => {
          if (cred.value) values[cred.id] = cred.value
        })
        setCredentialValues(values)
      }
      
      // Reset form
      setShowAddCredential(false)
      setNewCredentialName("")
      setNewCredentialType('text')
      setNewCredentialValue("")
      setNewCredentialFile(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed adding credential')
    }
  }

  const deleteCredential = async (credId: number) => {
    if (!confirm('Are you sure you want to delete this credential?')) return
    
    try {
      const r = await fetch(`${api}/credentials/${credId}`, {
        method: 'DELETE',
        headers: authHeaders
      }).then(r => r.json())
      
      if (!r.ok) throw new Error(r.error || 'Failed deleting credential')
      
      // Remove from local state
      setCredentials(prev => prev.filter(c => c.id !== credId))
      const newValues = {...credentialValues}
      delete newValues[credId]
      setCredentialValues(newValues)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed deleting credential')
    }
  }

  const downloadCredentialFile = async (credId: number, fileName: string) => {
    try {
      const response = await fetch(`${api}/credentials/${credId}/download`, {
        headers: authHeaders
      })
      if (!response.ok) throw new Error('Failed to download file')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed downloading file')
    }
  }

  const copyToClipboard = async (text: string, credName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess('Copied to clipboard')
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (e: unknown) {
      setError('Failed to copy to clipboard')
      setTimeout(() => setError(''), 2000)
    }
  }

  const isAdmin = me?.role === 'admin'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Profile & settings</h1>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {copySuccess && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{copySuccess}</div>}

      {isAdmin ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
          <div className="text-lg font-semibold">Admin profile</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label className="text-[var(--color-text-muted)]">Full name</label>
            <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
            <label className="text-[var(--color-text-muted)]">Company</label>
            <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={company} onChange={e=>setCompany(e.target.value)} />
            <label className="text-[var(--color-text-muted)]">Email</label>
            <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
            <label className="text-[var(--color-text-muted)]">Phone</label>
            <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving} className="btn-primary mt-4">{saving ? 'Saving…' : 'Save'}</button>
        </section>
      ) : (
        <>
          {/* Account Info Section */}
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
            <div className="text-lg font-semibold">Account Information</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-4 text-sm items-center">
                  <label className="text-[var(--color-text-muted)]">Full name</label>
                  <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
                  <label className="text-[var(--color-text-muted)]">Company</label>
                  <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={company} onChange={e=>setCompany(e.target.value)} />
                  <label className="text-[var(--color-text-muted)]">Email</label>
                  <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
                  <label className="text-[var(--color-text-muted)]">Phone</label>
                  <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-4 text-sm items-center">
                  <label className="text-[var(--color-text-muted)]">Username</label>
                  <input className="rounded-md border border-[var(--color-border)] px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} />
                  <label className="text-[var(--color-text-muted)]">New Password</label>
                  <input type="password" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
                  <label className="text-[var(--color-text-muted)]">Confirm Password</label>
                  <input type="password" className="rounded-md border border-[var(--color-border)] px-3 py-2" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                  <div></div>
                  <div className="text-xs text-[var(--color-text-muted)] -mt-2">Password must be at least 8 characters</div>
                </div>
              </div>
            </div>
            <button onClick={save} disabled={saving} className="btn-primary mt-6">{saving ? 'Saving…' : 'Save'}</button>
          </section>

          {/* Credentials Section */}
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card mt-6">
            <div className="text-lg font-semibold">Access & Credentials</div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Provide read‑only credentials. We store them securely and show everything that&apos;s in use.</p>
            
            <div className="mt-4 space-y-3">
              {credentials.map(cred => (
                <div key={cred.id} className="flex flex-wrap items-center gap-2 py-2">
                  <label className="w-full sm:w-[140px] text-sm text-[var(--color-text-muted)]">{cred.name}</label>
                  {editingCredential === cred.id ? (
                    <>
                      <input 
                        className="flex-1 min-w-[200px] rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                        type={cred.type === 'text' ? 'password' : 'text'}
                        value={credentialValues[cred.id] || ''}
                        onChange={e => setCredentialValues(prev => ({...prev, [cred.id]: e.target.value}))}
                        placeholder={cred.type === 'text' ? 'Enter API key or credential' : cred.file_name || 'No file uploaded'}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => saveCredential(cred.id)}
                          className="rounded-md bg-[var(--color-primary)] px-3 py-1 text-sm text-white hover:bg-[var(--color-primary-700)]"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingCredential(null)}
                          className="rounded-md border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-surface-alt)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {cred.type === 'file' && cred.file_name ? (
                        <button 
                          onClick={() => downloadCredentialFile(cred.id, cred.file_name!)}
                          className="flex-1 min-w-[200px] rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-left hover:bg-[var(--color-surface-alt)] cursor-pointer"
                        >
                          📎 {cred.file_name}
                        </button>
                      ) : cred.type === 'text' && cred.value ? (
                        <div className="flex-1 min-w-[200px] flex items-center gap-2">
                          <input 
                            className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                            type="password"
                            value='••••••••••••'
                            readOnly
                          />
                          <button 
                            onClick={() => copyToClipboard(cred.value!, cred.name)}
                            className="rounded-md border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-surface-alt)] transition"
                            title="Copy to clipboard"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <input 
                          className="flex-1 min-w-[200px] rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          type="password"
                          value={cred.value ? '••••••••' : ''}
                          placeholder={cred.type === 'text' ? 'Not configured' : 'No file uploaded'}
                          readOnly
                        />
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingCredential(cred.id)}
                          className="rounded-md border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-surface-alt)]"
                        >
                          Edit
                        </button>
                        {!cred.is_predefined && (
                          <button 
                            onClick={() => deleteCredential(cred.id)}
                            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {showAddCredential ? (
                <div className="mt-4 rounded-lg border border-[var(--color-border)] p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-[var(--color-text-muted)]">Credential Name</label>
                      <input 
                        className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                        value={newCredentialName}
                        onChange={e => setNewCredentialName(e.target.value)}
                        placeholder="e.g., Stripe API Key"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[var(--color-text-muted)]">Type</label>
                      <select 
                        className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                        value={newCredentialType}
                        onChange={e => setNewCredentialType(e.target.value as 'text' | 'file')}
                      >
                        <option value="text">Text / API Key</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>
                    {newCredentialType === 'text' ? (
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">Value</label>
                        <input 
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                          type="password"
                          value={newCredentialValue}
                          onChange={e => setNewCredentialValue(e.target.value)}
                          placeholder="Enter API key or credential value"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">File</label>
                        <input 
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                          type="file"
                          onChange={e => setNewCredentialFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={addCredential}
                        disabled={!newCredentialName || (newCredentialType === 'text' ? !newCredentialValue : !newCredentialFile)}
                        className="btn-primary"
                      >
                        Add Credential
                      </button>
                      <button 
                        onClick={() => {
                          setShowAddCredential(false)
                          setNewCredentialName("")
                          setNewCredentialType('text')
                          setNewCredentialValue("")
                          setNewCredentialFile(null)
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddCredential(true)}
                  className="btn-secondary mt-4"
                >
                  + Add Custom Credential
                </button>
              )}
            </div>
          </section>
          
          {/* Advisor Section */}
          {advisor && (
            <section className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
              <div className="text-lg font-semibold mb-4">Your Advisor</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium text-[var(--color-text)]">{advisor.name}</h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--color-text-muted)]">Email:</span>
                      <a href={`mailto:${advisor.email}`} className="text-[var(--color-primary)] underline">{advisor.email}</a>
                    </div>
                    {advisor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--color-text-muted)]">Phone:</span>
                        <a href={`tel:${advisor.phone}`} className="text-[var(--color-primary)] underline">{advisor.phone}</a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center md:justify-end">
                  <a href="/schedule" className="btn-primary">Schedule a Chat</a>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}