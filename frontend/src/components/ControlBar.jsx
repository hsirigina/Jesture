import { useState, useEffect } from 'react'
import './ControlBar.css'

const ControlBar = ({ onStop, onOpenApp }) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleStop = () => {
    console.log('🔴 Stop button clicked in ControlBar')
    if (onStop) {
      console.log('📞 Calling onStop callback')
      onStop()
    } else {
      console.log('⚠️ No onStop callback provided')
    }
    if (window.electronAPI) {
      console.log('📡 Sending workflowStopped to Electron')
      window.electronAPI.workflowStopped()
    }
  }

  const handleOpenApp = () => {
    if (onOpenApp) {
      onOpenApp()
    }
    if (window.electronAPI) {
      window.electronAPI.indicatorClicked()
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  if (!isExpanded) {
    return (
      <div className="gesture-control-bar minimized" onClick={toggleExpanded}>
        <div className="minimized-content">
          <div className="status-dot pulsing"></div>
          <span className="minimized-text">Click to open control bar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="gesture-control-bar expanded">
      <button className="toolbar-btn" onClick={handleOpenApp}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
        </svg>
        <span>Dashboard</span>
      </button>

      <div className="toolbar-separator"></div>

      <div className="status-indicator">
        <div className="status-dot pulsing"></div>
        <span className="status-label">Recording Active</span>
        <span className="status-time">{formatTime(elapsedTime)}</span>
      </div>

      <div className="toolbar-separator"></div>

      <button className="toolbar-btn-red" onClick={handleStop}>
        Stop Workflow
      </button>

      <button className="toolbar-btn icon-only" onClick={toggleExpanded}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14l5-5 5 5H7z"/>
        </svg>
      </button>
    </div>
  )
}

export default ControlBar
