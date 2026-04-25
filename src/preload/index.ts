import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from '../renderer/src/types/api'

// Custom APIs for renderer
const api: AppApi = {
  journal: {
    listByDate: (date) => electronAPI.ipcRenderer.invoke('journal:listByDate', date),
    createEntry: (date) => electronAPI.ipcRenderer.invoke('journal:createEntry', date),
    getEntry: (id, password) => electronAPI.ipcRenderer.invoke('journal:getEntry', id, password),
    saveEntry: (input) => electronAPI.ipcRenderer.invoke('journal:saveEntry', input),
    deleteEntry: (id) => electronAPI.ipcRenderer.invoke('journal:deleteEntry', id),
    lockEntry: (id) => electronAPI.ipcRenderer.invoke('journal:lockEntry', id),
    search: (query) => electronAPI.ipcRenderer.invoke('journal:search', query)
  },
  settings: {
    get: () => electronAPI.ipcRenderer.invoke('settings:get'),
    save: (settings) => electronAPI.ipcRenderer.invoke('settings:save', settings)
  },
  themes: {
    list: () => electronAPI.ipcRenderer.invoke('themes:list'),
    save: (theme) => electronAPI.ipcRenderer.invoke('themes:save', theme),
    delete: (id) => electronAPI.ipcRenderer.invoke('themes:delete', id)
  },
  security: {
    getGlobalState: () => electronAPI.ipcRenderer.invoke('security:getGlobalState'),
    setGlobalPassword: (password) =>
      electronAPI.ipcRenderer.invoke('security:setGlobalPassword', password),
    unlockGlobal: (password) => electronAPI.ipcRenderer.invoke('security:unlockGlobal', password),
    disableGlobal: () => electronAPI.ipcRenderer.invoke('security:disableGlobal'),
    lockGlobal: () => electronAPI.ipcRenderer.invoke('security:lockGlobal')
  },
  file: {
    exportEntry: (input) => electronAPI.ipcRenderer.invoke('file:exportEntry', input),
    importMarkdown: (targetDate) => electronAPI.ipcRenderer.invoke('file:importMarkdown', targetDate),
    createBackup: () => electronAPI.ipcRenderer.invoke('file:createBackup')
  },
  system: {
    listFonts: () => electronAPI.ipcRenderer.invoke('system:listFonts')
  },
  llm: {
    ask: (input) => electronAPI.ipcRenderer.invoke('llm:ask', input)
  },
  appMeta: {
    getInfo: () => electronAPI.ipcRenderer.invoke('app:getInfo')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
