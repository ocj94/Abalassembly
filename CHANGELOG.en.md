🇫🇷 [Version française](CHANGELOG.md)

# Changelog

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `APP_VERSION` in `index.html` and the
[GitHub Releases](https://github.com/ocj94/Abalassembly/releases).

This file exists because the history lived only in the Releases, and so was
invisible offline — which contradicts the project's own principle.

## [v2.79]

### Added — your offered marbles and your lead conversion, against real players
Olivier's request, from two AI proposals ("4, 1, 2 and 3"): point 4 first.
- **My quality of play against real players**, a new card in My statistics,
  with two columns, "You" and "Real players":
  - your moves close to the best, with their margin of error;
  - your **offered marbles** per 100 moves, overall and by moment of the
    game (opening, middle, end).

  The measures are **exactly** those of the corpus (a test checks it game
  by game, for both colours). Real players offer 10.1 marbles per 100 moves,
  and 13.4 in the middlegame.
- **When you lead, when you trail**: your wins after leading by 1, 2 or 3
  marbles at some point in the game, and after trailing by as much. Among
  real players, the side that led by 2 marbles wins 80 % of the time, and
  the one that led by 3, 92 %. The 6th marble, which ends the game, does not
  count. Same rule on both sides, checked by a test.
- **My progress** shows your offered marbles game by game, with a grey line
  for real players. The decision profile also shows the offered-marbles
  row.
- The **CSV export** gets a `billes_offertes` column.
- **Tests**: 2 more (285).

## [v2.78]

### Added — the quality of real players' moves
Point 4 of the statistics audit chosen by Olivier. Each of the 418,046 moves
of the 4,247 games played from a starting position was analysed in advance
by the site's engine (31 minutes of computation, `tools/qualite-coups.js`).
- **Moves close to the best**: one ply ahead, every legal move is
  evaluated, and the move played counts if it is within 30 points of the
  best. It is **exactly** the accuracy shown in My statistics (a test checks
  it), so the two compare. My statistics now show, under your accuracy,
  that of real players: **37.5 %**.
- **Offered marbles**: after the move, the opponent can push a marble off
  when another move avoided it. A trade (the move played pushes one off
  itself) does not count. Result: **10.1 per 100 moves**. The check is
  exact, and 20 times faster than generating every opposing move; a test
  compares it with the generator on more than 2,000 positions.
- **What it shows**:
  - the future winner offers 8.3 marbles per 100 moves, the future loser
    11.6;
  - the middlegame is the riskiest moment (13.4);
  - the players of the PlayStrategy tournament, the strongest in the corpus,
    offer only 3.6, but do not have a better "accuracy" (34.7 %). One ply
    ahead, accuracy measures strength poorly, and the card says so.
- The card follows the page filters (source, layout, length, year). The
  data, 131 KB, is embedded in the page, which stays fully offline.

### Changed — the tests on GitHub
The same engine test sometimes fails on GitHub (v2.73, v2.76, v2.77), then
passes on a rerun, with no readable reason. Each failure now becomes a
readable annotation, with the error message and the machine's system, to
catch it next time.

- **Tests**: 4 more (283).

## [v2.77]

### Added — more reliable corpus statistics, and the score explorer
Following the statistics audit ChatGPT made for Olivier ("1 2 3 and 4", plus
the explorer specification). Point 4, the quality of moves, follows in v2.78:
it needs a long computation done in advance.
- **Margins of error**: the corpus percentages show their 95 % margin ("53.7 %
  ± 1.7"), computed with the Wilson interval, more accurate than the usual
  formula for small samples. It appears:
  - as a figure in "In short" and in "Does the side that pushes off the
    first marble win";
  - as a whisker on the bars of "What wins games" and of the first moves;
  - on hover in the heat maps and the comeback table.

  Under 100 games, a ⚠ flags a fragile figure.
- **Duplicates**: 3 AbalOnline games (2020) were recorded twice, identically.
  They stay in the library but now count only once in the statistics. The
  page therefore speaks of **4,577 distinct games**, and says so in its
  sources.
- **A year filter**, next to source, layout and length. For example, in 2021
  Black wins only 50.1 % (± 3.6) of AbalOnline games.
- **The score explorer** (after the proposed specification): for each score
  reached during the game, and for the chosen side, the wins, losses, draws
  and unknown results, the win rate with its margin, over the whole game, the
  opening, the middle or the end.
  - A game counts once per score.
  - Clicking a row shows its games, to replay.
  - One difference from the specification: the moments are counted in plies
    (as elsewhere on the site), since the score already gives the number of
    ejections.
  - No server: everything is computed on the device.
- **Fixed**: with a filter on, the "Falling marbles" card announced a wrong
  number of AbalOnline games "started from a puzzle position" (e.g. 2,000
  with the MIGS filter). It is now counted, not deduced.
- **Tests**: 4 more (279).

## [v2.76]

### Changed — the Lab starts from the Texel weights
Olivier's request ("Start with 1"): since v2.75 the AI plays with the Texel
weights from level 4, but the Lab's self-improvement was still trying to
improve the old "Balanced" weights, which almost nobody faces at those
levels any more.
- **The starting point**: a new Lab starts from the Texel weights. Its
  mutants, SPSA and the Texel method work around them, and its checks
  measure the champion **against the Texel weights**. The gain shown is
  therefore what the Lab adds to the AI people actually play.
- **What it adopts** replaces the Texel weights from level 4, in Auto or
  Balanced style, on the device where it runs. Levels 1 to 3 keep the
  original weights: before, an adopted champion changed them too. The "Use
  the adopted weights" box now says where they apply.
- **A Lab already running** restarts from the Texel weights when the page
  opens. The current test stops, since it was about the old champion. The
  history, counters and log stay. The old champion stays in the champions'
  history (the "Définir comme champion" button can bring it back), and its checks, measured
  against the original weights, are kept apart. The generation cap starts
  again from zero.
- **A champion adopted before v2.76** no longer applies: it came from the
  old weights, which the Texel weights beat by more than 300 Elo. The Lab's
  export file now records where the champion comes from.
- **Two mutations that stayed stuck at 0**: "danger" and "mobility", being
  multiplied, could never come back once at 0. The Texel weights have no
  "danger" any more. They now restart from 4 and 1.
- **Tests**: 3 more (275), and the Lab tests follow the new starting point.

## [v2.75]

### Changed — from level 4, an AI tuned on real games
Olivier's choice ("OK for option 2"): the weights found by the Lab's
**Texel method**, only for levels 4 and up.
- **What changes**: from **level 4**, in **Auto** or **Balanced** style, the
  AI judges positions with the Texel weights. They put much more weight on
  the **centre** and on **compactness** (a criterion from KAAH), and almost
  none on passive defence (fortress, danger). On the corpus's control
  positions they guess the winner 75.8 % of the time, against 73.1 % for the
  old weights.
- **What does not change**: levels 1 to 3; a style picked by hand
  (Aggressive, Defensive, Divide, KAAH…); the **monthly tournament** (same
  difficulty for everyone until the end of the month); a device where a Lab
  champion has been adopted (it stays in charge).
- **Checked in duels** against the old weights, in pairs (the same real
  position twice, colours swapped):
  - depth 2: 42 points out of 48, about +338 Elo (± 145);
  - level 4: 27.5 out of 32, +314 (± 198);
  - level 5: 29 out of 32, +394 (± 250);
  - level 6: 17.5 out of 20, +338 (± 278).
  They also beat the styles the Auto mode used to pick (depth 2): Defensive
  +338, Aggressive +163, Divide +163.
- **The step between levels 3 and 4**: before, the two levels were even
  (+17 ± 114 Elo); it rises to about **+382** (± 299). The neighbouring
  steps: 2 → 3 about +191, 4 → 5 about +127. The 3 → 4 step is therefore the
  highest; it is kept as it is, since softening it would only move the jump
  to another step.
- **A little slower to compute**: the Texel evaluation looks at about 17 %
  fewer positions per second. In the same time it often sees one move less
  far ahead, and still wins. Thinking time does not change.
- **Where to see it**: the line under the level choice, the help, and the
  Lab's "Texel method" tab (the duels and the steps). The Lab's benches
  measure each level with its in-game weights. `tools/texel-poids.js` redoes
  the computation and checks the embedded weights.
- **Tests**: 3 more (272) — which levels and styles take the Texel weights,
  the engine playing with them, the help and Lab texts.

## [v2.74]

### Fixed — the Game statistics page in English
Reported by Olivier: "I'm on the corpus page. In English, but it stays in
French".
- **Everything is translated**: the page title and introduction, the cards
  "The first player's advantage", "Length of a game", "How games end", "Most
  played variants", the sources sentence and the "AI thinking" section
  (measurement buttons and messages included). The MIGS end types, recorded
  in French ("Au score", "Abandon", "Déco"…), have their translation.
- **Layout names**: the filters and the variants card showed raw keys
  (`swiss_daisy`, `custom`…); they now show "Swiss Daisy", "Custom layout"…,
  like the falling marbles, and "French Daisy" rather than "Marguerite
  française" in English.
- **Numbers** follow the language (1,877 and 100.7 in English; 1 877 and
  100,7 in French).
- **Switching language on the page** redraws it at once (before, the cards
  kept the old language until the next visit); the same for My statistics.
- **A wrong sentence**: "the side that moves first wins 3.7 percentage points
  more often than the other" — that is the gap to an even split (50 %); the
  gap between the two sides is twice as large. The sentence now says so. The
  introduction also lists every source (PlayStrategy and reference games
  included).
- **Tests**: the page rendered in English no longer holds a word of French
  (title, cards, variants, AI thinking, filters), and switching language
  redraws it.

## [v2.73]

### Added — My statistics and the Profile, filtered and in charts
Third part of Olivier's request ("more settings, charts, metrics…"), after
the Lab and the corpus.
- **The filters filter**: the period tabs (7 days, 30 days, 90 days, 1
  year, All) only showed a message; they now filter the whole page, with a
  choice of **game type** (against the AI, imported, two players). The rest
  of the site (history, Lab, sync) still sees all your games.
- **Detailed results**: your score and the **rolling rate** over your last
  10 games, then by AI level, style, colour, layout and opponent (imported
  or two-player games).
- **My progress**: **accuracy** game by game (moves close to the best
  choice), marbles taken and lost, game length (wins and losses in colour),
  and **when you play** (days of the week × 4-hour slots).
- **Me against the corpus**: your **12 dimensions** against the 427,000
  positions of real players (your average percentile, 50 = like them), and
  **your openings** against the book: share of known moves, share of the
  most played move, win rate of your choices among humans against that of
  the best possible move.
- **CSV export** of your games (filters applied) with their numbers:
  opponent, level, result, marbles taken and lost, accuracy.
- **The Profile** gets a "My numbers" card: score, last 10 games, best
  streak, highest level beaten, and the score curve.
- The percentile is computed "in the middle of ties": on dimensions with
  often-equal values, the strict percentile placed real players themselves
  at the 24th percentile instead of the 50th (checked on 3,891 corpus
  positions).
- 2 new tests (267 in all).

## [v2.72]

### Added — Game statistics, filtered and in charts
Second part of Olivier's request ("more settings, charts, metrics…"), after
the Lab.
- **Filters** at the top of the page: **source** (MIGS, AbalOnline,
  PlayStrategy, reference games), **layout**, **length** (under 60 plies, 60
  to 119, 120 and more). They recompute the cards marked 🔎: the summary,
  falling marbles, what wins games, how real players play and the new
  cards. My statistics and the end-of-game screen are still compared with
  the whole corpus.
- **In short**: games, share won by Black, median length, games ended at 6
  marbles — for the selection.
- **Winning by lead and moment**: a heat map — rows, the lead in marbles (1
  to 5), columns, the ply (20 to 140); in each cell, the share of real games
  the leading side won. For example, one marble ahead at ply 60: 65%.
- **First moves, length and endings**: the game length histogram, how games
  end (6 marbles, resignation or time, draw, unknown winner), and Black's
  first moves with their share of games and win rate.
- **Where the marbles are**: the board as a heat map, by side and by moment
  (opening, middle, end), and **where pushes start from** (the leading cell
  of pushing groups), from the Lab positions.
- 3 new tests (265 in all).

## [v2.71]

### Added — the Lab in charts and settings
Olivier's request: "more settings, charts, metrics… for the Lab, the corpus
and the profiles". First part: the Lab.
- **📊 Dashboard** (new tab): games played (Lab, benches, KAAH test),
  computing time, games per hour, decided tests (adopted, rejected,
  undecided, screenings with no finalist), adoption rate, measured real
  gain. Charts: the real gain test after test with its margin, **the
  champion's weights adoption after adoption** (one small curve per
  criterion), games per day, game length, how games end, the tested side's
  score by colour, where games start. Filters at the top: period (7 days,
  30 days, all) and phase.
- **📐 Texel method**: settings — which positions (all layouts or Belgian
  Daisy), which moment (opening, middle, end), the pull towards the
  champion's weights (none to strong), the number of steps. And charts:
  **predicted winner against actual winner** (the calibration, before and
  after), how much each criterion moves the evaluation, the error by moment
  of the game, and your previous settings side by side.
- **Test benches** (style tournament, levels, against you, openings): the
  thinking time per move, the number of plies before adjudication and the
  start can be set for each one (levels keep their real time). The
  tournament gets **each style's Elo with its margin** and a coloured
  **"who beats whom" cross table**; levels, their scale as a curve with its
  margin; against you, each style's score against your clone; openings,
  humans and AI side by side.
- Everywhere: a tooltip on hover (or touch) on every bar, cell or point, "See
  the numbers" under the main charts, and charts drawn at the screen's real
  width (readable text on phones).
- The Lab now keeps the history of its champions and the computing time of
  each game.
- 3 new tests (262 in all).

## [v2.70]

### Added — the AI Lab, six more tools
Olivier's request: "improve the Lab", then "all 6". The AI Lab page now has
**tabs**, one per tool.
- **📐 Texel method**: over 18,855 positions from real games whose winner is
  known, the weights for which the AI's evaluation **best guesses who will
  win** (the method of chess engines). A few seconds of computing. Games
  whose number ends in 0 or 5 are kept for checking only: right winner
  guessed 73.1% → 75.8%, error −5%. Nothing is adopted on this alone:
  "Check in duels" sends the weights to the Lab, which pits them against the
  champion. First trial, outside the site with the same engine and rules (24
  pairs from real positions, depth 2 like the Lab): the Texel weights score
  42 points out of 48 against the champion (+338 Elo ± 145). The AI's default
  weights do not change for all that.
- **🏆 Style tournament**: Balanced, Aggressive, Defensive, Divide, KAAH (and
  Texel, Human-like if they exist) play each other, in pairs; Elo ranking.
- **📶 Levels**: each level against the next one, with its real depth and
  thinking time (level 1 draws at random, as in a game); the height of each
  step in Elo, and the scale from level 1. Up to level 8 (9 and 10 would take
  days).
- **🧑 Like humans**: how often each level plays the player's move (measured:
  level 1 13%, level 2 26%, level 3 28%); and **"human" weights**, the ones
  that make the move actually played most likely (move guessed 17% → 30% on
  control games). They become the **"Human-like (Lab)"** style of the game
  setup.
- **🎯 Against you**: your **clone**, the same tuning on your moves (your
  history, imported games included, at least 120 moves); then every style
  plays your clone, and the best one can become the **"Against me (Lab)"**
  style.
- **📖 Openings**: the Belgian Daisy openings of the book, played by the AI
  from positions a little further on (what real players played next),
  compared with the humans' score. A checkbox makes the AI's book mix humans
  and duels.
- The test benches (tournament, levels, against you, openings) play on the
  Lab's threads, several games at a time, with throughput and time left;
  they resume after a reload. One at a time, never together with the Lab.

### Changed — Lab games that look like real ones
- **Start**: real **Belgian Daisy** positions taken from the corpus (between
  plies 8 and 16, at 0-0), instead of the Standard layout and 6 random moves.
  2,688 of the corpus's 4,580 games are Belgian Daisy, 384 Standard. Options:
  every layout of the corpus, or the old start. Both games of a pair start
  from the same position; "▶ replay" replays it.
- **Adjudication** at the move limit: in real games, the side one marble
  ahead at ply 66 wins only 66% of the time (two marbles: 78%, three: 94%). A
  one-marble lead now counts as a win only if both evaluations, marbles
  aside, do not see the other side better placed; otherwise, a draw.
- The Lab's current test restarts under these rules (the champion, history
  and measurements stay). The KAAH criteria test too, when restarted.
- A more readable page: weights in French words, an explanation without
  jargon, the phone layout fixed.
- New embedded data: `tools/labo-positions.js` (replays the corpus offline,
  about 3 minutes) writes 25,204 quiet positions and 3,866 starting positions.
  To be rerun when an embedded game changes: a test asks for it.
- 9 new tests (259 in all).

## [v2.69]

### Added — sync my devices
- **🔄 Sync my devices** (History or Settings, address `#sync`): two devices,
  or two browsers, **merge** their game data. Olivier's request: "how do I get
  the same data in every browser?".
  - **Live**: both open, one code each way (Copy or Share), then a direct
    connection between the browsers, like the live game. No account, no
    server.
  - **With a file**, if the direct connection does not work: a sync file to
    open on the other device with "Merge".
- **What travels**: game history, progress (XP, level, ELO, badges, streaks),
  statistics, heat maps, puzzles and daily puzzles, Brain Gym, Trainer
  course, real-board notebook, username. **What stays on each device**:
  display and sound settings, local account, AI Lab, game in progress.
- **Nothing is overwritten, nothing is counted twice**: games are added
  without duplicates, a game deleted on one device is deleted on the other
  (and comes back if you import it again). Each counter keeps every device's
  share: syncing twice changes nothing, and three devices synced in pairs add
  up exactly. One precaution: two devices where one is a copy of the other
  (old JSON export) keep the larger total instead of adding them.
- After the sync, a summary (games, XP, games played, puzzles), then the page
  reloads.
- **"My data (JSON)" export / import**: the device identity no longer travels
  with it, and the export records each device's share — a copy synced later
  counts nothing twice.
- Checked end to end: two real browsers connected live, identical merge on
  both sides. 4 new tests (250 in all).

## [v2.68]

### Fixed — games imported into the history
- **The result**: an imported game where it is known which side you played
  and who won (a KAAH game, for example) showed "—" instead of **Win** or
  **Loss**. It now shows it, and the history page's result filter files it
  correctly. A game you only watched (played by others) or with an unknown
  result keeps "—".
- **The time**: a game imported with a date but no time was stored at
  midnight UTC, so it showed **"02:00"** in Paris — an invented time. It now
  shows the date only. The import header also accepts the time
  (`# 2026-10-22 06:41 · …`), read as local time; re-importing a game that is
  already there, this time with its time, completes it without creating a
  duplicate. Games imported earlier are recognised and show their date only.
- **The history export** writes the local date and time (before: the UTC day —
  a game played at 1 a.m. in Paris left dated the day before).

## [v2.67]

### Added
- **Corpus**: 6th KAAH game checked against three sources — 22/10/2026,
  against KAI++ level 8 (Normal v5El10 profile, 60 s), **White wins 6-2** in
  58 moves. The Aba-Pro notation (116 plies, a single possible reading at
  every move), the Nacre notation (116 identical positions) and the five
  position codes shown by KAAH (start, moves 26, 55 and 82, end) match
  character for character; the 58 moves in the reflection table of KAAH's AI
  are indeed the game's. **4,580 games**.
- Its statistics (falling marbles, what wins games, kinds of moves) and its
  fingerprints are computed like the others: it counts in Game statistics,
  and the Architecture page moves to 8 reference games and 427,272 measured
  positions.

## [v2.66]

### Fixed — the Architecture page, brought up to date
- **It dated from v2.39** and no longer matched the code. It has been
  re-checked against the code in v2.66:
  - **how the AI picks its move**: the first question was missing — in
    Discovery mode, at 4 marbles against 2, the AI plays perfectly from the
    endgame table (since v2.49, except at level 1). Also added: the v2.60
    rule, never a move that goes backwards. And level 1 does not draw among
    the 4 *best* moves but among the first 4 of the list (ejections, then
    pushes, then plain moves);
  - **where the data comes from**: **4,579** games (not 4,479: the 93
    PlayStrategy tournament games and the 7 reference games were missing),
    **427,156** measured positions (not 418,595), and everything Game
    statistics has gained since;
  - **game modes and exchanges**: Discovery mode, the `?pos=` and `?defi=`
    links, images to share, APGN import, a games file sent to the site; and
    PlayStrategy, which does go through an outside server (read-only) — the
    page said no exchange used one;
  - **endgame tables**: the card said they were not wired into the AI and
    that larger tables were out of reach; the **4 against 2** table has been
    solved and proven since v2.49 (140,575,680 positions, the strong side
    always wins) and the AI uses it.
- **Readable on a phone**: the diagrams were 640-point-wide images whose text
  shrank to about 7 points on a phone. They are now text cards that wrap;
  each AI question has its "yes" answer beside it (indented below on a phone).
- **In English**: the page stayed in French when the site was in English. It
  now has its English version and switches language with the site.
- **The link to the detailed version** led to a missing page
  (`docs/Architecture.md`): it now points to `docs-fr/Architecture.fr.md` or
  `docs-en/Architecture.en.md`, depending on the language. Both documents are
  updated the same way (four Mermaid diagrams, checked by rendering them), as
  are the links of the English recovery guide (`RECOVERY.en.md`).
- **A test** now compares every figure on the page and in the documents with
  the embedded data, and the order of the AI's questions with the code's: one
  more game or a question moved, and it asks for the update.

## [v2.65]

### Added — when the marbles fall, every marble
- The “When the first marble falls” card of the Game statistics page becomes
  **“When the marbles fall”**: one row per marble, from the **1st to the
  11th**, then **the last one** (the winner's 6th, the marble that ends the
  game). Each row shows the median (the dot) and the range in which 8 games
  out of 10 fall (the bar), all on the same scale of moves.
- What the real games say: the 1st marble falls around **move 26**, then
  another one falls roughly **every 10 moves** (the 6th around move 75, the
  11th around move 121). The last one, the marble that wins, falls around
  **move 99** — around move 73 in Standard, move 104 in Belgian Daisy.
- **Picking a row** shows its details just below: the sentence, the
  histogram and the medians by starting layout. The histogram keeps the same
  axes from one marble to the next: you see the hump slide right and spread.
- Each marble only counts the games in which it fell (4,063 for the 1st, 317
  for the 11th); a marble that fell in fewer than 50 games would not be shown.
- Nothing to recompute: the move of every ejection was already in the
  embedded data.

### Added — graduations under the colour scale
- Under the colour scale of **the ejection map**, vertical ticks and their
  numbers, **from 0 to the maximum**: 0, 200, 500, 1,000 and 1,767 marbles
  on the “All” map. Each tick sits exactly where the map puts the colour of
  that number.
- The same under the “Where your marbles fall” map of My statistics (up to
  6 marbles, every number gets its tick).

### Fixed
- Switching tabs on the ejection map no longer hides the “games added since
  the last computation” warning.

## [v2.64]

### Added — one address per page
- **Every menu entry has its own address**, to bookmark or send: for example
  `https://ocj94.github.io/Abalassembly/#corpus` opens Corpus stats straight
  away, `#rules` the Game rules, `#puzzles` the Puzzles, `#my-statistics`,
  `#real-board`, `#library`… (full list in the README). The home page keeps
  the bare address.
- **The Back button** of the browser or phone returns to the previous page,
  and Forward to the next.
- **Arriving through one of these addresses** opens the page directly,
  without the intro.
- **In French**, the site shows French addresses (`#regles`,
  `#mes-statistiques`…); both languages are always understood, as are
  accents (`#problèmes`), capitals and the full menu names (`#game-rules`).
  Switching language switches the address shown.
- **The menu's windows** (Import, Game library, Sheet for AIs) have their own
  address too; once closed, the address returns to the page underneath, and
  the Back button closes them.
- **A game in progress is never restarted**: coming back to `#game` shows it
  again as it was. With no game, `#game` leads to setting one up, or offers
  to resume the saved one.
- Kids mode keeps its restrictions (`#settings`, `#lab` are refused there as
  in the menu); existing links (`?partie=`, `?pos=`, `?defi`) take priority.

## [v2.63]

### Added — falling marbles, what wins games, how real players play
- **The idea** comes from ClickHouse's sequence-analysis functions
  (`sequenceMatch`, `windowFunnel`): following the chains of events in a
  game. Rewritten here, with nothing to install, on the real games.
- **Game statistics page, “Falling marbles”** (computed by replaying the
  4,247 games played from a starting position):
  - the side that pushes off the first marble wins **65 %** of games;
  - the first marble falls at **move 26** (median; between 9 and 49 in
    8 games out of 10), with the detail by starting layout;
  - **the comeback table**: at 1-0 the leader wins 65 %; at 3-0, 90 %;
    trailing 0-2, a side still wins 23 % of the time;
  - **the final score**: 6-3 is the most frequent (22 %), 6-0 and 6-5 make
    13 % each;
  - **the ejection map**, seen by the player who loses the marble: in
    Standard, 75 % of marbles fall from their own half; over all layouts,
    the 6 corners give only 15 %, although they make up a quarter of the
    edge spots.
- **“What wins games”**, right after the 12 dimensions: at moves 20, 40 and
  60, both sides' dimensions compared on the same position, and the share of
  games won by the side ahead on each. At move 40, the side facing fewer
  threats wins 69 % of games, as much as having more marbles. Presented as a
  link observed, not a cause.
- **“How real players play”**: 25 % one-marble moves, 33 % two in line,
  32 % three in line, 9 % sideways; 39 % of moves push opposing marbles,
  6.8 % push one off; 33 % of chances to push a marble off are taken.
- **My statistics, Ejections card**: your comebacks (wins after losing or
  pushing off the first marble), you against real players (ejections per
  game, chances taken, first ejection, kinds of moves, phases), and where
  your marbles fall, seen from your side. Same definitions on both sides.
- **End-of-game screen**: one line drawn from real games, e.g. “What a
  comeback! You were behind 1 to 3. In real games, the side trailing 1 to 3
  wins only 21 % of the time.” Never in Kids mode.

### How it is computed
- `tools/stats-parties.js` replays every embedded game with the real engine
  (about 5 minutes) and writes `15-stats-parties.b64`; the page only has to
  add up. A test replays a sample of 17 games and compares with the file,
  and checks the games' signature; others check every sum on hand-built games.

### Improved
- The Game statistics page now shows in full in under a second from the
  first visit: MIGS winners come from this data (checked identical to the
  replay on all 1,518 “Au score” games) instead of over a minute of replay
  in the browser.

## [v2.62]

### Changed — "On a real board" starts at age 3, not before
- **Following the box.** Abalone is not suitable for children under 3 (small
  parts: the marbles). The page now starts at 3 and says so everywhere: in
  the page header ("From age 3"), in the very first sentence, as the first
  point of the safety box, in the help and in the documentation.
- **Removed**: everything aimed at under-3s — the "from age 2" and "2½" ages,
  and the giant floor board with big objects.
- **Step 1** is now played on the real board: use only the 19 centre holes at
  first (3, 4, 5, 4, 3), one marble per hole. Every step has a landmark age
  of 3 or more.
- **A little one under 3 at home** does not play yet, not even "just to
  touch": play during their nap, count the 28 marbles again and put the box
  back up high.

## [v2.61]

### Added — "Learning on a real board", for toddlers
- **A new page** (☰ menu → Improve → **On a real board**) for teaching Abalone
  to very young children, from age 2, on a real board and away from screens.
  The aim is not a real game straight away (the box says 6 or 7), but for them
  to love the board, the marbles and this time with a parent.
- **Safety first.** The box warns that the game is not suitable for under-3s
  (small parts). Before 3: no real marbles, a giant floor board (19 spots in
  3-4-5-4-3) with big objects that don't fit through a toilet-paper tube; from
  3, an adult alongside and the 28 marbles counted out and back in. Sources
  cited on the page (product page, Health Canada, INSPQ and Canadian
  Paediatric Society, CPSC).
- **Nine golden rules** so children are neither hurt by losing nor put off the
  game: short, happy sessions, the child chooses, they win often and then play
  against your handicap, praise what they did, the parent shows how to lose, a
  pushed marble "goes to the pool" (never "killed"), siblings on the same
  team, no comparing…
- **A typical 5-to-10-minute session** and **8 steps**, each a little game with
  a landmark age, a diagram, "done when" and "if it's not working": One marble
  per house, One little step, Taking turns, The little train, The stronger one
  pushes (the sumito: 2 against 1, 3 against 2… and 2 against 2 is stuck),
  Splash!, The mini-game (7 marbles each, the Kids mode Discovery layout) and
  The real game. The diagrams are drawn by the page (SVG); the last two come
  from the engine's layouts.
- **And to turn them into "war machines"**: three little sayings that prepare
  future strong players ("I look before I touch", "Together we're stronger",
  "In the middle, you don't fall").
- **A progress notebook** for 1 to 4 children: a dated star for each step done
  and each child's next step. Names and dates stay on the device
  (localStorage); they are never sent anywhere.
- **A printable guide** (5 A4 pages, on white) and the whole page in English.

## [v2.60]

### Fixed — the AI no longer goes back and forth in the opening
- **Where it came from.** In the first 20 half-moves, when the opening book had
  lost track of the game, the AI often played without computing a move "taken
  from real games that went through a very close position". This fallback
  actually took the closest historical position, with no threshold at all:
  often another game, from another starting layout, with the wrong side to
  move, and replayed a move picked two half-moves further on. Hence h9g8,
  g8h9, h9g8… — at every level, since this fallback came before the search.
- **Measured before the fix.** In the browser, levels 1 to 5, standard layout
  and Belgian Daisy: 99 of the AI's first 146 moves came from this fallback,
  with 25 back-and-forth moves (5 at every level in the standard layout). Over
  24 simulated games at level 3: 136 moves out of 264, 16 of them going back
  and forth, on average 313 points worse than the computed move and up to
  2,112 (more than a marble).
- **Now** this fallback only plays from exactly the same position as a real
  game (reached in a different order), checked by replaying that game;
  otherwise the AI computes. No move played without computing (opening books,
  this fallback, level 1) ever brings back a position already seen or undoes
  the same side's previous move.
- **The search could oscillate too**: in a simulated game, f4f5 then f7f6,
  four times in a row — the whole position never repeated, since the opponent
  was moving elsewhere. A move that puts one's marbles back exactly as before
  one's previous move now costs 140 points, 560 the second time in a row,
  1,260 after that: never the price of a marble, so the AI still retreats from
  a real danger.
- **Result.** In the browser, same games: no back-and-forth in 144 moves, only
  5 moves taken from real games (that went through exactly the same position).
  In the simulated games: no back-and-forth.

### Fixed — a sometimes very bad move when thinking time runs out
- When thinking time ran out in the middle of a depth, the AI played the best
  of only the moves already examined at that depth — often the first in the
  list — even when it was much worse than the best move of the previous depth.
  Measured over 132 cut searches (positions from real games, always cut at the
  same point): 61 returned a move worse than that one, by up to 2,010 points (a
  marble). The previous depth's best move is now examined first: none is
  worse. This affects levels 2 to 9, especially on a slow device.

### Tests
- 6 new tests: what a fingerprint record describes; the fallback only plays
  moves really played from the same position, and nothing outside real games
  (the position that gave g8h9 right after h9g8); no move played without
  computing goes back; the cost of a back-and-forth (140, 560, 1,260); a search
  cut by time is never worse than the previous depth.

## [v2.59]

### Added — understanding the 12 dimensions, Game statistics page
- **How to read the table**: an explanation of percentiles, with a picture. Each
  dimension is measured in every position of the real games; these positions
  are lined up from the smallest value to the largest, and each bar of the
  picture stands for 1 % of them. The 10th percentile, the median and the 90th
  percentile are marked, with the normal range (80 % of positions) in between.
- **Three charts** for the chosen dimension: both sides together, Black, White
  (a position counts for the side that has just moved). Clicking a row of the
  table changes the dimension; the table can show both sides, Black or White.
- **Place a value**: a slider places a value in the three charts and says what
  share of positions it is above ("higher than 93 % of positions: among the
  10 % most marked").
- **In step with the number of games**: the 93 games of the PlayStrategy
  tournament and the 7 reference games had no measures yet, so the 12
  dimensions covered 4,479 games while the page announces 4,579. They have them
  now: 427,156 positions from 4,576 games (the 3 games abandoned before the
  first move have none). Everything is computed from the loaded games: if games
  are added without their measures, the card says how many are missing, and a
  test refuses it.
- On phones, the picture has its own readable layout.

### Fixed
- **Game statistics page**: it froze the browser for about 5 seconds every time
  it opened (computing the 12 dimensions and their correlations, measured at
  2.7 s + 2.4 s). Now 0.25 s the first time, then instant; and the 12-dimension
  card shows up without waiting for the rest of the page, whose first
  computation takes more than a minute.
- "Up to 0.93" (the link between cohesion, support and unsupported marbles) was
  written by hand: it is now measured.

### Tests
- 5 new tests: every PlayStrategy and reference game has its measures, up to
  date; they follow the same convention as the main bank; the percentiles over
  all games and per side; the card (explanation, charts, slider, per-side
  table); games without measures are flagged.

## [v2.58]

### Added — the game's List and Comments, as in Uncle Lolo's Abalone
- **📋 List**: a tab next to "Game". The moves in a Move | Black | White table,
  in Aba-Pro notation, with the score after each ejection "(2-1)" (Black-White),
  as in ULA's List. Tap a move to see the position; ⏮ ◀ ▶ ⏭ to navigate,
  "↩ Current game" to come back; "Copy" gives the table (for a spreadsheet or a
  message).
- **📝 Comments**: one block per move, as in ULA's log. For each AI move: its
  expected continuation (the reply it expects, then the following moves), its
  evaluation, the depth, the positions examined and the time; or where the move
  comes from when it was not computed (opening book, real games, endgame table).
  For each position, both sides: distance to centre, cohesion, marbles on the
  edge, marbles in danger. Sumitos, ejections (with the score) and repeated
  positions are flagged. "Copy" gives the whole log as text, numbered 1x, 1y…
  as in ULA.
- **Import a game (Aba-Pro)** accepts ULA's List and comment log pasted as they
  are (capitals, move numbers, "(1-1)" scores, taken-back moves). The ULA game
  Olivier sent (Belgian Daisy, 217 moves) replays in full: ejections on the same
  moves, 6-2.

### Fixed
- **Undo**: the undone move stayed in the move list, the exports and the saved
  game (in a puzzle, the wrong move stayed before the right one).
- **Replay**: "Starting position" showed the one of a previously imported game
  (the threefold-repetition rule used it as the start too), or the standard
  layout for a game started from the editor; marbles already ejected at the
  start of a puzzle were not counted.
- **Phone**: below the board, "Click on your marbles…" covered the "Project"
  row.

### Tests
- 5 new tests: importing ULA's List and log, the ULA game replayed in full with
  the same scores, the position measures, the AI's comments, undo.

## [v2.57]

### Added — Daily puzzle #N
- **One puzzle a day, the same for everyone**: each day has its number
  (#1 = 14 October 2026) and a puzzle taken from real games, with no account and
  no server. It is played on the game board; the home page, the Puzzles page and
  the badge at the top lead to it, and a `?defi=12` link opens puzzle #12.
- **A result you can share without spoiling anything**: a grid (🟥 wrong move,
  🟨 hint, 🟩 solved, ⬛ solution shown), the time spent on the puzzle, the day
  streak and the link. On phones, the phone's share sheet; elsewhere, the
  clipboard. A countdown announces the next puzzle.
- **Images to share**: at the end of a game (new 🖼️ Image button: result, score
  and final board) and for the daily puzzle (the grid, never the position).
- It replaces three "daily challenges" that existed side by side, one of them
  fake: an invented puzzle number, "taken on" with one click for 50 XP without
  playing anything.

### Fixed — what did not work
- **Settings**: only "General profile" showed; the other tabs (Accessibility,
  Permissions, Notifications, Security, Password) looped until they crashed.
  Badly closed tags also made parts of pages spill over (the Variants filters
  appeared in the Museum, the writer area under the Settings).
- **Puzzle of the month**: "Play" set the puzzle up on the game board while
  staying on the Puzzles page, with no board. It now opens on the board, without
  erasing the saved game, without the marble rain, and without the "Game
  cancelled — no move played" that sent you home after a minute of thinking.
- **Puzzles**: after a puzzle, a new game stayed in puzzle mode: every move was
  compared with the solution, then undone.
- **Share**: the message always said "I just won", even after a loss. It now
  follows the real end of the game (win, loss, draw, two-player game) with the
  score, the opponent and the number of moves. The Discord, YouTube and Twitch
  buttons, pointing to pages that do not exist, are gone.
- **Profiles**: any password opened any profile; it is now checked (PBKDF2
  fingerprint, kept in the browser). Removed: the Google and Discord buttons that
  only showed a tooltip, "Reset e-mail sent" (no e-mail is ever sent), "visible
  to other players", and the "fightclub" account that logged in, without a
  password, under a real person's name with invented statistics — along with
  the "writer area" it opened, whose "published" articles never left the
  browser. The windows say what a profile is: local, on this device; the e-mail
  is now optional.
- **Profile page**: without a profile, below "Sign-in required", you saw a
  "18-day streak", a hand-drawn "1388 → 1489" ELO curve and ocj94's abal.online
  games — also shown on every profile as its own. A world rank without any
  ranking, achievements unlocked for free, counters never updated: everything now
  comes from the device's progress (games, streak, ELO, latest games).
- **Referrals**: "100 XP per friend" could not work without a server. The invited
  friend keeps the welcome bonus; the window explains why there is none for you.
- **Page bottom**: "🔥 18" and "⚡ 14 928", leftovers of an old phone bar, showed
  at the bottom of every page.

### Tests
- 9 new tests: Settings tabs, the tags of every page, profile, share message,
  profile passwords, referrals, and the daily puzzle (one number per day, draw,
  frozen puzzles, grid and text without the solution).

## [v2.56]

### Added — the site in English
- **Language**: the language menu is back at the top of the screen. English is
  translated by the site itself (over 700 strings): header, menus, home, game
  setup, the game and its end screens, the core rules, the tutorial, the help
  (11 topics rewritten), puzzles (the 18 in the series and the 138 from real
  games), live play, the Brain Duel and the Brain Gym home. More technical pages
  (AI Lab, game library, Academy, strategy chapters…) are still in French and
  say so. Other languages still rely on the browser's translation.
- **Direct link**: `?lang=en` (or `?lang=fr`) opens the site in that language and
  remembers it. Without a link or a choice the site stays in French; a banner,
  in English, offers English to non-French browsers.
- **No flicker**: in English the page shows up in English straight away. On a
  simulated mid-range phone, French used to stay visible for up to 1.7 s.
- **Home**: "Free forever. No ads, no account needed, no analytics. Open
  source (GPL)."

### Fixed
- **Puzzles**: two of the 18 puzzles had a marble off the board; the solution
  sometimes named the wrong ejected marble; statements used internal
  coordinates ("3,7") instead of board notation (f9). A test now checks every
  puzzle.
- **Rules**: "sold over 5 million copies… Educational Toy Award" replaced by
  sourced facts (over 4.5 million copies, more than thirty countries as of
  2011, one of the first Mensa Select awards in 1990); the standard layout is
  not "the Belgian" and has 5 + 6 + 3 marbles per side.
- **Game**: the player card showed "You (Olivier)" to everyone, and "Your
  marbles: Black" even when playing White.
- **Level**: a new player saw "-50 / 102 XP"; level 1 now starts at 0.
- **Menus**: the language and Help menus no longer overflow a phone screen.

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
