const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')

let mainWindow
let miniWindow
let tray
let isQuitting = false
let currentMode = 'full'

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    transparent: false,
    frame: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    }
  })

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`
  mainWindow.loadURL(startUrl)

  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMiniWindow() {
  miniWindow = new BrowserWindow({
    width: 200,
    height: 150,
    transparent: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    hasShadow: true,
    type: 'panel', // Makes it a utility panel that floats above everything
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    }
  })

  // Force it to be at the highest level
  miniWindow.setAlwaysOnTop(true, 'floating', 1)

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`
  miniWindow.loadURL(startUrl)

  miniWindow.webContents.once('did-finish-load', () => {
    miniWindow.webContents.send('set-view-mode', 'mini')
  })

  miniWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      miniWindow.hide()
    }
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })
}

function createTray() {
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVDiNpdM9S8NAGMDx/5VcirgILgoOTk5+AQcHJ0EQnBz8CA5OfoLi4uYHcHJycBBEEQdBHBwUxEVwUBQRQVDwBSSQNJc8DklMmqYX+MPBPdz9uDu4l3+JiPAf0/+NSCkREZRSiAg557TWGhEhpYSIoJRCRNBao7VGKYVSCq01IkLOOYuIEHNGRFBK/RLlnBERUkq/hDnnX0LO+ZdQzvmXUGt9J9Raf4ly1lp/CZVSt0KlFCJyJRQRRIScMzlncs6ICFrrK6HWGhH5FoZhSBzHhGFIHMcEQUAQBPi+j+/7+L6P7/v4vo/v+3ieh+d5eJ5HEARUq1Wq1SpxHBNFEVEU0Wg0aDQaNBoNms0mzWaTVqtFq9X6AeEfZl1v8gAAAABJRU5ErkJggg==')
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('MrGesture')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Panel',
      click: () => {
        if (!miniWindow) createMiniWindow()
        if (mainWindow) mainWindow.hide()
        miniWindow.show()
        currentMode = 'mini'
      }
    },
    {
      label: 'Show Full Window',
      click: () => {
        if (!mainWindow) createMainWindow()
        if (miniWindow) miniWindow.hide()
        mainWindow.show()
        currentMode = 'full'
      }
    },
    { type: 'separator' },
    {
      label: 'Active',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (currentMode === 'mini' && miniWindow) {
      if (miniWindow.isVisible()) {
        miniWindow.hide()
      } else {
        miniWindow.show()
      }
    } else if (currentMode === 'full' && mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    }
  })
}

ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide()
  if (miniWindow) miniWindow.hide()
})

ipcMain.on('set-view-mode', (event, mode) => {
  if (mode === 'mini') {
    if (!miniWindow) createMiniWindow()
    if (mainWindow) mainWindow.hide()
    miniWindow.show()
    currentMode = 'mini'
  } else if (mode === 'full') {
    if (!mainWindow) createMainWindow()
    if (miniWindow) miniWindow.hide()
    mainWindow.show()
    currentMode = 'full'
  }
})

app.on('ready', () => {
  createMainWindow()
  createTray()

  setTimeout(() => {
    if (mainWindow) {
      mainWindow.show()
    }
  }, 500)
})

app.on('window-all-closed', () => {
  // Don't quit
})

app.on('activate', () => {
  if (!mainWindow && !miniWindow) {
    createMainWindow()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})
