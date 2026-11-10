const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const { createStore } = require('./store');

let win = null;
let store = null;
let updater = null;
let manualCheck = false;

// Auto-update via GitHub Releases. Works for the installed (NSIS) build only,
// never for the portable .exe or when running with `npm start`.
function setupUpdater() {
  if (!app.isPackaged) return;
  try { updater = require('electron-updater').autoUpdater; } catch (e) { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('update-downloaded', (info) => {
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Restart and update', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'SC Loot Tracker ' + info.version + ' is ready to install.',
      detail: 'Your saved list is not affected. Choosing Later installs it the next time you close the app.'
    }).then((r) => { if (r.response === 0) updater.quitAndInstall(); }).catch(() => {});
  });
  updater.on('update-not-available', () => {
    if (manualCheck) dialog.showMessageBox(win, { type: 'info', message: 'You are on the latest version (' + app.getVersion() + ').' }).catch(() => {});
    manualCheck = false;
  });
  updater.on('error', (err) => {
    if (manualCheck) dialog.showMessageBox(win, { type: 'warning', message: 'Could not check for updates.', detail: String((err && err.message) || err).slice(0, 300) }).catch(() => {});
    manualCheck = false;
  });
  updater.checkForUpdates().catch(() => {});
}
function checkNow() {
  if (!updater) {
    dialog.showMessageBox(win, { type: 'info', message: 'Updates only work in the installed version.', detail: 'The portable file and development mode do not update themselves. Download the newest installer from the GitHub Releases page.' }).catch(() => {});
    return;
  }
  manualCheck = true;
  updater.checkForUpdates().catch(() => { manualCheck = false; });
}

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
      { role: 'windowMenu' },
      { label: 'Help', submenu: [{ label: 'Check for updates', click: checkNow }, { label: 'Version ' + app.getVersion(), enabled: false }] }
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
    setupUpdater();
  });

  app.on('window-all-closed', () => app.quit());
}
