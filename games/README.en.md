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

## `playstrategy-parties.apgn`

Other games played on **PlayStrategy**, sent one at a time (v3.28 to
v3.32), then brought into the corpus all at once (v3.33): they count in the
game statistics, the maps, the Lab and move quality.

- 15 casual games, 1,372 plies, sorted by date:
  - `FPEZWejN`, `HtlXNktv`, `5YGrgSbG` (27 May 2025, 10+0, 113, 36 and 107 plies: won 6-2, resignation at 0-0, loss on time at 3-3)
  - `MxbIzwOB`, `6mqKM9vY`, `RpnjUrjG`, `KntP8TmA` (28 May 2025, no clock, 102, 87, 186 and 231 plies: won 6-4, 6-5, 6-5 and 6-4)
  - `wpp0UG4c`, `B3YcJJKv` (29 May 2025, lost on time after 3 plies), `LIu9Ltk9` (29 May 2025, no clock, 128 plies, won 6-4)
  - `RCZ6myBN` (9 August 2026, 10+0, 62 plies, Black resigns)
  - `Dg90Vkbh`, `gcOnhSVq` (14 August 2026, "10 d/5" time control, 99 and 54 plies, won 6-0 and 6-4)
  - `aXsgzzHx`, `HrczjlFo` (17 August 2026, "12 d/1" time control, 78 and 83 plies, won 6-4, White resigns at 4-1)
- Layout: Belgian daisy ("Abalone" on PlayStrategy)
- Notation: Aba-Pro. Every move was converted from PlayStrategy's notation by
  `psConvertirSequence` (its replay semantics), then checked by a second,
  independent decoding: same moves, all legal, no ambiguity
- Validation: 15 out of 15 fully replay
- Notation: first cell, the tail marble; second cell, a cell on its path (in
  2026, where the last pushed marble lands; in 2025, depending on the move,
  where the leading marble lands or simply the next cell). The whole chain
  moves that way; `psConvertirSequence` reads all these forms. Sideways
  move: one end, then the cell the other end reaches; the distance between
  the two cells gives the group's size

## Not published

The same file also contains 1,891 games from **abal.online**, Vincent
Frochot's site. They are **not** distributed here, for lack of his consent.
The converter can produce them — `--source ao` — but they must not be
published before that consent is given.

## Producing the files

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
node tools/to-apgn.js --source ps --out games/playstrategy-yearly-2026.apgn
node tools/to-apgn.js --source ps-autres --out games/playstrategy-parties.apgn
```

## Adding games

1. Add the game to `PS_PARTIES_AMICALES` (`src/main/16-corpus-data-tools.js`),
   at its date, moves converted by `psConvertirSequence`, then
   `node tools/build.js` and regenerate `playstrategy-parties.apgn` with the
   command above.
2. It goes into the corpus's PlayStrategy bank by itself (`PS_CORPUS`):
   recompute `tools/qualite-coups.js`, `tools/stats-parties.js`,
   `tools/labo-positions.js` and `tools/empreintes-complement.js`, then update
   the figures quoted (4,595 games…); the tests say which.

## Players' usernames (GDPR)

These games carry their players' usernames, published on the basis of
legitimate interest (archives of games played in public). A player can ask
for theirs to be removed, no reason needed: "Remove my username" issue
template.

To remove it: add the username to `PSEUDOS_RETIRES` in
`src/main/00c-pseudos-retires.js`, then `node tools/build.js` and regenerate
these files with the commands above. The username becomes "Joueur retiré"
(removed player) on the site and in the files. Reply within a month (GDPR,
article 12).
