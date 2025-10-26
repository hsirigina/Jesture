import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { keyboard, Key, mouse, Button, screen } from '@nut-tree-fork/nut-js'
import * as govee from './goveeController.js'
import fetch from 'node-fetch'

const app = express()
const httpServer = createServer(app)

// Configure Socket.IO with CORS (allow both 5173 and 5174)
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

// Store connected clients and their mode
const clients = new Map()

// Store active workflow mappings (loaded from database)
let activeWorkflowMappings = new Map() // gesture -> action config

// Store AI Mode state
let aiModeActive = false
let aiModeSessionId = null
const AI_AGENT_URL = 'http://127.0.0.1:8001'  // Use IPv4 directly to avoid localhost resolution issues

// Store last execution time for cooldown tracking
let gestureLastExecuted = new Map() // gesture -> timestamp

// Store gesture hold start times for hold time tracking
let gestureHoldStart = new Map() // gesture -> timestamp when first detected

// REMOVED: gestureCurrentlyHeld - no longer needed, cooldown handles everything

// Store last hand position for relative mouse movement
let lastHandPosition = null // { x, y }

// Smoothing buffer for mouse movement (exponential moving average)
let smoothedMouseVelocity = { x: 0, y: 0 }
const SMOOTHING_FACTOR = 0.7 // 0 = no smoothing, 1 = max smoothing (0.7 = very smooth)

// No interpolation - direct cursor control for best performance

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
async function executeWorkflowAction(gestureName, position = null) {
  const actionConfig = activeWorkflowMappings.get(gestureName)

  if (!actionConfig) {
    console.log(`No workflow action mapped for gesture: ${gestureName}`)
    return { success: false, message: `No action mapped for ${gestureName}` }
  }

  // Attach position data to action config for moveCursor action
  if (position) {
    actionConfig.position = position
    console.log('📍 Position data attached:', position)
  } else {
    console.log('⚠️ No position data received')
  }

  const now = Date.now()

  // Check cooldown modifier FIRST - if in cooldown, don't even start hold timer
  const cooldownModifier = actionConfig.modifiers?.find(m => m.category === 'modifier' && m.config?.cooldown)
  if (cooldownModifier) {
    const cooldown = cooldownModifier.config.cooldown
    const lastExecuted = gestureLastExecuted.get(gestureName) || 0
    const timeSinceLastExecution = now - lastExecuted

    if (timeSinceLastExecution < cooldown) {
      const remainingCooldown = ((cooldown - timeSinceLastExecution) / 1000).toFixed(1)
      // Don't spam cooldown logs - only log once per second
      if (timeSinceLastExecution % 1000 < 100) {
        console.log(`⏸️  Cooldown active for ${gestureName}: ${remainingCooldown}s remaining`)
      }
      // Reset hold timer if it exists (user shouldn't accumulate hold time during cooldown)
      gestureHoldStart.delete(gestureName)
      return { success: false, message: `Cooldown: ${remainingCooldown}s` }
    }
  }

  // Check hold time modifier - gesture must be held for specified duration
  const holdTimeModifier = actionConfig.modifiers?.find(m => m.category === 'modifier' && m.config?.holdTime !== undefined)
  if (holdTimeModifier) {
    const requiredHoldTime = holdTimeModifier.config.holdTime

    // Check if this is the first detection or continuation
    if (!gestureHoldStart.has(gestureName)) {
      // First detection - start the timer
      gestureHoldStart.set(gestureName, now)
      const requiredSeconds = (requiredHoldTime / 1000).toFixed(1)
      console.log(`⏱️  Hold timer started for ${gestureName}: needs ${requiredSeconds}s`)
      return { success: false, message: `Hold ${gestureName}...` }
    } else {
      // Continuation - check if held long enough
      const holdStartTime = gestureHoldStart.get(gestureName)
      const holdDuration = now - holdStartTime

      if (holdDuration < requiredHoldTime) {
        const remainingTime = ((requiredHoldTime - holdDuration) / 1000).toFixed(1)
        return { success: false, message: `Hold ${remainingTime}s...` }
      }
      // Held long enough - clear the timer, set cooldown immediately to prevent double-trigger
      gestureHoldStart.delete(gestureName)

      // Set cooldown NOW (before action executes) to block rapid re-triggers
      if (cooldownModifier) {
        gestureLastExecuted.set(gestureName, now)
      }

      console.log(`✅ Hold time satisfied for ${gestureName}`)
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
        return { success: true, message: `Typed "${text}"` }
      }

      // Press key
      if (actionConfig.config?.key) {
        const keyName = actionConfig.config.key
        const key = Key[keyName] || keyName
        await keyboard.type(key)
        console.log(`✅ Executed workflow keyboard action: ${gestureName} → Press ${keyName}`)
        return { success: true, message: `Pressed ${keyName}` }
      }
    }

    // Handle mouse actions
    if (actionConfig.category === 'mouse' && actionConfig.config?.action) {
      const action = actionConfig.config.action
      let message = actionConfig.label

      switch (action) {
        case 'moveCursor':
          // RELATIVE mouse movement - direct control
          if (actionConfig.position && actionConfig.position.x !== undefined && actionConfig.position.y !== undefined) {
            const currentHandPos = {
              x: 1 - actionConfig.position.x, // Flip X for natural movement
              y: actionConfig.position.y
            }

            if (lastHandPosition) {
              // Calculate delta (how much hand moved)
              const deltaX = currentHandPos.x - lastHandPosition.x
              const deltaY = currentHandPos.y - lastHandPosition.y

              // Dead zone - ignore tiny movements (hand tremor/noise)
              const DEAD_ZONE = 0.003 // Ignore movements smaller than 0.3% of screen
              const movementMagnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

              if (movementMagnitude > DEAD_ZONE) {
                // Amplify movement (multiply by screen size for sensitivity)
                const screenWidth = await screen.width()
                const screenHeight = await screen.height()
                const rawMoveX = deltaX * screenWidth * 1.5 // Trackpad-like sensitivity
                const rawMoveY = deltaY * screenHeight * 1.5

                // Apply exponential smoothing for buttery smoothness
                smoothedMouseVelocity.x = (SMOOTHING_FACTOR * smoothedMouseVelocity.x) + ((1 - SMOOTHING_FACTOR) * rawMoveX)
                smoothedMouseVelocity.y = (SMOOTHING_FACTOR * smoothedMouseVelocity.y) + ((1 - SMOOTHING_FACTOR) * rawMoveY)

                // DIRECT MOVEMENT with smoothed velocity
                const currentMousePos = await mouse.getPosition()
                const newX = currentMousePos.x + smoothedMouseVelocity.x
                const newY = currentMousePos.y + smoothedMouseVelocity.y

                // Clamp to screen bounds
                const finalX = Math.max(0, Math.min(screenWidth - 1, Math.round(newX)))
                const finalY = Math.max(0, Math.min(screenHeight - 1, Math.round(newY)))

                await mouse.setPosition({ x: finalX, y: finalY })

                message = `Moved to (${finalX}, ${finalY})`
              } else {
                // Movement too small - stay still
                message = 'Holding position'
              }
            } else {
              // First detection - just store position, don't move
              message = 'Tracking initialized'
            }

            // Update last position for next delta calculation
            lastHandPosition = currentHandPos
          } else {
            return { success: false, message: 'No position data for cursor movement' }
          }
          break
        case 'click':
          await mouse.click(Button.LEFT)
          message = 'Left Click'
          break
        case 'rightClick':
          await mouse.click(Button.RIGHT)
          message = 'Right Click'
          break
        case 'doubleClick':
          await mouse.doubleClick(Button.LEFT)
          message = 'Double Click'
          break
        case 'scrollUp':
          const scrollUpAmount = actionConfig.config.amount || 3
          // Scroll up by moving negative Y (multiply by larger number for more noticeable scroll)
          await mouse.scrollUp(scrollUpAmount * 100)
          message = `Scrolled Up ${scrollUpAmount} lines`
          break
        case 'scrollDown':
          const scrollDownAmount = actionConfig.config.amount || 3
          // Scroll down by moving positive Y (multiply by larger number for more noticeable scroll)
          await mouse.scrollDown(scrollDownAmount * 100)
          message = `Scrolled Down ${scrollDownAmount} lines`
          break
        default:
          return { success: false, message: `Unknown mouse action: ${action}` }
      }

      console.log(`✅ Executed workflow mouse action: ${gestureName} → ${message}`)
      return { success: true, message }
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
    // Log all gestures for debugging (except releases)
    if (data.gesture !== 'palm_release' &&
        data.gesture !== 'continuous_motion_release' &&
        data.gesture !== 'gesture_release') {
      console.log('📥 Gesture received:', data.gesture, '| Active workflows:', activeWorkflowMappings.size)
    }

    // Handle palm release - reset tracking (legacy, keep for backwards compatibility)
    if (data.gesture === 'palm_release') {
      console.log('🖐️ Palm released - resetting mouse tracking')
      lastHandPosition = null
      smoothedMouseVelocity = { x: 0, y: 0 } // Reset smoothing
      return
    }

    // Handle continuous motion release - reset tracking
    if (data.gesture === 'continuous_motion_release') {
      console.log('👉 Point released - resetting continuous motion tracking')
      lastHandPosition = null
      smoothedMouseVelocity = { x: 0, y: 0 } // Reset smoothing
      return
    }

    // Handle gesture release - reset hold timer
    if (data.gesture === 'gesture_release') {
      const lastGesture = data.position?.lastGesture
      if (lastGesture && gestureHoldStart.has(lastGesture)) {
        console.log(`🔄 Gesture ${lastGesture} released - resetting hold timer`)
        gestureHoldStart.delete(lastGesture)
      }
      return
    }

    let result

    // Check if we have an active workflow
    if (activeWorkflowMappings.size > 0) {
      // Use workflow-based execution with position data
      result = await executeWorkflowAction(data.gesture, data.position)
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

    // Build forward and backward connection graphs
    const forwardConnections = new Map() // source -> [targets]
    const backwardConnections = new Map() // target -> [sources]
    edges.forEach(edge => {
      // Forward
      if (!forwardConnections.has(edge.source)) {
        forwardConnections.set(edge.source, [])
      }
      forwardConnections.get(edge.source).push(edge.target)

      // Backward
      if (!backwardConnections.has(edge.target)) {
        backwardConnections.set(edge.target, [])
      }
      backwardConnections.get(edge.target).push(edge.source)
    })

    // Find all input nodes (gestures)
    const inputNodes = nodes.filter(n => n.data?.nodeType === 'input')

    // For each input, trace the path to find output and any modifiers
    inputNodes.forEach(inputNode => {
      const gesture = inputNode.data.gesture
      if (!gesture) return

      // Trace path from input (both backwards and forwards)
      const visited = new Set()
      const modifiers = []
      let outputNode = null

      // Trace backwards to find modifiers BEFORE the input (e.g., HoldTime)
      const traceBackward = (nodeId) => {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) return

        if (node.data?.nodeType === 'modifier') {
          modifiers.push(node.data)
        }

        // Continue tracing backwards
        const sources = backwardConnections.get(nodeId) || []
        sources.forEach(traceBackward)
      }

      // Trace forwards to find modifiers AFTER the input and the output action
      const traceForward = (nodeId) => {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) return

        if (node.data?.nodeType === 'modifier') {
          modifiers.push(node.data)
        } else if (node.data?.nodeType === 'output' || node.data?.category === 'keyboard' || node.data?.category === 'light' || node.data?.category === 'mouse') {
          outputNode = node
          return
        }

        // Continue tracing forwards
        const targets = forwardConnections.get(nodeId) || []
        targets.forEach(traceForward)
      }

      // First trace backwards from input to find HoldTime
      const inputSources = backwardConnections.get(inputNode.id) || []
      inputSources.forEach(traceBackward)

      // Then trace forwards from input to find Cooldown and Output
      traceForward(inputNode.id)

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

  // ===== AI MODE HANDLERS =====

  // Activate AI Mode - sends request to AI agent
  socket.on('ai-mode:activate', async (data) => {
    console.log('🤖 AI Mode activation requested:', data)

    try {
      // Generate session ID
      const sessionId = `ai-session-${Date.now()}`

      // Send activation request to AI agent (simplified endpoint)
      const response = await fetch('http://127.0.0.1:8001/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user_id || socket.id,
          session_id: sessionId
        })
      })

      if (response.ok) {
        const result = await response.json()
        aiModeActive = true
        aiModeSessionId = sessionId

        console.log('✅ AI Mode activated:', result)

        socket.emit('ai-mode:activated', {
          success: true,
          session_id: sessionId,
          message: 'AI Mode is now active'
        })
      } else {
        throw new Error('AI agent not responding')
      }
    } catch (error) {
      console.error('❌ Failed to activate AI Mode:', error.message)
      socket.emit('ai-mode:error', {
        success: false,
        message: 'Could not connect to AI agent. Make sure it\'s running on port 8001.'
      })
    }
  })

  // Deactivate AI Mode
  socket.on('ai-mode:deactivate', () => {
    console.log('🛑 AI Mode deactivated')
    aiModeActive = false
    aiModeSessionId = null

    socket.emit('ai-mode:deactivated', {
      success: true,
      message: 'AI Mode is now off'
    })
  })

  // AI Mode gesture handler - sends gesture to AI agent for contextual interpretation
  socket.on('ai-gesture:detected', async (data) => {
    if (!aiModeActive) {
      socket.emit('ai-mode:error', { message: 'AI Mode is not active' })
      return
    }

    console.log('🤚 AI Mode gesture detected:', data.gesture)

    try {
      // Send gesture to AI agent (simplified endpoint)
      const response = await fetch('http://127.0.0.1:8001/gesture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture: data.gesture,
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        const aiDecision = await response.json()
        console.log('🧠 AI Decision:', aiDecision)

        // Execute the action decided by AI
        if (aiDecision.action === 'keyboard' && aiDecision.parameters?.key) {
          const keyName = aiDecision.parameters.key

          // Map common key names to nut-js Key enum
          const keyMap = {
            'ArrowRight': Key.Right,
            'ArrowLeft': Key.Left,
            'ArrowUp': Key.Up,
            'ArrowDown': Key.Down,
            'Space': Key.Space,
            'Escape': Key.Escape,
            'Enter': Key.Enter,
            'f': Key.F,
            'j': Key.J,
            'l': Key.L
          }

          const key = keyMap[keyName]

          if (key) {
            // It's a mapped key - use pressKey/releaseKey
            await keyboard.pressKey(key)
            await keyboard.releaseKey(key)
            console.log(`✅ Executed AI action (special key): ${keyName}`)
          } else {
            // It's a regular character - use type
            await keyboard.type(keyName)
            console.log(`✅ Executed AI action (character): ${keyName}`)
          }

          // Send result back to frontend
          socket.emit('ai-action:completed', {
            gesture: data.gesture,
            action: keyName,
            reasoning: aiDecision.reasoning,
            success: true
          })
        }
      } else {
        throw new Error('AI agent error')
      }
    } catch (error) {
      console.error('❌ AI gesture processing failed:', error.message)
      socket.emit('ai-mode:error', {
        message: 'Failed to process gesture with AI'
      })
    }
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
