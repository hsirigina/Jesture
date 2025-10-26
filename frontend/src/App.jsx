import { useState, useEffect, useCallback } from 'react'
import CameraFeed from './components/CameraFeed'
import MiniPanel from './components/MiniPanel'
import ControlBar from './components/ControlBar'
import Auth from './components/Auth'
import WorkflowDashboard from './components/WorkflowDashboard'
import WorkflowCanvas from './components/WorkflowCanvas'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import socketClient from './services/socketClient'
import { workflowService } from './services/workflowService'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'canvas', 'camera'
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null)
  const [lastGesture, setLastGesture] = useState(null)
  const [connected, setConnected] = useState(false)
  const [viewMode, setViewMode] = useState('full') // 'mini', 'full', or 'recording-indicator'
  const [isMiniWindow, setIsMiniWindow] = useState(false)
  const [controlMode, setControlMode] = useState('presentation') // 'presentation' or 'light'
  const [cameraActive, setCameraActive] = useState(false) // Only run camera when workflow is active
  const [aiModeActive, setAiModeActive] = useState(false) // AI Mode state
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0) // Force dashboard refresh

  console.log('🎬 AppContent render - viewMode:', viewMode, 'isMiniWindow:', isMiniWindow)

  useEffect(() => {
    // Connect to Socket.IO server
    socketClient.connect()

    // Listen for connection status
    const unsubscribeStatus = socketClient.on('connection:status', (data) => {
      setConnected(data.connected)
    })

    // Listen for action completed (silent - no logs)
    const unsubscribeAction = socketClient.on('action:completed', (data) => {
      // Action completed silently
    })

    // Listen for view mode changes from Electron
    let cleanupViewMode
    let cleanupWorkflowStopped
    if (window.electronAPI) {
      console.log('🔧 Setting up onSetViewMode listener')
      console.log('🔧 electronAPI available:', !!window.electronAPI)
      console.log('🔧 onSetViewMode available:', !!window.electronAPI.onSetViewMode)

      cleanupViewMode = window.electronAPI.onSetViewMode((mode) => {
        console.log('📡 Received view mode from Electron:', mode)
        setViewMode(mode)
        if (mode === 'mini') {
          setIsMiniWindow(true)
        } else if (mode === 'recording-indicator') {
          setViewMode('recording-indicator')
          console.log('🎯 Set viewMode to recording-indicator')
        } else {
          setIsMiniWindow(false)
        }
      })

      // Listen for workflow stopped event from Electron
      if (window.electronAPI.onWorkflowStopped) {
        cleanupWorkflowStopped = window.electronAPI.onWorkflowStopped(() => {
          console.log('🛑 Main window received workflow-stopped event - refreshing dashboard')
          // Turn off camera
          setCameraActive(false)
          // Increment refresh key to force WorkflowDashboard to reload
          setDashboardRefreshKey(prev => prev + 1)
        })
      }
    } else {
      console.log('❌ window.electronAPI not available')
    }

    // Cleanup on unmount
    return () => {
      unsubscribeStatus()
      unsubscribeAction()
      socketClient.disconnect()
      if (cleanupViewMode) cleanupViewMode()
      if (cleanupWorkflowStopped) cleanupWorkflowStopped()
    }
  }, [])

  // Auto-load active workflow on mount
  useEffect(() => {
    if (!user) return

    const loadActiveWorkflow = async () => {
      try {
        const activeWorkflow = await workflowService.getActiveWorkflow()

        if (activeWorkflow) {
          console.log('🔄 Auto-loading active workflow:', activeWorkflow.name)

          // Send workflow to server
          await socketClient.loadWorkflow(activeWorkflow.name, activeWorkflow.workflow_data)

          // Turn on camera
          setCameraActive(true)

          console.log('✅ Active workflow auto-loaded successfully')
        }
      } catch (error) {
        console.error('Failed to auto-load active workflow:', error)
      }
    }

    loadActiveWorkflow()
  }, [user])

  // Auto-enable camera when AI Mode is activated
  useEffect(() => {
    if (aiModeActive && !cameraActive) {
      console.log('🎥 AI Mode activated - turning on camera')
      setCameraActive(true)
    }
  }, [aiModeActive])

  // MERGED: Keep useCallback from friend's code, add AI Mode routing from your code
  const handleGestureDetected = useCallback((gestureName, confidence, position = null) => {
    console.log('👋 Gesture detected:', gestureName, 'confidence:', confidence)
    setLastGesture({ name: gestureName, confidence, time: Date.now() })

    // Route gesture based on active mode
    if (aiModeActive) {
      // Filter out release events in AI Mode - they shouldn't trigger actions
      if (gestureName === 'palm_release' || gestureName === 'continuous_motion_release') {
        console.log('🚫 Ignoring release event in AI Mode:', gestureName)
        return
      }

      // Send to AI agent for context-aware interpretation
      console.log('🤖 Routing gesture to AI agent:', gestureName)
      socketClient.emit('ai-gesture:detected', {
        gesture: gestureName,
        confidence: confidence
      })
    } else {
      // Send gesture to server via Socket.IO with position data (normal workflow mode)
      console.log('📤 Sending gesture to server:', gestureName)
      socketClient.sendGesture(gestureName, confidence, position)
    }
  }, [aiModeActive]) // Add aiModeActive to dependency array

  const handleModeChange = (newMode) => {
    setControlMode(newMode)
    socketClient.changeMode(newMode)
    console.log('Switched to', newMode, 'mode')
  }

  const handleWorkflowStop = async () => {
    console.log('🛑 handleWorkflowStop called - stopping workflow')

    // Turn off camera
    setCameraActive(false)

    // Deactivate workflow in database
    try {
      const activeWorkflow = await workflowService.getActiveWorkflow()
      console.log('🔍 Active workflow:', activeWorkflow)
      if (activeWorkflow) {
        await workflowService.deactivateWorkflow(activeWorkflow.id)
        await socketClient.unloadWorkflow()
        console.log('✅ Workflow stopped and unloaded')
      }
    } catch (err) {
      console.error('❌ Failed to stop workflow:', err)
    }
  }

  // Show loading state
  if (loading) {
    return <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  // Show auth if not logged in
  if (!user) {
    return <Auth />
  }

  // Recording indicator mode - ONLY show control bar (check BEFORE other views)
  if (viewMode === 'recording-indicator') {
    console.log('✅ RENDERING CONTROL BAR ONLY - viewMode:', viewMode)
    return <ControlBar onStop={handleWorkflowStop} />
  }

  // Mini panel mode - ONLY show this if we're actually in the mini window
  if (isMiniWindow || viewMode === 'mini') {
    return (
      <>
        {/* Keep camera running in background */}
        <div style={{ display: 'none' }}>
          <CameraFeed onGestureDetected={handleGestureDetected} />
        </div>
        <MiniPanel
          onShowFull={() => {
            setViewMode('full')
            if (window.electronAPI) {
              window.electronAPI.setViewMode('full')
            }
          }}
          onClose={() => {
            if (window.electronAPI) {
              window.electronAPI.hideWindow()
            }
          }}
        />
      </>
    )
  }

  // Show workflow dashboard
  if (currentView === 'dashboard') {
    return (
      <>
        {/* Only run camera when workflow is active */}
        {cameraActive && (
          <div style={{ display: 'none' }}>
            <CameraFeed onGestureDetected={handleGestureDetected} />
          </div>
        )}
        <WorkflowDashboard
          key={dashboardRefreshKey}
          onCreateWorkflow={() => {
            setCurrentWorkflowId(null)
            setCurrentView('canvas')
          }}
          onEditWorkflow={(workflowId) => {
            setCurrentWorkflowId(workflowId)
            setCurrentView('canvas')
          }}
          onWorkflowActivated={() => setCameraActive(true)}
          onWorkflowDeactivated={() => setCameraActive(false)}
          aiModeActive={aiModeActive}
          onAIModeChange={setAiModeActive}
        />
      </>
    )
  }

  // Show workflow canvas editor
  if (currentView === 'canvas') {
    return (
      <WorkflowCanvas
        workflowId={currentWorkflowId}
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Full homepage mode
  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            GestureThing
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '0.625rem',
              color: connected ? '#00ff00' : '#666666'
            }}>
              ● {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="header-actions">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mode:</span>
              <button
                className={controlMode === 'presentation' ? 'btn btn-primary' : 'btn'}
                onClick={() => handleModeChange('presentation')}
              >
                Presentation
              </button>
              <button
                className={controlMode === 'light' ? 'btn btn-primary' : 'btn'}
                onClick={() => handleModeChange('light')}
              >
                Light Control
              </button>
            </div>
            <button className="btn" onClick={() => {
              setViewMode('mini')
              if (window.electronAPI) {
                window.electronAPI.setViewMode('mini')
              }
            }}>Minimize</button>
          </div>
        </header>

        <div className="main-grid">
          <div className="card">
            <h2 className="section-title">Camera</h2>
            <CameraFeed onGestureDetected={handleGestureDetected} />
          </div>

          <div className="card">
            <h2 className="section-title">Gestures</h2>
            <div className="gesture-grid">
              {['Fist', 'Palm', 'Point', 'Peace', 'Thumbs Up', 'Thumbs Down'].map(gesture => (
                <button key={gesture} className="btn gesture-btn">
                  <span className="gesture-icon">✋</span>
                  <span className="gesture-label">{gesture}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Active Mappings - {controlMode === 'presentation' ? 'Presentation Mode' : 'Light Control Mode'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {controlMode === 'presentation' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Swipe Right</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Next Slide</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Swipe Left</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Previous Slide</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Thumbs Up</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Start Presentation (F5)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Palm</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">End Presentation (Esc)</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Thumbs Up</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Turn Lights ON</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Thumbs Down</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Turn Lights OFF</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Swipe Up</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Brighten (+20%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Swipe Down</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Dim (-20%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Peace</span>
                  <span style={{ flex: 1, borderBottom: '1px solid var(--border)' }}></span>
                  <span className="text-muted">Cycle Colors</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Connected Devices</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.5rem', color: '#00ff00' }}>●</span>
              <span>Local Computer (Keyboard)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.5rem', color: '#00ff00' }}>●</span>
              <span>Govee Smart LED Bulb (H6004)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
