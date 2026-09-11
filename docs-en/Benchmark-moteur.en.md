🇫🇷 [Version française](../docs-fr/Benchmark-moteur.fr.md)

# Engine benchmark — methodology and real results

As far as we know, no public, reproducible comparison of Abalone-playing programs exists. Academic work on the subject notes this explicitly, and one such paper even points out that no public server lets an AI connect to be evaluated.

This page gathers what Abalassembly actually measures, along with the method used. Every figure below was obtained by measurement, never estimated — and wherever a measurement is missing or unreliable, that's stated too.

## How to measure it yourself

The site includes an **engine benchmark** (AI Lab) that runs entirely in the browser, sending nothing anywhere. On the Belgian Daisy starting position, it measures: nodes explored per second with a single worker, then with however many workers are actually in use, and the real efficiency of that parallelism (observed gain relative to the ideal theoretical gain).

Anyone can reproduce this, on any device — and results vary a lot by machine, which is exactly the point of measuring it yourself rather than reading a published number.

## Measured results — mobile device (Android, browser)

| Depth | 1 worker | 4 workers (combined) | Parallelism efficiency |
|---|---|---|---|
| 3 | 4,661 nodes/s | 14,059 nodes/s | 69% |
| 4 | 16,881 nodes/s | 26,735 nodes/s | 13% |
| 5 | 8,912 nodes/s | 18,047 nodes/s | 15% |
| 6 | 7,422 nodes/s | 20,606 nodes/s | 17% |

**Honest reading**: efficiency collapses past depth 3. Root moves are split once and for all between workers, with no redistribution — a worker that finishes early waits while another drags on. See [Multi-worker engine](Moteur-multi-worker.en.md) for the detail, and an even deeper limitation that remains unresolved.

Note on depth 3: the test is very short (a few seconds), and the single-worker throughput looks lower there than at depth 4. This is most likely the mobile CPU not having had time to ramp up its clock speed, not a property of the engine.

## Measured results — server environment (Node.js, single core)

| Depth | Time | Nodes explored |
|---|---|---|
| 3 | 4.5 s | ~24,000 |
| 4 | 31.5 s | ~239,000 |
| 5 | 120 s | ~866,000 |

That's roughly 5,400 nodes/second single-threaded in this environment.

## Comparing engine versions (SPRT)

The AI Lab can pit two sets of evaluation weights against each other and run a **sequential test (SPRT)**: rather than arbitrarily fixing a number of games, the test stops as soon as it can conclude, at a given confidence level, that one version is stronger than the other — or that no detectable difference exists.

This is the standard method in the chess-engine world, and it avoids the classic trap: play 20 games, win 12, and wrongly conclude an improvement was made.

## Notable result: the neural network (NNUE) doesn't beat the current engine

Tested in real games, played to completion, across 15 varied starting positions, controlling for first-move advantage:

| Variant | Result against the current engine |
|---|---|
| NNUE — evaluation | 2 wins, 8 losses, 5 draws |
| NNUE — move ordering | +2.7% nodes for an identical result |
| NNUE — combined | nearly identical to evaluation alone |

Full detail and interpretation: [Experimental engine](Moteur-experimental.en.md).

## Notable result: 2v2 and 3v2 endgames are almost all draws

The endgame tables, computed exhaustively for Discovery mode, show that **99.9% of 2v2 and 3v2 positions are draws**. In 2v2, the only wins are immediate ejections; in 3v2, the longest win takes 7 half-moves.

A negative result, kept and documented as-is — it says something real about the game.

## What this benchmark doesn't measure

- **An absolute Elo rating** against other programs (Aba-Pro, ULA...): these programs can't be connected to automatically, and no common protocol exists for Abalone.
- **Strength against strong humans**: would require a volume of games no offline site can gather on its own.
- **Perfect comparability between workers**: a real limitation, documented in [Multi-worker engine](Moteur-multi-worker.en.md).

## Exchanging a game with an external engine

For lack of a standard protocol, the site offers the manual path that works with any program: **export the moves in Aba-Pro notation** (game controls → "Copy moves"), submit them to the external engine, then **re-import** the result (menu → "Import").

Worth noting: no standard *position* format exists for Abalone, unlike chess's FEN. Only *move* notation is standardized. Every exchange therefore starts from a known starting position.

Since version 2.12, an **"External engine duel"** mode (game controls) automates this move-by-move relay: the site displays its move in Aba-Pro, you submit it to the external program, paste its reply, and the game continues normally — with clocks, captures, and win detection just like an ordinary game.

The move received is always re-validated against the engine before being applied: an external program can never make an illegal move happen, even by mistake.
