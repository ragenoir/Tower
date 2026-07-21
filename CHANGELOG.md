# Changelog

## 1.3.1 — 2026-07-21
- Visual juice: layered kill bursts, hit sparks, muzzle flash, spark/soul particle kinds
- Tower identity: stronger L2/L3 silhouettes, outline shell, level badge
- Enemy silhouettes: clearer grunt/runner/flyer/armored/tank
- Map atmosphere: denser grass flecks, road center marks + edge contrast, theme bush accents
- Soft particle budget (~160) for late-wave stability

## 1.3.0 — 2026-07-20
- **New map: Conflux** — portal warp twist (seeded chance; bosses never warp; runners bias high)
- Purple arcane theme, portal gate visuals + WARP! banner, dedicated wave set
- Menu layout tightened for 5 map thumbnails
- Demo cycle + music pools + smoke for 5 maps / portal resolve

## 1.2.0 — 2026-07-20 (publish)
- Public repo: https://github.com/ragenoir/Tower (`origin` → `main`)
- GitHub Pages: https://ragenoir.github.io/Tower/
- itch.io: https://ragenoir.itch.io/tower (HTML browser build)
- Add `.nojekyll` for static Pages hosting
- Docs sync: README, IDEAS, BLUEPRINT, CHANGELOG for ship status
- `itch-embed.txt` notes for browser embed / zip / butler

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
