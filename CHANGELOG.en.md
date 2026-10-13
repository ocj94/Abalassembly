🇫🇷 [Version française](CHANGELOG.md)

# Changelog

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `APP_VERSION` in `index.html` and the
[GitHub Releases](https://github.com/ocj94/Abalassembly/releases).

This file exists because the history lived only in the Releases, and so was
invisible offline — which contradicts the project's own principle.

## [v2.55]

### Fixed — nothing made up on the site
- **Home**: undated, unsourced "48K active players · 2.3M games · 79K on BGA ·
  127 countries" replaced by verifiable figures (4,579 real games, 138
  puzzles from real games, 100 % offline, 0 account/ads/analytics), checked by
  a test against the corpus and the puzzle list.
- **Openings**: the page claimed "16,819 tournament games" — a cumulative count
  over the tree's 90 positions; the tree comes from **2,126 games**.
- **Friends, Compare and general-chat demos** used real community handles with
  invented ratings, games and activity, or put words in their mouths: now
  clearly fictional "(demo)" / "(example)" names.
- **Phone number removed**: a community member's personal number (and an
  invented e-mail) sat in a preset account's profile.
- **Game chat** opened with a pre-written "You: Thanks, you too!" never typed.
- **News**: three invented headlines and dates attributed to the Abalone Online
  blog replaced by links to the real sources and the release log.
- **Leaderboard**: no more empty table with filters that would have fabricated
  blitz ratings and monthly wins; an honest empty state instead.
- README: 4,579 games and the Lab v4 description. 5 tests.

## [v2.54]

### Changed
- **Lab: reliable verdicts.** Each random opening is played **twice, colours
  swapped**, and the verdict counts **pairs** (0, ½, 1, 1½ or 2 points). The
  SPRT is now pentanomial (Fishtest's method) with a Jeffreys prior. Before,
  it counted single games, fired on 8 straight wins (zero measured variance)
  and stopped at 60 games. In simulation at the measured draw rate (≈ 30 %):
  before, 96 % of no-effect tests ended "undecided" and a +70 Elo mutant was
  adopted only 14 times in 100; now +70 Elo is adopted over 99 times in 100
  (≈ 140 games), +35 Elo 68 times, a no-effect mutant wrongly ≈ 4 times.
- **Lab: over-long games are adjudicated by consensus** — a win is given only
  if both evaluations agree (before, the mutant's own evaluation decided).
- **Lab, SPSA: verified before adoption** (SPRT against the champion every 50
  iterations); the AI's weights no longer change every 2 games.
- **Lab: real gain measured** after each adoption — champion vs original
  weights, 25 pairs, with a 95 % margin and a chart — replacing the inflated
  "cumulative Elo". "Measure now" button.
- **Lab: no pointless confirmation** when no mutant reaches 50 % in screening.

### Added
- **Faster Lab: several games at once**, one per worker (half the cores, up
  to 4, configurable 1–8); games per hour shown; a stuck game gets a fresh
  worker and is replayed.
- **The Lab also tunes KAAH's criteria** (mutants and SPSA); "Tune KAAH's
  criteria too" checkbox. An adopted criterion is used by the AI.
- **KAAH criteria test**: same pairs, same verdict, parallel games.

### Fixed
- **"▶ replay" showed a different game** (the opening was drawn twice);
  replays now start from the initial position.
- A game whose 10 opening draws were all unbalanced started from an
  unrecorded opening.
- "Opening plies" and "balance window" settings were never sent to the engine.
- Unchecking "use adopted weights" or resetting the Lab left adopted KAAH
  criteria in place.
- Advanced settings no longer redraw while you type.

## [v2.53]

### Changed
- **Brain Duel: a single face-to-face bar, like a sumito** (Brain Wars /
  TikTok match style). Your theme colour pushes from the left, your opponent's
  from the right; the front line follows the points ratio and slides with a
  bounce on every answer. **Marbles at the front**: 1 vs 1 when even, then
  2 vs 1 and 3 vs 1 for whoever leads. Scores, ★ per round won and a green ✓
  "already answered" badge on each side. 1 test rewritten.

## [v2.52]

### Added
- **Brain Duel: progress bars for both players**, right above the exercise,
  each **in its player's board-theme colour** (sent with the challenge and the
  acceptance). They rise as soon as an answer arrives: if your opponent answered
  first, their bar jumps and "⚡ already answered!" blinks inside it. Cumulative
  points and ★ per round won. Received colour validated (#rrggbb only). 1 test.

## [v2.51]

### Added
- **⚔️ Brain Duel: speed exercises against a friend, live** (inspired by Brain
  Wars). Brain Gym page → *Connect to a friend* (the same one-time code as live
  play, no account, no game server) → *Start a duel*. 3 rounds drawn from 5
  exercises; a shared seed gives both players the exact same position. Best
  score wins each round, ties go to the faster player (each device times its
  own answer, network delay does not count). Round table, rematch, local
  win/loss record; refusal, busy opponent and lost connection handled. 3 tests.

## [v2.50]

### Added
- **A Help section explaining how to use the site**: ☰ menu → Progress →
  **❓ Help**, or the top "Help" menu → "📖 How to use the site". 11 sections
  (playing, during and after a game, AI reflection, history and backup, two
  players, progress, explore, install and offline, notations, settings),
  accent-insensitive search, works offline. Every quoted label comes from the
  site itself; a test checks that the 50 buttons and menus it mentions really
  exist.
- **Corpus**: 5th KAAH game, verified by three sources (2026-10-08, White wins
  6-2); 4,579 games.

### Fixed
- **The "two-factor authentication" was fake**: in Settings, its four methods
  (email, SMS, app, YubiKey) only changed a label, yet added 40 points to the
  security score; the sign-in window showed an "enabled" padlock. With no
  server, no code could ever be sent or checked. All removed: the tab is now
  "Security" and explains why there is no two-factor authentication; the score
  only counts what really exists.

## [v2.49]

### Added
- **4-vs-2 endgame table, solved and proven** (Discovery mode): with the move,
  the strong side **always** wins, in at most 97 plies; the weak side escapes in
  only 0.2% of cases. Every one of the 140,575,680 positions re-checked against
  the exact equations. In game: perfect AI, "Black wins in N plies" verdict,
  Endgame tables page, Trainer.
- **AI reflection table**, as in KAAH: for each depth, the 10 best first moves
  with evaluation, time, time under it, positions, each criterion's change and
  the expected line (checked legal move by move), on a small board. In an
  in-game panel and for every AI move.
- **KAAH's evaluation criteria in the engine** (score gain/loss, cells,
  compactness, sumito, threat, fork, trap), reimplemented from their
  definitions, **off by default**; "KAAH (experimental)" style; Lab test (paired
  duels, SPRT verdict, nothing adopted automatically).
- **Adjustable max thinking time** per level (empty = no limit) and **thinking
  statistics**: depth reached vs time, measured on corpus positions and
  recorded during your games.
- **Position code** (KAAH format), copyable; **evaluation** under each AI move,
  kept in history; **permutations** (12 symmetries and swapped sides, KAAH
  numbering, canonical form).
- **Full clocks**: Chrono, Delay, ejection bonus, custom cadence, time per move.
- **Draws**: a real draw offer (AI, same screen, remote) and threefold
  repetition.
- **AI levels numbered 1 to 10**, including 4 intermediate ones.
- **Share a games file to Abalassembly** (Android: Share menu; desktop: Open
  with): the import opens pre-filled.
- **Corpus**: 4 KAAH games verified by three sources (4,578 games); the heat map
  now learns from imported games.

### Changed
- **Intro**: the emblem (hexagon and marble) continues the launch screen, spins
  and vanishes, then ABALASSEMBLY, then the tagline.
- **Icon**: the current hexagon with the original marble, maskable variant.
- **Last move**: chevrons on the moved marbles.
- Dark colour scheme declared to the browser (colours altered on Samsung
  Internet).

### Fixed
- **A win with White counted as a loss** (screen, Elo, XP, streak).
- **The "Offer a draw" button did nothing.**
- **The service worker had never worked** (created in a way browsers refuse):
  replaced by a real `sw.js`, offline mode is real.
- **Academy**: the 10 Commandments showed raw code.

## [v2.48]

### Added
- **Follow a PlayStrategy game live**, read-only, from its link or simply a
  player's username. Each move arrives as a full position: no notation to
  interpret. With no game in progress, PlayStrategy returns the player's last
  game: it's detected and never shown as live.
- **The PlayStrategy window grows**: Abalone tournaments in progress and
  upcoming, Abalone teams, Twitch/YouTube streams (only when there are some),
  and importing a whole tournament by pasting its link (arena or Swiss) —
  *Grand Abalone*, whose board is incompatible, is filtered out. All 82
  PlayStrategy API routes were reviewed in their source code; cross-site
  access (CORS) is confirmed there for all of `/api/`, not yet verified in
  production. Left out, with proof in their code: puzzles (chess only),
  analysis cache (Abalone is never analysed), broadcasts (chess only). All
  text coming from PlayStrategy is escaped before display.
- **Two variants, verified by replaying a real game in full** from the
  position read off the image: **Pyramide** (83 plies) and **Marguerite
  française** / French Daisy (MiGs game 31299, 31 plies). The articles'
  claims — symmetries, opening sumitos, centre control — are checked by
  computation, not copied.
- **Variant reference games**: a small separate bank, neither MIGS nor
  AbalOnline, so as not to misstate provenance, with each game's source. They
  open from the library and count in the corpus.
- **Variants gallery rebuilt**: tapping a card opens its explanation right
  below, with the starting board and a "▶ Jouer cette variante" (play this
  variant) button that opens the setup screen with the variant preselected.
  Ten cards added: all 23 playable layouts now have one (33 cards overall).
  Their texts rest on measurements — games, wins, median length in the
  corpus, computed symmetries — and no difficulty is made up: without data,
  it reads "Non évaluée" (not rated).
- **Corpus stats**: the *Yearly Abalone Arena* tournament now counts, every
  game included, even abandoned ones (93), plus the reference games — 4,574
  games in all. The page title and the library header are now computed
  instead of hard-coded.
- **Découverte** (7 marbles a side, the Kids mode board) in the Play menu,
  still excluded from random draws.
- 78 unit tests (41 in v2.47).

### Fixed
- The French Daisy card called it "the only unbalanced variant in the game".
  Wrong: **Domination** has no colour-swapping symmetry either — and that
  alone isn't an imbalance, its 33 real games split 16 to 17. Commit
  `b1182f3c`'s message keeps the error; this changelog is authoritative.
- The variants documentation claimed 23 layouts in the Play menu while it had
  22 (Découverte was missing).

## [v2.47]

### Added
- **Local notifications**: "your turn" and game-over, sent only while the
  tab is in the background. The matching settings panel used to save
  nothing and never actually triggered anything; preferences now persist
  for real.
- **Menu swipe on phone**: swiping right opens the menu, left closes it
  (reversed in Arabic/Hebrew). Only recognised outside zones that already
  handle their own drag gestures (3D board, augmented reality, photo
  calibration, puzzles, cropping).
- **Fixed and expanded PlayStrategy tournament import**: PlayStrategy's
  notation is not Abalassembly's — the previous importer stored raw moves
  believing otherwise, so no imported game replayed past its first move. A
  converter checked three times per move (legality, position, notation)
  fixes the import. Other players' imported games no longer affect personal
  stats, and the import finally respects the colour the user actually
  played. The *Yearly Abalone Arena* (PlayStrategy, 90 games) ships as the
  first dataset verified through this path.
- **Engine unit tests** (`node --test`): 41 tests covering rules, both
  sides, board detection and game import, run on every push by CI — which
  until now only ran integrity checks (syntax, embedded data, puzzle
  proofs).
- CI security (OpenSSF Scorecard baseline): token permissions reduced to
  the minimum, actions pinned by commit hash, automated dependency updates
  (Dependabot) on both repos.
- `CITATION.cff`, this changelog, and a bug report template that always
  asks which colour was played — several real bugs in this release only
  showed up when playing white.

### Fixed
- **Opponent pieces selectable during the AI's turn**: the guard that
  blocks touching the opponent's pieces was only present on two of five
  ways to click a cell (canvas click, drag-and-drop); keyboard navigation,
  the 1D view and the Commentator mode board lacked it. The guard now
  lives inside `handleClick` itself.
- **Photo board detection**: the classifier separated board from marble by
  colour warmth, which assumes a wooden board — on a grey plastic board
  (the standard one), a single marble was missed on almost every photo.
  Replaced with colour distance to the image's median RGB, with a two-pass
  split for games where both marble colours are present.
- A public event name (`gameOver`) damaged by an earlier encapsulation
  pass, which had replaced the name inside the string literal itself.
- `APGN.md` renamed to `APGN.fr.md` (the suffix convention already used
  elsewhere in the docs); in passing, `README.en.md` linked to the French
  specification instead of the English one.

## [v2.46]

### Added
- **Alitration variant**, playable. Found on onlineabalone.wordpress.com;
  the position was verified by replaying a real 122-ply MiGs game through to
  its conclusion before integration.
- **Principal variation** on the move hint: the opponent's likely reply is
  shown, honestly bounded to the depth actually searched.
- **`docs/Variants`**: what is playable versus merely documented, across the
  three places on the site that describe variants.
- **`docs/Function glossary`**: 1,236 functions extracted from the real
  code, sorted by letter with their section.
- **`tablebase/generate-3v3.js`**: self-contained 3v3 solver.

### Changed
- The 21 starting layouts moved to a dropdown (previously individual
  buttons); the layout preview is larger.
- Progressive encapsulation of global state behind an explicit interface:
  `GameMode`, `HumanColor`, `CurrentTurn`, `CapturedByBlack`,
  `CapturedByWhite`, `MoveCount`, `GameOver`. `board` was deliberately left
  out — see `RECOVERY.en.md` for the figures behind that decision.
- Documentation reorganised into `docs-fr/` and `docs-en/`, explicit suffixes.

### Fixed
- **1D view**: now flips correctly when the human plays white. The standard
  layout puts black at the bottom; the display stayed fixed, so it was right
  for a black player and upside-down for a white one.
- **Undo impossible as white**: `requestUndo()` compared against a hardcoded
  `'black'`. A human playing white against the AI was told "only you can
  request an undo" — while being the player.
- **Train-the-Trainer certificate threshold**: the 6 sessions now genuinely
  count, alongside the assessment.
- Faster comparison against the 418,595 historical fingerprints (index
  access instead of text-key lookup), with no dependency added.
- A code comment wrongly claimed `tablebase/tb-3v2.json` did not exist. The
  file does exist (243 KB): it's the source `tools/check-embedded.js` reads,
  and its base64-encoded copy inside `index.html` is the one actually used
  at runtime. The comment now describes both forms and why they coexist.

- **Brain Gym, "Edge Mate" exercise** (12th exercise): find the move that
  wins immediately by ejection, generated by geometry (54 outward
  directions × 3 sumito shapes = 162 patterns) and validated one by one by
  the engine before being offered — no position written by hand.

## [v2.45]

- Pattern detector in the evaluation curve.

## [v2.44]

- Korean Daisy and Anglattack variants.

## [v2.43]

- Live game: integrated subsection.

---

*Versions before v2.43 are not restated here: their detail lives in the
GitHub Releases and the commit history.*
