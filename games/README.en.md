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

## Not published

The same file also contains 1,891 games from **abal.online**, Vincent
Frochot's site. They are **not** distributed here, for lack of his consent.
The converter can produce them — `--source ao` — but they must not be
published before that consent is given.

## Producing the files

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
```
