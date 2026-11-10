const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scStore', {
  // Synchronous on purpose: the page reads its saved data once at startup, and writes are small.
  loadSync: () => ipcRenderer.sendSync('store:load'),
  save: (data) => ipcRenderer.sendSync('store:save', data) === true,
  loadCatalogue: () => ipcRenderer.invoke('cat:load'),
  saveCatalogue: (cat) => ipcRenderer.invoke('cat:save', cat),
  dataPath: () => ipcRenderer.invoke('store:path'),
  openFolder: () => ipcRenderer.invoke('store:open')
});
