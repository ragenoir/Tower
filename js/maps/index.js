(() => {
'use strict';
const TD = window.TD;
const { TILE } = TD;

TD.MAP_IDS = ['meadow', 'canyon', 'ruins', 'rift', 'conflux'];

TD.MAPS = {
  meadow: TD.mapMeadow,
  canyon: TD.mapCanyon,
  ruins: TD.mapRuins,
  rift: TD.mapRift,
  conflux: TD.mapConflux
};

TD.mapMeadow.waves = TD.WAVES_MEADOW || TD.WAVES;
TD.mapCanyon.waves = TD.WAVES_CANYON || TD.WAVES;
TD.mapRuins.waves = TD.WAVES_RUINS || TD.WAVES;
TD.mapRift.waves = TD.WAVES_RIFT || TD.WAVES;
TD.mapConflux.waves = TD.WAVES_CONFLUX || TD.WAVES;

for (const m of Object.values(TD.MAPS)) {
  m.rows = TD.buildMapRows(m.corners, m.bushes, m.water);
  m.slots = TD.autoBuildSlots(m.rows, m.corners, m.slotCount);
  if (TD.validateMap) m.validation = TD.validateMap(m);
}

TD.currentMapId = 'meadow';
TD.MAP_ROWS = TD.MAPS.meadow.rows;
TD.PATH_WAYPOINTS = [];
TD.PATH_LENGTH = 0;
TD.BUILD_SLOTS = [];
TD.GRASS_DECO = [];

TD.loadMap = function loadMap(id) {
  const m = TD.MAPS[id] || TD.MAPS.meadow;
  TD.currentMapId = m.id;
  TD.MAP_ROWS = m.rows;
  TD.PATH_WAYPOINTS = TD.buildPathWaypoints(m.corners);
  TD.PATH_LENGTH = TD.computePathLength(TD.PATH_WAYPOINTS);
  // Resolve tile-based shortcuts (e.g. Rift air bypass) to actual wp indices for runtime
  if (m.airShortcut && m.airShortcut.fromTile && TD.findPathWaypointIndex) {
    const sc = m.airShortcut;
    m._airShortcut = {
      from: TD.findPathWaypointIndex(sc.fromTile[0], sc.fromTile[1]),
      to: TD.findPathWaypointIndex(sc.toTile[0], sc.toTile[1])
    };
  } else if (m.airShortcut && m.airShortcut.from != null) {
    m._airShortcut = m.airShortcut; // legacy direct indices
  }
  // Conflux-style portals: tile pairs → wp indices
  if (Array.isArray(m.portals) && TD.findPathWaypointIndex) {
    m._portals = m.portals.map(p => ({
      from: TD.findPathWaypointIndex(p.fromTile[0], p.fromTile[1]),
      to: TD.findPathWaypointIndex(p.toTile[0], p.toTile[1]),
      chance: p.chance != null ? p.chance : 0.45,
      minWave: p.minWave != null ? p.minWave : 1,
      skipBoss: p.skipBoss !== false,
      typeBonus: p.typeBonus || {},
      fromTile: p.fromTile,
      toTile: p.toTile
    }));
  } else {
    m._portals = null;
  }
  TD.BUILD_SLOTS = m.slots.map(([tx, ty]) => ({
    tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, tower: null
  }));
  TD.GRASS_DECO = TD.buildDeco(TD.MAP_ROWS);
  if (window.TDG) TDG.setTheme(m.theme);
};

TD.getBestEndless = function getBestEndless(mapId) {
  return parseInt(localStorage.getItem('bestEndless_' + mapId) || '0');
};

TD.setBestEndless = function setBestEndless(mapId, wave) {
  const prev = TD.getBestEndless(mapId);
  if (wave > prev) localStorage.setItem('bestEndless_' + mapId, wave);
};

TD.getBestStars = function getBestStars(mapId) {
  return parseInt(localStorage.getItem('bestStars_' + mapId) || '0');
};

TD.setBestStars = function setBestStars(mapId, stars) {
  const prev = TD.getBestStars(mapId);
  if (stars > prev) localStorage.setItem('bestStars_' + mapId, stars);
};

TD.getBestWave = function getBestWave(mapId) {
  return parseInt(localStorage.getItem('bestWave_' + mapId) || '0');
};

TD.setBestWave = function setBestWave(mapId, wave) {
  const prev = TD.getBestWave(mapId);
  if (wave > prev) localStorage.setItem('bestWave_' + mapId, wave);
};

TD.getBestTime = function getBestTime(mapId) {
  return parseFloat(localStorage.getItem('bestTime_' + mapId) || '0');
};

TD.setBestTime = function setBestTime(mapId, sec) {
  const prev = TD.getBestTime(mapId);
  if (prev === 0 || sec < prev) localStorage.setItem('bestTime_' + mapId, sec.toFixed(1));
};

TD.cycleMenuMap = function cycleMenuMap(dir) {
  const ids = TD.MAP_IDS;
  const i = ids.indexOf(TD.run.menuMap);
  TD.run.menuMap = ids[(i + dir + ids.length) % ids.length];
};

TD.cycleMenuDifficulty = function cycleMenuDifficulty() {
  TD.run.menuDifficulty = TD.run.menuDifficulty === 'easy' ? 'normal' : 'easy';
};

TD.loadMap('meadow');
})();