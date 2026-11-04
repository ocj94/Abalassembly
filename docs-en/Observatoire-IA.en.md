🇫🇷 [Version française](../docs-fr/Observatoire-IA.fr.md)

# AI Observatory

*Since v3.05, extended up to v3.09.* A panel that shows what the AI computes **while** the game goes on, then why it picked its move. The screenshots below come from the real site, during a real game against the AI (French interface).

**To open it**: in a game against the AI, the **"🔭 AI Observatory"** button under the board. The panel sits on the right on a computer and at the bottom on a phone. It has five tabs and three levels of detail: **Spectator**, **Analyst**, **Developer**.

> The engine's choices are unchanged: it only sends its measures while searching (at most every 150 ms). A test checks that it plays the same move, with the same positions searched, whether the panel is open or not. Nothing leaves the browser.

## The game board, live

![The board while the AI searches: three numbered arrows and the detailed banner](../docs-img/obs-plateau-direct.webp)

- **The 3 best moves of the moment**, as arrows numbered like the list: **1** green, **2** orange, **3** grey. An arrow starts at the last marble of the group and ends on the cell where the first one lands; the best move's marbles are circled.
- **Marbles at risk** on both sides: red for a marble on the edge with one ally or fewer, orange for an isolated marble. These are the engine's evaluation definitions.
- **The "AI is thinking…" banner**: depth, positions searched, time and provisional best move. It shows even with the panel closed.

All of it is set on the line under the tabs: **Show: arrows, threats, banner**.

## Overview

![Overview tab: depth, positions, time, speed, score by depth, search log](../docs-img/obs-vue-generale.webp)

Depth reached, positions searched, time out of the allowed time, speed. Then:

- **the best move, depth after depth**, and the **curve of its score** (orange dot when the best move changes);
- **the search log**: one line per completed depth, with the best move, its score, the positions and cutoffs, and "best changes" when it does; at the end, the move played, and "time ran out during depth N" if the timer cut in;
- speed, alpha-beta cutoffs, transposition table, pruning by depth; at Developer level, thread by thread.

## Search: the moves studied

![Search tab: mini board with coordinates and numbered arrows, list of first moves](../docs-img/obs-recherche.webp)

Every first move, with its score, its gap with the best one, the search effort spent under it, and ⚠ when the opponent has an ejection right after. The mini board shows **Aba-Pro coordinates** (letters a to i, numbers 1 to 9) to read the notation.

### "Why not this move?"

!["Why not …?" card: gap, score depth after depth, rules one move ahead, criteria](../docs-img/obs-pourquoi.webp)

Clicking a move in the list opens its card. It only holds facts:

- its rank and score, its gap with the chosen move, in points and in marbles;
- **its score depth after depth**. If it led earlier and then fell back, the card says so: searching further, the engine found a better reply for the opponent;
- what the rules show **one move ahead**: move type, ejections set up, ejections left to the opponent, marbles in danger;
- the criteria that differ at the end of both expected lines, when they are kept.

Below, the **expected line**, move by move, on a small board.

## Decision: why this move rather than another

![Decision tab: chosen move, two alternatives, arrows, "one move ahead" table](../docs-img/obs-decision.webp)

The chosen move and its two best alternatives, as arrows of the same colours, then a table: move type, ejections set up by the AI, ejections available to the opponent, marbles in danger on each side. These columns are **rebuilt after the search with the game rules, one move ahead, without search**: the panel says so. The score itself comes from the search.

![Two lines side by side, stepped together](../docs-img/obs-decision-variantes.webp)

Further down, **two lines side by side**, stepped together. The numbers on the marbles tell at which move of the line they moved.

## Evaluation: what makes up the score

![Evaluation tab: the engine's criteria and weights as bars, marble map](../docs-img/obs-evaluation.webp)

The engine's evaluation criteria, with their values, as bars centred on zero, and what the selected move changes. The score is in **internal points**: one marble ahead is worth 1000, an ejection 2000. It is not a win probability.

## History and strip

![History tab: AI score over the game, list of moves, deeper re-run, strip at the bottom](../docs-img/obs-historique.webp)

The AI's score over the game, the list of its decisions, and **"Re-run this search deeper"** for a past move. At the bottom of the panel, on every tab, a **strip**: one dot per AI move (red when the score is negative, ringed orange after a drop of 200 points or more, hollow without search), a dot that pulses while searching, ◀ ▶ to step from move to move. The game report can be **copied** or **downloaded** (.txt, and .json at Developer level).

## Shrunk panel

![The panel shrunk to one line, the board clear with arrows and marbles at risk](../docs-img/obs-reduit.webp)

The **—** button shrinks the panel to one line: the board stays clear, with its arrows and marbles at risk. Clicking the line opens it again. The **⤢** button does the opposite: all five tabs at once, full screen.

## On a phone

![On a phone, the panel as a drawer under the board, the banner just above](../docs-img/obs-telephone.webp)

On a phone, the panel opens as a drawer over the bottom of the screen and the "AI is thinking…" banner moves just above it. The drawer hides part of the board: its mini board shows the same arrows, and the **—** button shrinks it to one line at the top to see the whole board again.

## What the panel does not claim

- **No full tree**: the engine does not keep the thousands of positions it searched. We show the principal lines of the 10 best first moves.
- **No pruning at the root**: every first move is fully scored. A move is set aside for its score, not because its branch was cut.
- **No "confidence" percentage**, no "memory used": we show the gap with the 2nd move and how many depths the choice stayed the same, which are measured facts.

See also: [AI reflection](Reflexion-IA.en.md) (the table after the move) and [Analysing a game](Analyse.en.md).
