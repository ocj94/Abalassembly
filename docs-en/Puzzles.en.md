🇫🇷 [Version française](../docs-fr/Puzzles.fr.md)

# Puzzles — how they're verified

The library contains 138 puzzles drawn from real games: 78 one-move puzzles (verified offline, see below) and 60 two-move puzzles, added later (verified differently, see further down).

## The 78 one-move puzzles

### The offline checker

`tests/puzzles.js` replays every puzzle against the game's own engine — the same approach used for APGN games: don't trust the data, replay it. It checks six things:

1. **Valid coordinates** — every piece lands on an actual board cell.
2. **No collisions** — no cell is both black and white at once.
3. **Plausible piece counts** — at most 14 pieces per side, captures between 0 and 6, and pieces on the board plus pieces ejected never exceeding 14.
4. **Legal solution** — the proposed move is accepted by the engine from that position, for the side to move.
5. **Exact notation** — the displayed label genuinely matches the move played, in official Aba-Pro notation.
6. **Consistent defense** — for a parry puzzle, every alternative move is legal.

```
node tests/puzzles.js
```

The report lists, puzzle by puzzle, the field at fault. Exit code 1 if any problem remains.

### What the audit fixed

A first pass found eight faulty puzzles out of the original eighty:

- **Six wrong labels.** The move itself played correctly, but the written notation pointed to a different cell — misleading for anyone learning from it. These were recalculated by the engine.
- **Two impossible positions.** More than fourteen pieces once ejected ones were counted. Since the original intended score was unknown, these puzzles were removed rather than guessed at and patched.

Two guardrails in the regression suite now check that no coordinate or piece count can drift like this again in the future.

## The 60 two-move puzzles

Added afterward, mined from the real MIGS game corpus (Belgian Daisy). Unlike the first 78, the solution requires two moves from the player (three half-moves in total, with an opposing response in between) — none of the original 78 went beyond a single move.

### How they were found and verified

The mining process uses `AbaSolve`, the engine's proof solver (an exhaustive AND/OR search, not a heuristic): for each candidate position, it checks that no move wins in a single move (otherwise the position would already belong to the first 78), then that a win is **proven** in exactly three half-moves.

A first mining pass had a real bug: the stored position was a reference into the board state being used for calculation, not a copy — moves played during mining silently corrupted the original position. An independent check (replaying every puzzle from scratch, without reusing the mining run's state) uncovered it: 0 out of 60 passed this check. After fixing the position-cloning, 60 out of 60 passed.

### What is NOT done yet

`tests/puzzles.js` (the offline script above) still only covers the first 78 — it hasn't been extended to replay the three-half-move sequences of the 60 new ones. Their verification, for now, still relies on what was done at mining time plus the client-side certification badge (see below). Extending `tests/puzzles.js` to this format remains to be done.

## Client-side certification (new)

The site now also checks puzzles directly in the browser, against the engine actually loaded by the player — not only offline at commit time. For a one-move puzzle: the announced move must be legal and produce the capture (or remove the threat, for a parry puzzle). For a two-move puzzle: the whole sequence — move, stored opposing response, final move — is replayed and must result in a genuine capture. A "🏅 Certified" badge appears on the daily/monthly puzzle when the check succeeds.


## Spaced repetition (new)

Separate from the puzzle of the day and the puzzle of the month (which stay drawn deterministically by date, never touched by this system), a personal review queue appears when previously attempted puzzles come due again.

Simple, increasing-interval principle: missing a puzzle brings it back the very next day. Solving it pushes its next appearance further out — 3 days, then 7, then 14, 30, up to 90 days for a puzzle truly mastered. A new miss, even after a long streak of successes, sends it straight back to "review tomorrow".

The **"To review"** card appears on the Puzzles page only when at least one puzzle is due. The "Review now" button runs through the due puzzles one after another, starting with the most fragile (lowest interval), automatically moving to the next one after each success.
