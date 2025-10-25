import { useState, useCallback, useEffect } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { workflowService } from '../services/workflowService'
import './WorkflowCanvas.css'

// Available gesture input nodes
const GESTURE_INPUTS = [
  { id: 'swipe_left', label: 'Swipe Left', gesture: 'swipe_left' },
  { id: 'swipe_right', label: 'Swipe Right', gesture: 'swipe_right' },
  { id: 'thumbs_up', label: 'Thumbs Up', gesture: 'thumbs_up' },
  { id: 'thumbs_down', label: 'Thumbs Down', gesture: 'thumbs_down' },
  { id: 'palm', label: 'Palm', gesture: 'palm' },
  { id: 'point', label: 'Point', gesture: 'point' },
  { id: 'peace', label: 'Peace', gesture: 'peace' },
]

// Available output action nodes
const OUTPUT_ACTIONS = [
  {
    id: 'type_hello',
    label: 'Type "hello"',
    category: 'keyboard',
    config: { action: 'typeText', text: 'hello' },
  },
  {
    id: 'keyboard_key',
    label: 'Press Key',
    category: 'keyboard',
    config: { key: 'Right' },
  },
  {
    id: 'light_on',
    label: 'Lights ON',
    category: 'light',
    config: { action: 'turnOn' },
  },
  {
    id: 'light_off',
    label: 'Lights OFF',
    category: 'light',
    config: { action: 'turnOff' },
  },
  {
    id: 'light_brightness',
    label: 'Set Brightness',
    category: 'light',
    config: { action: 'setBrightness', value: 50 },
  },
  {
    id: 'light_color',
    label: 'Cycle Color',
    category: 'light',
    config: { action: 'colorCycle' },
  },
]

// Middleware/modifier nodes (go between input and output)
const MIDDLEWARE_NODES = [
  {
    id: 'cooldown',
    label: 'Cooldown',
    category: 'modifier',
    config: { cooldown: 2000 }, // 2 seconds default
    description: 'Prevent execution for X milliseconds after triggering'
  },
]

const WorkflowCanvas = ({ workflowId, onBack }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [nodeIdCounter, setNodeIdCounter] = useState(1)

  // Load workflow if editing existing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow()
    }
  }, [workflowId])

  const loadWorkflow = async () => {
    try {
      const workflow = await workflowService.getWorkflow(workflowId)
      setWorkflowName(workflow.name)
      setWorkflowDescription(workflow.description || '')

      if (workflow.workflow_data?.nodes) {
        setNodes(workflow.workflow_data.nodes)
      }
      if (workflow.workflow_data?.edges) {
        setEdges(workflow.workflow_data.edges)
      }

      // Set counter to max node ID + 1
      const maxId = workflow.workflow_data?.nodes?.reduce((max, node) => {
        const numId = parseInt(node.id.split('-')[1])
        return numId > max ? numId : max
      }, 0) || 0
      setNodeIdCounter(maxId + 1)
    } catch (error) {
      alert('Failed to load workflow: ' + error.message)
    }
  }

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleDragStart = (event, nodeType, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, nodeData }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'))
      const position = {
        x: event.clientX - 250, // Offset for sidebar
        y: event.clientY - 100,
      }

      const newNode = {
        id: `node-${nodeIdCounter}`,
        type: data.nodeType === 'input' ? 'input' : 'default',
        position,
        data: {
          label: data.nodeData.label,
          nodeType: data.nodeType,
          ...data.nodeData,
        },
      }

      setNodes((nds) => nds.concat(newNode))
      setNodeIdCounter(nodeIdCounter + 1)
    },
    [nodeIdCounter, setNodes]
  )

  const handleSave = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name')
      return
    }

    setSaving(true)
    try {
      const workflowData = {
        nodes,
        edges,
      }

      if (workflowId) {
        // Update existing workflow
        await workflowService.updateWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription,
          workflow_data: workflowData,
        })
      } else {
        // Create new workflow with data
        const newWorkflow = await workflowService.createWorkflow(workflowName, workflowDescription)
        // Update it with the nodes and edges
        await workflowService.updateWorkflow(newWorkflow.id, {
          workflow_data: workflowData,
        })
      }

      alert('Workflow saved successfully!')
      onBack()
    } catch (error) {
      alert('Failed to save workflow: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node)
  }, [])

  const handleUpdateNodeConfig = (key, value) => {
    if (!selectedNode) return

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updated = {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                [key]: value
              }
            }
          }
          setSelectedNode(updated)
          return updated
        }
        return node
      })
    )
  }

  const handleDeleteNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
    }
  }

  return (
    <div className="canvas-container">
      {/* Header */}
      <div className="canvas-header">
        <div className="canvas-title-section">
          <input
            type="text"
            className="canvas-title-input"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name..."
          />
          <input
            type="text"
            className="canvas-description-input"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="Description (optional)..."
          />
        </div>
        <div className="canvas-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="canvas-main">
        {/* Left Sidebar - Node Library */}
        <div className="node-library">
          <div className="library-section">
            <h3>Input Gestures</h3>
            <div className="node-list">
              {GESTURE_INPUTS.map((gesture) => (
                <div
                  key={gesture.id}
                  className="node-item input-node"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'input', gesture)}
                >
                  <span className="node-icon">👋</span>
                  <span className="node-label">{gesture.label}</span>
                  <span className="node-connector">→</span>
                </div>
              ))}
            </div>
          </div>

          <div className="library-section">
            <h3>Modifiers</h3>
            <div className="node-list">
              {MIDDLEWARE_NODES.map((modifier) => (
                <div
                  key={modifier.id}
                  className="node-item modifier-node"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'modifier', modifier)}
                >
                  <span className="node-icon">⚙️</span>
                  <span className="node-label">{modifier.label}</span>
                  <span className="node-connector">↔</span>
                </div>
              ))}
            </div>
          </div>

          <div className="library-section">
            <h3>Output Actions</h3>
            <div className="node-list">
              {OUTPUT_ACTIONS.map((action) => (
                <div
                  key={action.id}
                  className="node-item output-node"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'output', action)}
                >
                  <span className="node-icon">
                    {action.category === 'keyboard' ? '⌨️' : '💡'}
                  </span>
                  <span className="node-label">{action.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - React Flow Canvas */}
        <div className="flow-canvas" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Node Configuration */}
        <div className="node-config">
          {selectedNode ? (
            <>
              <h3>Node Settings</h3>
              <div className="config-section">
                <label>Node Type</label>
                <p>{
                  selectedNode.data.nodeType === 'input' ? 'Input Gesture' :
                  selectedNode.data.nodeType === 'modifier' ? 'Modifier' :
                  'Output Action'
                }</p>
              </div>
              <div className="config-section">
                <label>Label</label>
                <p>{selectedNode.data.label}</p>
              </div>
              {selectedNode.data.gesture && (
                <div className="config-section">
                  <label>Gesture</label>
                  <p><code>{selectedNode.data.gesture}</code></p>
                </div>
              )}

              {/* Modifier node configuration - editable */}
              {selectedNode.data.category === 'modifier' && selectedNode.data.config?.cooldown !== undefined && (
                <div className="config-section">
                  <label>Cooldown (milliseconds)</label>
                  <input
                    type="number"
                    value={selectedNode.data.config.cooldown}
                    onChange={(e) => handleUpdateNodeConfig('cooldown', parseInt(e.target.value))}
                    min="0"
                    step="100"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                    {(selectedNode.data.config.cooldown / 1000).toFixed(1)} seconds
                  </p>
                </div>
              )}

              {/* Other config (read-only for now) */}
              {selectedNode.data.config && selectedNode.data.category !== 'modifier' && (
                <div className="config-section">
                  <label>Configuration</label>
                  <pre>{JSON.stringify(selectedNode.data.config, null, 2)}</pre>
                </div>
              )}

              <button className="btn btn-danger" onClick={handleDeleteNode}>
                Delete Node
              </button>
            </>
          ) : (
            <div className="config-empty">
              <p>Select a node to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowCanvas
