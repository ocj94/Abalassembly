🇫🇷 [Version française](Echanger-des-parties.md)

# Exchanging games

## Game by code

An asynchronous game via a simple text exchange. You play, copy the code, send it; your opponent pastes it, plays, and sends theirs back. **No account, no server.**

The code carries the entire game from the first move — variant, move history, and now the identity of both players (`ABAL1:variant:blackName|whiteName:moves`). Whoever receives it replays everything against the engine and rejects the code at the first illegal move, rather than trusting it blindly. Codes generated before this addition (with no names) remain readable.

A "Your name" field (remembered from one game to the next) and a color choice appear in the modal. As soon as both names are known, they're shown at the top: "⚫ Olivier vs ⚪ Saab".

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

## The difference between the two

The game code (`ABAL1`) is compact, made to be sent by text message during a game. APGN is made for archiving and sharing a finished game.
