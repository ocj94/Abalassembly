🇫🇷 [Version française](Variantes.md)

# Variants — playable versus documented only

The site has two separate variant systems that don't fully overlap. This
page states precisely which ones can actually be played and which are only
described — checked directly against the code, not assumed.

## The two systems

**The "Variants" gallery** (menu → Explore → Variants) is an encyclopedia
of 20 cards — name, players, duration, difficulty, description, historical
source. Clicking a card shows it in detail. **No card has a "play" button**:
it's a reading catalog, not an entry point into a game.

**The setup screen** (Play → Starting layout) offers 19 real starting
positions, each with its own thumbnail and board coordinates — this is
what the engine can actually load.

The two lists don't match one to one.

## Genuinely playable (10 of 20)

These gallery cards have a real starting position behind them, sometimes
under a different name on the setup screen:

| Gallery | Setup screen |
|---|---|
| Standard | Standard |
| Belgian Daisy | Belgian |
| German Daisy | German |
| Dutch Daisy | Dutch |
| Swiss Daisy | Swiss |
| Face 2 Face | Face à face |
| Alien Attack | Alien |
| Fujiyama | Fujiyama |
| The Wall | The Wall |
| Snakes | Snakes |

## Documented only (10 of 20)

These cards exist and can be read, but nothing in the app lets you start a
game in this exact configuration:

- **The Pillar** — its description mentions an immovable neutral piece at
  the center: a third piece type the engine doesn't support (only black
  and white exist). Not "not wired up yet" — a different game mechanic
  that doesn't exist in the current engine.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** — no
  matching starting position found.
- **Blitz Contest**, **Misère** — "blitz" does exist elsewhere in the
  code, but only as a filter on a demo leaderboard page — not as an
  actual game mode you can start.
- **3, 4, 5, 6 players** — all 20 `LAYOUTS` positions are 2-sided
  (black/white); a multiplayer mode would need a different board
  structure, not built yet.

## And the other way around

A few setup-screen positions have no card in the gallery — playable, but
not described: Star, Alliances, Domination, Atomouche, Centrifuge, Korean
Daisy, Anglattack, and the "69" layout. The gap runs both ways, not just
the direction you'd guess first.
