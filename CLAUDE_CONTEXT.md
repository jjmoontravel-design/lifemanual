# Life Manual — Claude Context File
_Share this file at the start of any new session so Claude can pick up exactly where we left off._

---

## What This App Is

**Life Manual** is a Progressive Web App (PWA) hosted at:
`https://jjmoontravel-design.github.io/lifemanual/`

It is a daily life-skills app for young people. The idea: instead of figuring out adult life alone, this app guides users through 118 real-life skills (cooking, budgeting, car care, health, etc.) organized by age range. Think of it as a personal life coach in your pocket.

**Owner:** The user (non-programmer). Claude writes all the code.
**Repo:** `https://github.com/jjmoontravel-design/lifemanual`
**Local folder:** `C:\Users\snapa\lifemanual\`
**Deploy:** Push to `main` branch → GitHub Pages auto-deploys (takes ~1-2 min for CDN)

---

## Tech Stack

- Pure HTML/CSS/JS — single file app (`index.html` — 3500+ lines)
- No frameworks, no build tools
- PWA with service worker (`sw.js`) for offline support and caching
- Data split into separate JS files loaded at runtime:
  - `data-journey.js` — skill content
  - `data-daily.js` — daily task data
  - `data-guides.js` — guide content
  - `data-interests.js` — interest categories
  - `data-characters.js` — character definitions
  - `data-replies.js` — AI-style reply text
- State saved to `localStorage` via `saveAll()` / loaded via `loadAll()`
- Service worker version string in `sw.js` line 1: bump `lifemanual-vN` on every deploy to force cache invalidation

---

## App Structure (Tabs)

| Tab | What It Does |
|-----|-------------|
| **Today** | Daily home screen. Shows Barney (virtual pet character), mood, care stats, daily tasks, streak, coins |
| **Schedule** | Ocean-themed calendar/schedule tab. Has swimming dolphin videos as background decoration |
| **Journey** | The 118 life skills organized by category/age. Main content of the app |
| **Guides** | Step-by-step how-to guides |
| **You** | User profile, settings, interests |

---

## Virtual Pet System (Barney / Characters)

### Characters
- **Barney** (bear) — default character, has full mood animation set
- **Bunny** — second character, also has mood WebPs
- Others defined in `data-characters.js` — only use idle fallback

### Mood System
Moods are driven by 4 care stats (0–100 scale):
- `hunger` — decays 7 pts/hour
- `energy` — decays 5 pts/hour
- `happy` — decays 4 pts/hour
- `clean` — decays 3 pts/hour

Stats start at 80. Decay is calculated from last-seen timestamp (`state.pet.t`).

**`barneyMood()` function** (index.html ~line 1303) determines which clip plays:
```
hunger < 25          → "hungry"
energy < 25          → "sleep"
avg of all 4 >= 85   → "excited"
avg < 40             → "hungry"
avg >= 62            → "happy"
default              → "idle"
```

**Mood timeline for a user coming back after time away:**
- < 1 hr: happy/excited
- 2–4 hrs: idle
- 4–8 hrs: idle → hungry
- 8–11 hrs: hungry
- 11+ hrs: sleep

### Mood Clips (WebP animated files)
Each mood has an animated WebP file in the root folder:
- `barney-idle.webp`, `barney-happy.webp`, `barney-excited.webp`, `barney-hungry.webp`, `barney-sleep.webp`
- `barney-idle.png` etc. — PNG fallbacks
- Same naming for bunny: `bunny-idle.webp`, etc.

**Sleep loop fix:** Sleep WebP is finite (plays once). JS timer restarts `img.src` every 5.1 seconds to loop it.

### Mood Size Fix (CSS)
The idle clip has a tighter crop so the bear looks bigger. The other mood clips have more whitespace so the bear looks smaller. Fix: scale up the non-idle clips.

```css
/* In index.html ~line 277 */
.char-pet-img { transform-origin: center bottom; } /* base — for bounce animation */
.char-pet-img.mood-happy,
.char-pet-img.mood-excited,
.char-pet-img.mood-hungry,
.char-pet-img.mood-sleep { transform: scale(2.0); transform-origin: center center; }
```

The `transform-origin: center center` is critical — without it, scaling anchors to the bottom and heads get cut off by overflow.

### Mood CSS Classes
`switchCharMood(m)` adds class `mood-{m}` to `#charPetImg` so CSS can target by mood.
The initial class is set in the HTML template: `class="char-pet-img mood-${wasAsleep?"sleep":_m}"`

### Mood Preview Buttons
In the character showcase there are 5 buttons (Idle, Happy, Excited, Hungry, Sleep) to manually preview each clip. These call `switchCharMood('mood')`.

### GPU Compositing Fix (Slipper Glitch)
When `filter:drop-shadow` + parent `overflow:hidden` + CSS transform animation combine, transparent pixels at character edges flash the card background color. Fixed with:
```css
.char-pet-img { will-change: transform; backface-visibility: hidden; }
```

### Care System
Users spend coins to care for Barney. Care items restore specific stats.
`careItem(stat, amount, cost)` function handles this.

---

## Ocean / Schedule Tab — Dolphin Videos

### Current Setup
Three dolphin videos swim across the Schedule tab background:
```html
<video class="crit oc swim" src="dolphin-new.mp4" style="top:18%;width:180px;animation-duration:24s;mix-blend-mode:screen" autoplay loop muted playsinline></video>
<video class="crit oc swim rev" src="dolphin-new.mp4" style="top:36%;width:130px;animation-duration:30s;animation-delay:-12s;mix-blend-mode:screen" autoplay loop muted playsinline></video>
<video class="crit oc swim" src="dolphin-new.mp4" style="top:52%;width:90px;animation-duration:20s;animation-delay:-6s;mix-blend-mode:screen" autoplay loop muted playsinline></video>
```

### Why `mix-blend-mode: screen`
The dolphin video (`dolphin-new.mp4`) has a **pure black background**. With `mix-blend-mode:screen`, black pixels become fully transparent — so the dolphin appears to swim through the ocean background with no rectangle visible. This is much cleaner than canvas chroma-keying.

**Important:** This only works because the background is truly pure black (#000000). If a future dolphin video has a near-black or gray background, the rectangle will reappear.

### Dolphin File
- `dolphin-new.mp4` — 1.1MB, black background, Meta AI generated, in the lifemanual root folder
- Included in `sw.js` ASSETS array so it's cached offline

---

## Service Worker (`sw.js`)

- Current version: `lifemanual-v133` (bump this number on every deploy)
- Strategy: Network-first with cache fallback (updates show quickly, works offline)
- ASSETS array must include any new files added to the project
- Handles push notifications and alarm timers for schedule events

**Deploy process:**
1. Edit `index.html` / other files
2. Bump version in `sw.js` line 1
3. `git add`, `git commit`, `git push`
4. Wait ~60-90 seconds for GitHub Pages CDN
5. Reload browser (new SW version forces cache bust)

---

## Key Functions Reference

| Function | Location | What It Does |
|----------|----------|-------------|
| `barneyMood()` | ~line 1303 | Returns current mood string based on pet stats |
| `decayPet()` | ~line 1293 | Applies time-based stat decay since last visit |
| `ensurePet()` | ~line 1290 | Initializes pet state if missing |
| `petAvg()` | ~line 1301 | Average of all 4 pet stats |
| `switchCharMood(m)` | ~line 1862 | Switches character image + mood class + label |
| `companionImg(mood)` | ~line 1840 | Returns {webp, fallback} paths for current character + mood |
| `careItem(stat,amt,cost)` | ~line 1327 | Spends coins to restore a stat |
| `saveAll()` | — | Saves state to localStorage |
| `loadAll()` | — | Loads state from localStorage |
| `toast(msg)` | — | Shows a brief toast notification |
| `showCharacter()` | ~line 1800 | Renders the character showcase HTML |

---

## Important CSS Classes

| Class | What It Does |
|-------|-------------|
| `.char-showcase` | Card container for character display. Has `overflow:hidden` and `border-radius:26px` |
| `.char-stage` | Inner container for the character image |
| `.char-pet-img` | The character `<img>` element. 200×200, `object-fit:contain` |
| `.mood-idle` / `.mood-happy` etc. | Added to `#charPetImg` to enable per-mood CSS |
| `.char-tap` | Added on tap for bounce animation |
| `.crit.oc.swim` | Dolphin video swimming animation class |
| `.swim.rev` | Reverse direction swim (right to left) |
| `.mood-row` | Row of mood preview buttons |
| `.mood-btn.sel` | Selected mood button highlight |

---

## What's NOT Done Yet (Future Work)

- App not yet published / promoted — still in development
- Only Barney (bear) and Bunny have full mood clip sets. Other characters only show idle.
- No user accounts — everything is local to the device
- The 118 skills content may need expansion/updating
- No onboarding flow for new users
- Coins economy could be more fleshed out (currently earned by completing daily tasks)

---

## How to Continue in a New Claude Session

1. Upload this file (`CLAUDE_CONTEXT.md`) at the start of the conversation
2. Tell Claude what you want to work on next
3. Claude can read `index.html` and other files directly from `C:\Users\snapa\lifemanual\`
4. Claude can push changes to GitHub and verify them in your browser

---

_Last updated: June 2026 — SW version v133_
