import { io } from 'socket.io-client'

class SocketClient {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }

  connect(url = 'http://localhost:3001') {
    if (this.socket) {
      console.log('Socket already connected')
      return
    }

    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id)
      this.connected = true
      this.emit('connection:status', { connected: true })
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.connected = false
      this.emit('connection:status', { connected: false })
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.emit('connection:error', { error: error.message })
    })

    // Listen for action completed
    this.socket.on('action:completed', (data) => {
      this.emit('action:completed', data)
    })

    // Listen for device updates
    this.socket.on('devices:update', (data) => {
      console.log('Devices updated:', data)
      this.emit('devices:update', data)
    })

    // Listen for device connected
    this.socket.on('device:connected', (data) => {
      console.log('Device connected:', data)
      this.emit('device:connected', data)
    })

    // Listen for device errors
    this.socket.on('device:error', (data) => {
      console.error('Device error:', data)
      this.emit('device:error', data)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  // Send gesture detected event
  sendGesture(gesture, confidence, position = null) {
    if (!this.connected) {
      console.warn('Not connected to server')
      return
    }

    this.socket.emit('gesture:detected', {
      gesture,
      confidence,
      position, // { x, y } normalized 0-1
      timestamp: Date.now()
    })
  }

  // Request device list
  requestDevices() {
    if (!this.connected) {
      console.warn('Not connected to server')
      return
    }

    this.socket.emit('devices:list')
  }

  // Add new device
  addDevice(type, config = {}) {
    if (!this.connected) {
      console.warn('Not connected to server')
      return
    }

    this.socket.emit('device:add', {
      type,
      config
    })
  }

  // Change control mode
  changeMode(mode) {
    if (!this.connected) {
      console.warn('Not connected to server')
      return
    }

    this.socket.emit('mode:change', { mode })
    console.log('Mode change sent to server:', mode)
  }

  // Load workflow on server
  loadWorkflow(workflowName, workflowData) {
    if (!this.connected) {
      console.warn('Not connected to server')
      return Promise.reject(new Error('Not connected to server'))
    }

    return new Promise((resolve) => {
      this.socket.emit('workflow:load', { workflowName, workflowData })

      const handleLoaded = (data) => {
        this.socket.off('workflow:loaded', handleLoaded)
        resolve(data)
      }

      this.socket.on('workflow:loaded', handleLoaded)
    })
  }

  // Unload workflow from server
  unloadWorkflow() {
    if (!this.connected) {
      console.warn('Not connected to server')
      return Promise.reject(new Error('Not connected to server'))
    }

    return new Promise((resolve) => {
      this.socket.emit('workflow:unload')

      const handleUnloaded = (data) => {
        this.socket.off('workflow:unloaded', handleUnloaded)
        resolve(data)
      }

      this.socket.on('workflow:unloaded', handleUnloaded)
    })
  }

  // Event listener system
  on(event, callback) {
    // First check if this is a socket event we should forward
    if (this.socket && !this.listeners.has(event)) {
      this.socket.on(event, (data) => {
        this.emit(event, data)
      })
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Remove event listener
  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks && callback) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    } else if (!callback) {
      // Remove all listeners for this event
      this.listeners.delete(event)
    }
  }

  // Emit event to listeners (internal use)
  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }

    // Also emit to socket if connected (for server events)
    if (this.socket && this.connected && !this.listeners.has(event)) {
      this.socket.emit(event, data)
    }
  }
}

// Singleton instance
const socketClient = new SocketClient()

export default socketClient
