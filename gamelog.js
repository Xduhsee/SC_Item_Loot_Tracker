// Finds and reads the Star Citizen Game.log. Read-only: the file is never changed or moved.
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 120 * 1024 * 1024;

function defaultDirs(platform) {
  if (platform !== 'win32') return [];
  const out = [];
  for (const d of ['C', 'D', 'E', 'F']) {
    for (const pf of ['Program Files', 'Program Files (x86)']) {
      out.push(path.join(d + ':\\', pf, 'Roberts Space Industries', 'StarCitizen', 'LIVE'));
    }
  }
  return out;
}

// A folder counts if it holds Game.log, or is the StarCitizen folder with LIVE inside.
function logIn(dir) {
  if (!dir) return '';
  for (const p of [path.join(dir, 'Game.log'), path.join(dir, 'LIVE', 'Game.log')]) {
    try { if (fs.statSync(p).isFile()) return p; } catch (e) { /* not here */ }
  }
  return '';
}

function findLog(saved, platform) {
  const dirs = [saved].concat(defaultDirs(platform || process.platform));
  for (const d of dirs) { const p = logIn(d); if (p) return p; }
  return '';
}

function readLog(file) {
  const st = fs.statSync(file);
  if (st.size > MAX_BYTES) return { error: 'That log is over 120 MB. Choose a smaller file with the file picker.' };
  return { text: fs.readFileSync(file, 'utf8'), name: path.basename(file), size: st.size };
}

module.exports = { findLog, readLog, logIn, defaultDirs, MAX_BYTES };
