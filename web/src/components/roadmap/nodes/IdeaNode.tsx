import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export const IdeaNode = memo(({ data }: NodeProps) => {
  const getPriorityDot = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-purple-400 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer" style={{ width: 140 }}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-2 !h-2" />
      
      <div className="p-2">
        <div className="flex items-start gap-1.5 mb-1">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-500 text-[10px] font-bold text-white flex-shrink-0">
            I
          </div>
          <h3 className="font-semibold text-[var(--color-text)] text-xs leading-tight line-clamp-2 flex-1">
            {data.title}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {data.priority && (
            <div 
              className={`w-2 h-2 rounded-full ${getPriorityDot(data.priority)}`}
              title={`Priority: ${data.priority}`}
            />
          )}
          <span className="text-[9px] text-purple-600 font-medium uppercase tracking-wide">Idea</span>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-2 !h-2" />
    </div>
  )
})

IdeaNode.displayName = 'IdeaNode'

