🇫🇷 [Version française](Empreintes-historiques.md)

# Historical fingerprints — what can be learned from them

Every game in the corpus (MIGS + AbalOnline) is summarized, move by move, into a **12-dimension fingerprint** — cohesion, support, sumito potential, threats faced, tactical depth, mobility... 418,595 fingerprints in total, one per move played in a real human game.

Three features build on this, all computed at runtime — never a hand-written percentage or threshold.

## How uncommon a position is

The analysis panel compares your current position to its closest neighbors among the 418,595 fingerprints, and reports whether it's common or rare.

The thresholds aren't arbitrary: they come from a real measurement on 300 randomly drawn positions (median distance to nearest neighbor ≈ 0.18, 90th percentile ≈ 0.29). Below 0.05, a position is called "very common"; above 0.29, "rare".

## A game's evolution curve

On every similar historical position shown, a **"📈 curve"** button plots how any of the 12 dimensions evolved, move by move, throughout that specific real game.

Nothing new is computed for this — every move of a game already has its own fingerprint (verified: 86 fingerprints for the very first game in the MIGS corpus, one per move). The curve simply filters and sorts what already exists.

## What 155,533 real positions say about winning

The most interesting of the three features. For each dimension, the side to move's eventual win rate is compared depending on whether it was in the bottom third or the top third on that dimension, at the time of the position:

| Dimension | Bottom third | Top third | Gap |
|---|---|---|---|
| Material differential | 39.5% | 61.3% | +21.8 pt |
| Threats faced | 58.8% | 39.3% | −19.5 pt |
| Pieces in the core | 41.4% | 58.7% | +17.3 pt |
| Sumito potential | 43.4% | 57.7% | +14.3 pt |
| Pieces at the edge | 56.7% | 44.1% | −12.6 pt |
| Tactical depth | 45.1% | 56.8% | +11.7 pt |
| Average cohesion | 43.0% | 54.2% | +11.3 pt |

This isn't statistical noise: it confirms, with real data rather than a guess, well-known Abalone strategic principles — control the center, avoid the edge, don't sit under threat.

### Update: the MIGS corpus has joined the calculation (325,003 positions)

Checked after the fact: for MIGS games that ended **"by score"** (1,524 out of 2,589), replaying the game to the end with the real engine consistently reaches 6 captures on one side — a reliable, unambiguous winner. The panel now combines both sources: 155,533 AbalOnline positions + 169,470 MIGS "by score" positions = **325,003 positions** with a known winner.

This calculation (replaying 1,524 games) takes about 78 seconds the first time a device opens the panel — cached afterward, never redone. A game in progress is never disrupted by this calculation, which runs on its own temporary board state.

### The limitation that's openly acknowledged

For MIGS games that ended by **resignation, timeout, or disconnection** (1,045 games), the final capture counts never exceed 3 to 5 — it's structurally impossible to tell who resigned from the corpus data alone. Rather than guess, these games stay excluded from the calculation.

## How to access it

Game menu → **Analysis** tab, during or after a game. The comparison against historical positions (percentile, rarity, similar positions, correlations) displays automatically as soon as the library has finished loading.
