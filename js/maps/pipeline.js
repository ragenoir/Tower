(() => {
'use strict';
const TD = window.TD;
const { MAP_W, MAP_H, TILE } = TD;

TD.expandTilePath = function expandTilePath(corners) {
  const full = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [c0, r0] = corners[i], [c1, r1] = corners[i + 1];
    if (i === 0) full.push([c0, r0]);
    let c = c0, r = r0;
    while (c !== c1 || r !== r1) {
      if (c !== c1) c += c1 > c ? 1 : -1;
      else r += r1 > r ? 1 : -1;
      full.push([c, r]);
    }
  }
  return full;
};

TD.buildMapRows = function buildMapRows(corners, bushes, water) {
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('G'));
  for (const [c, r] of TD.expandTilePath(corners)) {
    if (r >= 0 && r < MAP_H && c >= 0 && c < MAP_W) grid[r][c] = 'D';
  }
  for (const [c, r] of bushes) {
    if (grid[r][c] === 'G') grid[r][c] = 'B';
  }
  for (const [c, r] of water) {
    if (grid[r][c] === 'G') grid[r][c] = 'W';
  }
  return grid.map(row => row.join(''));
};

TD.cornersToPixels = function cornersToPixels(corners) {
  return corners.map(([tx, ty]) => [tx * TILE + TILE / 2, ty * TILE + TILE / 2]);
};

TD.buildPathWaypoints = function buildPathWaypoints(corners) {
  return TD.expandTilePath(corners).map(([tx, ty]) => [tx * TILE + TILE / 2, ty * TILE + TILE / 2]);
};

TD.computePathLength = function computePathLength(waypoints) {
  const pts = waypoints || TD.PATH_WAYPOINTS;
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
};

TD.autoBuildSlots = function autoBuildSlots(rows, corners, target = 15) {
  const path = TD.expandTilePath(corners);
  const seen = new Set();
  const candidates = [];
  for (let i = 0; i < path.length; i++) {
    const [c, r] = path[i];
    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nc = c + dc, nr = r + dr, key = nc + ',' + nr;
      if (seen.has(key)) continue;
      if (nr < 0 || nr >= MAP_H || nc < 0 || nc >= MAP_W) continue;
      if (rows[nr][nc] !== 'G') continue;
      seen.add(key);
      candidates.push({ col: nc, row: nr, pathIdx: i });
    }
  }
  const slots = [];
  const minDist = 1.8;
  const step = Math.max(1, Math.floor(candidates.length / target));
  for (let i = 0; i < candidates.length && slots.length < target; i += step) {
    const c = candidates[i];
    if (slots.some(([sc, sr]) => Math.hypot(sc - c.col, sr - c.row) < minDist)) continue;
    slots.push([c.col, c.row]);
  }
  for (const c of candidates) {
    if (slots.length >= target) break;
    if (slots.some(([sc, sr]) => Math.hypot(sc - c.col, sr - c.row) < minDist)) continue;
    slots.push([c.col, c.row]);
  }
  return slots;
};

TD.buildDeco = function buildDeco(rows) {
  const deco = [];
  for (let row = 0; row < MAP_H; row++) {
    for (let col = 0; col < MAP_W; col++) {
      if (rows[row][col] !== 'G') continue;
      const seed = col * 7919 + row * 7927;
      if (seed % 9 < 2) deco.push({ col, row, kind: seed % 4 });
    }
  }
  return deco;
};

TD.findPathWaypointIndex = function findPathWaypointIndex(tx, ty) {
  const wps = TD.PATH_WAYPOINTS || [];
  // exact tile center match
  for (let i = 0; i < wps.length; i++) {
    const [px, py] = wps[i];
    if (Math.floor(px / TILE) === tx && Math.floor(py / TILE) === ty) return i;
  }
  // closest fallback
  let best = 0, bd = Infinity;
  for (let i = 0; i < wps.length; i++) {
    const [px, py] = wps[i];
    const d = Math.hypot(px / TILE - tx, py / TILE - ty);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};
})();