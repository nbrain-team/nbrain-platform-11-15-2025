"use client"
import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type AddNodeModalProps = {
  onClose: () => void
  onAdd: (data: { nodeType: string, title: string, description: string, priority?: string, category?: string }) => void
}

export function AddNodeModal({ onClose, onAdd }: AddNodeModalProps) {
  const [step, setStep] = useState<'select' | 'details'>('select')
  const [selectedType, setSelectedType] = useState<'project' | 'category' | 'subcategory' | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [generatingDescription, setGeneratingDescription] = useState(false)
  
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : undefined
  }, [])

  const predefinedCategories = [
    'The Brain',
    'Sales',
    'Marketing',
    'HR',
    'Operations',
    'Finance',
    'Other'
  ]

  const handleTypeSelect = (type: 'project' | 'category' | 'subcategory') => {
    setSelectedType(type)
    setStep('details')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() && selectedType !== 'category') {
      alert('Please enter a title')
      return
    }
    
    if (selectedType === 'category' && !selectedCategory) {
      alert('Please select a category')
      return
    }

    const nodeData: { nodeType: string, title: string, description: string, priority?: string, category?: string } = {
      nodeType: selectedType === 'project' ? 'project' : selectedType === 'category' ? 'category' : 'subcategory',
      title: selectedType === 'category' ? selectedCategory : title,
      description,
    }

    if (selectedType === 'project') {
      nodeData.priority = priority
    }
    
    if (selectedType === 'category') {
      nodeData.category = selectedCategory
    }

    onAdd(nodeData)
  }

  const handleBack = () => {
    setStep('select')
    setTitle('')
    setDescription('')
    setSelectedCategory('')
  }
  
  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      alert('Please enter a title first')
      return
    }
    
    setGeneratingDescription(true)
    try {
      const res = await fetch(`${api}/roadmap/ai-description`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title,
          nodeType: selectedType,
        }),
      })
      
      const data = await res.json()
      if (data.ok && data.description) {
        setDescription(data.description)
      } else {
        alert('Failed to generate description')
      }
    } catch (e) {
      console.error('AI description error:', e)
      alert('Failed to generate description')
    } finally {
      setGeneratingDescription(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Add New Node' : `Add ${selectedType === 'project' ? 'New Project' : selectedType === 'category' ? 'Category' : 'Sub-Category'}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Choose what type of node to create' : 'Enter the details for your new node'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-3">
            <button
              onClick={() => handleTypeSelect('project')}
              className="w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4 text-left hover:bg-emerald-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white text-xl font-bold">
                  P
                </div>
                <div>
                  <div className="font-semibold text-emerald-900">New Project</div>
                  <div className="text-sm text-emerald-700">Create a named project that can be built with AI later</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect('category')}
              className="w-full rounded-lg border-2 border-purple-300 bg-purple-50 p-4 text-left hover:bg-purple-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-white text-xl font-bold">
                  C
                </div>
                <div>
                  <div className="font-semibold text-purple-900">Category Selector</div>
                  <div className="text-sm text-purple-700">Add a predefined business category (Sales, Marketing, etc.)</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect('subcategory')}
              className="w-full rounded-lg border-2 border-indigo-300 bg-indigo-50 p-4 text-left hover:bg-indigo-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white text-xl">
                  📁
                </div>
                <div>
                  <div className="font-semibold text-indigo-900">Free Form Sub-Category</div>
                  <div className="text-sm text-indigo-700">Create a custom organizational node (e.g., &quot;SEO&quot; under Marketing)</div>
                </div>
              </div>
            </button>

            <div className="flex justify-end pt-4">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedType === 'category' ? (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Select Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {predefinedCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-md border-2 p-3 text-sm font-medium transition ${
                        selectedCategory === cat
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  {selectedType === 'project' ? 'Project Name' : 'Sub-Category Name'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder={selectedType === 'project' ? 'e.g., Sales AI Assistant' : 'e.g., SEO, Content Strategy'}
                  required
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[var(--color-text)]">
                  Description {selectedType === 'category' && '(Optional)'}
                </label>
                {selectedType !== 'category' && title.trim() && (
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {generatingDescription ? (
                      <>Generating...</>
                    ) : (
                      <>AI Generate</>
                    )}
                  </button>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                rows={3}
                placeholder="Enter description or use AI Generate..."
              />
            </div>


            <div className="flex justify-between gap-2 pt-4">
              <button type="button" onClick={handleBack} className="btn-secondary">
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedType === 'project' ? 'Create Project' : 'Add Node'}
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

