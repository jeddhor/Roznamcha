import { ElectronAPI } from '@electron-toolkit/preload'
import { AppApi } from '../renderer/src/types/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
