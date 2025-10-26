const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  hideWindow: () => ipcRenderer.send('hide-window'),
  setViewMode: (mode) => ipcRenderer.send('set-view-mode', mode),
  onSetViewMode: (callback) => {
    const listener = (event, mode) => {
      console.log('🎧 Preload listener received set-view-mode:', mode)
      callback(mode)
    }
    ipcRenderer.on('set-view-mode', listener)
    // Return cleanup function
    return () => ipcRenderer.removeListener('set-view-mode', listener)
  },
  workflowStarted: () => ipcRenderer.send('workflow:started'),
  workflowStopped: () => ipcRenderer.send('workflow:stopped'),
  indicatorClicked: () => ipcRenderer.send('indicator:clicked')
})
