🇫🇷 [Version française](Moteur-multi-worker.md)

# Multi-worker AI engine — what works, what doesn't yet

The AI can spread its calculation across several CPU cores (up to 4), via Web Workers. This page honestly documents a real limitation discovered while investigating a possible improvement — not to raise alarm, but because pretending otherwise would go against the spirit of the project.

## How it works today

Each worker receives a fixed batch of candidate moves to examine (split by index over a list sorted by `moveKey` — sorted cells + direction —, `move number % worker count`), and explores them on its own, independently of the others. At the end, the site compares the best score reported by each worker and keeps the highest.

**Note (fixed since):** before sorting by `moveKey`, the split was based on the raw output order of `getAllMovesForColor`, which depends on the board object's key insertion order — `applyMove`/`undoMove` change that order via delete-then-reassign. The split therefore stopped being a genuine partition as early as depth 2: measured on a real Belgian Daisy position, 33 of 52 moves changed index after a single applyMove/undoMove round trip, and with 3 workers, 11 of the 52 moves were examined by **no** worker at all. The AI could therefore be structurally blind to its own best move, with no visible symptom. Fixed by sorting on `moveKey` (canonical, hence stable) before splitting — verified: full, non-overlapping coverage at every depth tested. **This fix is distinct from the problem described below** — two different bugs in the same area of code. This one was about *coverage* (moves never examined); the one that follows is about *score comparability* between moves that are all examined correctly. The second one remains unresolved.

## The problem that was found

Each worker has its **own** search memory (transposition table, recently-good moves, history) — never shared with the others. This memory grows richer as the search progresses, making later evaluations more accurate.

Concretely: **the same move, at the same depth, can receive a very different score** depending on whether it's evaluated alone (empty memory) or as part of an already-rich search. Verified directly: a move that was objectively good (score 32 in a single-thread search, within a rich context) dropped to 0 when evaluated in isolation with empty memory — a 32-point gap on the **exact same position**.

This isn't a localized calculation bug — it's a natural consequence of how the algorithm (alpha-beta pruning assisted by search memory) works. The practical result: comparing scores across independent workers isn't perfectly reliable. A worker that happened to get the most favorable move sequence for building up useful context can report a more flattering score than another, for a move that's actually equivalent or worse.

## Why this isn't fixed (yet)

The standard fix — a search memory **shared** across workers — requires a web feature (`SharedArrayBuffer`) that needs server headers a site hosted on GitHub Pages cannot send. Confirmed blocked, not a matter of effort.

An alternative approach was explored and **abandoned**: quickly rank moves in parallel (independent memory, so approximate), then only closely verify the top candidates within a single, reliable context. It doesn't work: the gap between a "cold" and an "in-context" evaluation can be large enough that the quick ranking wrongly discards the actual best move before it ever reaches the reliable verification step.

A second approach (dynamic work redistribution between workers, to better balance load) was built and verified **correct**, but not clearly faster in practice, and it doesn't solve this underlying problem anyway — it stays in the code, disabled, documented in a comment for a possible future revisit.

## In practice

The system remains broadly functional: the score gaps caused by this phenomenon rarely change the **ranking** of the best moves, only their reported numeric value. But the risk is real, not zero, and deserves to be known rather than hidden.
