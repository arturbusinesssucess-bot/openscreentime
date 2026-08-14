import { contextBridge, ipcRenderer } from 'electron'

export interface AppUsage {
  app_name: string
  seconds: number
}

export interface DayAppUsage {
  day: string
  app_name: string
  seconds: number
}

export interface TodayUsage {
  day: string
  apps: AppUsage[]
  total: number
}

const api = {
  getToday: (): Promise<TodayUsage> => ipcRenderer.invoke('usage:today'),
  getRange: (days: number): Promise<DayAppUsage[]> => ipcRenderer.invoke('usage:range', days),
}

contextBridge.exposeInMainWorld('openScreenTime', api)

export type OpenScreenTimeApi = typeof api
