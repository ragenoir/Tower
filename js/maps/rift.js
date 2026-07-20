(() => {
'use strict';
const TD = window.TD = window.TD || {};
TD.mapRift = {
  id: 'rift',
  name: 'Rift',
  theme: 'rift',
  // Rift: dramatic chasm with narrow bridge.
  // Ground: long detour (right far bank + back).
  // Air: direct cross via resolved airShortcut (tile -> wp).
  // Visuals + particles make the bypass feel special. Slots clustered for side-specific defense.
  corners: [
    [2, 2], [7, 2], [7, 4], [11, 4], [11, 2], [15, 2],  // left approach + narrow upper bridge cross
    [15, 5], [20, 5], [20, 8], [3, 8],                  // far right bank + LONG ground detour back left
    [3, 10], [10, 10], [10, 12], [22, 12], [22, 13]     // lower return cross + final to base
  ],
  slotCount: 15,
  // Water = deep chasm. Clear horizontal band between upper/lower crossings.
  water: [
    [8,3],[9,3],[10,3],[11,3],[12,3],[13,3],[14,3],
    [8,4],[9,4],                   [14,4],
    [8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],
    [9,6],[10,6],[11,6],[12,6],[13,6],
    [8,7],[9,7],                   [14,7],
    [8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8]
  ],
  // Bushes sculpt banks + force nice slot clusters on left (flak side) and bridge.
  bushes: [
    [0,0],[1,1],[0,4],[1,5],
    [16,1],[17,3],[19,4],[21,6],
    [0,7],[1,9],[2,10],[16,9],[18,10],[19,11],
    [20,12],[21,12]
  ],
  // Rift-specific: air units take direct rift cross (skip far bank ground detour).
  // Use *tile* coords (human readable + stable). Resolved to wp indices at load time.
  // fromTile ≈ upper bridge cross point; toTile ≈ lower return after chasm.
  airShortcut: { fromTile: [11, 3], toTile: [4, 8] }
};
})();