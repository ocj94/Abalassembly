🇫🇷 [Version française](RECOVERY.md)

# Recovery guide

This document starts from a specific assumption: you're taking over this
project with no way to ask its creator a question. It doesn't replace the
[wiki](docs/Home.en.md) or [`CONTRIBUTING.md`](CONTRIBUTING.en.md) — it
gives the context neither one covers: where to start, what's genuinely
settled, and what isn't.

## Where to start

1. [`README.md`](README.en.md) — the overview
2. [`docs/Home.md`](docs/Home.en.md) — the wiki's table of contents, every page
3. [`docs/Architecture.md`](docs/Architecture.en.md) — the 3 diagrams (engine, data, game modes)
4. [`src/README.md`](src/README.en.md) — how the source is organized

The whole wiki exists in both French and English (a switcher link at the
top of every page).

## The principles that don't get negotiated

These aren't style preferences. They're rules that, if broken, change what
this project is:

- **Never fabricate data.** A displayed number is computed at runtime or
  sourced, never eyeballed. A missing value shows `—`, never `0` — a zero
  invents an absence the same way a made-up number invents a presence.
- **Verify before asserting.** Before claiming a bug exists, a feature is
  missing, or a figure is correct: go read the real, deployed code
  (`raw.githubusercontent.com`, not a local copy that might be stale), not
  what a README or a past conversation says.
- **One file, offline, for the player.** `index.html` must stay playable
  with no network, including opened directly from `file://` or a USB
  drive. `src/` exists for development comfort but changes nothing about
  that promise — see below for why it isn't real modules yet.
- **Document a limitation instead of staying silent about it.** The
  project has several pages that explicitly say "this doesn't work yet,
  here's why" ([`docs/Multi-worker`](docs/Moteur-multi-worker.en.md),
  [`docs/Distributed computing`](docs/Calcul-distribue.en.md)). That's a
  deliberate choice, not an admission to fix by hiding the problem.

## How the code is really organized

`board`, `currentTurn`, `humanColor`, `capturedByBlack`, and about a dozen
other global variables carry the entire game state, read and written
directly from hundreds of places (`board` alone: over 600 occurrences).
`src/` splits the code into readable files, but remains a **flat
concatenation** — no real `import`/`export`. This isn't an interrupted
effort: real modules would require tracing and fixing every caller one by
one, and missing even one doesn't fail loudly — it keeps reading the old
variable while another part of the code writes to the new one. A silent
divergence bug, not a visible error. If you ever want to genuinely tackle
this, start by precisely counting each variable's callers before touching
anything — never assume it's smaller than it looks.

**Two copies of the engine exist, deliberately**: one for the main thread,
one for the Web Worker (AI search without freezing the UI). A sync script
(see `abalassembly-api/scripts/check-engine-sync.js` and its conceptual
client-side counterpart) needs to stay green — a function updated on one
side but not the other is a real bug that has already happened once
("OPP_DIR"), not a minor style slip.

## What's genuinely still open

- **Personal leaderboard + local Elo against the AI** — never started.
- **`estMonTour()`/`monCamp()`** — the single source of truth for "who is
  the human" exists and has already fixed real, found bugs (game status,
  move hint, ejection display — all inverted for a player on White before
  the fix). It has **not** been swept exhaustively across the whole file:
  other places still hardcoding the "black = me" assumption may exist,
  unfound.
- **Score comparability across workers** — each worker has its own search
  memory, never shared (`SharedArrayBuffer` unavailable on GitHub Pages).
  Documented, not resolved.
- **Four different variant counts** (13 with a statistical book, 18 in the
  AbalOnline library, 19 across the full corpus, 20 in the playable
  gallery) — clarified in the displayed text, never unified into one if
  you genuinely want to keep only a single figure.
- **The move sequence (principal variation)** — shown for the in-game move
  hint (2 half-moves, honestly bounded to the depth actually searched),
  not for the multi-PV panel: extending every candidate shown there would
  give a reliable line for the top one and rough guesses for the rest,
  because of alpha-beta pruning.
- **Abalassembly Intelligence** — a name that comes up in discussions for
  an orchestration layer that doesn't exist yet. The capabilities (engine,
  history, fingerprints, profile, analysis, puzzles, Lab) already exist,
  each wiring up what it needs directly rather than going through a shared
  layer.

## Pitfalls already hit, so you don't repeat them

- **`console.assert` doesn't halt anything in Node.js.** A test using it
  can look like it passed when it actually failed. Always check the
  process's real exit code.
- **`raw.githubusercontent.com` has a propagation delay** after a commit
  (15 to 30 seconds observed). A 404 right after a push isn't a failure —
  retry before concluding otherwise.
- **A GitHub token should never persist** beyond the session using it —
  destroyed immediately after use, never committed, never left in a config
  file.
