🇫🇷 [Version française](Home.md)

# Abalassembly — wiki

A complete Abalone game in a single HTML file: zero dependencies, offline, GPL v3.

## Pages

- **[Kids Mode](Mode-Enfant.en.md)** — letting a young player sit at the screen alone, with a protected exit.
- **[Comfort & accessibility](Accessibilite.en.md)** — settings that genuinely change the display and pace.
- **[Performance profile](Profil-de-performance.en.md)** — metrics defined, computed, and placed against a real corpus.
- **[Exchanging games](Echanger-des-parties.en.md)** — game by code, APGN format.
- **[Puzzles](Puzzles.en.md)** — how the library is verified against the engine.
- **[History](Historique.en.md)** — your past games, filterable and replayable.
- **[Historical fingerprints](Empreintes-historiques.en.md)** — rarity, trajectory, correlations with winning.
- **[Engine benchmark](Benchmark-moteur.en.md)** — methodology and actually measured figures.
- **[Architecture](Architecture.en.md)** — three diagrams: engine, data, game modes.
- **[Distributed computing](Calcul-distribue.en.md)** — why there's no volunteer computing grid.
- **[Multi-worker engine](Moteur-multi-worker.en.md)** — what works, and a real unresolved limitation, documented honestly.
- **[Variants](Variantes.en.md)** — playable versus documented only, across the three places on the site that describe them.
- **[Function glossary](Glossaire-fonctions.en.md)** — 1,236 functions extracted from the real code, sorted by letter with their code section.

## In brief

- **Play**: [ocj94.github.io/Abalassembly](https://ocj94.github.io/Abalassembly/)
- **4,479 games** embedded, replayable move by move
- **2,589 MiGs games** republished in [APGN](../APGN.en.md), saved from a server that shut down in 2017
- **First-person view**, game by code, post-game analysis, puzzle of the day
- **12 languages** in the selector — English and Hebrew ship with embedded navigation translation, the others rely on the browser's own translation; Hebrew in RTL (sidebar and layout flip to the right)
- **Multi-worker AI** — splits across several cores when the device offers them (up to 4), otherwise behaves as before
- **RAM-capped search cache** — adapts to the device rather than growing without bound, especially useful in Minimax mode (unbounded-time search)
- **Technical mode** — on the pages that have it (Endgame tables, Openings, Lab, Statistics, Analysis), a button reveals the method and raw figures without cluttering the default view
- **Understanding engine** (Analysis page) — for any position: spatial breakdown, support weakness, sumito potential, immediate threats, tactical depth, 2-move mobility, and a targeted threat search on request
- **Positional fingerprint** (same page) — capture a position as a reference, compare any later position to it (distance + per-dimension detail in technical mode). Invariant under left-right mirroring: two exactly mirrored positions are recognized as identical
- **418,595 historical positions** embedded, with the current position's percentile against this real corpus
- **Tactical motif library** — rotation-invariant detection, real win rate computed from actual games
- **Position graph** — real transpositions between different games, up to 20 plies
- **Tactical map** — mobility, support, threat, and edge proximity per piece, as an overlay on the board
- **Navigable opening explorer**, with a statistical confidence indicator per branch
- Version-controlled test suite: `node tests/regression.js`
