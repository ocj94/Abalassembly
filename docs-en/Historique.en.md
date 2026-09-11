🇫🇷 [Version française](../docs-fr/Historique.fr.md)

# Game history

Every finished game (against the AI, local, by code, or live) is automatically archived on this device — accessible from the **History** button in the side menu.

## What gets recorded

For each game: the date, the variant played, the mode (against the AI, with its style and level, or local/by-code), the result, the number of moves, and the full game (replayable move by move).

Technically, each game is stored in the same compact format as "Game by code" — a few hundred bytes per game, not the full position at every move. The 200 most recent games are kept; beyond that, the oldest ones disappear to make room.

## Browsing and filtering

The history modal offers three combinable filters — variant, mode, result — plus free-text search. Each game shows a **Review** button, which reloads it in replay mode: move-by-move navigation, just like a game from the library.

## Review my mistakes

On the victory screen, right after a game, the **⚠️ Review my mistakes** button directly lists your 3 most costly moves (the largest evaluation drop), without having to go hunting for them yourself in the Analysis tab. Each listed move is clickable and jumps straight to the corresponding position.

This isn't a new analysis — the button reuses the exact same evaluation engine already used by the Analysis tab's evaluation bar, just made available in one click instead of having to search move by move by hand.

## Privacy

Everything stays on this device, in the browser's local storage — nothing is sent anywhere. Clearing the browser's cache also erases this history (along with the rest of your progress); remember to use **Export my data** in settings if you want to keep it elsewhere.
