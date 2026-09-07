🇫🇷 [Version française](README.md)

# Community games

Real games, played on an actual physical board and recorded through the
site's **AI Detection** feature (photograph the board after each move; the
move is reconstructed automatically by the engine).

Unlike the games in [`games/`](../games/README.en.md), these are **not all
guaranteed to replay**: detection starts from a photo, not a digital move
log, and can get it wrong. Every game therefore carries a `verified` field,
honest about this rather than claiming uniform reliability.

## Format (`abalassembly-scanned-games-v1`)

```json
{
  "format": "abalassembly-scanned-games-v1",
  "exportedAt": "2026-07-16T00:00:00.000Z",
  "count": 85,
  "games": [
    {
      "date": "2026-07-16",
      "black": "AP10",
      "white": "Ula6",
      "variant": "belgian",
      "start": "0a1a2b1b2b3c2c3g7g8h7h8h9i8i9,...",
      "startColor": "black",
      "seq": "1.A1B2 I5H5 2.A2B3 I6H6 3.C2C3 A5B5 ...",
      "plies": 84,
      "verified": true
    }
  ]
}
```

| Field | Content |
|---|---|
| `date` | Date of the game, `YYYY-MM-DD`. |
| `black` / `white` | Names entered by the person recording. |
| `variant` | Starting layout. |
| `start` | Starting position, AO format (a compact position notation, different from APGN's FEN-like one — see [`APGN.md`](../APGN.en.md) for that other format). |
| `startColor` | Side that opens from this position. |
| `seq` | Moves in Aba-Pro notation. |
| `plies` | Number of half-moves. |
| `verified` | `true` if the sequence fully replays against the engine at recording time; `false` otherwise (imperfect detection). |

The file as a whole also carries `format`, `exportedAt` (export timestamp),
and `count` (number of games). A single-game export uses the neighboring
format `abalassembly-scanned-game-v1` (singular), with one `game` field
instead of `games`.

## Current content

`abalassembly-saab-lot2.json` — 85 games submitted by **Saab**, all Belgian
Daisy: **83 of 85 fully replay** (`verified: true`), 2 don't (imperfect
detection at recording time, kept as-is rather than hand-corrected).

## Verification on import

The site never blindly trusts a file received from outside: on import, every
game is replayed against the engine before being accepted, whether or not it
carries `verified: true` in the source file.

## Difference from `games/`

[`games/`](../games/README.en.md) contains games **in APGN format**, **all**
verified before publication, sourced from online game servers (MiGs). This
folder contains games **in the site's native JSON format**, sourced from a
**physical** board, where an unverified game still gets published but is
clearly flagged as such.
