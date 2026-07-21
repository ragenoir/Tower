# Tower Defense (browser, no build step)

Pixel TD — **5 maps** (Rift air/ground · **Conflux portals**), 5 towers, seeded variants, Campaign + Endless.

**Play:** [itch.io](https://ragenoir.itch.io/tower) · [GitHub Pages](https://ragenoir.github.io/Tower/) · demo [`?demo=1`](https://ragenoir.github.io/Tower/?demo=1)  
**Repo:** [github.com/ragenoir/Tower](https://github.com/ragenoir/Tower)

## Layout
```
index.html  manifest.json  sw.js  icon-192.png  .nojekyll  CHANGELOG.md
js/… (share · game · demo · ui · maps/* · data/*)  graphics/*  scripts/smoke.js
```

## Script order
config → i18n → data/* → events → maps/* → storage → achievements → audio → graphics/* → share → game → demo → ui → debug → main.

## Features
- 5 maps · Campaign 15 waves · Endless · **Easy/Normal/Hard** · 3★ rules · 8 achievements
- **Conflux**: portal warp (seeded; runners love it; bosses walk full path)
- **Rift**: flyers shortcut the chasm
- Seeded variants + Daily · deep links · Results Copy/PNG · demo F4 · procedural audio · PWA

## Controls
Menu: ←→ map · ↑↓ mode · Q difficulty (Easy/Normal/Hard) · Seed/Daily · Space  
Game: click · N wave · T target · R sell · V vol · **audio S/C/M** · C chill · 1-3 speed

## Dev
`node scripts/smoke.js` · re-upload itch zip after content drops

## Edit guide (for AI)
| Area | Files |
|------|-------|
| New map / twist | `js/maps/<id>.js`, `waves-*.js`, `maps/index.js`, graphics theme/preview |
| Core / portals | `js/game.js` (moveEnemy), `js/maps/index.js` (loadMap resolve) |
| Demo / share | `js/demo.js`, `js/share.js` |

## Current Intent (2026-07-21)
Shipped. **v1.4.1 chill audio**. Next: itch re-upload / feedback.

**Update this file** on structure changes. Max **50 lines**.
