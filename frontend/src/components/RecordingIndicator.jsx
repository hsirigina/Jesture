import './RecordingIndicator.css'

const RecordingIndicator = ({ onStop }) => {
  const handleStop = () => {
    if (onStop) {
      onStop()
    }
    if (window.electronAPI) {
      window.electronAPI.workflowStopped()
    }
  }

  const handleOpenApp = () => {
    if (window.electronAPI) {
      window.electronAPI.indicatorClicked()
    }
  }

  return (
    <div className="gesture-control-bar">
      <button className="toolbar-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Gestures</span>
      </button>

      <button className="toolbar-btn" onClick={handleOpenApp}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
        </svg>
        <span>Dashboard</span>
      </button>

      <div className="toolbar-separator"></div>

      <div className="status-indicator">
        <div className="status-dot pulsing"></div>
        <span className="status-label">Recording Active</span>
        <span className="status-time">00:00</span>
      </div>

      <div className="toolbar-separator"></div>

      <button className="toolbar-btn-red" onClick={handleStop}>
        Stop Workflow
      </button>

      <button className="toolbar-btn icon-only">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  )
}

export default RecordingIndicator
