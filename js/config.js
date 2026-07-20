(() => {
'use strict';
const TD = window.TD = window.TD || {};

TD.TILE = 16;
TD.MAP_W = 24;
TD.MAP_H = 14;
TD.W = 384;
TD.H = 288; // 4:3 (map 224 + HUD 64). Deliberate retro pixel size. OK for desktop/tablet + crisp pixels.
// On smartphones (esp. portrait) effective scale~1 makes tiny buttons/fonts. We keep logical size
// and compensate with bigger touch rects + rotate hint instead of resizing the whole game world
// (resizing maps would require rewriting all corner data + balance).
TD.MAP_PX_H = TD.MAP_H * TD.TILE;
TD.HUD_H = 64;
TD.HUD_Y = TD.MAP_PX_H;

TD.HUD = {
  towerX: 4, towerW: 34, towerH: 26, towerGap: 1,
  statsX: 176, statsW: 112,
  ctrlX: 296, ctrlW: 88,
  row1: TD.HUD_Y + 4, row2: TD.HUD_Y + 34,
  btnW: 20, btnH: 22
};

TD.FLY_HEIGHT = 22;
TD.isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
TD.TOUCH_PAD = 18; // larger for phones; was 10. Hit slop for fat fingers on small scales.

TD.C = {
  grass1: '#2d4a22', grass2: '#264019', grass3: '#345a28',
  road: '#8b6914', roadDark: '#6b5010', roadEdge: '#5a4510', roadHi: '#a88020',
  accent: '#4a7c59', gold: '#c8b560', text: '#e8dcc0', shadow: '#3d2817',
  enemy: '#d45d3a', enemyRunner: '#e87a5a', enemyTank: '#8b3a2a', enemyBoss: '#5a1a4a',
  enemyFlyer: '#7ab8ff',
  arrow: '#5b8cbf', cannon: '#8b4513', frost: '#87ceeb', sniper: '#2f2f4f', flak: '#c9a227',
  base: '#4a7c59', baseDmg: '#ff4444', slot: '#3a5a32', slotHover: '#5a8a52',
  hp: '#44cc44', hpBg: '#222', ui: '#2a2a3e', uiBorder: '#c8b560', uiLight: '#3a3a52'
};

TD.STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, WON: 3, LOST: 4 };
TD.SELL_RATIO = 0.5;
TD.MAX_ENEMIES = 40;

// Tower damage / siege fantasy.
// Campaign: rare integrity chip only (repair matters; no destroy — protects 3★ fairness).
// Endless / demo / debug: chip + rare destroy + downgrade. Gameplay rolls use seeded RNG.
TD.TOWER_DAMAGE_ENABLED = true;
TD.TOWER_DAMAGE_CHANCE_MULT = 0.04;
TD.TOWER_DAMAGE_DESTROY = true; // allow destroy/downgrade outside campaign
TD.MAX_PROJECTILES = 80;

TD.DIFFICULTY = {
  easy:   { label: 'Easy',   goldMult: 1.25, enemyHpMult: 0.82 },
  normal: { label: 'Normal', goldMult: 1,    enemyHpMult: 1 }
};

TD.MENU_UI = {
  mapY: 38, mapH: 36, mapW: 54, mapGap: 16,
  ctrlY: 82, modeH: 16, modeW: 74,
  diffH: 14, startH: 18, sectionGap: 12,
  infoH: 62
};

// Demo / attract mode constants and early URL param parsing
TD.DEMO_RESTART_DELAY = 3;  // results / victory screen duration in demo attract mode (user: 3s looping screensaver)
TD.DEMO_DECISION_INTERVAL = 1.6;

const __params = (typeof location !== 'undefined' && location.search)
  ? new URLSearchParams(location.search)
  : new URLSearchParams('');
TD.debug = __params.has('debug');
TD.isDemo = !!__params.get('demo');
TD.demoMap = (__params.get('demo') && __params.get('demo') !== '1') ? __params.get('demo') : null;
// Deep-link / challenge params (applied after maps load in main.js)
TD.urlMap = __params.get('map') || null;
TD.urlMode = __params.get('mode') || null;
TD.urlDiff = __params.get('diff') || null;
TD.urlSeed = __params.get('seed') || null;
TD.urlAutostart = __params.has('autostart') || __params.get('start') === '1';
TD.VERSION = '1.1.1';
})();