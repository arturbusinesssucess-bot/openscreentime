import type { OpenScreenTimeApi } from '../electron/preload'

declare global {
  interface Window {
    openScreenTime: OpenScreenTimeApi
  }
}

export {}
