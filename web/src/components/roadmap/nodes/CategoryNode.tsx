import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export const CategoryNode = memo(({ data }: NodeProps) => {
  const isTheBrain = data.title === 'The Brain'
  
  const categoryColors: Record<string, string> = {
    'The Brain': '#9333EA',
    'Sales': '#EF4444',
    'Marketing': '#F59E0B',
    'HR': '#10B981',
    'Operations': '#3B82F6',
    'Finance': '#6366F1',
    'Other': '#6B7280',
  }
  
  const color = categoryColors[data.title] || '#6B7280'
  
  return (
    <div 
      className="rounded-lg bg-white shadow-md transition-all hover:shadow-lg cursor-pointer" 
      style={{ 
        width: isTheBrain ? 180 : 140,
        borderColor: color,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* All sides have handles for connections - separate target and source for proper connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="target-left"
        style={{ background: color, left: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="target-top"
        style={{ background: color, top: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="target-right"
        style={{ background: color, right: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="target-bottom"
        style={{ background: color, bottom: '-4px' }} 
        className="!w-2 !h-2" 
      />
      
      <div 
        className="rounded-lg p-3 flex flex-col items-center justify-center gap-2"
        style={{ backgroundColor: `${color}10` }}
      >
        <div 
          className="flex items-center justify-center rounded-full text-white font-bold shadow-sm"
          style={{ 
            backgroundColor: color,
            width: isTheBrain ? '48px' : '36px',
            height: isTheBrain ? '48px' : '36px',
            fontSize: isTheBrain ? '16px' : '18px',
          }}
        >
          {isTheBrain ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
              <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
              <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
              <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
              <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
              <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
              <path d="M6 18a4 4 0 0 1-1.967-.516"/>
              <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
            </svg>
          ) : data.title[0]}
        </div>
        
        <span 
          className="font-bold text-center leading-tight" 
          style={{ 
            color,
            fontSize: isTheBrain ? '16px' : '13px',
          }}
        >
          {data.title}
        </span>
        
        {isTheBrain && (
          <div className="text-[9px] text-purple-600 uppercase tracking-wide font-semibold">
            Hub
          </div>
        )}
      </div>
      
      {/* All sides have source handles */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="source-left"
        style={{ background: color, left: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="source-top"
        style={{ background: color, top: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="source-right"
        style={{ background: color, right: '-4px' }} 
        className="!w-2 !h-2" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="source-bottom"
        style={{ background: color, bottom: '-4px' }} 
        className="!w-2 !h-2" 
      />
    </div>
  )
})

CategoryNode.displayName = 'CategoryNode'

