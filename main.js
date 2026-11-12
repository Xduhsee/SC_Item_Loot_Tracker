const { app, BrowserWindow, ipcMain, shell, Menu, dialog, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { createStore } = require('./store');
const gamelog = require('./gamelog');
const overlayLib = require('./overlay');

const HOTKEY = 'CommandOrControl+Shift+L';
const SCAN_HOTKEY = 'CommandOrControl+Shift+S';
const OVERLAY_HOTKEY = 'CommandOrControl+Shift+O';

let win = null;
let quick = null;
let scan = null;
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

// Small always-on-top window for decoding scan numbers while flying. Same rules as the quick-add window.
function createScan() {
  scan = new BrowserWindow({
    width: 360,
    height: 460,
    show: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'Scan decoder',
    backgroundColor: '#060a07',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: webPrefs()
  });
  scan.setMenu(null);
  scan.setAlwaysOnTop(true, 'screen-saver');
  hardenWindow(scan);
  scan.on('close', (e) => { if (!quitting) { e.preventDefault(); scan.hide(); } });
  scan.on('closed', () => { scan = null; });
  return scan.loadFile(path.join(__dirname, 'app', 'scan.html'));
}
function toggleScan() {
  if (scan && !scan.isDestroyed() && scan.isVisible()) { scan.hide(); return; }
  const show = () => { scan.show(); scan.focus(); scan.webContents.send('scan:shown'); };
  if (!scan || scan.isDestroyed()) createScan().then(show).catch(() => {});
  else show();
}

// In-game overlay: one transparent box that sits over the game (borderless or windowed mode).
// It ignores the mouse until the pointer is over it, so it never blocks mouse-look; hold F in game to get the cursor.
// It never takes keyboard focus unless you click a text box. It does not touch the game process.
let overlay = null, ovCfg = null, ovAdjust = false;
function ovFile() { return path.join(store.paths.dir, 'overlay.json'); }
function ovLoad() {
  if (ovCfg) return ovCfg;
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(ovFile(), 'utf8')); } catch (e) { /* first run */ }
  ovCfg = overlayLib.sanitizeCfg(raw);
  return ovCfg;
}
function ovSave() { try { fs.writeFileSync(ovFile(), JSON.stringify(ovCfg)); } catch (e) { /* keep going */ } }
function ovAreas() { try { return screen.getAllDisplays().map((d) => d.bounds); } catch (e) { return []; } }
function ovIsOpen() { return !!(overlay && !overlay.isDestroyed() && overlay.isVisible()); }
function ovTell() { if (win && !win.isDestroyed()) win.webContents.send('overlay:state', ovIsOpen()); }
function ovBounds() {
  const c = ovLoad();
  if (c.w) return overlayLib.clampBounds({ x: c.x, y: c.y, width: c.w, height: c.h }, ovAreas());
  let primary = { x: 0, y: 0, width: 1920, height: 1080 };
  try { primary = screen.getPrimaryDisplay().bounds; } catch (e) { /* default */ }
  return overlayLib.defaultBounds(primary);
}
function createOverlay() {
  const b = ovBounds();
  overlay = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    show: false, frame: false, transparent: true, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true,
    alwaysOnTop: true, focusable: false, hasShadow: false,
    title: 'Quick add overlay',
    webPreferences: webPrefs()
  });
  overlay.setMenu(null);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true, { forward: true });
  hardenWindow(overlay);
  overlay.on('close', (e) => { if (!quitting) { e.preventDefault(); hideOverlay(); } });
  overlay.on('closed', () => { overlay = null; ovTell(); });
  return overlay.loadFile(path.join(__dirname, 'app', 'overlay.html'));
}
function hideOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  if (ovAdjust) ovCommit();
  ovAdjust = false;
  try { overlay.setFocusable(false); } catch (e) { /* ignore */ }
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.hide();
  ovTell();
}
function showOverlay() {
  const go = () => { ovAdjust = false; overlay.setIgnoreMouseEvents(true, { forward: true }); overlay.showInactive(); overlay.webContents.send('ov:shown', ovLoad().tab); ovTell(); };
  if (!overlay || overlay.isDestroyed()) createOverlay().then(go).catch(() => {});
  else go();
}
function toggleOverlay() { if (ovIsOpen()) hideOverlay(); else showOverlay(); }
function ovCommit() {
  if (!overlay || overlay.isDestroyed()) return;
  const b = overlay.getBounds(), c = ovLoad();
  c.x = b.x; c.y = b.y; c.w = b.width; c.h = b.height;
  ovSave();
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
    ipcMain.on('store:snapshot', (e, label) => { try { e.returnValue = fromApp(e) ? store.snapshot(String(label)) : false; } catch (err) { e.returnValue = false; } });
    ipcMain.handle('store:backups', (e) => { try { return fromApp(e) ? store.listBackups() : []; } catch (err) { return []; } });
    ipcMain.handle('store:restore', (e, name) => { try { return fromApp(e) ? store.restoreBackup(String(name)) : false; } catch (err) { return false; } });
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

    // Game.log import: find the log, read it, hand the text to the page. Nothing is written to the game folder.
    const logPrefFile = () => path.join(store.paths.dir, 'logdir.json');
    const loadLogDir = () => { try { return String(JSON.parse(fs.readFileSync(logPrefFile(), 'utf8')).dir || ''); } catch (err) { return ''; } };
    const pickLogDir = async () => {
      const r = await dialog.showOpenDialog(win, { title: 'Choose the StarCitizen\\LIVE folder (the one with Game.log)', properties: ['openDirectory'] });
      if (r.canceled || !r.filePaths || !r.filePaths[0]) return '';
      if (!gamelog.logIn(r.filePaths[0])) return '';
      try { fs.writeFileSync(logPrefFile(), JSON.stringify({ dir: r.filePaths[0] })); } catch (err) { /* keep going */ }
      return r.filePaths[0];
    };
    ipcMain.handle('log:latest', async (e) => {
      try {
        if (!fromApp(e)) return { error: 'Not allowed.' };
        let f = gamelog.findLog(loadLogDir());
        if (!f) {
          const d = await pickLogDir();
          f = d ? gamelog.findLog(d) : '';
        }
        if (!f) return { error: 'Game.log not found. Use Change log folder and pick the StarCitizen\\LIVE folder.' };
        return gamelog.readLog(f);
      } catch (err) { return { error: String((err && err.message) || err).slice(0, 200) }; }
    });
    ipcMain.handle('log:folder', async (e) => { try { return fromApp(e) ? await pickLogDir() : ''; } catch (err) { return ''; } });

    // Quick-add window: it sends an item here, and we hand it to the main window, which owns the list.
    ipcMain.handle('quick:add', (e, p) => {
      if (!fromApp(e) || !win || win.isDestroyed() || !p || typeof p !== 'object') return false;
      const s = (v, n) => String(v == null ? '' : v).slice(0, n);
      win.webContents.send('quick:apply', { name: s(p.name, 120), cat: s(p.cat, 40), sub: s(p.sub, 40), qty: Number(p.qty) || 0, loc: s(p.loc, 80), src: s(p.src, 80), sys: s(p.sys, 24), tag: s(p.tag, 40) });
      return true;
    });
    ipcMain.on('quick:hide', (e) => { if (fromApp(e) && quick && !quick.isDestroyed()) quick.hide(); });
    ipcMain.on('scan:hide', (e) => { if (fromApp(e) && scan && !scan.isDestroyed()) scan.hide(); });
    ipcMain.on('scan:pin', (e, on) => {
      if (fromApp(e) && scan && !scan.isDestroyed()) { if (on) scan.setAlwaysOnTop(true, 'screen-saver'); else scan.setAlwaysOnTop(false); }
    });
    ipcMain.on('cat:changed', (e) => {
      if (!fromApp(e)) return;
      if (quick && !quick.isDestroyed()) quick.webContents.send('cat:changed');
      if (overlay && !overlay.isDestroyed()) overlay.webContents.send('cat:changed');
    });

    // Overlay: the main window toggles it; the overlay page asks for mouse capture, keyboard focus and moves.
    const fromOv = (e) => fromApp(e) && overlay && !overlay.isDestroyed() && e.sender === overlay.webContents;
    ipcMain.handle('overlay:toggle', (e) => { if (!fromApp(e)) return false; toggleOverlay(); return ovIsOpen(); });
    ipcMain.handle('overlay:state', (e) => (fromApp(e) ? ovIsOpen() : false));
    ipcMain.on('ov:capture', (e, on) => { if (fromOv(e) && !ovAdjust) overlay.setIgnoreMouseEvents(!on, { forward: true }); });
    ipcMain.handle('ov:focus', (e, on) => {
      if (!fromOv(e)) return false;
      try {
        if (on) { overlay.setFocusable(true); overlay.focus(); overlay.webContents.focus(); }
        else { overlay.blur(); overlay.setFocusable(false); }
      } catch (err) { return false; }
      return true;
    });
    ipcMain.handle('ov:cfg', (e) => { if (!fromOv(e)) return null; const b = overlay.getBounds(); return { x: b.x, y: b.y, w: b.width, h: b.height, tab: ovLoad().tab }; });
    ipcMain.on('ov:bounds', (e, b) => {
      if (!fromOv(e) || !b || typeof b !== 'object') return;
      const n = (v) => Number(v) || 0;
      overlay.setBounds(overlayLib.clampBounds({ x: n(b.x), y: n(b.y), width: n(b.w), height: n(b.h) }, ovAreas()));
    });
    ipcMain.on('ov:adjust', (e, on) => {
      if (!fromOv(e)) return;
      ovAdjust = !!on;
      if (ovAdjust) overlay.setIgnoreMouseEvents(false);
      else { ovCommit(); overlay.setIgnoreMouseEvents(true, { forward: true }); }
    });
    ipcMain.on('ov:tab', (e, t) => { if (fromOv(e)) { ovLoad().tab = t === 'scan' ? 'scan' : 'add'; ovSave(); } });
    ipcMain.on('ov:hide', (e) => { if (fromOv(e)) hideOverlay(); });
    // Undo from the overlay: the main window owns the list and only undoes an add made from the overlay.
    ipcMain.on('ov:undo', (e, tag) => {
      if (!fromOv(e)) return;
      if (win && !win.isDestroyed()) win.webContents.send('overlay:undo', String(tag == null ? '' : tag).slice(0, 40));
      else overlay.webContents.send('ov:undo-result', false);
    });
    ipcMain.on('overlay:undo-reply', (e, ok) => { if (fromApp(e) && overlay && !overlay.isDestroyed()) overlay.webContents.send('ov:undo-result', !!ok); });

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        label: 'Tools',
        submenu: [
          { label: 'Quick add window', accelerator: HOTKEY, registerAccelerator: false, click: toggleQuick },
          { label: 'Scan decoder window', accelerator: SCAN_HOTKEY, registerAccelerator: false, click: toggleScan },
          { label: 'In-game overlay', accelerator: OVERLAY_HOTKEY, registerAccelerator: false, click: toggleOverlay }
        ]
      },
      { label: 'Help', submenu: [{ label: 'Check for updates', click: checkNow }, { label: 'Version ' + app.getVersion(), enabled: false }] }
    ]));

    win = new BrowserWindow({
      width: 1180,
      height: 860,
      minWidth: 420,
      minHeight: 520,
      backgroundColor: '#060a07',
      title: 'Loot Tracker',
      icon: path.join(__dirname, 'build', 'icon.png'),
      autoHideMenuBar: true,
      webPreferences: webPrefs()
    });
    hardenWindow(win);
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
    win.on('closed', () => { win = null; quitting = true; app.quit(); });

    // Global hotkey. If another program already owns it, the Tools menu item still works.
    try { globalShortcut.register(HOTKEY, toggleQuick); } catch (e) {}
    try { globalShortcut.register(SCAN_HOTKEY, toggleScan); } catch (e) {}
    try { globalShortcut.register(OVERLAY_HOTKEY, toggleOverlay); } catch (e) {}

    setupUpdater();
  });

  app.on('window-all-closed', () => app.quit());
}
