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
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { workflowService } from '../services/workflowService'
import './WorkflowCanvas.css'

// Custom Node Components
const InputNode = ({ data, selected }) => {
  const getGestureIcon = () => {
    const gesture = data.gesture
    const iconColor = '#ffffff'

    if (gesture === 'thumbs_up') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
      )
    } else if (gesture === 'thumbs_down') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
        </svg>
      )
    } else if (gesture === 'palm') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83c1.76-1.77 2.32-4.15.57-5.93.41-.42 1.09-.42 1.5 0l3.57 3.57c.09.09.21.14.34.14s.25-.05.35-.15c.09-.09.15-.22.15-.35V3c0-.55.45-1 1-1s1 .45 1 1v9.5c0 .28.22.5.5.5s.5-.22.5-.5V1.5c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V2c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V5.5c0-.55.45-1 1-1s1 .45 1 1z"/>
        </svg>
      )
    } else if (gesture === 'peace') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M12 2c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zm5 0c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zM9.5 11h-2c-.83 0-1.54.5-1.84 1.22l-1.16 2.71C4.22 15.5 4 16.08 4 16.69V20c0 2.21 1.79 4 4 4h4c1.1 0 2-.9 2-2V13c0-.55-.45-1-1-1h-3.5z"/>
        </svg>
      )
    } else if (gesture === 'swipe_left') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      )
    } else if (gesture === 'swipe_right') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      )
    } else if (gesture === 'continuous_motion') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      )
    }

    // Default hand icon
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83c1.76-1.77 2.32-4.15.57-5.93.41-.42 1.09-.42 1.5 0l3.57 3.57c.09.09.21.14.34.14s.25-.05.35-.15c.09-.09.15-.22.15-.35V3c0-.55.45-1 1-1s1 .45 1 1v9.5c0 .28.22.5.5.5s.5-.22.5-.5V1.5c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V2c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V5.5c0-.55.45-1 1-1s1 .45 1 1z"/>
      </svg>
    )
  }

  return (
    <div className={`input-circle-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-circle-icon">
        {getGestureIcon()}
      </div>
      <Handle type="source" position={Position.Right} />
      <div className="node-circle-tooltip">{data.label}</div>
    </div>
  )
}

const OutputNode = ({ data, selected }) => {
  const getActionIcon = () => {
    const iconColor = '#2d3748'

    if (data.category === 'keyboard') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
        </svg>
      )
    } else if (data.category === 'mouse') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/>
        </svg>
      )
    } else if (data.category === 'light') {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
        </svg>
      )
    }

    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    )
  }

  return (
    <div className={`output-circle-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-circle-icon">
        {getActionIcon()}
      </div>
      <Handle type="source" position={Position.Right} />
      <div className="node-circle-tooltip">{data.label}</div>
    </div>
  )
}

const ModifierNode = ({ data, selected }) => {
  const getModifierIcon = () => {
    const iconColor = '#ffffff'

    // Check if this is a cooldown node
    if (data.label === 'Cooldown' || data.config?.cooldown !== undefined) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={iconColor}>
          <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
        </svg>
      )
    }

    // Default to clock/timer icon for Hold Time
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>
    )
  }

  return (
    <div className={`modifier-circle-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="modifier-icon">
        {getModifierIcon()}
      </div>
      <Handle type="source" position={Position.Right} />
      <div className="modifier-tooltip">{data.label}</div>
    </div>
  )
}

// Map node types to components
const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  modifier: ModifierNode,
}

// Available gesture input nodes
const GESTURE_INPUTS = [
  { id: 'swipe_left', label: 'Swipe Left', gesture: 'swipe_left', type: 'discrete' },
  { id: 'swipe_right', label: 'Swipe Right', gesture: 'swipe_right', type: 'discrete' },
  { id: 'thumbs_up', label: 'Thumbs Up', gesture: 'thumbs_up', type: 'discrete' },
  { id: 'thumbs_down', label: 'Thumbs Down', gesture: 'thumbs_down', type: 'discrete' },
  { id: 'palm', label: 'Palm', gesture: 'palm', type: 'discrete' },
  { id: 'peace', label: 'Peace', gesture: 'peace', type: 'discrete' },
  { id: 'continuous_motion', label: 'Continuous Motion (Point)', gesture: 'continuous_motion', type: 'continuous' },
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

// Action type options for each category with compatibility rules
const ACTION_TYPE_OPTIONS = {
  keyboard: [
    { value: 'typeText', label: 'Type Text', defaultConfig: { action: 'typeText', text: '' }, compatibleWith: ['discrete'] },
    { value: 'pressKey', label: 'Press Key', defaultConfig: { key: 'Right' }, compatibleWith: ['discrete'] },
  ],
  mouse: [
    { value: 'moveCursor', label: 'Move Cursor (Continuous Tracking)', defaultConfig: { action: 'moveCursor' }, compatibleWith: ['continuous'] },
    { value: 'click', label: 'Left Click', defaultConfig: { action: 'click' }, compatibleWith: ['discrete'] },
    { value: 'rightClick', label: 'Right Click', defaultConfig: { action: 'rightClick' }, compatibleWith: ['discrete'] },
    { value: 'doubleClick', label: 'Double Click', defaultConfig: { action: 'doubleClick' }, compatibleWith: ['discrete'] },
    { value: 'scrollUp', label: 'Scroll Up', defaultConfig: { action: 'scrollUp', amount: 3 }, compatibleWith: ['discrete'] },
    { value: 'scrollDown', label: 'Scroll Down', defaultConfig: { action: 'scrollDown', amount: 3 }, compatibleWith: ['discrete'] },
  ],
  light: [
    { value: 'turnOn', label: 'Turn On', defaultConfig: { action: 'turnOn' }, compatibleWith: ['discrete'] },
    { value: 'turnOff', label: 'Turn Off', defaultConfig: { action: 'turnOff' }, compatibleWith: ['discrete'] },
    { value: 'setBrightness', label: 'Set Brightness', defaultConfig: { action: 'setBrightness', value: 50 }, compatibleWith: ['discrete'] },
    { value: 'colorCycle', label: 'Cycle Color', defaultConfig: { action: 'colorCycle' }, compatibleWith: ['discrete'] },
  ],
}

// Middleware/modifier nodes (go between input and output)
const MIDDLEWARE_NODES = [
  {
    id: 'holdTime',
    label: 'Hold Time',
    category: 'modifier',
    config: { holdTime: 2000 }, // 2 seconds default
    description: 'How long gesture must be held before triggering'
  },
  {
    id: 'cooldown',
    label: 'Cooldown',
    category: 'modifier',
    config: { cooldown: 2000 }, // 2 seconds default
    description: 'Prevent re-execution for X milliseconds after triggering'
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
  const [showAIChat, setShowAIChat] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBuilding, setAiBuilding] = useState(false)
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
    (params) => {
      // Validate compatibility between source and target
      const sourceNode = nodes.find(n => n.id === params.source)
      const targetNode = nodes.find(n => n.id === params.target)

      if (sourceNode && targetNode) {
        // Get input gesture type (discrete or continuous)
        const inputType = sourceNode.data.type || 'discrete'

        // Get target action's compatibility requirements
        const targetCategory = targetNode.data.category
        const targetActionType = targetNode.data.actionType

        if (targetCategory && targetActionType) {
          const actionTypeOptions = ACTION_TYPE_OPTIONS[targetCategory]
          const actionOption = actionTypeOptions?.find(opt => opt.value === targetActionType)

          if (actionOption && actionOption.compatibleWith) {
            // Check if input type is compatible with this action
            if (!actionOption.compatibleWith.includes(inputType)) {
              alert(`❌ Incompatible connection!\n\n"${sourceNode.data.label}" (${inputType}) cannot connect to "${actionOption.label}".\n\nThis action only works with: ${actionOption.compatibleWith.join(', ')} gestures.`)
              return
            }
          }
        }
      }

      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges, nodes]
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
        type: data.nodeType, // Use the correct type: 'input', 'output', or 'modifier'
        position,
        data: {
          label: data.nodeData.label,
          nodeType: data.nodeType,
          ...data.nodeData,
        },
      }

      let newNodes = [newNode]
      let newEdges = []
      let currentNodeId = nodeIdCounter + 1

      // Auto-add Hold Time and Cooldown modifiers for input nodes
      if (data.nodeType === 'input') {
        // Determine default hold time based on gesture type
        let defaultHoldTime = 500 // Default 500ms for most static gestures
        const gesture = data.nodeData.gesture

        if (gesture === 'palm') {
          defaultHoldTime = 1500 // 1.5s for palm (to avoid triggering during swipes)
        } else if (gesture === 'continuous_motion') {
          defaultHoldTime = 0 // Instant for continuous tracking
        } else if (gesture === 'swipe_left' || gesture === 'swipe_right') {
          defaultHoldTime = 0 // Instant for swipes
        }

        // Create Hold Time modifier (placed to the left of input)
        const holdTimeNode = {
          id: `node-${currentNodeId}`,
          type: 'modifier',
          position: { x: position.x - 200, y: position.y },
          data: {
            label: 'Hold Time',
            nodeType: 'modifier',
            category: 'modifier',
            config: { holdTime: defaultHoldTime },
          },
        }
        currentNodeId++

        // Determine default cooldown based on gesture type
        let defaultCooldown = 2000 // Default 2s for most gestures
        if (gesture === 'continuous_motion') {
          defaultCooldown = 0 // No cooldown for continuous tracking
        }

        // Create Cooldown modifier (placed to the right of input)
        const cooldownNode = {
          id: `node-${currentNodeId}`,
          type: 'modifier',
          position: { x: position.x + 200, y: position.y },
          data: {
            label: 'Cooldown',
            nodeType: 'modifier',
            category: 'modifier',
            config: { cooldown: defaultCooldown },
          },
        }
        currentNodeId++

        // Create edges: HoldTime -> Input -> Cooldown
        const holdTimeEdge = {
          id: `edge-${holdTimeNode.id}-${newNode.id}`,
          source: holdTimeNode.id,
          target: newNode.id,
        }

        const cooldownEdge = {
          id: `edge-${newNode.id}-${cooldownNode.id}`,
          source: newNode.id,
          target: cooldownNode.id,
        }

        newNodes = [holdTimeNode, newNode, cooldownNode]
        newEdges = [holdTimeEdge, cooldownEdge]
      }

      setNodes((nds) => nds.concat(newNodes))
      setEdges((eds) => eds.concat(newEdges))
      setNodeIdCounter(currentNodeId)
    },
    [nodeIdCounter, setNodes, setEdges, screenToFlowPosition]
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

  const handleAIBuildWorkflow = () => {
    setShowAIChat(false)
    setAiBuilding(true)
    setWorkflowName('Smart Light Control')
    setWorkflowDescription('AI-generated workflow for controlling smart lights with gestures')

    // Build light control workflow with hardcoded nodes
    setTimeout(() => {
      const lightWorkflow = [
        { id: '1', type: 'input', position: { x: 100, y: 100 }, data: { label: 'Thumbs Up', gesture: 'thumbs_up', type: 'discrete' } },
        { id: '2', type: 'output', position: { x: 400, y: 100 }, data: { label: 'Light Action', category: 'light', actionType: 'turnOn', config: { action: 'turnOn' } } },
        { id: '3', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Thumbs Down', gesture: 'thumbs_down', type: 'discrete' } },
        { id: '4', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Light Action', category: 'light', actionType: 'turnOff', config: { action: 'turnOff' } } },
        { id: '5', type: 'input', position: { x: 100, y: 300 }, data: { label: 'Peace', gesture: 'peace', type: 'discrete' } },
        { id: '6', type: 'output', position: { x: 400, y: 300 }, data: { label: 'Light Action', category: 'light', actionType: 'colorCycle', config: { action: 'colorCycle' } } },
      ]
      const lightEdges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e5-6', source: '5', target: '6' },
      ]
      setNodes(lightWorkflow)
      setEdges(lightEdges)
      setNodeIdCounter(7)
      setAiBuilding(false)
    }, 2000)
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
          <button
            className="btn"
            style={{
              background: '#7F9C96',
              color: 'white',
              border: 'none',
              fontWeight: '600'
            }}
            onClick={() => setShowAIChat(true)}
          >
            ✨ Ask AI to Build
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            animation: 'slideUp 0.3s ease'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontWeight: '600' }}>What should this workflow do?</h3>
            <div style={{
              marginBottom: '1.5rem',
              minHeight: '60px',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: '#333'
            }}>
              {aiPrompt.split('').map((char, i) => (
                <span key={i} style={{
                  animation: `typeChar 0.05s ease ${i * 0.05}s both`
                }}>{char}</span>
              ))}
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAIBuildWorkflow()}
              placeholder="e.g., Navigate slides during presentations..."
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAIChat(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAIBuildWorkflow}
                disabled={!aiPrompt.trim()}
              >
                Build Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Building Animation */}
      {aiBuilding && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '3rem 4rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              animation: 'spin 1s linear infinite'
            }}>✨</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333' }}>
              Building Smart Light Workflow...
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes typeChar {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="canvas-main">
        {/* Left Sidebar - Node Library */}
        <div className="node-library">
          <div className="library-section">
            <h3>Input Gestures</h3>
            <div className="node-list">
              {GESTURE_INPUTS.map((gesture) => {
                const getGestureIcon = () => {
                  const iconColor = '#1B4079'
                  const size = 20

                  if (gesture.gesture === 'thumbs_up') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'thumbs_down') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'palm') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83c1.76-1.77 2.32-4.15.57-5.93.41-.42 1.09-.42 1.5 0l3.57 3.57c.09.09.21.14.34.14s.25-.05.35-.15c.09-.09.15-.22.15-.35V3c0-.55.45-1 1-1s1 .45 1 1v9.5c0 .28.22.5.5.5s.5-.22.5-.5V1.5c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V2c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V5.5c0-.55.45-1 1-1s1 .45 1 1z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'peace') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M12 2c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zm5 0c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zM9.5 11h-2c-.83 0-1.54.5-1.84 1.22l-1.16 2.71C4.22 15.5 4 16.08 4 16.69V20c0 2.21 1.79 4 4 4h4c1.1 0 2-.9 2-2V13c0-.55-.45-1-1-1h-3.5z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'swipe_left') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'swipe_right') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                      </svg>
                    )
                  } else if (gesture.gesture === 'continuous_motion') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                    )
                  }

                  // Default hand icon
                  return (
                    <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                      <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83c1.76-1.77 2.32-4.15.57-5.93.41-.42 1.09-.42 1.5 0l3.57 3.57c.09.09.21.14.34.14s.25-.05.35-.15c.09-.09.15-.22.15-.35V3c0-.55.45-1 1-1s1 .45 1 1v9.5c0 .28.22.5.5.5s.5-.22.5-.5V1.5c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V2c0-.55.45-1 1-1s1 .45 1 1v11.5c0 .28.22.5.5.5s.5-.22.5-.5V5.5c0-.55.45-1 1-1s1 .45 1 1z"/>
                    </svg>
                  )
                }

                return (
                  <div
                    key={gesture.id}
                    className="node-item input-node"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'input', gesture)}
                  >
                    <span className="node-icon">{getGestureIcon()}</span>
                    <span className="node-label">{gesture.label}</span>
                    <span className="node-connector">→</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="library-section">
            <h3>Modifiers</h3>
            <div className="node-list">
              {MIDDLEWARE_NODES.map((modifier) => {
                const getModifierIcon = () => {
                  const iconColor = '#7F9C96'
                  const size = 20

                  if (modifier.label === 'Cooldown') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
                      </svg>
                    )
                  }

                  // Default clock icon for Hold Time
                  return (
                    <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                      <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                  )
                }

                return (
                  <div
                    key={modifier.id}
                    className="node-item modifier-node"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'modifier', modifier)}
                  >
                    <span className="node-icon">{getModifierIcon()}</span>
                    <span className="node-label">{modifier.label}</span>
                    <span className="node-connector">↔</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="library-section">
            <h3>Output Actions</h3>
            <div className="node-list">
              {OUTPUT_ACTIONS.map((action) => {
                const getActionIcon = () => {
                  const iconColor = '#C7DB94'
                  const size = 20

                  if (action.category === 'keyboard') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                      </svg>
                    )
                  } else if (action.category === 'mouse') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/>
                      </svg>
                    )
                  } else if (action.category === 'light') {
                    return (
                      <svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
                        <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
                      </svg>
                    )
                  }

                  return null
                }

                return (
                  <div
                    key={action.id}
                    className="node-item output-node"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'output', action)}
                  >
                    <span className="node-icon">{getActionIcon()}</span>
                    <span className="node-label">{action.label}</span>
                  </div>
                )
              })}
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
            nodeTypes={nodeTypes}
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

              {/* Modifier node configuration - Hold Time */}
              {selectedNode.data.category === 'modifier' && selectedNode.data.config?.holdTime !== undefined && (
                <div className="config-section">
                  <label>Hold Time (milliseconds)</label>
                  <input
                    type="number"
                    value={selectedNode.data.config.holdTime}
                    onChange={(e) => handleUpdateNodeConfig('holdTime', parseInt(e.target.value))}
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
                    {(selectedNode.data.config.holdTime / 1000).toFixed(1)} seconds
                  </p>
                </div>
              )}

              {/* Modifier node configuration - Cooldown */}
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
