const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const { createStore } = require('./store');

let win = null;
let store = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    store = createStore(app.getPath('userData'));

    ipcMain.on('store:load', (e) => {
      try { e.returnValue = store.load(); } catch (err) { e.returnValue = { items: [], known: [], restoredFrom: null }; }
    });
    ipcMain.on('store:save', (e, data) => {
      try { e.returnValue = store.save(data); } catch (err) { e.returnValue = false; }
    });
    ipcMain.handle('cat:load', () => { try { return store.loadCatalogue(); } catch (err) { return null; } });
    ipcMain.handle('cat:save', (e, cat) => { try { return store.saveCatalogue(cat); } catch (err) { return false; } });
    ipcMain.handle('store:path', () => store.paths.dir);
    ipcMain.handle('store:open', () => shell.openPath(store.paths.dir));

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' }
    ]));

    win = new BrowserWindow({
      width: 1180,
      height: 860,
      minWidth: 420,
      minHeight: 520,
      backgroundColor: '#060a07',
      title: 'SC Loot Tracker',
      icon: path.join(__dirname, 'build', 'icon.png'),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // Only the bundled page may load in this window; anything else opens in the normal browser.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); }
    });

    win.loadFile(path.join(__dirname, 'app', 'index.html'));
    win.on('closed', () => { win = null; });
  });

  app.on('window-all-closed', () => app.quit());
}
