🇫🇷 [Version française](Moteur-experimental.md)

# Experimental engine (NNUE)

An "Experimental engine (NNUE)" section offers to replace part of the game engine's machinery with a small neural network trained on the corpus's real games. It's an option, not a replacement — the current engine (weights tuned by hand and by SPSA) remains the default AI.

**Two places to pick it**: directly on the setup screen before starting a game (the most convenient for everyday use), or in the **AI Lab** (to test it in isolation without starting a real game). Both use the exact same setting — a choice made in one is reflected in the other.

## What it is

A tiny network (125 inputs → 32 → 16 → 1 output, 4,577 parameters in total — small enough to run in plain JavaScript, no external dependency) trained to predict, from a position, which side is favored to win the game.

**Training data**: 189,797 positions extracted from 3,944 real, replayable games from the corpus (MIGS + AbalOnline). The training/validation split is done **by whole game**, never by isolated position — positions from the same game are too correlated with each other to be used for both training and checking without skewing the result.

**Training result**: on games never seen during training, the network correctly predicts which side is favored 80.3% of the time (versus 50% at random).

## The three proposed variants

1. **NNUE — evaluation**: replaces the usual calculation (8 hand-tuned weights) with the network, to judge each position at the end of the search.
2. **NNUE — move ordering**: keeps the usual evaluation, but uses the network to decide in what order to examine candidate moves (a better order can, in theory, speed up the search).
3. **NNUE — combined**: both at once, across the full search depth.

## The honest result

Each variant was tested under real conditions: real games, played to completion, against the current engine, across 15 varied starting positions (drawn from the corpus, not the same position repeated), controlling for first-move advantage.

| Variant | Result against the current engine |
|---|---|
| NNUE — evaluation | 2 wins, 8 losses, 5 draws |
| NNUE — move ordering | +2.7% nodes explored for an identical result (so slower, not more efficient) |
| NNUE — combined | Result nearly identical to evaluation alone |

**In all three cases, the current engine wins.** This isn't a hidden flaw: it's displayed exactly as-is in the interface, with these same figures shown as a tooltip on each button.

## Why offer it anyway

The site's guiding principle is to never invent a figure or dress up a result. This network was built and tested seriously, and the result — even though it isn't the one hoped for — is genuine information: predicting *who ultimately wins* a human game is a different goal from correctly judging the tactical soundness of *one specific* position mid-search. This mismatch in objectives probably explains why the network, despite an honest accuracy on its own criterion (80.3%), doesn't beat an engine built directly for search.

This section stays available for anyone who wants to see the result for themselves, or explore a different training objective later (imitating strong human players' moves, for instance, rather than predicting the game's outcome).


## Your own results by engine

The **Statistics** page now brings the two scales together side by side: the general result above (the 15 test games), and your personal results — computed from your own game history, filtered by the engine chosen for each game.

If you've played few games with a given engine, a "small sample" warning appears below 10 games — a win rate over 2 or 3 games doesn't mean much statistically, and the site never presents it as if it did.

## The self-play lead: measured, and far more affordable than previously written

An academic project (Abalearn, INESC-ID) trained a network for Abalone through **self-play** — the program plays against itself and learns from its own games — rather than by predicting the outcome of human games. This is exactly the hypothesis put forward above to explain the current NNUE's mixed result: the training objective may simply be the wrong one.

**Correcting a mistaken claim.** An earlier version of this page stated that this approach would cost around 300 hours of compute and was therefore out of reach. **That was wrong**, and based on an estimate that had never been checked. The calculation assumed a depth-3 search and the goal of matching the entire human corpus — two unnecessarily costly assumptions, neither of which self-play actually requires.

Here is what the **actual measurement** gives (depth 2, Belgian Daisy, full games played to completion):

| Measurement | Value |
|---|---|
| Time per game | 20.4 s |
| Average length | 43.6 moves |
| Training positions per game | 44.6 |
| Unique positions | 97.8% |

Extrapolating from these measurements:

| Target volume | Compute time |
|---|---|
| 20,000 positions | ~2.5 hours |
| 50,000 positions | ~6.3 hours |
| 190,000 positions (current human corpus volume) | ~24 hours |

Long, but perfectly within reach for a useful dataset — nowhere near the wrongly-claimed 300 hours.

### A trap narrowly avoided

The engine is **strictly deterministic**: three searches on the same position return exactly the same move. Without randomizing the opening moves, a thousand self-played games would have been **the same game a thousand times over**, and the resulting dataset would have been worthless — a silent failure, hard to spot after the fact.

The generator therefore plays its opening moves at random, and **measures and displays the rate of unique positions on every run** (97.8% on the sample), precisely so this risk stays visible if the settings change.

### The real difficulty isn't compute time

On the measured sample, **Black wins 8 games out of 10**. This marked first-player imbalance means a network trained as-is would mostly learn "Black wins", instead of learning to evaluate a position. The data would need to be balanced before any training — flipping colors, or weighting.

This is the real remaining obstacle, not the compute cost. It hasn't been solved.

### Current status

The generator exists and is validated: `tools/selfplay-gen.js` in the repo, with its measured figures and documented caveats in the header. Large-scale generation and the actual training remain to be done.

## Why no NNUE — the 0/53 measurement

This section closes out the neural-network path, not with a plain "it didn't work", but with three reproducible measurements that explain **why**.

### Correlation wasn't the right criterion

A retrained network reached **0.87 correlation** with the classical evaluation (versus 0.07 for the originally shipped network). That looked excellent — and it still lost, 3 wins out of 12.

Correlation measures agreement *on average*. But choosing a move doesn't depend on the average: the alternatives need to be ranked correctly against each other. On a position where fifty moves are worth +10 and a single one is worth +2100 because it ejects a piece, an error of a few points is invisible in a correlation score but misses the winning move entirely.

The useful criterion is therefore the **"same best move" rate** against the classical evaluation, measured separately depending on whether the position is tactical (at least one ejection available, for either side) or quiet.

### The three experiments

| Approach | Input | Parameters | Tactical | Quiet | Total |
|---|---|---|---|---|---|
| 64/32, original network | 125 cells | 10,177 | **0%** (0/53) | 26.9% | 20.5% |
| 256/128, ×6.4 parameters | 125 cells | 65,281 | 8.7% (4/46) | 31.0% | 26.4% |
| 64/32 + 4 tactical indicators | 129 inputs | 10,433 | **26%** (13/50) | 7.3% | 12.0% |

The first result is the most striking: **zero good moves out of 53 tactical positions**. Not "less often" — never. And the error is costly: 58 evaluation points at the median, up to 2,104 at worst, on the order of a lost piece.

### What these measurements establish

**It isn't a capacity problem.** Multiplying the parameter count by 6.4 does improve learning (validation error 0.102 versus 0.123) but only gains 8.7 points on tactics. Far from the ~100% that would be needed to compete.

**It's a representation problem.** Adding just four explicit tactical indicators — number of available ejections, possible pushes, threats faced, capture differential — brings tactical accuracy up to 26%, with a network six times smaller than the previous one. Three times better, for much less.

**But this gain comes at a cost.** Quiet positions collapse from 31% to 7.3%, and the total drops from 26.4% to 12%. The network leans on the easy indicators and stops learning positional structure. It trades one skill for another rather than adding the second on top of the first.

### The conclusion

The original 125 inputs only describe which cells are occupied. They say nothing about what makes a position tactical: that a push is possible, that an opposing piece sits at the board's edge and can be pushed off, that a threat is looming. The network would have to infer all of that from raw occupancy — in other words, relearn hexagonal geometry from scratch: alignments along six directions, sumito rules, distance to the edge.

It doesn't, and handing it that information amounts to recomputing what the classical evaluation already computes, explicitly, in fifteen lines.

**If the network needs to be handed the classical evaluation's own calculations to get things right, the classical evaluation might as well be kept.** It's also three times faster per call (9.9 µs versus a measured 31.4 µs — the network was never the slow link), it encodes the geometry explicitly, and it wins: 15-2 against the originally shipped network, 9-3 against the retrained version.

### Reproducing the measurement

1. Generate about 220 positions via random walk from several starting variants, stopping at 6 captures.
2. Classify each position: *tactical* if at least one ejection is available for either side, *quiet* otherwise.
3. For each position, enumerate the legal moves and record the one the classical evaluation prefers, then the one the network prefers.
4. Count the agreement rate separately for each category.

An agreement rate close to zero on tactical positions is the decisive signal: the network doesn't see the ejections, whatever its overall correlation.
