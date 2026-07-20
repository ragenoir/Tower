(() => {
'use strict';
const S = window.__TDG_S;
const px = window.TDG.px;
const pal = window.TDG.pal;
Object.assign(window.TDG, {
  drawGrassTile(x, y, col, row) {
    const p = pal();
    const base = p.grass[(col + row) % 3];
    px(x, y, S.TILE, S.TILE, base);
    if ((col * 3 + row * 7) % 11 === 0) px(x + 2, y + 2, 1, 1, p.grass[(col + row + 1) % 3]);
    if ((col + row) % 5 === 0) px(x + 10, y + 11, 2, 1, p.grass[(col + row + 2) % 3]);
  },

  drawRoadTile(x, y, col, row, rows) {
    const p = pal();
    const ir = (c, r) => window.TDG.isRoad(rows, c, r);
    const h = ir(col - 1, row) && ir(col + 1, row);
    const v = ir(col, row - 1) && ir(col, row + 1);
    px(x, y, S.TILE, S.TILE, p.roadEdge);
    px(x + 1, y + 1, S.TILE - 2, S.TILE - 2, p.road);
    px(x + 2, y + 2, S.TILE - 4, S.TILE - 4, p.roadDark);
    if (h) {
      px(x + 3, y + 7, S.TILE - 6, 2, p.roadHi);
      if ((col + row) % 3 === 0) px(x + 6, y + 7, 2, 2, 'rgba(90,70,30,0.35)');
    } else if (v) {
      px(x + 7, y + 3, 2, S.TILE - 6, p.roadHi);
      if ((col + row) % 3 === 0) px(x + 7, y + 6, 2, 2, 'rgba(90,70,30,0.35)');
    } else {
      px(x + 5, y + 5, S.TILE - 10, S.TILE - 10, p.roadHi);
    }
    if (!ir(col - 1, row)) px(x, y + 2, 2, S.TILE - 4, p.roadEdge);
    if (!ir(col + 1, row)) px(x + S.TILE - 2, y + 2, 2, S.TILE - 4, p.roadEdge);
    if (!ir(col, row - 1)) px(x + 2, y, S.TILE - 4, 2, p.roadEdge);
    if (!ir(col, row + 1)) px(x + 2, y + S.TILE - 2, S.TILE - 4, 2, p.roadEdge);
  },

  drawWaterTile(x, y, col, row, pulse) {
    const wave = Math.sin(pulse * 2.5 + col * 0.7 + row * 0.5);
    if (S.theme === 'rift') {
      // Deep chasm / rift abyss look (very dark + subtle energy)
      px(x, y, S.TILE, S.TILE, '#151f28');
      px(x + 1, y + 1, S.TILE - 2, S.TILE - 2, wave > 0 ? '#1f2f3a' : '#18252f');
      px(x + 2, y + 5 + (wave > 0.2 ? 1 : 0), S.TILE - 5, 2, 'rgba(60,95,125,0.15)');
      if ((col + row) % 4 === 0) px(x + 3, y + 10, 4, 1, 'rgba(35,55,75,0.4)');
      return;
    }
    if (S.theme === 'conflux') {
      // Arcane pools
      px(x, y, S.TILE, S.TILE, '#1a1430');
      px(x + 1, y + 1, S.TILE - 2, S.TILE - 2, wave > 0 ? '#2a2050' : '#221a42');
      px(x + 3, y + 4 + (wave > 0.3 ? 1 : 0), S.TILE - 6, 3, 'rgba(180,140,255,0.28)');
      px(x + 8, y + 9, 3, 2, 'rgba(220,200,255,0.18)');
      return;
    }
    px(x, y, S.TILE, S.TILE, '#2a4a62');
    px(x + 1, y + 1, S.TILE - 2, S.TILE - 2, wave > 0 ? '#3a6a8a' : '#325a78');
    px(x + 3, y + 4 + (wave > 0.3 ? 1 : 0), S.TILE - 6, 3, 'rgba(180,220,255,0.25)');
    px(x + 8, y + 9, 3, 2, 'rgba(255,255,255,0.15)');
  },

  drawBushTile(x, y, col, row) {
    const p = pal();
    px(x, y, S.TILE, S.TILE, p.grass[(col + row) % 3]);
    px(x + 3, y + 8, 10, 6, p.bush);
    px(x + 5, y + 5, 6, 5, p.bush);
    px(x + 6, y + 3, 4, 3, '#4a9a4a');
    if (S.theme === 'canyon') px(x + 7, y + 4, 2, 2, p.flower);
  },

  drawSpawnPortal(x, y, pulse) {
    const r = 9 + Math.sin(pulse * 4) * 1.5;
    S.ctx.strokeStyle = 'rgba(200,181,96,0.45)'; S.ctx.lineWidth = 1;
    S.ctx.beginPath(); S.ctx.arc(x, y, r, 0, Math.PI * 2); S.ctx.stroke();
    S.ctx.strokeStyle = 'rgba(140,100,220,0.25)'; S.ctx.lineWidth = 1;
    S.ctx.beginPath(); S.ctx.arc(x, y, r + 4 + Math.sin(pulse * 6) * 2, 0, Math.PI * 2); S.ctx.stroke();
    px(x - 3, y - 3, 6, 6, 'rgba(80,60,120,0.5)');
    px(x - 1, y - 5, 2, 8, S.C.gold);
    px(x - 4, y - 1, 8, 2, S.C.gold);
    const spin = Math.floor(pulse * 8) % 4;
    px(x - 1 + (spin === 1 ? 1 : 0), y - 1 + (spin === 2 ? 1 : 0), 2, 2, '#fff8');
  },

  drawMap(data) {
    const { rows, deco, pathStart, pathEnd, buildSlots, hoverSlot, slotPulse } = data;
    const p = pal();
    for (let row = 0; row < S.MAP_H; row++) {
      for (let col = 0; col < S.MAP_W; col++) {
        const ch = rows[row][col], x = col * S.TILE, y = row * S.TILE;
        if (ch === 'G') window.TDG.drawGrassTile(x, y, col, row);
        else if (ch === 'D') window.TDG.drawRoadTile(x, y, col, row, rows);
        else if (ch === 'W') window.TDG.drawWaterTile(x, y, col, row, slotPulse);
        else if (ch === 'B') window.TDG.drawBushTile(x, y, col, row);
      }
    }
    for (const d of deco) {
      const x = d.col * S.TILE, y = d.row * S.TILE;
      if (d.kind === 0) { px(x + 4, y + 10, 2, 2, p.flower); px(x + 3, y + 9, 1, 1, p.flowerHi); }
      else if (d.kind === 1) { px(x + 10, y + 5, 3, 2, p.rock); px(x + 9, y + 7, 4, 1, '#555'); }
      else if (d.kind === 2) { px(x + 6, y + 4, 1, 4, p.bush); px(x + 5, y + 3, 3, 2, '#4a9a4a'); }
      else { px(x + 2, y + 11, 2, 1, p.grass[(d.col + d.row + 1) % 3]); px(x + 12, y + 8, 1, 1, p.flowerHi); }
    }
    if (S.theme === 'rift') {
      const pulse = 1 + Math.sin(slotPulse * 5) * 0.2;
      const fromTile = [11, 3];
      const toTile = [4, 8];
      const drawMarker = (tx, ty) => {
        const mx = tx * S.TILE + S.TILE / 2;
        const my = ty * S.TILE + S.TILE / 2;
        S.ctx.strokeStyle = 'rgba(140,200,255,0.9)';
        S.ctx.lineWidth = 1;
        S.ctx.beginPath(); S.ctx.arc(mx, my, 5 * pulse, 0, Math.PI * 2); S.ctx.stroke();
        S.ctx.beginPath(); S.ctx.arc(mx, my, 9 * pulse, 0, Math.PI * 2); S.ctx.stroke();
        px(mx - 1, my - 1, 3, 3, '#aaddff');
      };
      drawMarker(fromTile[0], fromTile[1]);
      drawMarker(toTile[0], toTile[1]);
      const fx = fromTile[0] * S.TILE + S.TILE / 2;
      const fy = fromTile[1] * S.TILE + S.TILE / 2;
      const tx = toTile[0] * S.TILE + S.TILE / 2;
      const ty = toTile[1] * S.TILE + S.TILE / 2;
      S.ctx.strokeStyle = 'rgba(90,160,220,0.25)';
      S.ctx.lineWidth = 5;
      S.ctx.setLineDash([]);
      S.ctx.beginPath(); S.ctx.moveTo(fx, fy); S.ctx.lineTo(tx, ty); S.ctx.stroke();
      S.ctx.strokeStyle = 'rgba(160,220,255,0.7)';
      S.ctx.lineWidth = 2;
      S.ctx.setLineDash([4, 3]);
      S.ctx.beginPath(); S.ctx.moveTo(fx, fy); S.ctx.lineTo(tx, ty); S.ctx.stroke();
      S.ctx.setLineDash([]);
    }
    // Conflux portal gates (entry + exit) + dashed warp line
    if (S.theme === 'conflux' && typeof window.TD !== 'undefined') {
      const m = window.TD.MAPS && window.TD.MAPS.conflux;
      const portals = (m && m._portals) || (m && m.portals) || [];
      const pulse = 1 + Math.sin(slotPulse * 6) * 0.18;
      for (const p of portals) {
        const ft = p.fromTile || [0, 0];
        const tt = p.toTile || [0, 0];
        const fx = ft[0] * S.TILE + S.TILE / 2;
        const fy = ft[1] * S.TILE + S.TILE / 2;
        const tx = tt[0] * S.TILE + S.TILE / 2;
        const ty = tt[1] * S.TILE + S.TILE / 2;
        const gate = (gx, gy, entry) => {
          S.ctx.strokeStyle = entry ? 'rgba(180,120,255,0.95)' : 'rgba(140,220,180,0.9)';
          S.ctx.lineWidth = 1;
          S.ctx.beginPath(); S.ctx.arc(gx, gy, 6 * pulse, 0, Math.PI * 2); S.ctx.stroke();
          S.ctx.beginPath(); S.ctx.arc(gx, gy, 10 * pulse, 0, Math.PI * 2); S.ctx.stroke();
          px(gx - 2, gy - 2, 4, 4, entry ? '#c49cff' : '#8fd4a8');
        };
        gate(fx, fy, true);
        gate(tx, ty, false);
        S.ctx.strokeStyle = 'rgba(160,100,255,0.22)';
        S.ctx.lineWidth = 4;
        S.ctx.setLineDash([]);
        S.ctx.beginPath(); S.ctx.moveTo(fx, fy); S.ctx.lineTo(tx, ty); S.ctx.stroke();
        S.ctx.strokeStyle = 'rgba(200,150,255,0.65)';
        S.ctx.lineWidth = 1;
        S.ctx.setLineDash([3, 3]);
        S.ctx.beginPath(); S.ctx.moveTo(fx, fy); S.ctx.lineTo(tx, ty); S.ctx.stroke();
        S.ctx.setLineDash([]);
      }
    }
    if (pathStart) window.TDG.drawSpawnPortal(pathStart[0], pathStart[1], slotPulse);
    window.TDG.drawBaseSprite(pathEnd[0], pathEnd[1], slotPulse);
    for (const slot of buildSlots) {
      if (slot.tower) continue;
      const hov = hoverSlot === slot;
      const pulse = hov ? 1 + Math.sin(slotPulse * 6) * 0.15 : 1 + Math.sin(slotPulse * 2 + slot.tx) * 0.04;
      const r = 7 * pulse;
      S.ctx.strokeStyle = hov ? S.C.slotHover : S.C.slot;
      S.ctx.lineWidth = 1;
      S.ctx.setLineDash([2, 2]);
      S.ctx.beginPath(); S.ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2); S.ctx.stroke();
      S.ctx.setLineDash([]);
      px(slot.x - 2, slot.y - 2, 4, 4, hov ? '#4a8a42' : '#2a4a22');
      if (hov) {
        S.ctx.globalAlpha = 0.25 + Math.sin(slotPulse * 8) * 0.1;
        S.ctx.fillStyle = S.C.gold;
        S.ctx.beginPath(); S.ctx.arc(slot.x, slot.y, r + 2, 0, Math.PI * 2); S.ctx.fill();
        S.ctx.globalAlpha = 1;
      }
    }
  },

  drawBaseSprite(x, y, animTime = 0) {
    const p = pal();
    const flag = Math.sin(animTime * 5) * 2;
    px(x - 12, y - 8, 24, 16, S.C.shadow);
    px(x - 10, y - 14, 20, 14,
      S.theme === 'canyon' ? '#6a5040'
        : S.theme === 'rift' ? '#2a3a48'
        : S.theme === 'conflux' ? '#3a2a58'
        : S.C.base);
    px(x - 8, y - 12, 16, 10, S.C.accent);
    px(x - 2, y - 18, 4, 8, '#6a4a2a');
    px(x - 4 + flag, y - 20, 8, 3, S.C.baseDmg);
    px(x - 6, y - 6, 4, 6, '#3a6a4a');
    px(x + 2, y - 6, 4, 6, '#3a6a4a');
    px(x - 10, y + 2, 20, 4, p.roadDark);
    if (S.theme === 'canyon') {
      px(x - 8, y - 16, 3, 6, p.road); px(x + 5, y - 16, 3, 6, p.road);
    }
    const torch = Math.sin(animTime * 10) > 0;
    px(x - 9, y - 8, 2, 2, torch ? '#ffaa44' : '#cc6622');
    px(x + 7, y - 8, 2, 2, torch ? '#ffaa44' : '#cc6622');
  },

});
})();
