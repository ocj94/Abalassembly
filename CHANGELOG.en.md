🇫🇷 [Version française](CHANGELOG.md)

# Changelog

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `APP_VERSION` in `index.html` and the
[GitHub Releases](https://github.com/ocj94/Abalassembly/releases).

This file exists because the history lived only in the Releases, and so was
invisible offline — which contradicts the project's own principle.

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
