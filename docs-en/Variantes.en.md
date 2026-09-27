🇫🇷 [Version française](../docs-fr/Variantes.fr.md)

# Variants — playable versus documented only

The site documents variants in three different places, which don't fully
overlap. This page states precisely which ones can actually be played and
which are only described — checked directly against the code on every
revision, never assumed.

## 1. The "Variants" gallery versus the setup screen

**The gallery** (menu → Explore → Variants) is an encyclopedia of 33
cards — name, players, duration, difficulty, description, historical
source. Tapping a card opens its explanation right below it. For the 23
playable cards, it also shows the starting board, drawn from the engine's
actual position, and a **"▶ Jouer cette variante"** (play this variant)
button that opens the setup screen with the variant already selected.

**The setup screen** (Play → Starting layout) offers 23 real starting
positions in its dropdown, each with its own thumbnail — this is what the
engine can actually load. (This document previously stated that number
while the dropdown only had 22: Découverte, the reduced board of Kids
mode, was missing. It's there now, and still excluded from random draws.)

The two lists now match one to one for everything playable: every engine
position has its card, checked by the tests.

For the most recently added cards, the texts rely only on already-verified
sources and on measurements: number of games, wins and median length in
the AbalOnline corpus, computed symmetries. No difficulty is made up: when
there's no data, it's marked "Non évaluée" (not rated).

### Genuinely playable (23 of 33)

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
| Alitration | Alitration |
| Pyramide | Pyramide |
| Marguerite française (French Daisy) | Marguerite française |
| Découverte (Discovery) | Découverte (7 billes) |
| 69 | 69 |
| Star | Star |
| Alliances | Alliances |
| Domination | Domination |
| Atomouche | Atomouche |
| Centrifugeuse | Centrifugeuse |
| Snakes variant | Snakes variant |
| Korean Daisy | Korean Daisy |
| Anglattack | Anglattack |

### Documented only (10 of 33)

- **The Pillar** — its description mentions an immovable neutral piece at
  the center: a third piece type the engine doesn't support (only black
  and white exist). Not "not wired up yet" — a different game mechanic
  that doesn't exist in the current engine.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** — no
  matching starting position found.
- **Blitz Contest**, **Misère** — "blitz" does exist elsewhere in the
  code, but only as a filter on a demo leaderboard page — not as an
  actual game mode you can start.
- **3, 4, 5, 6 players** — all 23 `LAYOUTS` positions are 2-sided
  (black/white); a multiplayer mode would need a different board
  structure. See section 2: this mode actually has its own dedicated
  page, separate from these gallery cards.

### And the other way around: playable but not in the gallery (0 of 23)

There used to be ten — Découverte, 69, Star, Alliances, Domination,
Atomouche, Centrifugeuse, Snakes variant, Korean Daisy, Anglattack. They all
have a card now: the gap only runs one way, that of documented variants the
engine can't play.

## 2. The Learn page: multiplayer variants, deliberately on hold

Completely separate from the gallery above: the Learn page has a dedicated
section ("Playing with 3 or 4 players") that describes **in full detail**
four real, official multiplayer variants, complete rules included:

- **3-player Abalone** — 3 colors, 11 marbles each, win at 6 ejections
  regardless of color.
- **4-player Abalone** — three ways to play it: in teams (the official
  rule, 4-3-2 trapezoid layout), free-for-all, or adapting any existing
  symmetric daisy layout without adding marbles.
- **Abalone Quattro** — the commercial Schmidt Spiel edition with four
  sets of 14 marbles.
- **Abalone+ (10 ejections)** — classic two-player rules, but 10
  ejections to win (or an agreed target between 1 and 9), a 4-marble
  move extension, and two moves per turn.

These four variants are **honestly flagged as not playable** by an
explicit note at the end of the section: they need several players around
the same board, and will be playable online once multiplayer mode is
available. This isn't an oversight — it's stated plainly in the app
itself.

## 3. Mentioned only in the FAQ

Three more names show up in the built-in assistant's answers, with no
detailed description anywhere else on the site:

- **Grand Abalone** — bigger board, 2 moves per turn, 10 ejections to
  win; available on PlayStrategy, not in Abalassembly.
- **Offboard** — external scoring zones, 2025 edition.
- **Abalone Junior** (1997) — a historical simplified edition.

These three have no gallery card, no dedicated Learn section, and no
playable position: just a name mentioned in answer to a question, nothing
more for now.
