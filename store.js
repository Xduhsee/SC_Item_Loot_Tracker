// Disk storage for the tracker. No Electron dependency, so it can be tested on its own.
const fs = require('fs');
const path = require('path');

const KEEP_BACKUPS = 14;
const MAX_BYTES = 25e6;
const BLOBS = ['prices', 'plan']; // small extra files the page may keep next to the data file

function createStore(dir) {
  const dataFile = path.join(dir, 'tracker-data.json');
  const catFile = path.join(dir, 'item-database.json');
  const backupDir = path.join(dir, 'backups');
  fs.mkdirSync(dir, { recursive: true });

  function readJSON(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
  }
  function writeAtomic(file, text) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, file);
  }
  function validData(d) {
    return !!d && typeof d === 'object' && Array.isArray(d.items) && Array.isArray(d.known);
  }
  function backupNames() {
    try {
      return fs.readdirSync(backupDir).filter(n => /^tracker-data-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().reverse();
    } catch (e) { return []; }
  }
  function today() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  // Copy the current data file into backups/ once per day, BEFORE it is overwritten.
  function backupDaily() {
    if (!fs.existsSync(dataFile)) return;
    const name = 'tracker-data-' + today() + '.json';
    const dest = path.join(backupDir, name);
    if (fs.existsSync(dest)) return;
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      if (!validData(readJSON(dataFile))) return; // never back up a damaged file over a good one
      fs.copyFileSync(dataFile, dest);
      backupNames().slice(KEEP_BACKUPS).forEach(n => { try { fs.unlinkSync(path.join(backupDir, n)); } catch (e) {} });
    } catch (e) {}
  }
  function load() {
    let d = readJSON(dataFile);
    let restoredFrom = null;
    if (!validData(d)) {
      d = null;
      for (const n of backupNames()) {
        const b = readJSON(path.join(backupDir, n));
        if (validData(b)) { d = b; restoredFrom = n; break; }
      }
      if (d && fs.existsSync(dataFile)) {
        try { fs.renameSync(dataFile, dataFile + '.damaged-' + Date.now()); } catch (e) {}
      }
      if (d) { try { writeAtomic(dataFile, JSON.stringify(d)); } catch (e) {} }
    }
    return Object.assign({ items: [], known: [], extra: {} }, validData(d) ? d : {}, { restoredFrom });
  }
  function save(d) {
    if (!validData(d)) throw new Error('Invalid data');
    const out = { items: d.items, known: d.known };
    if (d.extra && typeof d.extra === 'object' && !Array.isArray(d.extra)) out.extra = d.extra;
    const text = JSON.stringify(out);
    if (text.length > MAX_BYTES) throw new Error('Data too large');
    backupDaily();
    writeAtomic(dataFile, text);
    return true;
  }
  function loadCatalogue() {
    const c = readJSON(catFile);
    return c && c.v === 2 && Array.isArray(c.items) ? c : null;
  }
  function saveCatalogue(c) {
    if (!c || c.v !== 2 || !Array.isArray(c.items)) throw new Error('Invalid database');
    const text = JSON.stringify(c);
    if (text.length > MAX_BYTES * 2) throw new Error('Database too large');
    writeAtomic(catFile, text);
    return true;
  }
  function loadBlob(name) {
    if (!BLOBS.includes(name)) return null;
    return readJSON(path.join(dir, name + '.json'));
  }
  function saveBlob(name, obj) {
    if (!BLOBS.includes(name)) throw new Error('Unknown file');
    if (!obj || typeof obj !== 'object') throw new Error('Invalid data');
    const text = JSON.stringify(obj);
    if (text.length > 10e6) throw new Error('Data too large');
    writeAtomic(path.join(dir, name + '.json'), text);
    return true;
  }
  return { load, save, loadCatalogue, saveCatalogue, loadBlob, saveBlob, paths: { dir, dataFile, catFile, backupDir } };
}

module.exports = { createStore };
