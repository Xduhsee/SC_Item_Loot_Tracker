const { app, BrowserWindow, ipcMain, shell, Menu, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { createStore } = require('./store');

const HOTKEY = 'CommandOrControl+Shift+L';

let win = null;
let quick = null;
let store = null;
let updater = null;
let manualCheck = false;
let quitting = false;

// IPC calls are only trusted when they come from our own bundled pages.
function fromApp(e) {
  try { return !!(e.senderFrame && String(e.senderFrame.url).startsWith('file://')); } catch (err) { return false; }
}

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

function hardenWindow(w) {
  // Only the bundled pages may load in a window; anything else opens in the normal browser.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); }
  });
}

function webPrefs() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  };
}

// Small always-on-top window for logging loot without leaving the game.
// It is a normal separate window: it never touches the game process, and it only
// shows over the game in borderless-windowed mode (not exclusive fullscreen).
function createQuick() {
  quick = new BrowserWindow({
    width: 480,
    height: 380,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'Quick add',
    backgroundColor: '#060a07',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: webPrefs()
  });
  quick.setMenu(null);
  quick.setAlwaysOnTop(true, 'screen-saver');
  hardenWindow(quick);
  quick.on('close', (e) => { if (!quitting) { e.preventDefault(); quick.hide(); } });
  quick.on('closed', () => { quick = null; });
  return quick.loadFile(path.join(__dirname, 'app', 'quick.html'));
}
function toggleQuick() {
  if (quick && !quick.isDestroyed() && quick.isVisible()) { quick.hide(); return; }
  const show = () => { quick.show(); quick.focus(); quick.webContents.send('quick:shown'); };
  if (!quick || quick.isDestroyed()) createQuick().then(show).catch(() => {});
  else show();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (e) {} });

  app.whenReady().then(() => {
    store = createStore(app.getPath('userData'));

    ipcMain.on('store:load', (e) => {
      try { e.returnValue = fromApp(e) ? store.load() : { items: [], known: [], extra: {}, restoredFrom: null }; }
      catch (err) { e.returnValue = { items: [], known: [], extra: {}, restoredFrom: null }; }
    });
    ipcMain.on('store:save', (e, data) => {
      try { e.returnValue = fromApp(e) ? store.save(data) : false; } catch (err) { e.returnValue = false; }
    });
    ipcMain.handle('cat:load', (e) => { try { return fromApp(e) ? store.loadCatalogue() : null; } catch (err) { return null; } });
    ipcMain.handle('cat:save', (e, cat) => { try { return fromApp(e) ? store.saveCatalogue(cat) : false; } catch (err) { return false; } });
    ipcMain.handle('blob:load', (e, name) => { try { return fromApp(e) ? store.loadBlob(String(name)) : null; } catch (err) { return null; } });
    ipcMain.handle('blob:save', (e, name, obj) => { try { return fromApp(e) ? store.saveBlob(String(name), obj) : false; } catch (err) { return false; } });
    ipcMain.handle('store:path', () => store.paths.dir);
    ipcMain.handle('app:version', () => app.getVersion());
    ipcMain.handle('store:open', (e) => (fromApp(e) ? shell.openPath(store.paths.dir) : ''));

    // Save a text file (CSV export) through a normal Save dialog.
    ipcMain.handle('file:save', async (e, name, text) => {
      try {
        if (!fromApp(e) || typeof text !== 'string' || text.length > 20e6) return { ok: false };
        let base = String(name || 'export.csv').replace(/[^\w.\- ]/g, '_').slice(0, 80);
        if (!/\.csv$/i.test(base)) base += '.csv';
        const r = await dialog.showSaveDialog(win, {
          defaultPath: path.join(app.getPath('documents'), base),
          filters: [{ name: 'CSV file', extensions: ['csv'] }]
        });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        fs.writeFileSync(r.filePath, '﻿' + text, 'utf8');
        return { ok: true, path: r.filePath };
      } catch (err) { return { ok: false, error: String((err && err.message) || err).slice(0, 200) }; }
    });

    // Quick-add window: it sends an item here, and we hand it to the main window, which owns the list.
    ipcMain.handle('quick:add', (e, p) => {
      if (!fromApp(e) || !win || win.isDestroyed() || !p || typeof p !== 'object') return false;
      const s = (v, n) => String(v == null ? '' : v).slice(0, n);
      win.webContents.send('quick:apply', { name: s(p.name, 120), cat: s(p.cat, 40), sub: s(p.sub, 40), qty: Number(p.qty) || 0, loc: s(p.loc, 80) });
      return true;
    });
    ipcMain.on('quick:hide', (e) => { if (fromApp(e) && quick && !quick.isDestroyed()) quick.hide(); });
    ipcMain.on('cat:changed', (e) => {
      if (fromApp(e) && quick && !quick.isDestroyed()) quick.webContents.send('cat:changed');
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        label: 'Tools',
        submenu: [{ label: 'Quick add window', accelerator: HOTKEY, registerAccelerator: false, click: toggleQuick }]
      },
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
      webPreferences: webPrefs()
    });
    hardenWindow(win);
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
    win.on('closed', () => { win = null; quitting = true; app.quit(); });

    // Global hotkey. If another program already owns it, the Tools menu item still works.
    try { globalShortcut.register(HOTKEY, toggleQuick); } catch (e) {}

    setupUpdater();
  });

  app.on('window-all-closed', () => app.quit());
}
