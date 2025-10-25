const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  hideWindow: () => ipcRenderer.send('hide-window'),
  setViewMode: (mode) => ipcRenderer.send('set-view-mode', mode),
  onSetViewMode: (callback) => {
    ipcRenderer.on('set-view-mode', (event, mode) => callback(mode))
  }
})
