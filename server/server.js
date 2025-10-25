import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import * as govee from './goveeController.js'

const app = express()
const httpServer = createServer(app)

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

// Store connected clients and their mode
const clients = new Map()

// Store active workflow mappings (loaded from database)
let activeWorkflowMappings = new Map() // gesture -> action config

// Store last execution time for cooldown tracking
let gestureLastExecuted = new Map() // gesture -> timestamp

// LEGACY: Gesture to keyboard mapping for Presentation Mode (fallback)
const gestureActionMap = {
  'swipe_right': { key: Key.Right, description: 'Next slide' },
  'swipe_left': { key: Key.Left, description: 'Previous slide' },
  'thumbs_up': { key: Key.F5, description: 'Start presentation' },
  'palm': { key: Key.Escape, description: 'End presentation' }
}

// LEGACY: Gesture to light action mapping for Light Mode (fallback)
const gestureLightMap = {
  'thumbs_up': { action: 'turnOn', description: 'Turn lights ON' },
  'thumbs_down': { action: 'turnOff', description: 'Turn lights OFF' },
  'swipe_up': { action: 'brighten', description: 'Brighten lights' },
  'swipe_down': { action: 'dim', description: 'Dim lights' },
  'peace': { action: 'colorCycle', description: 'Change color' }
}

let currentBrightness = 50
let currentColorIndex = 0
const colors = [
  { r: 255, g: 0, b: 0, name: 'Red' },
  { r: 0, g: 255, b: 0, name: 'Green' },
  { r: 0, g: 0, b: 255, name: 'Blue' },
  { r: 255, g: 255, b: 0, name: 'Yellow' },
  { r: 255, g: 0, b: 255, name: 'Magenta' },
  { r: 0, g: 255, b: 255, name: 'Cyan' },
  { r: 255, g: 255, b: 255, name: 'White' }
]

// Execute keyboard action for gesture
async function executeGestureAction(gestureName) {
  const action = gestureActionMap[gestureName]

  if (!action) {
    console.log(`No keyboard action mapped for gesture: ${gestureName}`)
    return { success: false, message: `No action for ${gestureName}` }
  }

  try {
    await keyboard.type(action.key)
    console.log(`✅ Executed: ${gestureName} → ${action.description}`)
    return { success: true, message: action.description }
  } catch (error) {
    console.error(`❌ Keyboard action failed for ${gestureName}:`, error)
    return { success: false, message: error.message }
  }
}

// Execute action from workflow node
async function executeWorkflowAction(gestureName) {
  const actionConfig = activeWorkflowMappings.get(gestureName)

  if (!actionConfig) {
    console.log(`No workflow action mapped for gesture: ${gestureName}`)
    return { success: false, message: `No action mapped for ${gestureName}` }
  }

  // Check cooldown modifier
  const cooldownModifier = actionConfig.modifiers?.find(m => m.category === 'modifier' && m.config?.cooldown)
  if (cooldownModifier) {
    const cooldown = cooldownModifier.config.cooldown
    const lastExecuted = gestureLastExecuted.get(gestureName) || 0
    const now = Date.now()
    const timeSinceLastExecution = now - lastExecuted

    if (timeSinceLastExecution < cooldown) {
      const remainingCooldown = ((cooldown - timeSinceLastExecution) / 1000).toFixed(1)
      console.log(`⏸️  Cooldown active for ${gestureName}: ${remainingCooldown}s remaining`)
      return { success: false, message: `Cooldown: ${remainingCooldown}s` }
    }
  }

  try {
    // Handle keyboard actions
    if (actionConfig.category === 'keyboard') {
      // Type text
      if (actionConfig.config?.action === 'typeText' && actionConfig.config?.text) {
        const text = actionConfig.config.text
        await keyboard.type(text)
        console.log(`✅ Executed workflow keyboard action: ${gestureName} → Type "${text}"`)
        // Record execution time for cooldown
        gestureLastExecuted.set(gestureName, Date.now())
        return { success: true, message: `Typed "${text}"` }
      }

      // Press key
      if (actionConfig.config?.key) {
        const keyName = actionConfig.config.key
        const key = Key[keyName] || keyName
        await keyboard.type(key)
        console.log(`✅ Executed workflow keyboard action: ${gestureName} → Press ${keyName}`)
        // Record execution time for cooldown
        gestureLastExecuted.set(gestureName, Date.now())
        return { success: true, message: `Pressed ${keyName}` }
      }
    }

    // Handle light actions
    if (actionConfig.category === 'light' && actionConfig.config?.action) {
      const action = actionConfig.config.action
      let message = actionConfig.label

      switch (action) {
        case 'turnOn':
          await govee.turnOn()
          break
        case 'turnOff':
          await govee.turnOff()
          break
        case 'setBrightness':
          const brightness = actionConfig.config.value || 50
          await govee.setBrightness(brightness)
          message = `Brightness: ${brightness}%`
          break
        case 'colorCycle':
          currentColorIndex = (currentColorIndex + 1) % colors.length
          const color = colors[currentColorIndex]
          await govee.setColor(color.r, color.g, color.b)
          message = `Color: ${color.name}`
          break
        default:
          return { success: false, message: `Unknown light action: ${action}` }
      }

      console.log(`✅ Executed workflow light action: ${gestureName} → ${message}`)
      // Record execution time for cooldown
      gestureLastExecuted.set(gestureName, Date.now())
      return { success: true, message }
    }

    return { success: false, message: 'Unknown action type' }
  } catch (error) {
    console.error(`❌ Workflow action failed for ${gestureName}:`, error)
    return { success: false, message: error.message }
  }
}

// Execute light action for gesture
async function executeLightAction(gestureName) {
  const action = gestureLightMap[gestureName]

  if (!action) {
    console.log(`No light action mapped for gesture: ${gestureName}`)
    return { success: false, message: `No action for ${gestureName}` }
  }

  try {
    let message = action.description

    switch (action.action) {
      case 'turnOn':
        await govee.turnOn()
        break
      case 'turnOff':
        await govee.turnOff()
        break
      case 'brighten':
        currentBrightness = Math.min(100, currentBrightness + 20)
        await govee.setBrightness(currentBrightness)
        message = `Brightness: ${currentBrightness}%`
        break
      case 'dim':
        currentBrightness = Math.max(10, currentBrightness - 20)
        await govee.setBrightness(currentBrightness)
        message = `Brightness: ${currentBrightness}%`
        break
      case 'colorCycle':
        currentColorIndex = (currentColorIndex + 1) % colors.length
        const color = colors[currentColorIndex]
        await govee.setColor(color.r, color.g, color.b)
        message = `Color: ${color.name}`
        break
    }

    console.log(`✅ Executed: ${gestureName} → ${message}`)
    return { success: true, message }
  } catch (error) {
    console.error(`❌ Light action failed for ${gestureName}:`, error)
    return { success: false, message: error.message }
  }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  clients.set(socket.id, { id: socket.id, connectedAt: Date.now(), mode: 'presentation' })

  // Mode change event
  socket.on('mode:change', (data) => {
    const client = clients.get(socket.id)
    if (client) {
      client.mode = data.mode
      console.log(`🔄 Client ${socket.id} switched to ${data.mode} mode`)
      socket.emit('mode:changed', { mode: data.mode })
    }
  })

  // Gesture detected event
  socket.on('gesture:detected', async (data) => {
    console.log('Gesture detected:', data)

    let result

    // Check if we have an active workflow
    if (activeWorkflowMappings.size > 0) {
      // Use workflow-based execution
      result = await executeWorkflowAction(data.gesture)
    } else {
      // Fallback to legacy mode-based execution
      const client = clients.get(socket.id)
      const mode = client?.mode || 'presentation'

      result = mode === 'light'
        ? await executeLightAction(data.gesture)
        : await executeGestureAction(data.gesture)
    }

    // Broadcast to all clients
    socket.broadcast.emit('gesture:detected', {
      gesture: data.gesture,
      confidence: data.confidence,
      timestamp: data.timestamp || Date.now()
    })

    // Send confirmation back to sender with execution result
    socket.emit('action:completed', {
      action: data.gesture,
      success: result.success,
      message: result.success ? `${data.gesture} → ${result.message}` : result.message
    })
  })

  // Load workflow event - receives workflow from client when "Run" is clicked
  socket.on('workflow:load', (data) => {
    console.log('📋 Loading workflow:', data.workflowName)

    // Clear existing mappings
    activeWorkflowMappings.clear()

    // Build gesture -> action mapping from workflow nodes and edges
    const { nodes, edges } = data.workflowData

    // Create a map of node IDs to node data
    const nodeMap = new Map()
    nodes.forEach(node => {
      nodeMap.set(node.id, node)
    })

    // Build a graph to trace paths from input → modifier → output
    const nodeConnections = new Map()
    edges.forEach(edge => {
      if (!nodeConnections.has(edge.source)) {
        nodeConnections.set(edge.source, [])
      }
      nodeConnections.get(edge.source).push(edge.target)
    })

    // Find all input nodes (gestures)
    const inputNodes = nodes.filter(n => n.data?.nodeType === 'input')

    // For each input, trace the path to find output and any modifiers
    inputNodes.forEach(inputNode => {
      const gesture = inputNode.data.gesture
      if (!gesture) return

      // Trace path from input
      const visited = new Set()
      const modifiers = []
      let outputNode = null

      const trace = (nodeId) => {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) return

        if (node.data?.nodeType === 'modifier') {
          modifiers.push(node.data)
        } else if (node.data?.nodeType === 'output' || node.data?.category === 'keyboard' || node.data?.category === 'light') {
          outputNode = node
          return
        }

        // Continue tracing
        const connections = nodeConnections.get(nodeId) || []
        connections.forEach(trace)
      }

      trace(inputNode.id)

      if (outputNode) {
        const actionConfig = {
          label: outputNode.data.label,
          category: outputNode.data.category,
          config: outputNode.data.config,
          modifiers: modifiers.map(m => ({
            category: m.category,
            config: m.config
          }))
        }

        activeWorkflowMappings.set(gesture, actionConfig)

        const modifierInfo = modifiers.length > 0
          ? ` [${modifiers.map(m => m.label).join(', ')}]`
          : ''
        console.log(`  ✓ Mapped: ${gesture} → ${actionConfig.label}${modifierInfo}`)
      }
    })

    console.log(`✅ Workflow loaded with ${activeWorkflowMappings.size} gesture mappings`)

    socket.emit('workflow:loaded', {
      success: true,
      mappingCount: activeWorkflowMappings.size
    })
  })

  // Unload workflow event - clears active workflow
  socket.on('workflow:unload', () => {
    console.log('🗑️  Unloading active workflow')
    activeWorkflowMappings.clear()
    socket.emit('workflow:unloaded', { success: true })
  })

  // Request device list
  socket.on('devices:list', () => {
    socket.emit('devices:update', [
      { id: 'local', type: 'computer', status: 'connected' },
      { id: 'hue_1', type: 'hue', name: 'Living Room', status: 'disconnected' }
    ])
  })

  // Add device
  socket.on('device:add', (data) => {
    console.log('Add device request:', data)

    // TODO: Implement actual device connection logic
    socket.emit('device:connected', {
      deviceId: data.type + '_' + Date.now(),
      type: data.type,
      message: `Device ${data.type} added successfully`
    })
  })

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    clients.delete(socket.id)
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    clients: clients.size,
    uptime: process.uptime()
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Socket.IO ready for connections')
})
