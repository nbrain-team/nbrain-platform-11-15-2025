import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export const DepartmentNode = memo(({ data }: NodeProps) => {
  const color = data.color || '#3B82F6'
  
  return (
    <div 
      className="rounded-lg border bg-white shadow-md" 
      style={{ 
        minWidth: 200, 
        borderColor: color,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} className="!w-2 !h-2" />
      
      <div 
        className="rounded-t-lg px-4 py-3 border-b"
        style={{ 
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            D
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
            Department
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-[var(--color-text)] mb-2">{data.name || data.title}</h3>
        {data.description && (
          <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">{data.description}</p>
        )}
        
        {data.ai_adoption_score !== undefined && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">AI Adoption</span>
              <span className="font-medium" style={{ color }}>{data.ai_adoption_score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${data.ai_adoption_score}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} style={{ background: color }} className="!w-2 !h-2" />
    </div>
  )
})

DepartmentNode.displayName = 'DepartmentNode'

