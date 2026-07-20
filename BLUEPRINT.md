# Project Blueprint — Small Instant-Play Games
> Derived from the development of **Tower Defense** (2026).  
> A living template to start, run, and ship similar projects (zero-dependency browser experiences, pixel games, tools, toys).

**Purpose**: Capture *how* we build these projects — the constraints, process, patterns, and habits that made Tower coherent, fun to iterate, and potentially viral — so the next project starts with the same discipline instead of rediscovering it.

**Two ways to use this document**:
- As a reference the AI consults while we build (Progressive Mode — see section 5b). You don't have to fill anything first.
- As a structured template you can fill when you prefer more up-front clarity.

---

## 1. One-Sentence Vision + Constraints Canvas

**Template**
```
We are building [one-sentence pitch] for [audience] that can be experienced instantly by opening a single file (no install, no build).
Hard constraints: [list 4-6 non-negotiables]
Success looks like: [3-5 measurable or feel-based outcomes]
```

**Tower example**
- Pitch: "Pixel tower defense with standout procedural audio, 4 maps, campaign+endless, perfect 3★ runs, instantly playable in any browser."
- Hard constraints:
  - Zero dependencies, single `index.html` + folder of JS. Open directly.
  - Fixed logical size 384×288 (pixel art, no dynamic world resize).
  - Bilingual from day 1 (en default, uk via navigator).
  - Full keyboard + touch (no mouse-only).
  - All state in localStorage or URL; no server required.
  - Demo/attract mode works as passive showcase.
- Success: people open it, stay for a full run, share a seed or screenshot, come back for 3★, feel the audio.

**Questions to answer at kickoff** (steal from IDEAS.md style):
- Who is the audience?
- What is the *one* thing we double-down on (audio, feel, shareability, depth...)?
- What must never be added (build step, heavy assets, accounts...)?

---

## 2. Core Principles (The "Why" that survives features)

From Tower these proved valuable:

1. **Instant & Embeddable** — The barrier to first play must be one click/double-click. This dictates architecture.
2. **Procedural where it creates personality** — Audio was the standout. Seeded variants, tension, ducking. Same for future "magic" systems.
3. **Data-driven content** — Maps, waves, towers, enemies live in clean data + small pipeline. Easy to add without touching core.
4. **Self-documenting & AI-friendly** — README always accurate, "Edit guide" table, smoke tests act as executable contract.
5. **Shareable moments & loops** — Seeds, results text/PNG, deep links, demo that shows value. Virality designed in, not bolted on.
6. **Small surface, high polish** — Fixed canvas + retro pixels + tight feedback > scope creep.
7. **Local-first + graceful export** — Player owns their progress. Export buttons are table stakes.
8. **Demo mode as product feature** — Not just dev tool. F4 / ?demo=1 turns the game into its own trailer.

Write your project's version of this list early. Revisit when adding scope.

---

## 3. Recommended Structure & Loading Discipline

**Standard layout (Tower evolved toward this)**

```
index.html
js/
  config.js          # constants, sizes, DIFFICULTY, global flags, URL params
  i18n.js
  events.js          # simple bus (emit/on)
  data/
    towers.js
    enemies.js
    waves*.js
  maps/
    pipeline.js      # corners → rows, slots, waypoints (shared)
    meadow.js etc.   # corners + bushes + water + themed data
    validate.js
    index.js         # assemble + validation
  storage.js
  achievements.js
  audio.js           # procedural music + sfx (often the star)
  share.js           # seeds, deep links, share text/PNG, daily
  game.js            # core loop, run state, combat
  demo.js            # attract-mode AI (optional for forks)
  ui.js
  debug.js
  main.js            # input, init, top level
graphics/
  state.js
  map.js
  units.js
  fx.js
scripts/
  smoke.js           # node smoke test (vm + assertions)
CHANGELOG.md
README.md            # ≤50 lines, update on every structural change
IDEAS.md             # living backlog + reviews + questions (date sections)
BLUEPRINT.md         # this file (or link to central copy)
```

**Critical: Script order is part of architecture**
Document it explicitly (see README). Changing load order breaks globals or init assumptions.

**Tower pattern**:
config → i18n → data → events → maps/* → storage → achievements → audio → graphics → share → game → demo → ui → debug → main

---

## 4. Documentation Rules (Non-Negotiable)

- **README.md**: Concise. Current structure, script order, features summary, controls, dev commands, **Edit guide table** for AI/future self.
  - Rule: Max ~45-50 lines. If it grows, split or tighten.
  - Always update when structure or public API changes.
- **IDEAS.md** (or BACKLOG.md): After any significant review or completion, write a dated section:
  - Current state snapshot
  - Strengths to double down
  - Categorized ideas (Polish, Content, Balance, Viral, Tech)
  - Prioritized "Starter Pack" (3-6 items)
  - Open questions for the human
- **Inline comments**: Especially "why" decisions (fixed size, TOWER_DAMAGE_ENABLED currently true with low mult — re-evaluate for 3★ fairness).
- **Edit guide**: Table of "if you change X, touch these files".

**Tower habit**: The AI was told "full review of README + implemented code" before suggesting. Replicate this.

---

## 5. AI / Solo + AI Collaboration Workflow (What Worked)

Proven loop:

1. **Context injection** — "Read README fully, look at key files, run smoke if possible."
2. **Full review mode** — Ask for current state summary + strengths/weaknesses before new work.
3. **Prioritized output** — Always end with "Recommended first 4-6 things" + clear questions.
4. **Small verifiable steps** — One area, one file group. Update docs in same change.
5. **Smoke as contract** — Add assertions when adding maps/towers/achievements. The test must stay green.
6. **Living docs over memory** — If it's not in README/IDEAS/code comments, it will be forgotten.
7. **"Update this file" reminders** at the bottom of README.

**Prompt seeds that produced good results here**:
- "Based on full review of README + implemented code (date)"
- "Prioritized Starters"
- "Suggested Questions (to discover the next best ideas)"
- "Edit guide (for AI)" table

Capture the prompts/styles that work for *you* in this document for the next project.

---

## 5b. Progressive Discovery Mode with AI (Recommended for New Projects)

**Philosophy**: You do **not** need to fill this BLUEPRINT.md (or even section 1) before starting to build.  
The document is primarily **reference material for the AI**.  
We discover vision, constraints, architecture, and priorities **through conversation and small slices of actual work**.

This mode matches how many people (including the author of Tower) prefer to work: have a rough idea → start making something → let important questions emerge when they matter.

### AI Rules of Engagement (Progressive Mode)

When the user starts a session with a prompt referencing this mode, the AI **must** follow these rules:

1. **Start light** — First actions:
   - Read `BLUEPRINT.md` in full.
   - Explore the current folder state (files present, read README if exists, check for any existing code).
   - Give a short neutral summary: "Current state of the project folder (3-5 sentences)."
   - Do **not** immediately demand "let's fill the vision and constraints".

2. **Ask questions contextually**, not all at once:
   - Ask 1–4 sharp questions only when they are relevant to the next decision or when ambiguity is blocking progress.
   - Good moments to surface questions: after the first tiny playable thing, when choosing persistence strategy, when thinking about the "magic" differentiator, before scaling a system, when designing results/sharing.
   - Never open with a giant questionnaire.

3. **Proposal-first, questions-second**:
   - Preferred pattern: "Here's a small safe next step I recommend. This is how I'd do the first slice. Does this direction feel right? A few questions: ..."

4. **Maintain lightweight memory**:
   - Help keep a short running record (usually 1 small section at the bottom of `README.md` called "## Current Intent & Open Questions", or a tiny `DECISIONS.md`).
   - Update it at the end of sessions instead of forcing the user to maintain a big document.

5. **Respect the spirit of the Blueprint**:
   - Reference principles, checklists, and pitfalls from this file when relevant.
   - Push for the habits that worked (tiny steps, update README on structure change, smoke tests early if it fits the project, think about shareable moments early).
   - But don't turn "following the blueprint" into busywork.

6. **End-of-step ritual** (important):
   - Short summary of what changed/decided.
   - List of currently open high-leverage questions (max 5).
   - 1–3 concrete suggested next actions (with different risk levels if useful).

### Useful Question Categories (ask when relevant, not all at kickoff)

**Vision & Scope**
- What is the one thing this project should feel uniquely good at?
- Who is the main person we want to delight in the first 2 minutes?

**Constraints (surface gradually)**
- Must it stay zero-dependency / single file openable?
- Any hard limits on size, tech, or "no accounts / no server"?
- Is mobile/touch first-class or nice-to-have?

**The Magic**
- What should be the "standout" procedural or feel element (like audio was for Tower)?
- What moment do we want people to want to record or share?

**Distribution & Loops**
- How should someone discover or come back to this?
- What would a "shareable moment" or deep link look like?

**Process**
- How much documentation do you want during active building vs after a slice works?
- Do you prefer very small commits/slices or are you ok with slightly larger explorations?

### Lightweight Tracking Recommendation

Instead of a full `IDEAS.md` from day 0, many projects do well with:

- Tiny `README.md` that grows
- A section at the bottom:
  ```markdown
  ## Current Intent (updated YYYY-MM-DD)
  Rough goal: ...
  Known hard constraints so far: ...
  What felt good in the last slice: ...
  Open questions:
  - ...
  ```

Later, when the project has a playable core, you can do a proper dated review entry in `IDEAS.md` or similar.

---

## 6. Key Implementation Patterns to Reuse

| Pattern              | Why it mattered in Tower                  | How to generalize                  | Files to copy/study          |
|----------------------|-------------------------------------------|------------------------------------|------------------------------|
| Map pipeline         | Corners + bushes + auto slots + validation | New project with paths/levels     | maps/pipeline.js, validate.js |
| Procedural audio     | Unique identity, zero assets, tension     | Any game where sound = soul       | audio.js (full)             |
| Seeded variants      | Replayability + shareable challenges      | Daily/seed deep links             | ?seed=, getWaveDef jitter   |
| URL as state/API     | ?demo, ?debug, ?seed, ?map...             | Deep links everywhere             | config + main               |
| localStorage records + ach | Progression without backend            | Always add export button          | storage.js, achievements.js |
| Dual input           | Touch pad + keyboard + RMB cancel         | Mobile is first class             | ui.js, main.js, config TOUCH|
| Demo/attract mode    | Passive marketing + dev tool              | Make it pretty and informative    | game.js demo logic, F4      |
| Results + share hooks| Viral loop                                | Plan share (text + canvas PNG)    | ui results screen           |
| Data tables          | Easy balance, easy extension              | Keep core thin                    | js/data/*                   |
| Bus (events)         | Loose coupling (sfx, music, toasts)       | Use early                         | events.js                   |

Add your own rows as you discover them.

---

## 7. Testing Strategy

- **Smoke test (mandatory)**: `node scripts/smoke.js`
  - Syntax + load in vm
  - Count checks (maps, towers, waves, ach, audio, i18n, path)
  - Specific behavior (air/ground, validation.ok)
  - Extend on every new content type.
- **Manual via demo**: `?demo=1` or F4. Fast loop for balance and feel.
- **Map validation**: Separate validate step on load.
- **Human checklist**: 3★ possible on Normal? Volume reaches 0 and 1? Touch works without zoom? Seeds deterministic?

---

## 8. Virality & Distribution as Architecture, Not Marketing

Tower treated shareability as a core feature:

- Results screen designed for bragging (stars, time, combo, sells/pauses)
- Seed + reroll visible and copyable
- Deep link support (`?map=...&mode=endless&seed=...`)
- Demo mode as embeddable trailer
- Zero deps → perfect for itch.io embeds and "open index.html"
- Planned (in IDEAS): share text + auto PNG card, daily challenge (date seed), PWA

**Template questions**:
- What is the "clip" or "shareable moment" for this project?
- How does a player challenge a friend without accounts?
- What does the "attract" version look like?

---

## 9. Content & Feature Addition Checklists

### Adding a new map
- [ ] Define corners, bushes, water, slotCount, theme modifiers in `js/maps/<name>.js`
- [ ] Create `waves-<name>.js` (15 waves for campaign) or reuse
- [ ] Wire in `js/maps/index.js`
- [ ] Run smoke + manual validation
- [ ] Update README map count + edit guide if needed
- [ ] Add i18n keys + records handling
- [ ] Consider themed audio pool entries

### Adding a tower
- [ ] `js/data/towers.js` entry + balance
- [ ] Targeting + projectile + draw logic
- [ ] Air/ground flags + canTowerHit
- [ ] Tooltip strings
- [ ] Smoke assertions
- [ ] Test in editor (E) + real runs

### Adding i18n
- [ ] Add to both `en` and `uk` objects in `js/i18n.js`
- [ ] Use `TD.t('key', {vars})` everywhere
- [ ] Test locale switch (fake UA nav or manual)
- [ ] Check that new UI text doesn't break layout

### Adding achievement
- [ ] Add to `TD.ACHIEVEMENTS` array
- [ ] Strings + unlock condition in game flow
- [ ] Smoke count check
- [ ] Toast + sfx already wired

### Adding audio track or SFX
- [ ] Define in `MUSIC_TRACKS` or `SFX`
- [ ] Wire `selectMusicTrack` / tension if map-specific
- [ ] Test volume 0 / cycle / ducking
- [ ] Update smoke if new public fn

---

## 10. Common Pitfalls & Lessons from Tower

- Volume slider edge cases (steps, % label, full range) — fix early, test live.
- Fixed canvas decision has ripple effects (don't resize maps later).
- Tutorial hints and target mode (T) need explicit one-time teaching.
- Perfect 3★ is sacred for some players — don't accidentally make it impossible with "fun" mutations.
- Demo mode decision timer is powerful for pacing — tune it.
- localStorage only: always provide visible export of progress/records.
- README rot is real — enforce "update this file" discipline.
- "More content" is tempting; polish + share loops often give higher ROI first.
- Tower damage / destruction is seductive but high risk — gate behind flag + tiny mult.
- Bilingual strings must be considered when writing *new* UI, not retrofitted.

Add every painful or "almost missed" thing here for the next project.

---

## 11. Onboarding for Next Time (Self + AI + Teammate)

**To start working on this project**:
1. Open `README.md` and read completely.
2. Run `node scripts/smoke.js` — it must pass (if it exists).
3. Open the main file (e.g. `index.html`).
4. Read the relevant section of `BLUEPRINT.md`.
5. Look at latest notes / open questions.
6. Only then propose or implement changes.

**For brand new / empty projects (Progressive Mode)**:
- The main instruction lives in the starter prompt (see section 13).
- The AI should explore whatever exists (even if almost nothing) and not require prior documentation.

**For AI sessions**:
- "Perform a full review of README + current code + BLUEPRINT principles."
- "Propose a small starter pack and 3-5 questions."
- "Update docs and smoke as part of the change."

**Progressive mode (preferred for brand new projects)**:
See the dedicated section below. The AI should ask targeted questions during work rather than requiring you to fill sections upfront.

---

## 12. Post-Ship / Evolution

- Version the save format if localStorage shape changes.
- Keep smoke + validation as the gate for new content.
- Revisit virality levers after real players (what actually gets shared?).
- Consider "chill audio mode", reduced motion, colorblind support when they stop being optional.
- When the project grows beyond "small", decide explicitly what constraints to relax (and document the trade-off).

---

## 13. How to Use This Blueprint for a Brand New Project

There are two recommended paths. Choose based on your preference.

### Path A — Structured Quick Start (classic)
1. Copy `BLUEPRINT.md` + a minimal `README.md` + smoke test pattern.
2. Spend 10-15 minutes filling a rough **Vision + Constraints** (section 1 style).
3. Identify your "standout magic" early.
4. Set up basic folder + script loading discipline.
5. Build the first tiny slice.

### Path B — Progressive Discovery (recommended when you don't want to design upfront)
1. Copy `BLUEPRINT.md` into the new folder.
2. Create a very minimal `README.md` (just title + "Open index.html" or equivalent).
3. Start working with the AI using a **progressive prompt** (see the prompt template below).
4. Let vision, constraints, and priorities emerge through small experiments and conversations.
5. The AI will ask relevant questions as decisions arise.
6. After you have a first playable slice, optionally do a short review and capture what you learned.

**Key rule for Path B**: The human does **not** pre-fill BLUEPRINT.md. The AI uses it as reference and asks questions opportunistically.

**Best starter prompt for Path B** (copy-paste this at the beginning of a new project / new chat):

```
You are an expert technical collaborator.

This is a brand new small instant-play project. We will use Progressive Discovery Mode as described in BLUEPRINT.md section "5b".

Mandatory first actions for you:
1. Read the entire BLUEPRINT.md file in this folder.
2. List and briefly inspect current files in the project directory.
3. Read the README.md if it exists.
4. Output a very short neutral summary of the current project state (3-5 sentences max). Do not lecture.

Working rules (strict):
- Never ask me to pre-fill Vision, Constraints, or the whole blueprint.
- Work in small, concrete steps. Prefer proposing a tiny slice I can try immediately.
- Ask only 1-4 sharp, relevant questions at a time — and only when they help with the immediate next decision or clarify direction.
- Actively reference relevant parts of BLUEPRINT (Core Principles, patterns, checklists, pitfalls) when they apply.
- At the end of any meaningful piece of work, always end with:
  - Short "What we did / decided" summary
  - Current open high-leverage questions (maximum 5, or "none right now")
  - 1-3 concrete suggested next actions (with different effort levels if useful)
- Gently help maintain a lightweight record of intent and open questions (usually by editing a small section in README.md).

My current rough starting idea (can be vague):
[Write 1-3 sentences here about what you want to build or explore]

Let's start.
```

You can (and should) evolve this prompt over time and update the copy in BLUEPRINT.md.

**Optional artifacts to extract later**:
- `templates/` folder with minimal map.js, tower entry, audio track boilerplate.
- A tiny `new-project.sh` that scaffolds the layout.
- Centralized copy of this BLUEPRINT in a "playbooks" repo.

**Recommended starter prompt** (for Path B) is included just above. Paste it when you open a new chat/session with the AI for this project.

---

## Appendix: Tower-Specific Snapshot (2026-07-20, v1.2.0 published)

- **Repo:** https://github.com/ragenoir/Tower · **Play:** https://ragenoir.github.io/Tower/ (Pages from `main` / root)
- 4 maps (meadow, canyon, ruins, rift — air/ground split)
- 5 towers (Arrow, Frost, Sniper, Cannon ground-only, Flak air-only)
- 15-wave campaign + Endless; tower siege (seeded; campaign chip-only, endless destroy)
- 8 achievements (all_maps = all 4 maps)
- Procedural audio; seeded variants + daily challenge
- Deep links / share / PWA; modules: `share.js`, `game.js`, `demo.js`
- No build. `node scripts/smoke.js`. Git + CHANGELOG. Optional itch zip via `itch-embed.txt`.

Update or fork this section when forking the blueprint.

---

**Last rule**: This document only has value if it is shorter and more useful than "just remember what we did last time". Keep it tight. Update when the process itself evolves.

Update this file when core habits or constraints change for the family of projects.
