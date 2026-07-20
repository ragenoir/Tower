/**
 * TDG shared state + init
 */
(() => {
'use strict';
const S = window.__TDG_S = {
  ctx: null, C: null, TT: null, TILE: 16, MAP_W: 24, MAP_H: 14, theme: 'meadow'
};

const THEMES = {
  meadow: {
    grass: ['#2d4a22', '#264019', '#345a28'],
    road: '#8b6914', roadDark: '#6b5010', roadEdge: '#5a4510', roadHi: '#a88020',
    flower: '#ff6b8a', flowerHi: '#ff8baa', rock: '#888', bush: '#3a7a3a'
  },
  canyon: {
    grass: ['#4a3520', '#3d2a18', '#5a4030'],
    road: '#a06830', roadDark: '#7a5020', roadEdge: '#5a3810', roadHi: '#c08840',
    flower: '#e8a050', flowerHi: '#ffc070', rock: '#6a5a4a', bush: '#6a5030'
  },
  ruins: {
    grass: ['#3a3a48', '#323240', '#424252'],
    road: '#6a6a78', roadDark: '#4a4a58', roadEdge: '#3a3a48', roadHi: '#8a8a98',
    flower: '#9a8acc', flowerHi: '#bab0ee', rock: '#5a5a68', bush: '#4a5a4a'
  },
  rift: {
    grass: ['#2a3a3a', '#223232', '#2f4340'],
    road: '#5a6a72', roadDark: '#3a454c', roadEdge: '#2a343a', roadHi: '#7a8a92',
    flower: '#7aa0b0', flowerHi: '#9ac0d0', rock: '#556066', bush: '#3a5a52'
  }
};

function pal() { return THEMES[S.theme] || THEMES.meadow; }
function px(x, y, w, h, color) {
  S.ctx.fillStyle = color;
  S.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

window.TDG = {
  init(c, palette, towerTypes, tileSize, mapW, mapH) {
    S.ctx = c; S.C = palette; S.TT = towerTypes;
    S.TILE = tileSize; S.MAP_W = mapW; S.MAP_H = mapH;
  },
  setTheme(t) { S.theme = t; },
  px, pal,
  isRoad(rows, c, r) {
    return r >= 0 && r < S.MAP_H && c >= 0 && c < S.MAP_W && rows[r][c] === 'D';
  },
  textOutlined(txt, x, y, fill, outline = '#000') {
    const ctx = S.ctx, C = S.C;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = outline;
    ctx.fillText(txt, x + 1, y); ctx.fillText(txt, x - 1, y);
    ctx.fillText(txt, x, y + 1); ctx.fillText(txt, x, y - 1);
    ctx.fillStyle = fill;
    ctx.fillText(txt, x, y);
  },
  drawCoin(x, y, r) {
    px(x - r, y - r, r * 2, r * 2, S.C.gold);
    px(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, '#a89040');
  },
  drawStars(cx, cy, count, size) {
    const ctx = S.ctx, C = S.C;
    ctx.font = 'bold ' + size + 'px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < count ? C.gold : '#3a3a4a';
      ctx.fillText('★', cx - size + i * size, cy);
    }
  }
};
})();
