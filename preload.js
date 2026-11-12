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
  // Game.log import
  logLatest: () => ipcRenderer.invoke('log:latest'),
  logFolder: () => ipcRenderer.invoke('log:folder'),
  // quick-add window
  quickAdd: (item) => ipcRenderer.invoke('quick:add', item),
  quickHide: () => ipcRenderer.send('quick:hide'),
  onQuickAdd: (cb) => ipcRenderer.on('quick:apply', (_e, item) => cb(item)),
  onQuickShown: (cb) => ipcRenderer.on('quick:shown', () => cb()),
  // scan decoder window
  scanHide: () => ipcRenderer.send('scan:hide'),
  scanPin: (on) => ipcRenderer.send('scan:pin', !!on),
  onScanShown: (cb) => ipcRenderer.on('scan:shown', () => cb()),
  // in-game overlay: used by the main window
  overlayToggle: () => ipcRenderer.invoke('overlay:toggle'),
  overlayState: () => ipcRenderer.invoke('overlay:state'),
  onOverlayUndo: (cb) => ipcRenderer.on('overlay:undo', (_e, tag) => cb(tag)),
  overlayUndoReply: (ok) => ipcRenderer.send('overlay:undo-reply', !!ok),
  onOverlayState: (cb) => ipcRenderer.on('overlay:state', (_e, on) => cb(!!on)),
  // in-game overlay: used by the overlay page
  ovCapture: (on) => ipcRenderer.send('ov:capture', !!on),
  ovFocus: (on) => ipcRenderer.invoke('ov:focus', !!on),
  ovCfg: () => ipcRenderer.invoke('ov:cfg'),
  ovBounds: (b) => ipcRenderer.send('ov:bounds', b),
  ovAdjust: (on) => ipcRenderer.send('ov:adjust', !!on),
  ovTab: (t) => ipcRenderer.send('ov:tab', t),
  ovUndo: (tag) => ipcRenderer.send('ov:undo', tag),
  onOvUndo: (cb) => ipcRenderer.on('ov:undo-result', (_e, ok) => cb(!!ok)),
  ovHide: () => ipcRenderer.send('ov:hide'),
  onOvShown: (cb) => ipcRenderer.on('ov:shown', (_e, tab) => cb(tab)),
  notifyCatalogue: () => ipcRenderer.send('cat:changed'),
  onCatalogueChanged: (cb) => ipcRenderer.on('cat:changed', () => cb())
});
