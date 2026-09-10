🇫🇷 [Version française](Calcul-distribue.md)

# Distributed computing — why there isn't any

Four separate "volunteer computing grid" proposals (BOINC- or World Community Grid-style) were studied for Abalassembly. None was adopted. This page explains why, with the actual numbers, to avoid re-litigating the question in six months.

The idea isn't a bad one. The blocker isn't strictly technical either — the browser can run Workers in the background just fine. The blocker is simpler: **no calculation exists today that would justify the infrastructure.**

## The real sizes of the endgame tables

This is the mistake common to all four proposals: each one massively underestimated the size of the endgame tables, and each one built its main argument on that estimate. Here are the computed figures, for a 61-cell board:

| Class | Positions | Minimum storage (2 bits/position) |
|---|---|---|
| 2v2 — **already computed** | 3,131,130 | ~1 MB |
| 3v2 — **already computed** | 59,491,470 | ~15 MB |
| 3v3 | 1,110,507,440 | **278 MB** |
| 4v3 | 15,269,477,300 | **3.8 GB** |
| 4v4 | 206,137,943,550 | **51.5 GB** |

For reference, the whole site weighs about 7.8 MB, everything included. Even the 3v3 class, the most modest of the three remaining ones, would outweigh the file by a factor of thirty-five.

The gaps between these figures and the ones claimed in the proposals ranged from a factor of 6 to a factor of 20,000. That gap is consistently what made each proposal collapse once recalculated.

### Two ways to count, both correct

The table above counts **raw** placements — how many marble configurations exist on the board, ignoring the board's symmetries. That's the right measure for showing the scale of the problem.

But 2v2 and 3v2, once **actually computed**, don't occupy that raw space: they exploit the board's 12 symmetries (rotations and reflections) to reduce the weaker side to its canonical positions only, plus a ×2 factor for whose turn it is. Concretely:

| Class | Raw space (table above) | Reduced space (real, validated method) |
|---|---|---|
| 2v2 | 3,131,130 | 6,262,260 *(includes the ×2 for turn, absent from the raw count)* |
| 3v2 | 59,491,470 | 11,703,240 |
| 3v3 | 1,110,507,440 | **224,721,560** |

The reduced method is the one that actually produced the 2v2 and 3v2 tables already embedded in the game — re-checked by rerunning it from scratch in a separate sandbox and comparing the result against the real data, position by position, with zero discrepancy across the tens of thousands of non-empty entries in both tables.

**3v3 has been computed with this same method**, a first: 224,721,560 positions resolved, of which only 2 wins and no forced losses — the rest, draws. A surprising but consistent result: a capture from 3v3 lands on a 3v2 position that's almost always a draw (99.85% of the corpus), so very few captures happen to land on one of the rare decisive positions. Both winning positions were independently re-verified with the real game engine, not just with the calculation that produced them.

**One assumption behind the shipped 3v2 table, verified for the first time rather than just inherited**: the original algorithm never checks whether the stronger side (3 marbles) can lose — it assumes that's impossible without proving it. An isolated black marble genuinely can be pushed by the two white marbles (confirmed with the real engine, on a hand-built position), but a simple push doesn't reduce the marble count. The real question — can white force a full ejection against optimal defense — was tested on a sample of 158,043 black-to-move positions, covering all 180 orbits of the weaker side: zero cases where all of black's moves led to a confirmed white win. The shipped table holds, now on evidence.

**What this doesn't change**: 4v3 remains out of reach for single-file storage even reduced by symmetry (roughly 812 MB estimated, versus 3.8 GB raw) — still tens of times the size of the entire site. A real additional obstacle, found while digging further: half of the retrograde computation (the weaker side, when it's their turn to move) changes its table slot on **every single move, without exception** — splitting the work into independent chunks doesn't work, the whole table would need to stay in memory (or virtual memory backed by a swap file) for the entire computation.

**Where this actually stands**: 3v2 (already shipped) and 3v3 (computed, validated, not shipped — no use to a player, 2 exploitable positions out of 224 million) are the two prerequisites for 4v2, itself a prerequisite for 4v3. None of this changes this page's conclusion — 4v3 remains out of the site's reach — but the computation method is now proven, not just estimated on paper.

## The four computing candidates, and why none holds up

**3v3 endgame tables and beyond** — incompatible with the single-file architecture, see the table above. The project stopped at 3v2 for this reason, and that was the right call.

**Training a neural network (NNUE)** — the candidate that came up most often, usually presented as the priority. It's ruled out based on measurement, not intuition: the network is **blind to tactical positions**, and this isn't a data-volume or compute-power problem. See [Experimental engine](Moteur-experimental.en.md), section "Why no NNUE — the 0/53 measurement". Throwing more compute at a model that systematically misses ejections wouldn't fix it.

**SPSA weight optimization** — the Lab already does this, locally, on a few workers. It doesn't need outside help.

**Position generation and game analysis** — the corpus of 4,479 real games is already embedded and put to use (opening books, historical fingerprints, statistics). There's nothing left waiting to be computed.

## Two architectural constraints, verified in the code

**Workers are created from an embedded string**, never from a separate file:

```js
const blob = new Blob([AI_WORKER_CODE], { type: 'application/javascript' });
_aiWorker = new Worker(URL.createObjectURL(blob));
```

Several proposals suggested a standalone `distributed-worker.js`. A separate file **breaks operation over `file://`** — meaning from a USB drive, offline, which is the project's founding principle.

**`SharedArrayBuffer` is unusable here.** It requires the COOP/COEP HTTP headers, which can't be set on GitHub Pages. This is the same limitation that already prevents a transposition table shared across workers (see [Multi-worker engine](Moteur-multi-worker.en.md)).

## The verification problem

Without a server, there's no way to verify that a contributor actually computed what they're sending back. A malicious — or simply buggy — client could return anything at all.

Real grids (BOINC, World Community Grid) solve this by distributing the same task to several machines and comparing the results. That requires exactly the central server the offline architecture is trying to avoid, and doubles the compute cost.

Manually merging files received by email isn't a computing grid: it's file-sharing, with no guarantee about their contents.

## What's still worth keeping from these proposals

Three points are worth keeping for whenever this question reopens:

**Strict consent.** Nothing on by default, an explicit checkbox, an adjustable power limit, an immediate stop button, and clear wording on what's being computed. A site that ran computation without explicit agreement would rightly be treated as a hidden cryptominer.

**Redundant validation.** The same task distributed to several machines, a result accepted only if the answers agree; plus control tasks whose answer is already known.

**Start with a reproducibility test, not the endgame tables.** Have several browsers compute random positions and check they land on exactly the same result. This tests the whole chain — distribution, computation, validation — without committing weeks of compute to an uncertain goal. This was the best advice across all four documents.

## Under what conditions this reopens

Two, both required:

1. **A real computing goal** — something whose result would actually fit in the site and bring a measurable improvement. None of the four current candidates meets this bar.
2. **An active backend** — `abalassembly-api` exists but stays deliberately dormant. It's the precondition for aggregation and verification, and would unlock a genuine Elo leaderboard along the way.

Until then, building "lend my CPU" toggles would mean promising contributors a computation nobody actually needs.
