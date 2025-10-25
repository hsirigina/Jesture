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
      <header className="dashboard-header">
        <div>
          <h1>My Workflows</h1>
          <p className="user-email">{user?.email}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onCreateWorkflow}>
            + New Workflow
          </button>
          <button className="btn btn-secondary" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {workflows.length === 0 ? (
        <div className="empty-state">
          <h2>No workflows yet</h2>
          <p>Create your first gesture-controlled workflow to get started</p>
          <button className="btn btn-primary" onClick={onCreateWorkflow}>
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="workflows-grid">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="workflow-card">
              <div className="workflow-header">
                <h3>{workflow.name}</h3>
                {workflow.active && <span className="active-badge">ACTIVE</span>}
              </div>

              {workflow.description && (
                <p className="workflow-description">{workflow.description}</p>
              )}

              <div className="workflow-meta">
                <span>{getGestureCount(workflow)} gestures</span>
                <span>•</span>
                <span>Modified {formatDate(workflow.updated_at)}</span>
              </div>

              <div className="workflow-actions">
                <button
                  className="btn btn-sm"
                  onClick={() => onEditWorkflow(workflow.id)}
                >
                  Edit
                </button>
                {workflow.active ? (
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => handleStop(workflow.id)}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleRun(workflow.id)}
                  >
                    Run
                  </button>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(workflow.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkflowDashboard
