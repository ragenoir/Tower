#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const noop = () => {};

const ctx = {
  document: {
    getElementById: () => ({
      getContext: () => new Proxy({}, { get: () => noop }),
      addEventListener: noop, style: {}, width: 1, height: 1,
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    }),
    addEventListener: noop
  },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  performance: { now: () => 0 },
  requestAnimationFrame: noop,
  location: { search: '' },
  Math, parseInt, parseFloat, setTimeout, setInterval, clearInterval: noop,
  URLSearchParams: class {
    constructor(s = '') { this.s = String(s || ''); }
    has(k) { return this.s.includes(k) || this.s.includes(k + '='); }
    get(k) {
      const m = new RegExp(k + '=([^&]*)').exec(this.s);
      return m ? decodeURIComponent(m[1]) : (this.s.includes(k) ? '1' : null);
    }
  },
  AudioContext: class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
    resume() {}
    createOscillator() { return { type: '', frequency: { value: 0 }, connect: noop, start: noop, stop: noop }; }
    createGain() { return { gain: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop }; }
    createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
    createBufferSource() { return { buffer: null, connect: noop, start: noop }; }
  }
};
ctx.window = ctx;
ctx.window.addEventListener = noop;
vm.createContext(ctx);

const files = [
  'js/config.js', 'js/i18n.js', 'js/data/towers.js', 'js/data/enemies.js', 'js/data/waves.js',
  'js/data/waves-meadow.js', 'js/data/waves-canyon.js', 'js/data/waves-ruins.js', 'js/data/waves-rift.js',
  'js/events.js', 'js/maps/pipeline.js', 'js/maps/meadow.js', 'js/maps/canyon.js', 'js/maps/ruins.js', 'js/maps/rift.js',
  'js/maps/validate.js', 'js/maps/index.js', 'js/storage.js', 'js/achievements.js', 'js/audio.js',
  'graphics/state.js', 'graphics/map.js', 'graphics/units.js', 'graphics/fx.js',
  'js/game.js', 'js/ui.js', 'js/debug.js', 'js/main.js'
];

let failed = 0;
for (const f of files) {
  const p = path.join(root, f);
  try {
    require('node:child_process').execFileSync('node', ['--check', p], { stdio: 'pipe' });
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  } catch (e) {
    console.error('FAIL', f, e.message || e);
    failed++;
  }
}

const TD = ctx.TD;
const checks = [
  () => TD.MAP_IDS.length === 4,
  () => TD.TOWER_ORDER.length === 5,
  () => TD.TOWER_TYPES.cannon.hitsAir === false,
  () => TD.TOWER_TYPES.flak.hitsGround === false,
  () => TD.MAPS.ruins.waves.length === 15,
  () => TD.getCampaignWaveCount() === 15,
  () => TD.canTowerHit('cannon', { flying: true }) === false,
  () => TD.canTowerHit('flak', { flying: true }) === true,
  () => Object.keys(ctx.TDG).length >= 25,
  () => TD.PATH_WAYPOINTS.length > 20,
  () => TD.PATH_LENGTH > 0 && TD.getPathFraction({ wp: 0, progress: 0 }) < 0.01,
  () => typeof TD.updateMusicTension === 'function' && TD.computeMusicTensionTarget(0) === 0,
  () => typeof TD.selectMusicTrack === 'function' && typeof TD.getCurrentMusicTrack === 'function',
  () => TD.MUSIC_TRACKS && Object.keys(TD.MUSIC_TRACKS).length >= 9,
  () => Array.isArray(TD.TARGET_MODES) && TD.TARGET_MODES.length === 4,
  () => typeof TD.getSellValue === 'function' && typeof TD.cycleTowerTargetMode === 'function',
  () => TD.ACHIEVEMENTS.length === 8,
  () => TD.MAPS.meadow.validation.ok === true,
  () => TD.MAPS.rift && TD.MAPS.rift.validation && TD.MAPS.rift.validation.ok === true,
  () => typeof TD.waveHasBoss === 'function' && TD.SFX.bossSpawn && TD.SFX.bossWarn,
  () => TD.locale === 'en' && TD.t('tagline').includes('Build towers'),
  () => TD.achLabel(TD.ACHIEVEMENTS[0]).length > 0,
  () => typeof TD.isDemo === 'boolean' && typeof TD.DEMO_RESTART_DELAY === 'number'
];

for (const [i, fn] of checks.entries()) {
  if (!fn()) { console.error('CHECK FAIL', i); failed++; }
}

if (failed) { console.error(failed, 'failures'); process.exit(1); }
console.log('smoke OK — maps:', TD.MAP_IDS.join(','), 'towers:', TD.TOWER_ORDER.length);