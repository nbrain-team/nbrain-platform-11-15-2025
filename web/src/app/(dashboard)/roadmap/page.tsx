"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
  NodeTypes,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ProjectNode } from '@/components/roadmap/nodes/ProjectNode'
import { IdeaNode } from '@/components/roadmap/nodes/IdeaNode'
import { DepartmentNode } from '@/components/roadmap/nodes/DepartmentNode'
import { CategoryNode } from '@/components/roadmap/nodes/CategoryNode'
import { SubCategoryNode } from '@/components/roadmap/nodes/SubCategoryNode'
import { RoadmapToolbar } from '@/components/roadmap/RoadmapToolbar'
import { RoadmapSidebar } from '@/components/roadmap/RoadmapSidebar'
import { AddNodeModal } from '@/components/roadmap/modals/AddNodeModal'

type RoadmapNode = {
  id: number
  node_type: string
  title: string
  description: string
  status: string
  priority: string
  position_x: number
  position_y: number
  project_id?: number
  idea_id?: string
  estimated_roi?: number
  estimated_timeline?: string
}

type RoadmapEdge = {
  id: number
  source_node_id: number
  target_node_id: number
  edge_type: string
  label?: string
  is_critical: boolean
  source_handle?: string
  target_handle?: string
}

export default function RoadmapPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [roadmapData, setRoadmapData] = useState<{ nodes: RoadmapNode[], edges: RoadmapEdge[] }>({ nodes: [], edges: [] })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clients, setClients] = useState<{id: number, name: string}[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  
  const authHeaders = useMemo<HeadersInit>(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }, [])
  
  // Detect user role and load clients if advisor
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('xsourcing_token') : null
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserRole(payload.role)
        
        // Load clients if advisor
        if (payload.role === 'advisor') {
          fetch(`${api}/advisor/clients`, { headers: authHeaders })
            .then(r => r.json())
            .then(data => {
              if (data.ok && data.clients) {
                setClients(data.clients)
                // Auto-select first client
                if (data.clients.length > 0) {
                  setSelectedClientId(data.clients[0].id)
                }
              }
            })
            .catch(console.error)
        }
      } catch (e) {
        console.error('Failed to decode token:', e)
      }
    }
  }, [api, authHeaders])

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    project: ProjectNode,
    idea: IdeaNode,
    department: DepartmentNode,
    category: CategoryNode,
    subcategory: SubCategoryNode,
  }), [])

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Function to load roadmap data
  const loadRoadmap = useCallback(async () => {
    try {
      setLoading(true)
      
      // Construct URL based on role and selected client
      let url = `${api}/roadmap`
      console.log('loadRoadmap called with:', { userRole, selectedClientId })
      
      if (userRole === 'advisor' && selectedClientId) {
        url = `${api}/advisor/clients/${selectedClientId}/roadmap`
        console.log('Using advisor endpoint for client:', selectedClientId)
      } else {
        console.log('Using client endpoint (userRole:', userRole, ', selectedClientId:', selectedClientId, ')')
      }
      
      console.log('Loading roadmap from:', url)
      console.log('Auth headers:', authHeaders ? 'Present' : 'Missing')
      
      const res = await fetch(url, { headers: authHeaders })
      const data = await res.json()
      
      console.log('Roadmap API response:', data)
      
      if (!data.ok) {
        console.error('Roadmap API error:', data.error)
        setLoading(false)
        return
      }
      
      if (data.ok && data.roadmap) {
          setRoadmapData(data.roadmap)
          
          console.log('Loaded roadmap:', {
            nodes: data.roadmap.nodes.length,
            edges: data.roadmap.edges.length,
            edgeDetails: data.roadmap.edges
          })
          
          // Convert database nodes to React Flow nodes
          const flowNodes: Node[] = data.roadmap.nodes.map((node: RoadmapNode) => ({
            id: String(node.id),
            type: node.node_type,
            position: { x: Number(node.position_x), y: Number(node.position_y) },
            data: {
              ...node,
              onSelect: (n: Node) => setSelectedNode(n),
            },
          }))
          
          // Convert database edges to React Flow edges
          const flowEdges: Edge[] = data.roadmap.edges.map((edge: RoadmapEdge) => ({
            id: String(edge.id),
            source: String(edge.source_node_id),
            target: String(edge.target_node_id),
            sourceHandle: edge.source_handle || undefined,
            targetHandle: edge.target_handle || undefined,
            type: 'smoothstep',
            animated: edge.is_critical,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            style: {
              strokeWidth: edge.is_critical ? 3 : 2,
              stroke: edge.is_critical ? '#EF4444' : '#6B7280',
            },
          }))
          
          console.log('Setting React Flow edges:', flowEdges)
          setNodes(flowNodes)
          setEdges(flowEdges)
        }
    } catch (e) {
      console.error('Failed to load roadmap:', e)
    } finally {
      setLoading(false)
    }
  }, [api, authHeaders, setNodes, setEdges, userRole, selectedClientId])

  // Load roadmap data on mount and when selected client changes
  useEffect(() => {
    console.log('Effect triggered:', { userRole, selectedClientId })
    if (userRole === 'client' || (userRole === 'advisor' && selectedClientId)) {
      console.log('Loading roadmap...')
      loadRoadmap()
    } else {
      console.log('Not loading roadmap:', { userRole, selectedClientId })
    }
  }, [userRole, selectedClientId, loadRoadmap])
  
  // Reload when returning from chat (check URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('refresh') === 'true') {
      loadRoadmap()
      // Clean up URL
      window.history.replaceState({}, '', '/roadmap')
    }
  }, [])

  // Debounced position saver
  const savePositionsDebounced = useCallback(
    (() => {
      let timeout: NodeJS.Timeout
      return (nodesToSave: Node[]) => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
          try {
            // Filter out nodes without IDs (temporary nodes) and map to positions
            const positions = nodesToSave
              .filter(n => n && n.id && !n.id.startsWith('temp-'))
              .map(n => ({
                id: Number(n.id),
                positionX: n.position.x,
                positionY: n.position.y,
              }))
            
            if (positions.length === 0) {
              console.log('No valid positions to save')
              return
            }
            
            console.log('Bulk saving positions for', positions.length, 'nodes')
            
            const res = await fetch(`${api}/roadmap/bulk-update-positions`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ nodes: positions }),
            })
            
            if (!res.ok) {
              const errorText = await res.text()
              console.error('Bulk position save failed:', res.status, errorText)
            } else {
              console.log('Positions saved successfully')
            }
          } catch (e) {
            console.error('Failed to save positions:', e)
          }
        }, 1000)
      }
    })(),
    [api, authHeaders]
  )

  // Handle node drag end - save position
  const handleNodeDragStop = useCallback(async (_event: unknown, node: Node) => {
    if (!node || !node.id) {
      console.error('Invalid node data:', node)
      return
    }
    
    try {
      console.log('Saving node position:', { id: node.id, x: node.position.x, y: node.position.y })
      
      const res = await fetch(`${api}/roadmap/nodes/${node.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          positionX: node.position.x,
          positionY: node.position.y,
        }),
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to save position, status:', res.status, errorText)
      } else {
        console.log('Position saved successfully')
      }
    } catch (e) {
      console.error('Failed to save node position:', e)
    }
  }, [api, authHeaders])
  
  // Save positions when nodes change (debounced)
  const handleNodesChangeWithSave = useCallback((changes: unknown) => {
    onNodesChange(changes)
    savePositionsDebounced(nodes)
  }, [onNodesChange, savePositionsDebounced, nodes])

  // Handle edge changes (including deletions)
  const handleEdgesChangeWithSave = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes)
    
    // Check for edge removals and save to backend
    changes.forEach(async (change) => {
      if (change.type === 'remove') {
        try {
          await fetch(`${api}/roadmap/edges/${change.id}`, {
            method: 'DELETE',
            headers: authHeaders,
          })
        } catch (e) {
          console.error('Failed to delete edge:', e)
        }
      }
    })
  }, [onEdgesChange, api, authHeaders])

  // Handle connection creation
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) {
      console.log('Connection missing source or target')
      return
    }
    
    console.log('Creating edge connection:', connection)
    
    // Optimistically add the edge to UI first
    const tempEdge = {
      ...connection,
      id: `temp-${Date.now()}`,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#6B7280' },
    }
    setEdges((eds) => addEdge(tempEdge, eds))
    
    try {
      const res = await fetch(`${api}/roadmap/edges`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceNodeId: Number(connection.source),
          targetNodeId: Number(connection.target),
          sourceHandle: connection.sourceHandle || null,
          targetHandle: connection.targetHandle || null,
          edgeType: 'dependency',
          label: '',
        }),
      })
      
      if (!res.ok) {
        console.error('Edge creation failed with status:', res.status)
        const errorText = await res.text()
        console.error('Error response:', errorText)
        alert('Failed to save connection. Please try again.')
        // Remove the temporary edge
        setEdges((eds) => eds.filter(e => e.id !== tempEdge.id))
        return
      }
      
      const data = await res.json()
      console.log('Edge created successfully:', data)
      
      if (data.ok && data.edge) {
        // Replace temp edge with real one from backend, preserving all connection details
        setEdges((eds) => eds.map(e => 
          e.id === tempEdge.id 
            ? { 
                ...e, 
                id: String(data.edge.id),
                sourceHandle: data.edge.source_handle || e.sourceHandle,
                targetHandle: data.edge.target_handle || e.targetHandle,
              }
            : e
        ))
      }
    } catch (e) {
      console.error('Failed to create edge:', e)
      alert('Failed to save connection. Please check your internet connection.')
      // Remove the temporary edge
      setEdges((eds) => eds.filter(e => e.id !== tempEdge.id))
    }
  }, [api, authHeaders, setEdges])

  // Handle node click
  const onNodeClick = useCallback((_event: unknown, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Handle add node
  const handleAddNode = async (nodeData: { nodeType: string, title: string, description: string, priority: string }) => {
    try {
      const res = await fetch(`${api}/roadmap/nodes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...nodeData,
          positionX: 400,
          positionY: 300,
        }),
      })
      
      const data = await res.json()
      if (data.ok) {
        const newNode: Node = {
          id: String(data.node.id),
          type: data.node.node_type,
          position: { x: data.node.position_x, y: data.node.position_y },
          data: {
            ...data.node,
            onSelect: setSelectedNode,
          },
        }
        setNodes((nds) => [...nds, newNode])
        setShowAddModal(false)
      }
    } catch (e) {
      console.error('Failed to add node:', e)
    }
  }

  // Handle delete node
  const handleDeleteNode = async (nodeId: string) => {
    try {
      await fetch(`${api}/roadmap/nodes/${nodeId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setSelectedNode(null)
    } catch (e) {
      console.error('Failed to delete node:', e)
    }
  }

  // Handle update node
  const handleUpdateNode = useCallback(async (nodeId: string, updates: Record<string, unknown>) => {
    // Update local state immediately for better UX
    setNodes((nds) => 
      nds.map((n) => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, ...updates } }
          : n
      )
    )
    // Update selected node to reflect changes
    setSelectedNode((prev) => 
      prev && prev.id === nodeId 
        ? { ...prev, data: { ...prev.data, ...updates } }
        : prev
    )
    
    // Save to backend
    try {
      await fetch(`${api}/roadmap/nodes/${nodeId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updates),
      })
    } catch (e) {
      console.error('Failed to update node:', e)
    }
  }, [setNodes, api, authHeaders])

  // Handle export
  const handleExport = async (format: 'png' | 'pdf') => {
    if (format === 'png') {
      // Dynamic import for html-to-image
      const { toPng } = await import('html-to-image')
      const element = document.querySelector('.react-flow') as HTMLElement
      if (element) {
        const dataUrl = await toPng(element)
        const link = document.createElement('a')
        link.download = 'ai-roadmap.png'
        link.href = dataUrl
        link.click()
      }
    } else if (format === 'pdf') {
      const { toPng } = await import('html-to-image')
      const { jsPDF } = await import('jspdf')
      const element = document.querySelector('.react-flow') as HTMLElement
      if (element) {
        const dataUrl = await toPng(element)
        const pdf = new jsPDF('landscape')
        pdf.addImage(dataUrl, 'PNG', 10, 10, 277, 190)
        pdf.save('ai-roadmap.pdf')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-lg text-[var(--color-text-muted)]">Loading your AI Roadmap...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            {userRole === 'advisor' ? 'Client AI Ecosystems' : 'Your AI Ecosystem'}
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {userRole === 'advisor' ? 'View and manage client roadmaps' : 'Visual strategy map of your AI adoption journey'}
          </p>
        </div>
        
        {/* Client selector for advisors */}
        {userRole === 'advisor' && clients.length > 0 && (
          <div className="mx-4">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Select Client</label>
            <select
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm min-w-[200px]"
              value={selectedClientId || ''}
              onChange={e => setSelectedClientId(Number(e.target.value))}
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          Add Node
        </button>
      </header>

      <div className="flex gap-4">
        {/* Main Canvas */}
        <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-white shadow-card" style={{ height: '70vh' }}>
          <RoadmapToolbar onExport={handleExport} nodeCount={nodes.length} edgeCount={edges.length} />
          
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChangeWithSave}
            onEdgesChange={handleEdgesChangeWithSave}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            fitView={nodes.length === 0}
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { strokeWidth: 2, stroke: '#6B7280' }
            }}
            connectionLineType="smoothstep"
            connectionLineStyle={{ strokeWidth: 2, stroke: '#6B7280' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'project': 
                    // Scoped projects (green) vs Planned projects (blue)
                    return node.data?.project_id ? '#10B981' : '#3B82F6'
                  case 'idea': return '#8B5CF6'
                  case 'department': return '#3B82F6'
                  case 'category': return '#9333EA'
                  case 'subcategory': return '#6366F1'
                  default: return '#6B7280'
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        {/* Sidebar */}
        {selectedNode && (
          <RoadmapSidebar
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onDelete={handleDeleteNode}
            onUpdate={handleUpdateNode}
          />
        )}
      </div>

      {/* Add Node Modal */}
      {showAddModal && (
        <AddNodeModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddNode}
        />
      )}

      {/* Getting Started Message */}
      {nodes.length === 0 && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center">
          <h3 className="text-xl font-semibold text-[var(--color-text)]">Welcome to Your AI Ecosystem!</h3>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Get started by adding your first node. Projects and ideas from your account will appear here automatically.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowAddModal(true)}>
            Create Your First Node
          </button>
        </div>
      )}
    </div>
  )
}

