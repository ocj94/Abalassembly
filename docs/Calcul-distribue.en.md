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
