🇬🇧 [English version](../docs-en/Ressources.en.md)

# Ressources sur l'Abalone

Tout ce qui existe autour du jeu, rassemblé en un seul endroit : où jouer,
les serveurs disparus, les compétitions, les programmes, les articles, les
encyclopédies, les données ouvertes, les systèmes de notation. Chaque ligne dit d'où vient
l'information ; ce qui n'a pas pu être vérifié est signalé comme tel.

Mise à jour : 30 octobre 2026.

## 1. Où jouer aujourd'hui

| Site ou appli | Ce qu'on y trouve |
|---|---|
| [Board Game Arena](https://en.boardgamearena.com/gamepanel?game=abalone) | Abalone dans le navigateur, classé. Appartient à Asmodee, l'éditeur du jeu, depuis février 2021. Aucune partie exportable. |
| [PlayStrategy](https://playstrategy.org) | Site gratuit et libre, fondé par Etan Ilfeld sur le modèle de lichess. Abalone y est arrivé le 9 janvier 2025, développé surtout par Vincent Frochot ([annonce](https://playstrategy.org/blog/Z34_ChIAACcA884u/abalone-has-arrived)). Partie en direct ou par correspondance, tournois « Arena », Grand Prix en ligne du Mind Sports Olympiad, variante Grand Abalone. Trois bots d'entraînement : PS-Random-Mover, PS-Greedy-One-Move, PS-Greedy-Two-Move. Les tournois s'exportent (PGN, CSV). |
| [abal.online](https://abal.online) | Le site de Vincent Frochot. A rouvert le jeu en ligne à l'été 2020 (ses plus anciennes parties connues datent du 31 juillet 2020), trois ans après la fermeture de MiGs, et a accueilli le championnat du monde en ligne de 2020. Section Replay. Statut actuel non vérifié. |
| [KAAH](https://saabalone.github.io/KAAH_Test/) | L'application de Saab, avec son IA KAI++ ; code sur [GitHub](https://github.com/saabalone/KAAH_Test). |
| [PlayAbalone](https://www.playabalone.com) | Version gratuite dans le navigateur, contre des IA (cité par Wikipédia en anglais). |
| [abalone.stellarflow.fr](https://abalone.stellarflow.fr/) | Version non officielle pour jouer à deux : un salon, un code à partager. Ni historique, ni export. |
| Application officielle d'Asmodee · [Steam](https://store.steampowered.com/app/279480/Abalone/) | Les versions de l'éditeur : en ligne, mais fermées (ni export, ni base de parties). |
| [Abalassembly](https://ocj94.github.io/Abalassembly/) | Ce projet : un seul fichier, hors ligne, 140 positions de départ, 4 580 vraies parties. |

## 2. Les serveurs disparus

| Serveur | Ce qu'on en sait |
|---|---|
| NetAbalone | Le serveur d'avant MiGs, fermé vers 2011 (date approximative). Aucune archive de parties connue. |
| abalonegames.com | Une capture de la Wayback Machine du [18 février 2003](https://web.archive.org/web/20030218145130/http://fr.abalonegames.com/). Aucune partie récupérable connue. |
| MiGs (moggames.net) | Serveur gratuit de « Mogwai », financé par les dons des joueurs, fermé le 30 mai 2017. La première partie gardée est la n° 159 (15 octobre 2006) ; les parties n'étaient gardées systématiquement qu'à partir de février 2008 ; plus de 12 000 en juin 2012, près de 40 000 à la fin. Abalassembly en publie 2 589 (2016-2017) dans [`games/`](../games/), et garde en trace dans sa bibliothèque 40 autres citées par le blog. |

Les variantes de MiGs avaient chacune un code. La liste, communiquée par
FightClub (blog Abalone Online) en décembre 2019 :

| Code | Variante | Code | Variante |
|---|---|---|---|
| 69 | Six-Neuf (6-9) | INTI | Intimidation |
| ALC | Alliances | LAB | Labyrinthe |
| ALG | Aliennage | MA | Marguerite allemande |
| ALN | Alien | MB | Marguerite belge |
| ALT | Alitration | MF | Marguerite française |
| AR | Araignée | MH | Marguerite hollandaise |
| BOUT | Boutonnière | MI | Marguerite irlandaise |
| CC | Cœurs croisés | MO | Mosaïque |
| CENT | Centrifugeuse | MQ | MQuorric1 |
| COUR | Couronne | MS | Marguerite suisse |
| CRX | Croix | PVR | Pieuvre |
| DA | Damier | PYRA | Pyramide |
| DoA | Def or Atak | ROBOT | Je suis un robot |
| DOM | Domination | ROUE | Roue |
| DUEL | Duel | SNK | Snakes |
| DvsM | Domination vs Marguerite | SNKV | Snakes variante |
| ET | Étoile | ST | Standard |
| F2F | Face à face | TRA | Tranchée |
| FOR | Forçage | VM | Vraie marguerite |
| FUJI | Fujiyama | WALL | The Wall |
| INFALIEN | Infiltralien | | |
| INFATION | Infiltration | | |

## 3. Les compétitions

- **[Mind Sports Olympiad](https://mindsportsolympiad.com)** : le
  championnat du monde, chaque année depuis 1997 (en ligne en 2020 et
  2021). Le palmarès complet est sur Wikipédia
  ([en français](https://fr.wikipedia.org/wiki/Abalone_(jeu)) jusqu'en 2019,
  [en anglais](https://en.wikipedia.org/wiki/Abalone_(board_game)) jusqu'en
  2026) ; les tableaux de médailles sur [msoworld.com](https://msoworld.com/2018-medal-table/).
- **Grand Prix en ligne du MSO** sur PlayStrategy, depuis mars 2025.
- **Championnat du monde en ligne 2020**, sur abal.online : 52 joueurs.
- **Yearly Abalone Arena** de PlayStrategy (18 septembre 2026) : ses 93
  parties sont publiées dans [`games/playstrategy-yearly-2026.apgn`](../games/),
  avec l'accord de Vincent Frochot.
- **Computer Olympiad 2003, Graz** : le tournoi entre programmes de l'ICGA.
  AbaPro (T. Werner) bat Nacre (P. Sommerlund) 8 à 0
  ([résultats de l'ICGA](https://icga.org/icga/news/Olympiad/Olympiad2003/results/Abalone/abalone.htm)).

## 4. Les programmes

| Programme | Auteur | Note |
|---|---|---|
| ABA-PRO | Tino Werner | Vainqueur du Computer Olympiad 2003 ; son aide (ABA-PRO.HLP) documente les variantes et la notation Aba-Pro. |
| Nacre | Peer Sommerlund | Deuxième en 2003 ; a donné son nom à la notation Nacre. |
| MLA (My Lovely Abalone) | David Malek | L'IA de MiGs, en trois niveaux : elle tient un camp dans 1 359 des 2 589 parties MiGs d'Abalassembly. |
| ULA (Uncle Lolo's Abalone) | Laurent Pagli | Référence pour la notation ; [son blog sur la programmation d'Abalone](https://iadabalone.wordpress.com/). |
| KAAH, KAI++ | Saab | [GitHub](https://github.com/saabalone/KAAH_Test). |
| Replayer | Nicolas Fiorini | Rejoue des parties dans le navigateur ([play-abalone.com](http://play-abalone.com/)). |
| [gym-abalone](https://github.com/towzeur/gym-abalone) | Nicolas Larue | Environnement d'apprentissage par renforcement (licence MIT) ; ses 60 positions de départ, vérifiées, ont donné 37 des positions d'Abalassembly. |

## 5. Articles et mémoires

- O. Aichholzer, F. Aurenhammer, T. Werner, *Algorithmic Fun — Abalone*,
  Telematik, 2002.
- P. Campos, T. Langlois (INESC-ID, Lisbonne), *Abalearn: Efficient
  Self-Play Learning of the game Abalone*, Lecture Notes in Computer Science.
- N. P. P. M. Lemmens, *Constructing an Abalone Game-Playing Agent*,
  mémoire de licence, 18 juin 2005.
- Bruno Curfs, *Abalone — Rules and Strategems*, version 2.1.
- P. Reysset, M. Lalet, L. Lévi, *Le livre d'Abalone*, Bornemann, 1996
  (ISBN 978-2-85182-538-4).

## 6. Encyclopédies et références

- **Wikipédia** : [Abalone (jeu)](https://fr.wikipedia.org/wiki/Abalone_(jeu))
  en français, [Abalone (board game)](https://en.wikipedia.org/wiki/Abalone_(board_game))
  en anglais (plus à jour : jeu en ligne, palmarès jusqu'en 2026). Ses
  images de positions (*Abalone arrow.svg*, *Abalone snakes variation.svg*…)
  ont confirmé deux positions d'Abalassembly.
- **[BoardGameGeek](https://boardgamegeek.com/boardgame/526/abalone)** : la
  fiche de référence du jeu et son forum.
- **[Vikidia](https://fr.vikidia.org/wiki/Abalone)**, l'encyclopédie des
  8-13 ans : l'article contient deux erreurs de règle (une « capture par
  encerclement », qui n'existe pas, et l'idée qu'on peut briser une ligne de
  plus de 3 billes). À corriger.
- **Blog Abalone Online** : [en français](https://onlineabalone.wordpress.com/),
  [en anglais](https://abaloneonline.wordpress.com/), et sa
  [première version sur over-blog](https://abalone-online.over-blog.com/).
  Dix ans de vie de la communauté : problèmes du mois, banque de parties,
  variantes, tournois. Sa [page de liens](https://onlineabalone.wordpress.com/liens/)
  est le meilleur annuaire qui existe.

## 7. La communauté

- Le serveur Discord **⚫Abalone⚪ By the fans for the fans** (127 membres
  en juillet 2026).
- Des groupes Facebook et WhatsApp, privés.

## 8. Les données ouvertes d'Abalassembly

- [`games/migs-2016-2017.apgn`](../games/) : 2 589 parties MiGs.
- [`games/playstrategy-yearly-2026.apgn`](../games/) : 93 parties PlayStrategy.
- [APGN](../APGN.fr.md) : le format, avec les balises `BlackType` /
  `WhiteType` qui marquent le camp d'un programme.
- [`community-games/`](../community-games/) : les parties apportées par les
  joueurs.
- Les 140 positions de départ du site, dont les 80 qu'il a inventées : [Variantes](Variantes.fr.md).

## 9. Les systèmes de notation

Avant Aba-Pro et Nacre, d'autres façons d'écrire les coups ont existé. Les
deux de Marc Ghigou peuvent s'afficher sous chaque coup de l'historique
(Paramètres → Notation des coups → Notation historique), avec une fenêtre
qui dessine leurs plateaux.

| Système | Date | Principe |
|---|---|---|
| Marc Ghigou, « 1989 » | *Jeux & Stratégie* n° 1, octobre 1989 | 24 lettres sur le bord (A en bas à gauche, sens inverse des aiguilles d'une montre, sans W) ; six bases, Noir sur AE, Blanc sur MQ ; une case intérieure porte deux lettres (c4 = BD, le centre = AE). Coup : la bille de queue puis la lettre visée (`A-M`), en flèche une lettre par bille (`AC-SR`), éjection `(eI)` en romain pour Noir, `(e2)` en arabe pour Blanc. Jugé trop compliqué et ambigu. |
| Marc Ghigou, « Hemgé » (1990) | *Jeux & Stratégie* n° 7, mai-juin 1990 | Rangées A (base de Noir) à I, cases numérotées depuis l'Ouest (`A1`…`I5`). Coup en ligne : la queue puis sa case d'arrivée (`B2-C3`) ; en flèche : une extrémité puis les cases d'arrivée (`C3-D4, D5, D6`) ; éjection `(e)`. Défaut : E2 et F1 sont sur la même diagonale. |
| Michael Frank (MIT) | début des années 1990 | L'hexagone inscrit dans un carré, chaque case repérée par x et y, puis les y remplacés par des lettres : le principe d'Aba-Pro. Pas de notation des coups aboutie ([archives au MIT](https://groups.csail.mit.edu/medg/ftp/abalone/)). |
| LMU | 1994 | Loyola Marymount University : cases numérotées de 0 à 60. |
| OKUN | | Cases numérotées de 1 à 61. |
| Aba-Pro | | Rangées a à i, diagonales 1 à 9 : la notation de référence, celle des exports. |
| Nacre | | Les mêmes cases ; en flèche, le départ d'une extrémité et l'arrivée de l'autre. |
| Saab (KAAH, KAAWA) | | Pas une notation de coup : la position entière, « factorisée » (`0a12b123…_0a45b456…`, chaque camp précédé de ses billes perdues) ; sa posRef la range quelle que soit son orientation. Voir [Échanger des parties](Echanger-des-parties.fr.md). |

Sources : *Jeux & Stratégie* n° 1, n° 6 ([avril 1990](http://fr.1001mags.com/parution/jeux-strategie/numero-6-avril-1990/page-54-55-texte-integral))
et n° 7 ([mai-juin 1990](http://fr.1001mags.com/parution/jeux-strategie/numero-7-mai-jun-1990/page-50-51-texte-integral)) ;
blog Abalone Online, [« Les systèmes de notation »](https://onlineabalone.wordpress.com/2017/03/01/les-systemes-de-notation/)
(1er mars 2017). Les parties d'exemple des deux articles de Ghigou se
rejouent coup pour coup dans Abalassembly : chaque coup publié y est le seul
coup légal qui s'écrive ainsi. Deux points flous du système de 1989 (les
cases des médianes, l'extrémité nommée en flèche) sont tranchés comme dans
les exemples publiés.

Pour ajouter une ressource ou corriger une ligne, ouvrez une issue sur le
dépôt.
