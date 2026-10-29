🇫🇷 [Version française](../docs-fr/Ressources.fr.md)

# Abalone resources

Everything that exists around the game, in one place: where to play, the
servers that disappeared, competitions, programs, papers, encyclopedias,
open data. Each line says where the information comes from; what could not
be checked is flagged as such.

Updated: 29 October 2026.

## 1. Where to play today

| Site or app | What you find there |
|---|---|
| [Board Game Arena](https://en.boardgamearena.com/gamepanel?game=abalone) | Abalone in the browser, rated. Owned by Asmodee, the game's publisher, since February 2021. No exportable games. |
| [PlayStrategy](https://playstrategy.org) | Free, open-source site founded by Etan Ilfeld on the lichess model. Abalone arrived on 9 January 2025, mostly developed by Vincent Frochot ([announcement](https://playstrategy.org/blog/Z34_ChIAACcA884u/abalone-has-arrived)). Live or correspondence play, "Arena" tournaments, the Mind Sports Olympiad's online Grand Prix, the Grand Abalone variant. Three practice bots: PS-Random-Mover, PS-Greedy-One-Move, PS-Greedy-Two-Move. Tournaments can be exported (PGN, CSV). |
| [abal.online](https://abal.online) | Vincent Frochot's site. Reopened online play in summer 2020 (its oldest known games date from 31 July 2020), three years after MiGs closed, and hosted the 2020 online world championship. Replay section. Current status not checked. |
| [KAAH](https://saabalone.github.io/KAAH_Test/) | Saab's app, with its KAI++ AI; code on [GitHub](https://github.com/saabalone/KAAH_Test). |
| [PlayAbalone](https://www.playabalone.com) | Free browser version, against AIs (cited by the English Wikipedia). |
| [abalone.stellarflow.fr](https://abalone.stellarflow.fr/) | Unofficial version to play with a friend: a lobby, a code to share. No history, no export. |
| Asmodee's official app · [Steam](https://store.steampowered.com/app/279480/Abalone/) | The publisher's versions: online, but closed (no export, no game database). |
| [Abalassembly](https://ocj94.github.io/Abalassembly/) | This project: a single file, offline, 60 starting positions, 4,580 real games. |

## 2. Servers that disappeared

| Server | What is known |
|---|---|
| NetAbalone | The server before MiGs, closed around 2011 (approximate date). No known game archive. |
| abalonegames.com | A Wayback Machine capture from [18 February 2003](https://web.archive.org/web/20030218145130/http://fr.abalonegames.com/). No known recoverable games. |
| MiGs (moggames.net) | Free server run by "Mogwai", funded by player donations, closed on 30 May 2017. The first game kept is no. 159 (15 October 2006); games were only kept systematically from February 2008; over 12,000 in June 2012, nearly 40,000 by the end. Abalassembly publishes 2,589 of them (2016-2017) in [`games/`](../games/), and keeps as a trace in its library 40 more cited by the blog. |

Each MiGs variant had a code. The list, sent by FightClub (Abalone Online
blog) in December 2019:

| Code | Variant | Code | Variant |
|---|---|---|---|
| 69 | Six-Neuf (6-9) | INTI | Intimidation |
| ALC | Alliances | LAB | Labyrinthe |
| ALG | Aliennage | MA | Marguerite allemande (German Daisy) |
| ALN | Alien | MB | Marguerite belge (Belgian Daisy) |
| ALT | Alitration | MF | Marguerite française (French Daisy) |
| AR | Araignée (Spider) | MH | Marguerite hollandaise (Dutch Daisy) |
| BOUT | Boutonnière (Buttonhole) | MI | Marguerite irlandaise (Irish Daisy) |
| CC | Cœurs croisés (Crossed hearts) | MO | Mosaïque (Mosaic) |
| CENT | Centrifugeuse | MQ | MQuorric1 |
| COUR | Couronne (Crown) | MS | Marguerite suisse (Swiss Daisy) |
| CRX | Croix (Cross) | PVR | Pieuvre (Octopus) |
| DA | Damier (Checkerboard) | PYRA | Pyramide |
| DoA | Def or Atak | ROBOT | Je suis un robot (I'm a robot) |
| DOM | Domination | ROUE | Roue (Wheel) |
| DUEL | Duel | SNK | Snakes |
| DvsM | Domination vs Marguerite | SNKV | Snakes variante |
| ET | Étoile (Star) | ST | Standard |
| F2F | Face à face | TRA | Tranchée (Trench) |
| FOR | Forçage (Forcing) | VM | Vraie marguerite (True daisy) |
| FUJI | Fujiyama | WALL | The Wall |
| INFALIEN | Infiltralien | | |
| INFATION | Infiltration | | |

## 3. Competitions

- **[Mind Sports Olympiad](https://mindsportsolympiad.com)**: the world
  championship, every year since 1997 (online in 2020 and 2021). The full
  list of winners is on Wikipedia
  ([in French](https://fr.wikipedia.org/wiki/Abalone_(jeu)) up to 2019,
  [in English](https://en.wikipedia.org/wiki/Abalone_(board_game)) up to
  2026); medal tables on [msoworld.com](https://msoworld.com/2018-medal-table/).
- **The MSO online Grand Prix** on PlayStrategy, since March 2025.
- **The 2020 online world championship**, on abal.online: 52 players.
- **PlayStrategy's Yearly Abalone Arena** (18 September 2026): its 93 games
  are published in [`games/playstrategy-yearly-2026.apgn`](../games/), with
  Vincent Frochot's consent.
- **Computer Olympiad 2003, Graz**: the ICGA tournament between programs.
  AbaPro (T. Werner) beats Nacre (P. Sommerlund) 8 to 0
  ([ICGA results](https://icga.org/icga/news/Olympiad/Olympiad2003/results/Abalone/abalone.htm)).

## 4. Programs

| Program | Author | Note |
|---|---|---|
| ABA-PRO | Tino Werner | Winner of the 2003 Computer Olympiad; its help file (ABA-PRO.HLP) documents variants and the Aba-Pro notation. |
| Nacre | Peer Sommerlund | Second in 2003; gave its name to the Nacre notation. |
| MLA (My Lovely Abalone) | David Malek | The MiGs AI, in three levels: it plays one side in 1,359 of Abalassembly's 2,589 MiGs games. |
| ULA (Uncle Lolo's Abalone) | Laurent Pagli | Reference for the notation; [his blog on programming Abalone](https://iadabalone.wordpress.com/). |
| KAAH, KAI++ | Saab | [GitHub](https://github.com/saabalone/KAAH_Test). |
| Replayer | Nicolas Fiorini | Replays games in the browser ([play-abalone.com](http://play-abalone.com/)). |
| [gym-abalone](https://github.com/towzeur/gym-abalone) | Nicolas Larue | Reinforcement-learning environment (MIT licence); its 60 starting positions, once checked, gave 37 of Abalassembly's positions. |

## 5. Papers and theses

- O. Aichholzer, F. Aurenhammer, T. Werner, *Algorithmic Fun — Abalone*,
  Telematik, 2002.
- P. Campos, T. Langlois (INESC-ID, Lisbon), *Abalearn: Efficient
  Self-Play Learning of the game Abalone*, Lecture Notes in Computer Science.
- N. P. P. M. Lemmens, *Constructing an Abalone Game-Playing Agent*,
  bachelor's thesis, 18 June 2005.
- Bruno Curfs, *Abalone — Rules and Strategems*, version 2.1.
- P. Reysset, M. Lalet, L. Lévi, *Le livre d'Abalone*, Bornemann, 1996
  (ISBN 978-2-85182-538-4).

## 6. Encyclopedias and references

- **Wikipedia**: [Abalone (jeu)](https://fr.wikipedia.org/wiki/Abalone_(jeu))
  in French, [Abalone (board game)](https://en.wikipedia.org/wiki/Abalone_(board_game))
  in English (more up to date: online play, winners up to 2026). Its
  position images (*Abalone arrow.svg*, *Abalone snakes variation.svg*…)
  confirmed two of Abalassembly's positions.
- **[BoardGameGeek](https://boardgamegeek.com/boardgame/526/abalone)**: the
  game's reference page and forum.
- **[Vikidia](https://fr.vikidia.org/wiki/Abalone)**, the encyclopedia for
  8-13 year-olds: the article has two rule errors (a "capture by
  surrounding", which doesn't exist, and the idea that a line of more than
  3 marbles can be broken). To be fixed.
- **Abalone Online blog**: [in French](https://onlineabalone.wordpress.com/),
  [in English](https://abaloneonline.wordpress.com/), and its
  [first version on over-blog](https://abalone-online.over-blog.com/). Ten
  years of community life: problems of the month, game bank, variants,
  tournaments. Its [links page](https://onlineabalone.wordpress.com/liens/)
  is the best directory there is.

## 7. The community

- The Discord server **⚫Abalone⚪ By the fans for the fans** (127 members in
  July 2026).
- Private Facebook and WhatsApp groups.

## 8. Abalassembly's open data

- [`games/migs-2016-2017.apgn`](../games/): 2,589 MiGs games.
- [`games/playstrategy-yearly-2026.apgn`](../games/): 93 PlayStrategy games.
- [APGN](../APGN.en.md): the format, with the `BlackType` / `WhiteType` tags
  that mark a program's side.
- [`community-games/`](../community-games/): games contributed by players.
- The site's 60 starting positions: [Variants](Variantes.en.md).

To add a resource or fix a line, open an issue on the repository.
