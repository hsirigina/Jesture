import { useState, useEffect } from 'react'
import socketClient from '../services/socketClient'
import './MiniPanel.css'

const MiniPanel = ({ onShowFull, onClose }) => {
  const [lastGesture, setLastGesture] = useState('None')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Listen for connection status
    const unsubscribeStatus = socketClient.on('connection:status', (data) => {
      setIsConnected(data.connected)
    })

    // Listen for gesture detection
    const unsubscribeGesture = socketClient.on('gesture:detected', (data) => {
      setLastGesture(data.gesture)
    })

    // Check initial connection
    setIsConnected(socketClient.connected)

    return () => {
      unsubscribeStatus()
      unsubscribeGesture()
    }
  }, [])

  return (
    <div className="mini-panel">
      <div className="mini-panel-header">
        <span className="mini-panel-title">MrGesture</span>
        <button className="mini-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="mini-panel-body">
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Active' : 'Disconnected'}
          </span>
        </div>

        <div className="gesture-row">
          <span className="gesture-label">Last:</span>
          <span className="gesture-value">{lastGesture}</span>
        </div>

        <button className="show-full-btn" onClick={() => {
          onShowFull()
          if (window.electronAPI) {
            window.electronAPI.setViewMode('full')
          }
        }}>
          Show Full
        </button>
      </div>
    </div>
  )
}

export default MiniPanel
