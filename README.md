# Tower Defense (browser, no build step)

Pixel TD — 4 maps (Rift: air/ground split), 5 towers (incl. Flak), seeded variants, Campaign + Endless, share + daily + PWA. Open `index.html` (or host for SW).

## Layout
```
index.html  manifest.json  sw.js  icon-192.png
js/config.js  js/i18n.js  js/data/*  js/events.js  js/maps/*  js/storage.js
js/achievements.js  js/audio.js  js/game.js  js/ui.js  js/debug.js  js/main.js
graphics/*  scripts/smoke.js
BLUEPRINT.md  IDEAS.md
```

## Script order
config → i18n → data/* → events → maps/* → storage → achievements → audio → graphics/* → game → ui → debug → main. Locale: default **en**, **uk** if `navigator.languages[0]` is Ukrainian (`js/i18n.js`, `TD.t`).

## Features
- Campaign 15 waves/map; Endless; per-map stars/wave/time/endless records; 8 achievements
- Easy/Normal (Q); 3★ = full HP, no sell, no pause
- Towers: Arrow/Frost/Sniper (all), Cannon (ground), Flak (air); target modes (T); integrity/repair
- Seeded variants + **Daily challenge** (date seed + rotating map); `?map=&mode=&diff=&seed=&autostart=1`
- Results: **Copy text** + **Save PNG** share card (deep link in text)
- Demo F4 / `?demo=1`; procedural audio (map pools + tension); PWA when served over http(s)
- Mobile: fullscreen, touch pads, visualViewport, rotate hint

## Controls
Menu: ←→ map · ↑↓ mode · Q difficulty · Variant / Daily · Space start · R reroll seed  
Game: click · RMB/× cancel · N wave · T target · R sell · V vol · 1-3 speed  
Results: Copy / PNG · Space menu · Demo: F4 · Debug: F3 · `?debug=1`

## Dev
`node scripts/smoke.js` — syntax + load; maps×4, towers×5, share/deep-link/daily, seed-stable waves, i18n en

## Edit guide (for AI)
| Area | Files |
|------|-------|
| Balance / waves | `js/data/*.js`, `js/maps/<id>.js` |
| Locale / UI text | `js/i18n.js`, `js/ui.js`, `js/achievements.js` |
| Share / deep links | `js/game.js` (format/link), `js/ui.js` (results), `js/config.js` |
| Audio | `js/audio.js` |
| PWA | `manifest.json`, `sw.js`, `index.html` |
| Graphics | `graphics/*.js` |

## Current Intent (2026-07-20)
Ship loop: git ✓ · share/daily/deep/PWA ✓ · tower siege seeded + campaign chip-only ✓ · volume layout exclusive ✓  
Next: **publish** (GH Pages / itch) · then content.

**Update this file** on structure changes. Max **50 lines**.
