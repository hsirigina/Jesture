import { useState, useEffect, useCallback } from 'react'
import CameraFeed from './components/CameraFeed'
import MiniPanel from './components/MiniPanel'
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
  const [viewMode, setViewMode] = useState('full') // 'mini' or 'full'
  const [isMiniWindow, setIsMiniWindow] = useState(false)
  const [controlMode, setControlMode] = useState('presentation') // 'presentation' or 'light'
  const [cameraActive, setCameraActive] = useState(false) // Only run camera when workflow is active

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
    if (window.electronAPI) {
      window.electronAPI.onSetViewMode((mode) => {
        setViewMode(mode)
        if (mode === 'mini') {
          setIsMiniWindow(true)
        } else {
          setIsMiniWindow(false)
        }
      })
    }

    // Cleanup on unmount
    return () => {
      unsubscribeStatus()
      unsubscribeAction()
      socketClient.disconnect()
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

  const handleGestureDetected = useCallback((gestureName, confidence, position = null) => {
    setLastGesture({ name: gestureName, confidence, time: Date.now() })

    // Send gesture to server via Socket.IO with position data
    socketClient.sendGesture(gestureName, confidence, position)
  }, [])

  const handleModeChange = (newMode) => {
    setControlMode(newMode)
    socketClient.changeMode(newMode)
    console.log('Switched to', newMode, 'mode')
  }

  // Show loading state
  if (loading) {
    return <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  // Show auth if not logged in
  if (!user) {
    return <Auth />
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
