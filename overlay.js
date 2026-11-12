// Pure helpers for the in-game overlay window: saved settings and keeping the box on a screen.
const MIN_W = 260, MIN_H = 280, MAX_W = 640, MAX_H = 900;
const DEF_W = 300, DEF_H = 470;

const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : null);

function sanitizeCfg(o) {
  o = o && typeof o === 'object' ? o : {};
  const x = num(o.x), y = num(o.y), w = num(o.w), h = num(o.h);
  const ok = x !== null && y !== null && w !== null && h !== null && w >= MIN_W && h >= MIN_H;
  return {
    x: ok ? x : null, y: ok ? y : null,
    w: ok ? Math.min(w, MAX_W) : null, h: ok ? Math.min(h, MAX_H) : null,
    tab: o.tab === 'scan' ? 'scan' : 'add'
  };
}

function defaultBounds(area) {
  return { x: area.x + area.width - DEF_W - 24, y: area.y + 24, width: DEF_W, height: DEF_H };
}

function overlap(b, a) {
  const w = Math.min(b.x + b.width, a.x + a.width) - Math.max(b.x, a.x);
  const h = Math.min(b.y + b.height, a.y + a.height) - Math.max(b.y, a.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// Keeps the size inside the limits and the whole box on the screen it overlaps most.
function clampBounds(b, areas) {
  const list = Array.isArray(areas) && areas.length ? areas : [{ x: 0, y: 0, width: 1920, height: 1080 }];
  let area = list[0], best = -1;
  list.forEach((a) => { const o = overlap(b, a); if (o > best) { best = o; area = a; } });
  const width = Math.max(MIN_W, Math.min(Math.round(b.width), MAX_W, area.width));
  const height = Math.max(MIN_H, Math.min(Math.round(b.height), MAX_H, area.height));
  const x = Math.max(area.x, Math.min(Math.round(b.x), area.x + area.width - width));
  const y = Math.max(area.y, Math.min(Math.round(b.y), area.y + area.height - height));
  return { x, y, width, height };
}

module.exports = { sanitizeCfg, defaultBounds, clampBounds, MIN_W, MIN_H, MAX_W, MAX_H, DEF_W, DEF_H };
