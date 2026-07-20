# Changelog

## 1.1.2 — 2026-07-20
- Tech debt: extract `js/demo.js` (attract AI) and `js/share.js` (seeds, deep links, PNG/text share)
- Remove unused `graphics.js` stub
- Fix demo `isGoodChoke` temporal-dead-zone bug (early-game sniper scoring)
- Expand smoke: all-map validation, deep-link apply, module surface
- `game.js` ~1550 → ~920 lines (core loop only)

## 1.1.1 — 2026-07-20
- Tower siege: seeded RNG; campaign chip-only / endless destroy
- Volume HUD exclusive layout + % label; results screen stack fix

## 1.1.0 — 2026-07-20
- Results share (copy text + PNG card)
- Deep links `?map=&mode=&diff=&seed=&autostart=1`
- Daily challenge (date seed + rotating map)
- PWA: manifest, service worker, icon
- GA events: play_start / win / lose / share
- Git repository initialized

## 1.0.x — 2026-06-30 … 2026-07-08
- Core TD: 4 maps (Rift air/ground), 5 towers, campaign + endless
- Procedural audio, demo/attract, achievements, i18n en/uk, mobile touch
- Seeded wave variants, tower integrity system, BLUEPRINT.md
