import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage, Notification } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addUsage,
  getUsageForDay,
  getUsageSince,
  getTotalForDay,
  getLimits,
  setLimit,
  deleteLimit,
  getCategories,
  setCategory,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const POLL_INTERVAL_MS = 2000
const IDLE_THRESHOLD_SECONDS = 60

let win: BrowserWindow | null = null
let tray: Tray | null = null
let pollTimer: NodeJS.Timeout | null = null

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// tracks which (day, appName) pairs already triggered a limit notification
const notifiedLimits = new Set<string>()

function checkLimit(day: string, appName: string) {
  const limitSeconds = getLimits()[appName]
  if (!limitSeconds) return

  const total = getUsageForDay(day).find((u) => u.app_name === appName)?.seconds ?? 0
  if (total < limitSeconds) return

  const key = `${day}::${appName}`
  if (notifiedLimits.has(key)) return
  notifiedLimits.add(key)

  new Notification({
    title: 'Limite de tempo atingido',
    body: `Você já passou do limite diário em ${appName}.`,
  }).show()
}

async function pollActiveWindow() {
  try {
    const idleSeconds = powerMonitor.getSystemIdleTime()
    if (idleSeconds >= IDLE_THRESHOLD_SECONDS) return

    const activeWindow = (await import('active-win')).default
    const result = await activeWindow()
    if (!result) return

    const appName = result.owner?.name ?? 'Unknown'
    const day = todayKey()
    addUsage(day, appName, POLL_INTERVAL_MS / 1000)
    checkLimit(day, appName)
  } catch (err) {
    console.error('[tracker] poll failed:', err)
  }
}

function startTracking() {
  if (pollTimer) return
  pollTimer = setInterval(pollActiveWindow, POLL_INTERVAL_MS)
}

function stopTracking() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 700,
    minHeight: 500,
    title: 'OpenScreenTime',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      win?.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('OpenScreenTime')
  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir dashboard',
      click: () => {
        win?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        ;(app as any).isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => win?.show())
}

ipcMain.handle('usage:today', () => {
  const day = todayKey()
  return { day, apps: getUsageForDay(day), total: getTotalForDay(day) }
})

ipcMain.handle('usage:range', (_e, days: number) => {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceKey = since.toISOString().slice(0, 10)
  return getUsageSince(sinceKey)
})

ipcMain.handle('limits:get', () => getLimits())

ipcMain.handle('limits:set', (_e, appName: string, limitSeconds: number) => {
  setLimit(appName, limitSeconds)
})

ipcMain.handle('limits:delete', (_e, appName: string) => {
  deleteLimit(appName)
})

ipcMain.handle('categories:get', () => getCategories())

ipcMain.handle('categories:set', (_e, appName: string, category: string) => {
  setCategory(appName, category)
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  startTracking()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else win?.show()
  })
})

app.on('before-quit', () => {
  ;(app as any).isQuitting = true
  stopTracking()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // keep running in tray instead of quitting
  }
})
