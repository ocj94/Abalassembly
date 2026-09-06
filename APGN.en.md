🇫🇷 [Version française](APGN.md)

# APGN — Abalone Portable Game Notation

A text format for exchanging Abalone games, modeled on chess's PGN. Readable
by eye, parseable by machine, and **verifiable**: every game must be
replayable move by move against a rules engine.

Abalone has no PGN equivalent. It has two competing notations — Aba-Pro and
Nacre — neither of which is self-sufficient: they describe a move, never the
starting position, and Aba-Pro is ambiguous out of context. No public
database exists either. This document proposes the first one.

---

## 1. Structure

An `.apgn` file contains a sequence of games. Each game has a bracketed
**tag header**, a blank line, then the **move text**, then a blank line.
UTF-8 encoding, `\n` line endings.

```
[Event "MIGS 29813"]
[Date "2016.09.19"]
[Black "abbelgriebsch"]
[White "budgie"]
[Variant "belgian"]
[Result "1-0"]
[Termination "Au score"]
[Notation "Aba-Pro"]
[Plies "84"]
[Source "MIGS"]

1. i9h8 i6h6 2. i8h7 a5b5 3. h8g7 h6g5 1-0
```

## 2. Tags

Seven tags are **mandatory**, in this order. A game missing one of them is
not valid APGN.

| Tag | Content |
|---|---|
| `Event` | Name of the tournament, source, or matchup. |
| `Date` | `YYYY.MM.DD`. An unknown field is written `????`, never a made-up date. |
| `Black` | Black's player. Black always opens. |
| `White` | White's player. |
| `Variant` | Starting layout (§3). |
| `Result` | `1-0` Black wins, `0-1` White wins, `1/2-1/2` draw, `*` unknown or interrupted game. |
| `Notation` | `Aba-Pro` or `Nacre`. No default value: both notations produce tokens of identical shape, and mixing them up silently corrupts the game. |

Optional tags, in this order when present:
`SetUp`, `Position`, `Termination`, `Plies`, `Source`, `BlackElo`, `WhiteElo`,
`TimeControl`, `Annotator`.

## 3. Variants

`Variant` takes one of the following names, in lowercase:

`standard`, `belgian`, `german_daisy`, `dutch_daisy`, `swiss_daisy`,
`alien`, `alliances`, `accelium`, `atomouche`, `centrifugeuse`, `corners`,
`domination`, `duel`, `fujiyama`, `snakes_variant`, `star`, `the_clearing`,
`the_wall`, `custom`.

`custom` **requires** the `SetUp "1"` and `Position` tags, without which the
game isn't replayable. A named variant may also carry a `Position`: in case
of disagreement, **the `Position` takes precedence**.

## 4. Position — the most important field

Chess has FEN. APGN has a string of nine rows, from row `i` (top) to row `a`
(bottom), separated by `/`. Within each row, left to right: `b` for a black
piece, `w` for a white one, a digit for a number of consecutive empty cells.
Row lengths are fixed by the board — 5, 6, 7, 8, 9, 8, 7, 6, 5 — and must be
respected.

Standard position:

```
Position "ww3/www3/2www2/8/9/8/2bbb2/3bbb/3bb b"
```

The last field, space-separated, is the side to move: `b` or `w`. It's
mandatory. In chess, the side to move can be inferred from the move number;
in Abalone, a study position may start with either side.

### Pieces already ejected

A position resumed mid-game must also carry the **score**: without it,
there's no way to know how many pieces have already left the board, and the
game isn't faithfully reconstructed. Flagged by Saab.

The ejection count is written between the rows and the side to move, prefixed
with a hyphen: `-<n>b<n>w`, black pieces ejected first, then white. The
hyphen sets it apart unambiguously from the rest.

```
Position "ww3/www3/2www2/8/9/8/2bbb2/3bbb/3bb-5b4w b"
```

Here, 5 black pieces and 4 white pieces have been ejected. At the starting
position, no ejections: the segment is **omitted** rather than written as
`-0b0w`, which would add needless weight.

```
Position "ww3/www3/2www2/8/9/8/2bbb2/3bbb/3bb b"
```

A reader encountering `-0b0w` must accept it (equivalent to the segment being
absent); a producer doesn't write it.

## 5. Move text

Moves are grouped by number: `1. <black> <white> 2. <black> <white>`. The
period immediately follows the digit. If the first recorded move is White's,
it's written `1... <white>`.

The text ends with the result, repeated from the header. A reader that finds
a disagreement between the two must reject the game rather than pick one.

Tokens follow the declared notation. Comments are written in braces and may
be ignored.

## 6. Replayability — the requirement that makes the difference

An APGN game is **valid** if, starting from its position and applying its
moves in order, a rules engine accepts every move as legal.

This is what sets APGN apart from a plain text file. Aba-Pro is ambiguous: a
token can denote several legal moves, and the position is needed to settle
it. The `Position` tag removes the ambiguity; the replay verifies it.

An APGN producer must validate before writing. A consumer must validate
before using. A game that doesn't replay isn't a malformed APGN game: it's a
false one, and it must be rejected along with the number of the offending
move.

## 7. What this format doesn't do

It doesn't replace Aba-Pro or Nacre: it carries them. It doesn't define a
move notation, it declares which one is in use.

It carries no per-move clock, no evaluation, no analysis variations. These
additions will come if a real need appears — not before.

## 8. File extension and type

`.apgn`, `text/x-abalone-pgn`.
