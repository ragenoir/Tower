# Tower Defense (browser, no build step)

Pixel TD — 4 maps (Rift air/ground), 5 towers, seeded variants, Campaign + Endless, share + daily + PWA. Open `index.html` (http(s) for SW).

## Layout
```
index.html  manifest.json  sw.js  icon-192.png  CHANGELOG.md
js/config.js  i18n  data/*  events  maps/*  storage  achievements  audio
js/share.js  game.js  demo.js  ui.js  debug.js  main.js
graphics/*  scripts/smoke.js
BLUEPRINT.md  IDEAS.md
```

## Script order
config → i18n → data/* → events → maps/* → storage → achievements → audio → graphics/* → **share → game → demo** → ui → debug → main.  
Locale: default **en**, **uk** if `navigator.languages[0]` is Ukrainian.

## Features
- Campaign 15 waves/map; Endless; stars/records; 8 achievements; v badge in menu
- Easy/Normal; 3★ = full HP, no sell, no pause
- Towers: Arrow/Frost/Sniper/Cannon(g)/Flak(a); target modes (T); integrity (campaign chip-only)
- Seeded variants + Daily challenge; deep links `?map=&mode=&diff=&seed=&autostart=1`
- Results: Copy text + PNG; demo F4/`?demo=1`; procedural audio; PWA on http(s)

## Controls
Menu: ←→ map · ↑↓ mode · Q difficulty · Seed/Daily · Space start · R reroll  
Game: click · N wave · T target · R sell · V vol · 1-3 speed · Results: Copy/PNG

## Dev
`node scripts/smoke.js` — load + maps×4, share/demo modules, seed-stable waves, volume layout, destroy policy

## Edit guide (for AI)
| Area | Files |
|------|-------|
| Balance / waves | `js/data/*.js`, `js/maps/<id>.js` |
| Core loop / combat | `js/game.js` |
| Demo AI | `js/demo.js` |
| Share / seeds / deep links | `js/share.js` |
| Locale / HUD / menu | `js/i18n.js`, `js/ui.js` |
| Audio | `js/audio.js` |
| PWA | `manifest.json`, `sw.js` |

## Current Intent (2026-07-20)
Tech debt slice ✓ (demo/share split, smoke, changelog). **Publish later**. Next: content or polish.

**Update this file** on structure changes. Max **50 lines**.
