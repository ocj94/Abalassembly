🇫🇷 [Version française](Profil-de-performance.md)

# Performance profile

A dashboard built for an analytical eye: every metric is **defined**, **computed from real data**, and **placed** against a real corpus of 2,589 games (MiGs server).

## Where to find it

**Profile** tab, below the radar.

## What sets it apart

- **Raw calculation shown**: every row shows its numerator and denominator, for example `[24/57]` for 24 successful pushes out of 57 attempts. Nothing is asked to be taken on faith.
- **Real reference point**: the right-hand column places your value within the distribution of the 2,589 MiGs games — for example "P75" for a game length, or "within the median range" for the first ejection (corpus median: move 27).
- **No misleading zero**: missing data shows `—`, never `0`. A zero denominator doesn't invent a number.
- **Export**: a button exports everything to **JSON** and **CSV** — derived metrics and raw counters — for analysis in a spreadsheet or notebook.

## Metrics

Win rate, ejections per game, push share and efficiency, optimal moves, center control, average cohesion, advantage conversion, fast moves, game length.

## The reference values, and how they're computed

The reference distributions are measured by replaying the 2,589 MiGs games against the game's own engine, then sampled into percentiles and embedded in the file. A test in the regression suite checks that the distribution stays monotonic and properly covers 0 to 100%.
