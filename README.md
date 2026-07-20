# Tower Defense (browser, no build step)

Pixel TD — 4 maps (Rift: air/ground split — visible flying shortcut (dashed line + sprite lerp across chasm) + long bridge path for ground), 5 towers (incl. Flak), seeded replay variants, Campaign + Endless. Open `index.html`.

## Layout
```
index.html
js/config.js  js/i18n.js  js/data/*  js/events.js  js/maps/*  js/storage.js
js/achievements.js  js/audio.js  js/game.js  js/ui.js  js/debug.js  js/main.js
graphics/state.js  graphics/map.js  graphics/units.js  graphics/fx.js
scripts/smoke.js
BLUEPRINT.md  (process + template for future projects)
IDEAS.md      (living backlog + reviews)
```

## Script order
config → i18n → data/* → events → maps/* → storage → achievements → audio → graphics/* → game → ui → debug → main. Locale: default **en**, **uk** if `navigator.languages[0]` is Ukrainian (`js/i18n.js`, `TD.t`).

## Features
- Campaign 15 waves/map; Endless scaling; per-map stars/wave/time/endless records
- Easy/Normal (Q): +25% gold / standard; 3★ = full HP, no sell, no pause
- Towers: Arrow/Frost/Sniper (all), Cannon (ground), Flak (air); per-tower target modes (Farthest/Fastest/Strongest/Closest, T cycle); tooltips on hover
- Enemies: grunt, runner, flyer, armored (35% armor), tank, boss; red X if tower can't hit
- 8 achievements (localStorage); endless milestone +gold every 5 waves
- Audio: fully procedural; AW-style tracks (map pools + random)
- Replay variants: seeded light random on waves/enemies + seed + reroll + ?seed=
- Mobile: fullscreen (touch), larger hit areas, visualViewport, rotate hint

## Controls
Menu: ←→ map · ↑↓ mode · Q difficulty · tap Variant seed (reroll) · Space start
Game: click/tap · RMB/×/tap map cancel · N early wave · T cycle target · R sell · V vol · 1-3 speed · fullscreen icon (touch)
Demo: F4 toggle attract mode (smart AI: varied starts...) · `?demo=1` · `?seed=xxx` for variants
Debug: F3 overlay · `?debug=1` on load · E map editor (click tiles → C logs corners)

## Dev
`node scripts/smoke.js` — syntax + load; maps×4, towers×5, anti-air, 15 waves, path, achievements×8, boss SFX, i18n en

## Edit guide (for AI)
| Area | Files |
|------|-------|
| Balance / waves | `js/data/*.js`, `js/maps/<id>.js` |
| Locale / UI text | `js/i18n.js`, `js/ui.js`, `js/achievements.js`, `js/game.js` |
| Audio | `js/audio.js` |
| Touch / HUD / menu | `js/ui.js`, `js/main.js`, `js/config.js` MENU_UI/HUD |
| Graphics | `graphics/*.js` |
| Debug / editor | `js/debug.js`, `js/maps/validate.js` |

**Update this file** on structure changes. Max **45 lines**.