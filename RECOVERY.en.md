🇫🇷 [Version française](RECOVERY.fr.md)

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
- **Modular encapsulation stopped at six variables** — `GameMode`,
  `HumanColor`, `CurrentTurn`, `CapturedByBlack`/`CapturedByWhite`,
  `MoveCount` and `GameOver` sit behind a `.get()`/`.set()` interface
  (plus `.inc()`/`.dec()` for the counters). **`board` was deliberately
  left out, not forgotten.** The figures behind that decision, so nobody
  has to recompute them:
  - *Risk*: 24 scopes where `board` isn't the global — 15 local variables
    (one per Gym exercise, `const board = new Map()`) and 9 function
    parameters (`probe(board, color)`, `fromBoard(board)`,
    `gymRenderBoard(id, board, ...)`). That's 78 of the 447 affected
    lines, 17% needing exact scope boundaries. The other six variables
    had 0 or 1.
  - *Nature of the risk*: a slightly wrong boundary doesn't break syntax
    (CI would see nothing), it produces valid but wrong code — a Gym
    exercise reading the live game board instead of its own grid.
  - *Benefit*: `board` is a **mutable object**, unlike the six scalars.
    Of ~217 access sites, only the 85 reassignments would gain a real
    control point; the 69 key reads, 11 `board[k] = v` writes, 3
    `delete`s and 49 pass-by-reference calls bypass the interface anyway
    (`Board.get()[k] = 'black'` mutates with no control at all).
  - *Conclusion*: the riskiest work of the series for the smallest gain.
    Anyone who still wants to do it should start by mapping the 24
    scopes, not by a line-by-line transformation.

- **Abalassembly Intelligence** — a name that comes up in discussions for
  an orchestration layer that doesn't exist yet. The capabilities (engine,
  history, fingerprints, profile, analysis, puzzles, Lab) already exist,
  each wiring up what it needs directly rather than going through a shared
  layer.

## Pitfalls already hit, so you don't repeat them

- **The `AI_WORKER_CODE` string spans TWO source files**
  (`main/13-move-detection-motifs.js` → `main/14-engine-experimental-workers.js`).
  It holds the complete AI worker code, which runs in a separate thread
  with its **own** local variables sharing the globals' names. Any
  automated transformation must exclude it: injecting a main-thread
  interface there breaks the AI, and **no syntax check will catch it**
  because that code lives inside a string. The puzzle audit caught the
  case — not `check-scripts`.
- **Local variables shadow the globals.** `renderPSGamesList()` declares
  its own `const moveCount`, unrelated to the global counter; `board` has
  15 such cases. Transforming a local declaration yields
  `const MoveCount.set(...)`, which is invalid — but transforming its
  *uses* yields code that is valid and wrong.
- **Object shorthand doesn't survive automated transformation.** In
  `pushUndoState()`, `{ capturedByBlack, moveCount }` cannot become
  `{ CapturedByBlack.get(), MoveCount.get() }` — the key must be made
  explicit, or move undo breaks.
- **Documentation comments get transformed too.** One pass rewrote two
  comments describing emitted event payloads (`abalassembly:movePlayed`,
  `gameOver`), which then showed method calls instead of the real
  property names. Check the actually emitted payload before fixing such
  text.
- **`console.assert` doesn't halt anything in Node.js.** A test using it
  can look like it passed when it actually failed. Always check the
  process's real exit code.
- **`raw.githubusercontent.com` has a propagation delay** after a commit
  (15 to 30 seconds observed). A 404 right after a push isn't a failure —
  retry before concluding otherwise.
- **A GitHub token should never persist** beyond the session using it —
  destroyed immediately after use, never committed, never left in a config
  file.
