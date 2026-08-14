import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

// Storage format: { [day: string]: { [appName: string]: seconds } }
type Store = Record<string, Record<string, number>>

const userDataDir = app.getPath('userData')
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true })

const storePath = path.join(userDataDir, 'usage.json')

function load(): Store {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
  } catch {
    return {}
  }
}

let store: Store = load()
let dirty = false

function persist() {
  if (!dirty) return
  fs.writeFileSync(storePath, JSON.stringify(store), 'utf-8')
  dirty = false
}

setInterval(persist, 10_000)
app.on('before-quit', persist)

export function addUsage(day: string, appName: string, seconds: number) {
  if (!store[day]) store[day] = {}
  store[day][appName] = (store[day][appName] ?? 0) + seconds
  dirty = true
}

export interface AppUsage {
  app_name: string
  seconds: number
}

export function getUsageForDay(day: string): AppUsage[] {
  const dayData = store[day] ?? {}
  return Object.entries(dayData)
    .map(([app_name, seconds]) => ({ app_name, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}

export interface DayAppUsage {
  day: string
  app_name: string
  seconds: number
}

export function getUsageSince(sinceDay: string): DayAppUsage[] {
  const rows: DayAppUsage[] = []
  for (const day of Object.keys(store).sort()) {
    if (day < sinceDay) continue
    for (const [app_name, seconds] of Object.entries(store[day])) {
      rows.push({ day, app_name, seconds })
    }
  }
  return rows
}

export function getTotalForDay(day: string): number {
  const dayData = store[day] ?? {}
  return Object.values(dayData).reduce((sum, s) => sum + s, 0)
}

// Limits: { [appName]: limitSeconds }
type LimitsStore = Record<string, number>

const limitsPath = path.join(userDataDir, 'limits.json')

function loadLimits(): LimitsStore {
  try {
    return JSON.parse(fs.readFileSync(limitsPath, 'utf-8'))
  } catch {
    return {}
  }
}

let limits: LimitsStore = loadLimits()

function persistLimits() {
  fs.writeFileSync(limitsPath, JSON.stringify(limits), 'utf-8')
}

export function getLimits(): LimitsStore {
  return limits
}

export function setLimit(appName: string, limitSeconds: number) {
  limits[appName] = limitSeconds
  persistLimits()
}

export function deleteLimit(appName: string) {
  delete limits[appName]
  persistLimits()
}
