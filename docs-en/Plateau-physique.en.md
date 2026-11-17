🇫🇷 [Version française](../docs-fr/Plateau-physique.fr.md)

# Playing on a physical board

What the site already does with a real board, and what would be needed for a machine to move the marbles itself. Written in November 2026 after watching an Abalone-playing machine project found on video.

---

## What the site already does

The **Photo / board detection** page (`#photo`, `18-camera-detection.js`) has three modes:

| Mode | What it does | Where the computing happens |
|---|---|---|
| **Photo** | A dropped or captured image, read by Claude Vision | network call |
| **Live** | Camera feed, read frame by frame | in the page |
| **AR** | Continuous feed, board recognised as an overlay, legal moves and best move drawn on the image | in the page |

The AR mode is the most complete: four-corner calibration, homography (`detComputeHomography` / `detApplyHomography`), colour classification of the 61 holes (`detSamplePatch` / `detClassify`), then **the engine's real functions** — `validateMove`, `applyMove`, `evaluateBoard` — applied to a temporary board, synchronously, never disturbing a game running elsewhere in the application.

In other words: **seeing the board** and **deciding the move** are done, and done offline, inside the phone.

## The project observed

A five-block setup: a phone app to start the game, **Microsoft Azure** for the computation, a camera above the board, an **Arduino Uno**, and a two-axis gantry that moves the marbles.

Two fundamental differences from Abalassembly's choices:

- **Their engine lives on a server.** No network, no game, and every move costs a round trip. Here the engine is in the page: the site plays on a plane, in the underground, with no account.
- **Their camera deduces the human's move** by comparing two successive states. The AR mode reads the complete state on every frame, which is simpler and more robust: no memory of the previous move is needed.

So only the third block is missing: **moving the marbles**.

## Why Abalone is harder to automate than chess

In chess, draughts or noughts and crosses, a move is a **pick and place**: a piece leaves one square and lands on another. An arm or an electromagnet is enough.

In Abalone, a move is the **sliding of a column**. A three-against-two push moves **five marbles at once**, along one axis. A magnet pulls only one, and moving the marbles out of order breaks the position.

## The decomposition that solves it

An Abalone move breaks down into simple one-cell moves, provided you **start with the leading marble**:

1. The marble furthest along the direction of the move goes first — into the empty cell ahead of it, or **off the board** if the move is an ejection.
2. The cell it frees becomes the destination of the marble right behind it.
3. You work back up the column, one marble at a time, to the tail.

Each destination frees up **just before** it is needed. A push therefore becomes 2 to 5 single-cell moves in an imposed order, and a two-axis gantry is enough — no need to grip several marbles together.

The engine already produces everything this list needs: `addMoveToHistory` receives `{ cells, dir, type, ejection }`, that is the marbles played, the direction and the kind of move. The sequence follows without recomputing anything:

```
marbles sorted by (marble · direction), descending   →  the head first
for each marble, from head to tail:
    destination = position + direction
    if the destination is off the board: ejection
```

For a broadside move the marbles travel **in parallel** and none blocks another: the order is free.

## What is not done, and not by accident

No hardware control is planned in the site. A gantry is expensive, it breaks, and it adds nothing for the player: knowing which move to play is the whole value; moving three marbles two centimetres is something a human does very well. The **On a real board** page and the AR mode cover the real need — playing on your wooden board with the engine advising.

If the third block ever had to exist, the shortest path would be: the browser reads the board in AR, computes the move, and sends the sequence of single-cell moves to a microcontroller over Bluetooth or local Wi-Fi. The optional server (`abalassembly-api`) is not needed: there is nothing to compute anywhere but in the page.
