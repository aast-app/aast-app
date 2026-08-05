const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  uploadBaseData: () => ipcRenderer.invoke('upload-base-data')
})
