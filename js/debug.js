(() => {
'use strict';
const TD = window.TD;
const r = () => TD.run;

// debug flag is set early in config.js via URL params (TD.debug)
TD.mapEditor = false;
TD.editorLog = [];

TD.toggleDebug = function toggleDebug() {
  TD.debug = !TD.debug;
};

TD.toggleMapEditor = function toggleMapEditor() {
  TD.mapEditor = !TD.mapEditor;
  TD.editorLog = [];
};

TD.drawDebugOverlay = function drawDebugOverlay() {
  if (!TD.debug) return;
  const ctx = TD.ctx;
  ctx.save();

  ctx.strokeStyle = 'rgba(255,80,80,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < TD.PATH_WAYPOINTS.length; i++) {
    const [x, y] = TD.PATH_WAYPOINTS[i];
    ctx.moveTo(x, y);
    if (i > 0) ctx.lineTo(TD.PATH_WAYPOINTS[i - 1][0], TD.PATH_WAYPOINTS[i - 1][1]);
    ctx.fillStyle = i === 0 ? '#44ff44' : i === TD.PATH_WAYPOINTS.length - 1 ? '#ff4444' : '#ffaa44';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.stroke();

  TD.BUILD_SLOTS.forEach((slot, i) => {
    ctx.strokeStyle = 'rgba(100,200,255,0.6)';
    ctx.strokeRect(slot.tx * TD.TILE, slot.ty * TD.TILE, TD.TILE, TD.TILE);
    ctx.fillStyle = '#aaf';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('' + i, slot.x, slot.y + 2);
  });

  const m = TD.MAPS[TD.currentMapId];
  if (m?.validation) {
    const v = m.validation;
    let ty = 12;
    ctx.textAlign = 'left';
    ctx.font = '7px monospace';
    ctx.fillStyle = v.ok ? '#8f8' : '#f88';
    ctx.fillText('DEBUG ' + TD.currentMapId + (v.ok ? ' OK' : ' ERR'), 4, ty);
    ty += 10;
    for (const e of v.errors) { ctx.fillStyle = '#f88'; ctx.fillText('! ' + e, 4, ty); ty += 9; }
    for (const w of v.warnings) { ctx.fillStyle = '#ff8'; ctx.fillText('? ' + w, 4, ty); ty += 9; }
  }

  ctx.fillStyle = '#888';
  ctx.font = '6px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('F3 debug · E editor', TD.W - 4, 10);

  // Tower vulnerability fantasy status (see plan)
  if (TD.debug) {
    ctx.textAlign = 'left';
    ctx.fillStyle = TD.TOWER_DAMAGE_ENABLED ? '#8f8' : '#888';
    const destroy = typeof TD.towerDamageCanDestroy === 'function' && TD.towerDamageCanDestroy() ? 'destroy' : 'chip';
    const status = TD.TOWER_DAMAGE_ENABLED
      ? ('ON mult=' + TD.TOWER_DAMAGE_CHANCE_MULT.toFixed(2) + ' ' + destroy)
      : 'OFF';
    ctx.fillText('TowerDmg: ' + status + ' (D toggle)', 4, 22);
  }

  if (TD.mapEditor) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let col = 0; col < TD.MAP_W; col++) {
      for (let row = 0; row < TD.MAP_H; row++) {
        ctx.strokeRect(col * TD.TILE, row * TD.TILE, TD.TILE, TD.TILE);
      }
    }
    const tcx = Math.floor(TD.mouseX / TD.TILE), tcy = Math.floor(TD.mouseY / TD.TILE);
    if (TD.mouseY < TD.MAP_PX_H) {
      ctx.strokeStyle = '#ff0';
      ctx.strokeRect(tcx * TD.TILE, tcy * TD.TILE, TD.TILE, TD.TILE);
      ctx.fillStyle = '#ff0';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('[' + tcx + ',' + tcy + ']', 4, TD.MAP_PX_H - 6);
    }
    TD.editorLog.slice(-4).forEach((ln, i) => {
      ctx.fillStyle = '#aaa';
      ctx.fillText(ln, 4, 24 + i * 9);
    });
  }
  ctx.restore();
};

TD.handleMapEditorClick = function handleMapEditorClick() {
  if (!TD.debug || !TD.mapEditor || TD.mouseY >= TD.MAP_PX_H) return;
  const c = Math.floor(TD.mouseX / TD.TILE), r = Math.floor(TD.mouseY / TD.TILE);
  const pt = '[' + c + ', ' + r + ']';
  TD.editorLog.push(pt);
  console.log('corner', pt);
};

})();