import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export const ProjectNode = memo(({ data }: NodeProps) => {
  // Determine if this is a scoped project (has project_id) or planned (no project_id)
  const isScoped = !!data.project_id
  const nodeColor = isScoped ? 'emerald' : 'blue'
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'in production': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'draft': return 'bg-gray-100 text-gray-600 border-gray-300'
      case 'waiting client feedback': return 'bg-brand-100 text-brand-700 border-brand-300'
      default: return 'bg-blue-100 text-blue-700 border-blue-300'
    }
  }

  return (
    <div 
      className={`rounded-lg border bg-white shadow-md ${
        isScoped ? 'border-emerald-400' : 'border-blue-400'
      }`} 
      style={{ minWidth: 220 }}
    >
      {/* All 4 sides have target handles */}
      <Handle type="target" position={Position.Top} id="target-top" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ top: '-4px' }} />
      <Handle type="target" position={Position.Left} id="target-left" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ left: '-4px' }} />
      <Handle type="target" position={Position.Right} id="target-right" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ right: '-4px' }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ bottom: '-4px' }} />
      
      <div className={`rounded-t-lg px-4 py-2 border-b ${
        isScoped 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${
            isScoped ? 'bg-emerald-500' : 'bg-blue-500'
          }`}>
            {isScoped ? 'S' : 'P'}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${
            isScoped ? 'text-emerald-700' : 'text-blue-700'
          }`}>
            {isScoped ? 'Scoped' : 'Planned'}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-[var(--color-text)] mb-2">{data.title}</h3>
        
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-1 text-xs font-medium border ${getStatusColor(data.status)}`}>
            {data.status}
          </span>
          
          {data.project_id && (
            <a 
              href={`/projects/PRJ-${String(data.project_id).padStart(4, '0')}`}
              className="text-xs text-emerald-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View →
            </a>
          )}
        </div>
      </div>
      
      {/* All 4 sides have source handles */}
      <Handle type="source" position={Position.Top} id="source-top" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ top: '-4px' }} />
      <Handle type="source" position={Position.Left} id="source-left" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ left: '-4px' }} />
      <Handle type="source" position={Position.Right} id="source-right" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ right: '-4px' }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className={`!w-2 !h-2 ${isScoped ? '!bg-emerald-500' : '!bg-blue-500'}`} style={{ bottom: '-4px' }} />
    </div>
  )
})

ProjectNode.displayName = 'ProjectNode'

