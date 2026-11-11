const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scStore', {
  // Synchronous on purpose: the page reads its saved data once at startup, and writes are small.
  loadSync: () => ipcRenderer.sendSync('store:load'),
  save: (data) => ipcRenderer.sendSync('store:save', data) === true,
  snapshot: (label) => ipcRenderer.sendSync('store:snapshot', label) === true,
  listBackups: () => ipcRenderer.invoke('store:backups'),
  restoreBackup: (name) => ipcRenderer.invoke('store:restore', name),
  loadCatalogue: () => ipcRenderer.invoke('cat:load'),
  saveCatalogue: (cat) => ipcRenderer.invoke('cat:save', cat),
  loadBlob: (name) => ipcRenderer.invoke('blob:load', name),
  saveBlob: (name, obj) => ipcRenderer.invoke('blob:save', name, obj),
  dataPath: () => ipcRenderer.invoke('store:path'),
  version: () => ipcRenderer.invoke('app:version'),
  openFolder: () => ipcRenderer.invoke('store:open'),
  saveFile: (name, text) => ipcRenderer.invoke('file:save', name, text),
  // quick-add window
  quickAdd: (item) => ipcRenderer.invoke('quick:add', item),
  quickHide: () => ipcRenderer.send('quick:hide'),
  onQuickAdd: (cb) => ipcRenderer.on('quick:apply', (_e, item) => cb(item)),
  onQuickShown: (cb) => ipcRenderer.on('quick:shown', () => cb()),
  // scan decoder window
  scanHide: () => ipcRenderer.send('scan:hide'),
  scanPin: (on) => ipcRenderer.send('scan:pin', !!on),
  onScanShown: (cb) => ipcRenderer.on('scan:shown', () => cb()),
  notifyCatalogue: () => ipcRenderer.send('cat:changed'),
  onCatalogueChanged: (cb) => ipcRenderer.on('cat:changed', () => cb())
});
