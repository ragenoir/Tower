(() => {
'use strict';
const TD = window.TD;
const r = () => TD.run;

// Helper to generate short seed for variants
TD.generateSeed = function generateSeed() {
  return Math.floor(Math.random() * 0xfffff).toString(16);
};

/** Date-derived seed for daily challenge (no server). Same everywhere for the same local day. */
TD.getDailySeed = function getDailySeed(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  let h = ((y * 372 + m * 31 + day) * 1664525 + 1013904223) >>> 0;
  return h.toString(16).slice(0, 5);
};

/** Rotate daily map by day-of-year so the challenge changes map too. */
TD.getDailyMapId = function getDailyMapId(date) {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  const ids = TD.MAP_IDS || ['meadow'];
  return ids[dayOfYear % ids.length];
};

/** Build shareable deep-link query (map/mode/diff/seed). */
TD.buildDeepLink = function buildDeepLink(opts = {}) {
  const p = new URLSearchParams();
  if (opts.mapId) p.set('map', opts.mapId);
  if (opts.mode) p.set('mode', opts.mode);
  if (opts.diff || opts.difficulty) p.set('diff', opts.diff || opts.difficulty);
  if (opts.seed) p.set('seed', String(opts.seed));
  if (opts.autostart) p.set('autostart', '1');
  let base = '';
  if (typeof location !== 'undefined') {
    base = (location.origin || '') + (location.pathname || 'index.html');
  } else {
    base = 'index.html';
  }
  const q = p.toString();
  return q ? base + '?' + q : base;
};

/** Apply ?map=&mode=&diff=&seed= into menu state (after maps exist). */
TD.applyUrlDeepLink = function applyUrlDeepLink() {
  if (TD.urlMap && TD.MAP_IDS && TD.MAP_IDS.includes(TD.urlMap)) {
    r().menuMap = TD.urlMap;
  }
  if (TD.urlMode === 'campaign' || TD.urlMode === 'endless') {
    r().menuMode = TD.urlMode;
  }
  if (TD.urlDiff && TD.DIFFICULTY && TD.DIFFICULTY[TD.urlDiff]) {
    r().menuDifficulty = TD.urlDiff;
  }
  if (TD.urlSeed) {
    r().menuSeed = String(TD.urlSeed);
  }
};

/** Lightweight analytics (no-op if gtag missing). */
TD.track = function track(event, params) {
  try {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  } catch (_) { /* ignore */ }
};

/** Brag text for clipboard / social. */
TD.formatRunShareText = function formatRunShareText(result) {
  if (!result) return '';
  const mapName = TD.MAPS[result.mapId]?.name || result.mapId;
  const mode = result.mode === 'endless' ? 'Endless' : 'Campaign';
  const lines = [
    result.won ? '★ Tower Defense — VICTORY' : 'Tower Defense — Defeat',
    mapName + ' · ' + mode + (result.diff ? ' · ' + result.diff : '')
  ];
  if (result.mode === 'campaign' && result.won) {
    lines.push('Stars: ' + '★'.repeat(result.stars || 0) + '☆'.repeat(Math.max(0, 3 - (result.stars || 0))));
  }
  if (result.mode === 'endless') lines.push('Wave: E' + result.wave);
  else lines.push('Wave: ' + result.wave + '/' + (TD.getCampaignWaveCount ? TD.getCampaignWaveCount() : 15));
  lines.push('Time: ' + (TD.formatTime ? TD.formatTime(result.time) : Math.round(result.time) + 's'));
  lines.push('Kills: ' + (result.kills || 0) + (result.maxCombo ? ' · combo x' + result.maxCombo : ''));
  if (result.seed) lines.push('Seed: ' + result.seed);
  const link = TD.buildDeepLink({
    mapId: result.mapId,
    mode: result.mode,
    diff: result.diff || r().menuDifficulty,
    seed: result.seed
  });
  lines.push('Play: ' + link);
  return lines.join('\n');
};

/** Draw a small share card and trigger PNG download. */
TD.saveRunSharePng = function saveRunSharePng(result) {
  if (!result || typeof document === 'undefined') return false;
  const W = 480, H = 270;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c8b560';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.fillStyle = result.won ? '#c8b560' : '#ff4444';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(result.won ? 'VICTORY' : 'DEFEAT', W / 2, 52);
  const mapName = TD.MAPS[result.mapId]?.name || result.mapId;
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '16px monospace';
  ctx.fillText(mapName + ' · ' + (result.mode === 'endless' ? 'Endless' : 'Campaign'), W / 2, 88);
  if (result.mode === 'campaign' && result.won) {
    ctx.fillStyle = '#c8b560';
    ctx.font = '22px monospace';
    ctx.fillText('★'.repeat(result.stars || 0) + '☆'.repeat(Math.max(0, 3 - (result.stars || 0))), W / 2, 120);
  }
  ctx.fillStyle = '#aaa';
  ctx.font = '14px monospace';
  const stats = [
    result.mode === 'endless' ? 'Wave E' + result.wave : 'Wave ' + result.wave,
    'Time ' + (TD.formatTime ? TD.formatTime(result.time) : Math.round(result.time) + 's'),
    'Kills ' + (result.kills || 0),
    result.seed ? 'Seed ' + result.seed : ''
  ].filter(Boolean);
  stats.forEach((ln, i) => ctx.fillText(ln, W / 2, 150 + i * 22));
  ctx.fillStyle = '#666';
  ctx.font = '11px monospace';
  ctx.fillText('Pixel TD · open index.html', W / 2, H - 24);
  try {
    const a = document.createElement('a');
    const stars = result.stars != null ? result.stars : 'x';
    a.download = 'TD_' + (result.mapId || 'map') + '_' + stars + 's_w' + result.wave + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
    return true;
  } catch (_) {
    return false;
  }
};

TD.copyRunShareText = function copyRunShareText(result) {
  const text = TD.formatRunShareText(result);
  if (!text) return Promise.resolve(false);
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => {
      return TD._copyFallback(text);
    });
  }
  return Promise.resolve(TD._copyFallback(text));
};

TD._copyFallback = function _copyFallback(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) {
    return false;
  }
};

})();
