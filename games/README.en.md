🇫🇷 [Version française](README.md)

# Games

Abalone games in [APGN](../APGN.en.md) format. Every game in this folder was
**replayed move by move against the game's own engine** before being
written: a game that doesn't replay isn't published.

## `migs-2016-2017.apgn`

2,589 games played on **MiGs**, a free online Abalone server built and run by
"Mogwai" and funded by player donations. MiGs shut down for good on
**May 30, 2017**. As far as we know, no other public source exists for these
games.

- Period: 2016 – 2017
- Layout: Belgian Daisy, for all games
- 140 distinct players, 262,032 moves, 101 moves per game on average
- Notation: Aba-Pro
- Validation: 2,589 out of 2,589 fully replay

These records are move sequences — that is, facts, not creative works. They
are republished here for preservation: the server that hosted them no longer
exists and its administrator can't be reached. If you hold rights over this
set and want it taken down, open an issue on this repo: it will be removed
without argument.

1,431 of these games have a program on one side (MLA, lolo's AI,
π #0ABA10): those sides carry the `BlackType` or `WhiteType` `"program"` tag
(v2.91).

## `playstrategy-yearly-2026.apgn`

The 93 games of PlayStrategy's **Yearly Abalone Arena**, played on
18 September 2026, published with Vincent Frochot's consent.

- Layout: Belgian Daisy (that is "Abalone" on PlayStrategy)
- 16 players, one of them a program: the PST-Greedy-Tom bot, in 73 games
  (`"program"` tag); 20 games are between two humans
- 7,705 plies, 83 per game on average; 86 games ended on the score, 7 by
  resignation or abandonment, 3 of them without a single move
- Notation: Aba-Pro. PlayStrategy writes its moves in its own notation,
  which is **not** Nacre: every move was converted then checked (same
  position as PlayStrategy's on all 7,705 plies)
- Validation: 93 out of 93 fully replay
- Result: the one recorded by PlayStrategy; the ending (`Termination`) is
  read from the replay

## Not published

The same file also contains 1,891 games from **abal.online**, Vincent
Frochot's site. They are **not** distributed here, for lack of his consent.
The converter can produce them — `--source ao` — but they must not be
published before that consent is given.

## Producing the files

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
node tools/to-apgn.js --source ps --out games/playstrategy-yearly-2026.apgn
```
