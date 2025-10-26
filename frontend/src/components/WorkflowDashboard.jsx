import { useState, useEffect } from 'react'
import { workflowService } from '../services/workflowService'
import { useAuth } from '../contexts/AuthContext'
import socketClient from '../services/socketClient'
import './WorkflowDashboard.css'

const WorkflowDashboard = ({ onEditWorkflow, onCreateWorkflow, onWorkflowActivated, onWorkflowDeactivated }) => {
  const { user, signOut } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      const data = await workflowService.getWorkflows()
      setWorkflows(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async (workflowId) => {
    try {
      // Activate in database
      const workflow = await workflowService.activateWorkflow(workflowId)

      // Send workflow to server
      await socketClient.loadWorkflow(workflow.name, workflow.workflow_data)

      // Turn on camera
      if (onWorkflowActivated) {
        onWorkflowActivated()
      }

      // Notify Electron to show recording indicator
      if (window.electronAPI) {
        window.electronAPI.workflowStarted()
      }

      console.log('✅ Workflow loaded on server:', workflow.name)
      await loadWorkflows()
    } catch (err) {
      alert('Failed to activate workflow: ' + err.message)
    }
  }

  const handleStop = async (workflowId) => {
    try {
      // Deactivate in database
      await workflowService.deactivateWorkflow(workflowId)

      // Unload workflow from server
      await socketClient.unloadWorkflow()

      // Turn off camera
      if (onWorkflowDeactivated) {
        onWorkflowDeactivated()
      }

      // Notify Electron to restore main window
      if (window.electronAPI) {
        window.electronAPI.workflowStopped()
      }

      console.log('✅ Workflow unloaded from server')
      await loadWorkflows()
    } catch (err) {
      alert('Failed to deactivate workflow: ' + err.message)
    }
  }

  const handleDelete = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      await workflowService.deleteWorkflow(workflowId)
      await loadWorkflows()
    } catch (err) {
      alert('Failed to delete workflow: ' + err.message)
    }
  }

  const getGestureCount = (workflow) => {
    return workflow.workflow_data?.nodes?.filter(n => n.type === 'input').length || 0
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return '1d ago'
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading workflows...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-left">
          <h1 className="nav-logo">GestureThing</h1>
          <span className="nav-divider"></span>
          <span className="nav-section-title">Workflows</span>
        </div>
        <div className="nav-right">
          <div className="user-menu">
            <div className="user-avatar">{user?.email?.charAt(0).toUpperCase()}</div>
            <span className="user-email-nav">{user?.email}</span>
            <button className="btn-text" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="content-header">
          <div>
            <h2 className="content-title">Workflows</h2>
            <p className="content-subtitle">Create and manage your gesture automation workflows</p>
          </div>
          <button className="btn-create" onClick={onCreateWorkflow}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Create Workflow
          </button>
        </div>

        {error && (
          <div className="alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
            </svg>
            {error}
          </div>
        )}

        {workflows.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="16" width="16" height="16" rx="4" fill="#E5E7EB"/>
                <rect x="40" y="16" width="16" height="16" rx="4" fill="#E5E7EB"/>
                <rect x="24" y="32" width="16" height="16" rx="4" fill="#E5E7EB"/>
                <path d="M24 24H16M40 24H32M32 32V24" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="empty-title">No workflows yet</h3>
            <p className="empty-description">Get started by creating your first gesture-controlled automation workflow</p>
            <button className="btn-create" onClick={onCreateWorkflow}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Create Your First Workflow
            </button>
          </div>
        ) : (
          <div className="workflows-grid-modern">
            {workflows.map((workflow) => (
              <div key={workflow.id} className={`workflow-card-modern ${workflow.active ? 'active' : ''}`}>
                <div className="card-content">
                  <div className="card-top">
                    <div className="card-header-modern">
                      <h3 className="card-title">{workflow.name}</h3>
                      {workflow.active && (
                        <span className="status-badge active">
                          <span className="status-dot"></span>
                          Active
                        </span>
                      )}
                    </div>
                    {workflow.description && (
                      <p className="card-description">{workflow.description}</p>
                    )}
                  </div>

                  <div className="card-meta-modern">
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
                      </svg>
                      <span>{getGestureCount(workflow)} gestures</span>
                    </div>
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
                      </svg>
                      <span>{formatDate(workflow.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions-modern">
                  <button
                    className="btn-action secondary"
                    onClick={() => onEditWorkflow(workflow.id)}
                    title="Edit workflow"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-10 10a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 015 12.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.468-.325z"/>
                    </svg>
                    Edit
                  </button>

                  {workflow.active ? (
                    <button
                      className="btn-action warning"
                      onClick={() => handleStop(workflow.id)}
                      title="Stop workflow"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3.5h6A1.5 1.5 0 0112.5 5v6a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 11V5A1.5 1.5 0 015 3.5z"/>
                      </svg>
                      Stop
                    </button>
                  ) : (
                    <button
                      className="btn-action primary"
                      onClick={() => handleRun(workflow.id)}
                      title="Run workflow"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 010 1.393z"/>
                      </svg>
                      Run
                    </button>
                  )}

                  <button
                    className="btn-action danger"
                    onClick={() => handleDelete(workflow.id)}
                    title="Delete workflow"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default WorkflowDashboard
