"use client"

type RoadmapToolbarProps = {
  onExport: (format: 'png' | 'pdf') => void
  nodeCount: number
  edgeCount: number
}

export function RoadmapToolbar({ onExport, nodeCount, edgeCount }: RoadmapToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2">
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span>{nodeCount} nodes</span>
        <span className="text-[var(--color-border)]">•</span>
        <span>{edgeCount} connections</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:bg-[var(--color-surface-alt)] transition"
          onClick={() => onExport('png')}
          title="Export as PNG"
        >
          Export PNG
        </button>
        <button
          className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:bg-[var(--color-surface-alt)] transition"
          onClick={() => onExport('pdf')}
          title="Export as PDF"
        >
          Export PDF
        </button>
      </div>
    </div>
  )
}

