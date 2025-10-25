import { useState, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
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

// Available output action nodes (consolidated to generic nodes)
const OUTPUT_ACTIONS = [
  {
    id: 'keyboard_action',
    label: 'Keyboard Action',
    category: 'keyboard',
    actionType: null, // User selects: 'typeText' or 'pressKey'
    config: {},
  },
  {
    id: 'mouse_action',
    label: 'Mouse Action',
    category: 'mouse',
    actionType: null, // User selects: 'click', 'rightClick', 'doubleClick', 'scrollUp', 'scrollDown'
    config: {},
  },
  {
    id: 'light_action',
    label: 'Light Action',
    category: 'light',
    actionType: null, // User selects: 'turnOn', 'turnOff', 'setBrightness', 'colorCycle'
    config: {},
  },
]

// Action type options for each category
const ACTION_TYPE_OPTIONS = {
  keyboard: [
    { value: 'typeText', label: 'Type Text', defaultConfig: { action: 'typeText', text: '' } },
    { value: 'pressKey', label: 'Press Key', defaultConfig: { key: 'Right' } },
  ],
  mouse: [
    { value: 'moveCursor', label: 'Move Cursor (Hand Tracking)', defaultConfig: { action: 'moveCursor' } },
    { value: 'click', label: 'Left Click', defaultConfig: { action: 'click' } },
    { value: 'rightClick', label: 'Right Click', defaultConfig: { action: 'rightClick' } },
    { value: 'doubleClick', label: 'Double Click', defaultConfig: { action: 'doubleClick' } },
    { value: 'scrollUp', label: 'Scroll Up', defaultConfig: { action: 'scrollUp', amount: 3 } },
    { value: 'scrollDown', label: 'Scroll Down', defaultConfig: { action: 'scrollDown', amount: 3 } },
  ],
  light: [
    { value: 'turnOn', label: 'Turn On', defaultConfig: { action: 'turnOn' } },
    { value: 'turnOff', label: 'Turn Off', defaultConfig: { action: 'turnOff' } },
    { value: 'setBrightness', label: 'Set Brightness', defaultConfig: { action: 'setBrightness', value: 50 } },
    { value: 'colorCycle', label: 'Cycle Color', defaultConfig: { action: 'colorCycle' } },
  ],
}

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
  const reactFlowWrapper = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

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

    // Create a custom drag image that looks like the actual node
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.padding = '10px 20px'
    dragImage.style.borderRadius = '8px'
    dragImage.style.backgroundColor = '#fff'
    dragImage.style.border = nodeType === 'input' ? '2px solid #4ade80' :
                            nodeType === 'modifier' ? '2px solid #fb923c' :
                            '2px solid #60a5fa'
    dragImage.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
    dragImage.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    dragImage.style.fontSize = '14px'
    dragImage.style.whiteSpace = 'nowrap'
    dragImage.textContent = nodeData.label

    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)

    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'))

      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

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
    [nodeIdCounter, setNodes, screenToFlowPosition]
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

  const handleActionTypeChange = (actionType) => {
    if (!selectedNode) return

    const category = selectedNode.data.category
    const typeOption = ACTION_TYPE_OPTIONS[category]?.find(opt => opt.value === actionType)

    if (!typeOption) return

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updated = {
            ...node,
            data: {
              ...node.data,
              actionType,
              config: { ...typeOption.defaultConfig },
              label: typeOption.label // Update label to match action type
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
                    {action.category === 'keyboard' ? '⌨️' :
                     action.category === 'mouse' ? '🖱️' : '💡'}
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

              {/* Action Type Selector for Output Nodes */}
              {(selectedNode.data.category === 'keyboard' || selectedNode.data.category === 'mouse' || selectedNode.data.category === 'light') && (
                <div className="config-section">
                  <label>Action Type</label>
                  <select
                    value={selectedNode.data.actionType || ''}
                    onChange={(e) => handleActionTypeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      backgroundColor: selectedNode.data.actionType ? '#fff' : '#fff3cd'
                    }}
                  >
                    <option value="">-- Select Action Type --</option>
                    {ACTION_TYPE_OPTIONS[selectedNode.data.category]?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {!selectedNode.data.actionType && (
                    <p style={{ fontSize: '0.8rem', color: '#856404', marginTop: '0.5rem' }}>
                      ⚠️ Please select an action type
                    </p>
                  )}
                </div>
              )}

              {/* Keyboard - Type Text Config */}
              {selectedNode.data.category === 'keyboard' && selectedNode.data.actionType === 'typeText' && (
                <div className="config-section">
                  <label>Text to Type</label>
                  <input
                    type="text"
                    value={selectedNode.data.config.text || ''}
                    onChange={(e) => handleUpdateNodeConfig('text', e.target.value)}
                    placeholder="Enter text..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}

              {/* Keyboard - Press Key Config */}
              {selectedNode.data.category === 'keyboard' && selectedNode.data.actionType === 'pressKey' && (
                <div className="config-section">
                  <label>Key to Press</label>
                  <select
                    value={selectedNode.data.config.key || 'Right'}
                    onChange={(e) => handleUpdateNodeConfig('key', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="Right">Right Arrow</option>
                    <option value="Left">Left Arrow</option>
                    <option value="Up">Up Arrow</option>
                    <option value="Down">Down Arrow</option>
                    <option value="Space">Space</option>
                    <option value="Enter">Enter</option>
                    <option value="Escape">Escape</option>
                    <option value="F5">F5</option>
                    <option value="Tab">Tab</option>
                  </select>
                </div>
              )}

              {/* Mouse - Scroll Amount Config */}
              {selectedNode.data.category === 'mouse' && (selectedNode.data.actionType === 'scrollUp' || selectedNode.data.actionType === 'scrollDown') && (
                <div className="config-section">
                  <label>Scroll Amount (lines)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedNode.data.config.amount || 3}
                    onChange={(e) => handleUpdateNodeConfig('amount', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                    Number of lines to scroll
                  </p>
                </div>
              )}

              {/* Light - Set Brightness Config */}
              {selectedNode.data.category === 'light' && selectedNode.data.actionType === 'setBrightness' && (
                <div className="config-section">
                  <label>Brightness Level (0-100)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedNode.data.config.value || 50}
                    onChange={(e) => handleUpdateNodeConfig('value', parseInt(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                    {selectedNode.data.config.value || 50}%
                  </p>
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

// Wrap with ReactFlowProvider to enable useReactFlow hook
const WorkflowCanvasWrapper = (props) => (
  <ReactFlowProvider>
    <WorkflowCanvas {...props} />
  </ReactFlowProvider>
)

export default WorkflowCanvasWrapper
