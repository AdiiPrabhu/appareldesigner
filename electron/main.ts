import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as http from 'http'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8765', 10)
const isWin = process.platform === 'win32'
const isMac = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendReady = false

// ─── Python path resolution (cross-platform) ────────────────────────────────
// Windows venvs put executables in Scripts/, Unix puts them in bin/
function getPythonPath(): string {
  const venvBin = isWin ? 'Scripts' : 'bin'
  const pythonExe = isWin ? 'python.exe' : 'python3'
  const fallback = isWin ? 'python' : 'python3'

  if (app.isPackaged) {
    const bundledPython = join(process.resourcesPath, 'backend', 'venv', venvBin, pythonExe)
    if (fs.existsSync(bundledPython)) return bundledPython
    return fallback
  }

  // Dev: look for a local venv two levels above the compiled electron dir
  const devVenv = join(__dirname, '..', '..', 'backend', 'venv', venvBin, pythonExe)
  if (fs.existsSync(devVenv)) return devVenv

  return fallback
}

function getBackendPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'backend', 'main.py')
  }
  return join(__dirname, '..', '..', 'backend', 'main.py')
}

// ─── Backend subprocess ───────────────────────────────────────────────────────
function startBackend(): void {
  const pythonPath = getPythonPath()
  const backendPath = getBackendPath()
  const backendDir = join(backendPath, '..')

  console.log(`[Main] Starting backend: ${pythonPath} ${backendPath}`)

  backendProcess = spawn(pythonPath, [backendPath], {
    cwd: backendDir,
    env: {
      ...process.env,
      BACKEND_PORT: String(BACKEND_PORT),
      PYTHONUNBUFFERED: '1',
    },
    // On Windows use 'pipe'; on Unix we can also use 'pipe'
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const isReadyLine = (text: string) =>
    text.includes('Application startup complete') || text.includes('Uvicorn running')

  backendProcess.stdout?.on('data', (data: Buffer) => {
    const text = data.toString()
    process.stdout.write(`[Backend] ${text}`)
    if (isReadyLine(text)) signalBackendReady()
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString()
    // uvicorn writes startup info to stderr
    process.stderr.write(`[Backend] ${text}`)
    if (isReadyLine(text)) signalBackendReady()
  })

  backendProcess.on('close', (code) => {
    console.log(`[Main] Backend exited with code ${code}`)
    backendReady = false
    backendProcess = null
  })

  backendProcess.on('error', (err) => {
    console.error('[Main] Failed to start backend process:', err.message)
    mainWindow?.webContents.send('backend-error', err.message)
  })
}

function signalBackendReady(): void {
  if (!backendReady) {
    backendReady = true
    console.log('[Main] Backend is ready')
    mainWindow?.webContents.send('backend-ready')
  }
}

// ─── Health-check polling (backup detection if stdout message is missed) ─────
function pollBackendReady(retries = 40): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const check = () => {
      attempts++
      const req = http.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          signalBackendReady()
          resolve()
        } else {
          scheduleRetry()
        }
      })
      req.on('error', scheduleRetry)
      req.setTimeout(2000, () => req.destroy())

      function scheduleRetry() {
        if (attempts < retries) {
          setTimeout(check, 1000)
        } else {
          reject(new Error('Backend did not respond after 40 seconds'))
        }
      }
    }

    // Give the process 2 s to start before the first check
    setTimeout(check, 2000)
  })
}

// ─── BrowserWindow creation (platform-aware title bar) ───────────────────────
function createMainWindow(): void {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0f13',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: !isDev,
    },
  }

  if (isWin) {
    // Windows: hide the default frame, keep the native overlay buttons
    windowOptions.titleBarStyle = 'hidden'
    windowOptions.titleBarOverlay = {
      color: '#1a1a24',
      symbolColor: '#e8e8f0',
      height: 32,
    }
  } else if (isMac) {
    // macOS: inset style keeps the traffic-light buttons inside the window chrome
    windowOptions.titleBarStyle = 'hiddenInset'
    windowOptions.trafficLightPosition = { x: 12, y: 12 }
  } else {
    // Linux: use the default system title bar; custom frame causes issues
    // on many desktop environments (GNOME, KDE, etc.)
    windowOptions.titleBarStyle = 'default'
  }

  mainWindow = new BrowserWindow(windowOptions)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) mainWindow?.webContents.openDevTools()
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Open external links in the OS default browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // out/main/index.js → __dirname = out/main/
    // ../renderer/ resolves to out/renderer/
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async (_event, options) => {
  return dialog.showOpenDialog(mainWindow!, {
    properties: options?.multiSelect ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options?.filters || [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  })
})

ipcMain.handle('save-file-dialog', async (_event, options) => {
  return dialog.showSaveDialog(mainWindow!, {
    defaultPath: options?.defaultPath,
    filters: options?.filters || [{ name: 'PNG Image', extensions: ['png'] }],
  })
})

ipcMain.handle('open-folder-dialog', async () => {
  return dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
})

ipcMain.handle('get-app-path', async (_event, name: string) => {
  const paths: Record<string, string> = {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    pictures: app.getPath('pictures'),
    home: app.getPath('home'),
    temp: app.getPath('temp'),
    exe: app.getPath('exe'),
    appData: app.getPath('appData'),
  }
  return paths[name] ?? ''
})

ipcMain.handle('get-platform', () => process.platform)

ipcMain.handle('backend-status', () => ({ ready: backendReady, port: BACKEND_PORT }))

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend()
  createMainWindow()

  try {
    await pollBackendReady()
  } catch (err) {
    console.error('[Main] Backend startup timeout:', err)
    mainWindow?.webContents.send('backend-error', 'Backend failed to start. Check that Python is installed.')
  }

  // macOS: re-create the window when the dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  // On macOS apps conventionally stay open until the user explicitly quits
  if (!isMac) app.quit()
})

// Graceful shutdown: give the backend time to flush before SIGKILL
app.on('before-quit', () => {
  if (backendProcess) {
    console.log('[Main] Sending SIGTERM to backend...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
})

app.on('will-quit', () => {
  // Last-chance cleanup if SIGTERM was ignored
  if (backendProcess) backendProcess.kill('SIGKILL')
})
