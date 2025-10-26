import './ControlBar.css'

const ControlBar = ({ onStop, onOpenApp }) => {
  const handleStop = () => {
    if (onStop) {
      onStop()
    }
    if (window.electronAPI) {
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

  return (
    <div className="gesture-control-bar">
      <button className="toolbar-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 17l-5 5-3.5-3.5 1.5-1.5 2 2 3.5-3.5 1.5 1.5zM12 3c-4.97 0-9 4.03-9 9H0l4 4 4-4H5c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C7.27 19.99 9.51 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
        </svg>
        <span>Gestures</span>
      </button>

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
        <span className="status-time">00:00</span>
      </div>

      <div className="toolbar-separator"></div>

      <button className="toolbar-btn-red" onClick={handleStop}>
        Stop Workflow
      </button>

      <button className="toolbar-btn icon-only">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  )
}

export default ControlBar
