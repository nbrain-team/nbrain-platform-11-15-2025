import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export const SubCategoryNode = memo(({ data }: NodeProps) => {
  return (
    <div className="rounded-lg border border-dashed border-indigo-300 bg-gradient-to-br from-white to-indigo-50 shadow-sm" style={{ minWidth: 180 }}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-2 !h-2" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
            📁
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sub-Category</span>
        </div>
        
        <h3 className="font-semibold text-[var(--color-text)] text-sm">{data.title}</h3>
        
        {data.description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">{data.description}</p>
        )}
        
        {data.parent_node_id && (
          <div className="mt-2 text-xs text-indigo-500">
            Organizes related initiatives
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2 !h-2" />
    </div>
  )
})

SubCategoryNode.displayName = 'SubCategoryNode'

