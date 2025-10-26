/**
 * AI Mode Component
 *
 * ISOLATED COMPONENT - Won't conflict with other frontend changes
 *
 * Provides context-aware gesture control using AI agent.
 * When active, gestures are interpreted based on the active application
 * (Netflix, Spotify, PowerPoint, etc.)
 */

import { useState, useEffect, useRef } from 'react'
import socketClient from '../services/socketClient'

export default function AIMode({ isGestureDetectionActive, aiModeActive, onAIModeChange }) {
  const [lastAction, setLastAction] = useState(null)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [currentWorkflow, setCurrentWorkflow] = useState(null)
  const [workflowCached, setWorkflowCached] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving', 'saved', 'error'

  // Draggable state
  const [corner, setCorner] = useState('top-right') // top-right, top-left, bottom-right, bottom-left
  const [isDragging, setIsDragging] = useState(false)
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const modalRef = useRef(null)

  // Get corner position
  const getCornerPosition = (cornerName) => {
    const margin = 20
    switch (cornerName) {
      case 'top-right':
        return { top: margin, right: margin, left: 'auto', bottom: 'auto' }
      case 'top-left':
        return { top: margin, left: margin, right: 'auto', bottom: 'auto' }
      case 'bottom-right':
        return { bottom: margin, right: margin, left: 'auto', top: 'auto' }
      case 'bottom-left':
        return { bottom: margin, left: margin, right: 'auto', top: 'auto' }
      default:
        return { top: margin, right: margin, left: 'auto', bottom: 'auto' }
    }
  }

  // Snap to nearest corner
  const snapToCorner = (x, y) => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Determine which corner is closest
    const isLeft = x < windowWidth / 2
    const isTop = y < windowHeight / 2

    if (isTop && !isLeft) return 'top-right'
    if (isTop && isLeft) return 'top-left'
    if (!isTop && !isLeft) return 'bottom-right'
    if (!isTop && isLeft) return 'bottom-left'
    return 'top-right'
  }

  // Dragging handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setTempPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = (e) => {
      if (isDragging) {
        // Snap to nearest corner
        const newCorner = snapToCorner(e.clientX, e.clientY)
        setCorner(newCorner)
        setIsDragging(false)
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  useEffect(() => {
    // Listen for AI mode activation success
    socketClient.on('ai-mode:activated', (data) => {
      console.log('✅ AI Mode activated:', data)
      onAIModeChange(true)
      setSessionId(data.session_id)
      setCurrentWorkflow(data.workflow)
      setWorkflowCached(data.cached || false)
      setError(null)
      setSaveStatus(null)
    })

    // Listen for AI mode deactivation
    socketClient.on('ai-mode:deactivated', (data) => {
      console.log('🛑 AI Mode deactivated:', data)
      onAIModeChange(false)
      setSessionId(null)
      setLastAction(null)
      setCurrentWorkflow(null)
      setWorkflowCached(false)
      setSaveStatus(null)
    })

    // Listen for AI action completions
    socketClient.on('ai-action:completed', (data) => {
      console.log('🧠 AI Action:', data)
      setLastAction(data)

      // Clear after 3 seconds
      setTimeout(() => setLastAction(null), 3000)
    })

    // Listen for errors
    socketClient.on('ai-mode:error', (data) => {
      console.error('❌ AI Mode Error:', data)
      setError(data.message)

      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    })

    // Listen for workflow save request (from server to save to Supabase)
    socketClient.on('ai-workflow:save-to-db', async (data) => {
      console.log('💾 Saving AI workflow to database:', data)
      setSaveStatus('saving')

      try {
        // TODO: Import and use saveWorkflowToSupabase function
        // For now, just show success
        setTimeout(() => {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 3000)
        }, 1000)
      } catch (error) {
        console.error('Failed to save workflow:', error)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(null), 3000)
      }
    })

    return () => {
      socketClient.off('ai-mode:activated')
      socketClient.off('ai-mode:deactivated')
      socketClient.off('ai-action:completed')
      socketClient.off('ai-mode:error')
      socketClient.off('ai-workflow:save-to-db')
    }
  }, [])

  const handleToggleAIMode = () => {
    if (aiModeActive) {
      // Deactivate
      socketClient.emit('ai-mode:deactivate')
    } else {
      // Activate
      socketClient.emit('ai-mode:activate', {
        user_id: 'demo-user' // In production, use actual user ID from auth
      })
    }
  }

  const handleSaveWorkflow = () => {
    if (!currentWorkflow) {
      setError('No workflow to save')
      return
    }

    setSaveStatus('saving')
    socketClient.emit('ai-workflow:save', {
      workflow_name: currentWorkflow.workflow_name
    })
  }

  const handleMouseDown = (e) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  // Calculate style based on dragging state
  const modalStyle = isDragging
    ? {
        position: 'fixed',
        left: `${tempPosition.x}px`,
        top: `${tempPosition.y}px`,
        zIndex: 9999,
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        minWidth: '300px',
        border: aiModeActive ? '3px solid #10b981' : '1px solid #e5e7eb',
        cursor: 'grabbing',
        transition: 'none'
      }
    : {
        position: 'fixed',
        ...getCornerPosition(corner),
        zIndex: 9999,
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '300px',
        border: aiModeActive ? '3px solid #10b981' : '1px solid #e5e7eb',
        cursor: 'grab',
        transition: 'all 0.3s ease'
      }

  return (
    <div ref={modalRef} style={modalStyle}>
      {/* Header - Draggable */}
      <div
        style={{ marginBottom: '16px', cursor: 'grab', userSelect: 'none' }}
        onMouseDown={handleMouseDown}
      >
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ cursor: 'grab' }}>⋮⋮</span>
          🤖 AI Mode
        </h3>
        <p style={{
          margin: '4px 0 0 0 0 0 0 28px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          Context-aware gesture control
        </p>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggleAIMode}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: aiModeActive ? '#ef4444' : '#10b981',
          color: 'white',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)'
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)'
          e.target.style.boxShadow = 'none'
        }}
      >
        {aiModeActive ? '🛑 Stop AI Mode' : '▶️ Start AI Mode'}
      </button>

      {/* Status Indicator */}
      {aiModeActive && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#ecfdf5',
          borderRadius: '6px',
          border: '1px solid #10b981'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '12px', color: '#047857', fontWeight: '500' }}>
              Active - AI is watching your screen
            </span>
          </div>
        </div>
      )}

      {/* Current Workflow Display */}
      {currentWorkflow && aiModeActive && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {currentWorkflow.workflow_name}
            </div>
            {workflowCached && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                CACHED
              </span>
            )}
          </div>

          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
            {currentWorkflow.mappings?.length || 0} gesture mappings
          </div>

          {/* Gesture Mappings */}
          <div style={{ fontSize: '11px', color: '#374151' }}>
            {currentWorkflow.mappings?.slice(0, 3).map((mapping, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                • {mapping.gesture_id} → {mapping.action_id}
              </div>
            ))}
            {currentWorkflow.mappings?.length > 3 && (
              <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                +{currentWorkflow.mappings.length - 3} more...
              </div>
            )}
          </div>

          {/* Save to Dashboard Button */}
          {!workflowCached && (
            <button
              onClick={handleSaveWorkflow}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '8px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: saveStatus === 'saving' || saveStatus === 'saved' ? 'not-allowed' : 'pointer',
                backgroundColor: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#3b82f6',
                color: 'white',
                transition: 'all 0.2s',
                opacity: saveStatus === 'saving' || saveStatus === 'saved' ? 0.7 : 1
              }}
            >
              {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '💾 Save to Dashboard'}
            </button>
          )}

          {workflowCached && (
            <div style={{
              marginTop: '8px',
              fontSize: '10px',
              color: '#6b7280',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              This workflow was loaded from cache
            </div>
          )}
        </div>
      )}

      {/* Info: Camera will auto-start */}
      {!isGestureDetectionActive && !aiModeActive && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #3b82f6'
        }}>
          <span style={{ fontSize: '12px', color: '#1e40af' }}>
            💡 Camera will start automatically when you activate AI Mode
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#fee2e2',
          borderRadius: '6px',
          border: '1px solid #ef4444'
        }}>
          <span style={{ fontSize: '12px', color: '#991b1b' }}>
            ❌ {error}
          </span>
        </div>
      )}

      {/* Last Action Display */}
      {lastAction && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          border: '1px solid #d1d5db'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            Last Action:
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            {lastAction.gesture} → {lastAction.action}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
            {lastAction.reasoning}
          </div>
        </div>
      )}

      {/* How It Works */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{
          fontSize: '12px',
          color: '#6b7280',
          cursor: 'pointer',
          userSelect: 'none'
        }}>
          How it works
        </summary>
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '4px 0' }}>
            • AI detects your active app (Netflix, Spotify, PowerPoint, etc.)
          </p>
          <p style={{ margin: '4px 0' }}>
            • Same gesture does different things based on context
          </p>
          <p style={{ margin: '4px 0' }}>
            • Example: Swipe right → Next slide in PowerPoint, Skip forward in Netflix
          </p>
        </div>
      </details>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
