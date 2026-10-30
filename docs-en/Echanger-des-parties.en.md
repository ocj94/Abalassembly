🇫🇷 [Version française](../docs-fr/Echanger-des-parties.fr.md)

# Exchanging games

## Game by code

An asynchronous game via a simple text exchange. You play, copy the code, send it; your opponent pastes it, plays, and sends theirs back. **No account, no server.**

The code carries the entire game from the first move — variant, move history, and now the identity of both players (`ABAL1:variant:blackName|whiteName:moves`). Whoever receives it replays everything against the engine and rejects the code at the first illegal move, rather than trusting it blindly. Codes generated before this addition (with no names) remain readable.

A "Your name" field (remembered from one game to the next) and a color choice appear in the modal. As soon as both names are known, they're shown at the top: "⚫ ocj94 vs ⚪ Saab".

Game menu → **Game by code**.

## Live game (WebRTC) — experimental

Same spirit as "Game by code", but in real time: the two browsers connect directly to each other, with no account and no game server. A single code exchange at the start (offer → answer, exactly like setting up a game by code), then every move appears instantly on the other side — nothing left to copy-paste afterward.

One small external service remains necessary: a free, public STUN server helps each device find itself behind its home router. No game data passes through it, just a few technical networking details.

**Labeled experimental** because the direct connection doesn't work on every network (strict firewalls, some corporate or mobile networks). If it fails or disconnects mid-game, a button offers to switch straight to "Game by code" — the game continues, just asynchronously instead of live.

Game menu → **Live game**.

## The APGN format

Abalone never had an equivalent to chess's PGN. [`APGN.md`](../APGN.en.md) proposes one: a tag header, numbered moves, a result.

Two choices set it apart from a plain text file:

- The **Notation** tag is mandatory. Aba-Pro and Nacre produce tokens of identical shape; mixing them up would silently corrupt the game.
- The **Position** tag plays the role of chess's FEN and removes Aba-Pro's ambiguity.

**A game is only valid if it replays.** The `tools/to-apgn.js` converter produces the file and rejects anything that doesn't pass.

## Importing Aba-Pro notation

A third entry point, for moves already written down elsewhere: menu → **Import** opens a text box where you can paste a move sequence in Aba-Pro notation (`e5f6 c3b2 ...`, move numbers optional), along with a choice of variant and who starts.

An honest note: this isn't an import aimed at any one specific site. Board Game Arena, for instance, exposes no downloadable text export format for Abalone — its replays work by replaying the browser's own internal notifications, nothing to copy-paste. Aba-Pro, on the other hand, remains the genuinely documented standard actually used by the Abalone community — the same one used by "Game by code" and by APGN below.

If the pasted text contains an unreadable or illegal move for the chosen board, the import stops cleanly at that point and says so clearly (X moves recognized out of Y) — never a silently truncated import presented as complete.

## Saab's notation: the position code (KAAH, KAAWA)

It is not a move notation but the **whole position**, "factorised" (as Saab,
KAAH's author, explains it): each side's cells grouped by row (`a1 a2 b1 b2
b3` → `a12b123`), each side preceded by the number of **its own** lost
marbles, the two sides separated by `_`. The Belgian Daisy:

```
0a12b123c23g78h789i89_0a45b456c56g45h456i56
```

In sudden death (5 marbles already lost on each side): `5a12b123c23g78h789i89_5a45b456c56g45h456i56`.
A single position displays without replaying the game, and two consecutive
positions give the move, in any notation.

In Abalassembly (v2.98):

- **under the board**, the code of the position shown: *Copy*, and
  *Permutations*, KAAH's window: the code can be edited there (paste another
  one to read it), the 12 symmetries and the swapped sides, the **posRef**
  highlighted with its **code_permut**, *Copy all* in KAAH's format, and
  *Play this position*;
- the **posRef** is the form under which KAAH files a position, whatever its
  orientation: the side with more marbles comes first, then, among the 12
  symmetries (and the swapped sides if they have as many marbles), the one
  whose marbles are closest to a1, then a2, a3, b2… The
  `code_permut_Ref_Orig` tells which symmetry leads there (0 to 11, +100 if
  the sides were swapped). It is KAAH's own computation, compared with its
  code on 2,885 positions without a single difference;
- **playing from a code**: menu → *Import* ("Or a position" field), the
  *Permutations* window, or the position editor ("Or a position code", and
  *Copy the position code*). The game starts from that position, Black to
  move. Its game code (`ABAL1`) then carries its starting position instead
  of the layout name — `pos_` followed by the code — so that the history and
  *Game by code* replay it;
- **KAAH and KAAWA game files** (`.json`): menu → *Import* → *KAAH / KAAWA
  game file*, and the game's *💾 KAAH file (.json)* button. Each move carries
  its position (`pos`): when reading, that position picks the move among the
  legal moves (the Nacre text is only a fallback), following the line
  actually played (`is_origin`). Files written by Abalassembly were read back
  by KAAH's own loader, identically; branches and clocks are not written.

## The difference between the two

The game code (`ABAL1`) is compact, made to be sent by text message during a game. APGN is made for archiving and sharing a finished game.
