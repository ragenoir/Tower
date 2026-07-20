# Tower Defense (browser, no build step)

Pixel TD — 4 maps (Rift air/ground), 5 towers, seeded variants, Campaign + Endless, share + daily + PWA.

**Repo:** [github.com/ragenoir/Tower](https://github.com/ragenoir/Tower) · **Play (Pages):** [ragenoir.github.io/Tower](https://ragenoir.github.io/Tower/) · demo: [`?demo=1`](https://ragenoir.github.io/Tower/?demo=1)

## Layout
```
index.html  manifest.json  sw.js  icon-192.png  .nojekyll  CHANGELOG.md
js/… (share · game · demo · ui · …)  graphics/*  scripts/smoke.js
BLUEPRINT.md  IDEAS.md
```

## Script order
config → i18n → data/* → events → maps/* → storage → achievements → audio → graphics/* → **share → game → demo** → ui → debug → main.  
Locale: default **en**, **uk** if `navigator.languages[0]` is Ukrainian.

## Features
- Campaign 15 waves/map; Endless; stars/records; 8 achievements; version badge
- Easy/Normal; 3★ = full HP, no sell, no pause
- Towers: Arrow/Frost/Sniper/Cannon(g)/Flak(a); integrity (campaign chip-only)
- Seeded variants + Daily; deep links `?map=&mode=&diff=&seed=&autostart=1`
- Results: Copy text + PNG; demo F4/`?demo=1`; procedural audio; PWA on http(s)

## Controls
Menu: ←→ map · ↑↓ mode · Q difficulty · Seed/Daily · Space start  
Game: click · N wave · T target · R sell · V vol · 1-3 speed · Results: Copy/PNG

## Dev / publish
`node scripts/smoke.js` · GitHub Pages from `main` · itch: zip root HTML/JS (see `itch-embed.txt`)

## Edit guide (for AI)
| Area | Files |
|------|-------|
| Balance / waves | `js/data/*.js`, `js/maps/<id>.js` |
| Core / demo / share | `js/game.js`, `js/demo.js`, `js/share.js` |
| Locale / HUD | `js/i18n.js`, `js/ui.js` |
| Audio / PWA | `js/audio.js`, `manifest.json`, `sw.js` |

## Current Intent (2026-07-20)
**Published** (GitHub Pages). Next: content (Hard / maps) or polish.

**Update this file** on structure changes. Max **50 lines**.
