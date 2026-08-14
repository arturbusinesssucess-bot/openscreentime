import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage, Notification, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
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

const ICON_PATH = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public', 'icon.png')
  : path.join(RENDERER_DIST, 'icon.png')

let win: BrowserWindow | null = null
let tray: Tray | null = null
let pollTimer: NodeJS.Timeout | null = null

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '<1m'
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
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
    updateTrayTooltip(day)
  } catch (err) {
    console.error('[tracker] poll failed:', err)
  }
}

function updateTrayTooltip(day: string) {
  if (!tray) return
  tray.setToolTip(`OpenScreenTime — hoje: ${formatDuration(getTotalForDay(day))}`)
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
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
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
  const icon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
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

ipcMain.handle('usage:all', () => getUsageSince('1970-01-01'))

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

ipcMain.handle('export:data', async (_e, format: 'csv' | 'json') => {
  if (!win) return null

  const rows = getUsageSince('1970-01-01')
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar dados',
    defaultPath: `openscreentime-export.${format}`,
    filters:
      format === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return null

  if (format === 'json') {
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8')
  } else {
    const header = 'day,app_name,seconds'
    const lines = rows.map((r) => `${r.day},"${r.app_name.replace(/"/g, '""')}",${r.seconds}`)
    fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8')
  }

  return filePath
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  updateTrayTooltip(todayKey())
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
