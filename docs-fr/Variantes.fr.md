🇬🇧 [English version](../docs-en/Variantes.en.md)

# Variantes — jouables et documentées seulement

Le site documente des variantes à trois endroits différents, qui ne se
recouvrent pas entièrement. Cette page dit précisément lesquelles se
jouent réellement et lesquelles sont seulement décrites — vérifié
directement dans le code à chaque révision, jamais supposé.

## 1. La galerie « Variantes » face à l'écran de configuration

**La galerie** (menu → Explorer → Variantes) est une encyclopédie de 130
fiches — nom, joueurs, durée, difficulté, description, source historique.
Toucher une fiche ouvre ses explications juste en dessous. Pour les 120
fiches jouables, s'y ajoutent le plateau de départ, dessiné depuis la vraie
position du moteur, et un bouton **« ▶ Jouer cette variante »** qui ouvre la
configuration avec la variante déjà choisie.

**L'écran de configuration** (Jouer → Disposition de départ) propose 120
positions de départ réelles dans son menu déroulant, chacune avec sa
propre miniature — c'est ce que le moteur sait effectivement charger.
(Jusqu'ici ce document annonçait ce chiffre alors que le menu n'en
comptait que 22 : Découverte, le plateau réduit du mode Enfant, n'y
figurait pas. Elle y est désormais, et reste exclue du tirage aléatoire.)

Les deux listes correspondent terme à terme pour tout ce qui est jouable :
chaque position du moteur a sa fiche, vérifié par les tests.

Pour les fiches ajoutées en dernier, les textes s'appuient uniquement sur
des sources déjà vérifiées et sur des mesures : nombre de parties, victoires
et durée médiane dans le corpus AbalOnline, symétries calculées. Aucune
difficulté n'est inventée : faute de donnée, elle est marquée « Non
évaluée ».

### Réellement jouables (120 sur 130)

| Galerie | Configuration |
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
| Marguerite française | Marguerite française |
| Découverte | Découverte (7 billes) |
| 69 | 69 |
| Star | Star |
| Alliances | Alliances |
| Domination | Domination |
| Atomouche | Atomouche |
| Centrifugeuse | Centrifugeuse |
| Snakes variant | Snakes variant |
| Korean Daisy | Korean Daisy |
| Anglattack | Anglattack |

### Ajoutées en v2.93 : 36 positions du blog Abalone Online, relevées par gym-abalone

Le projet libre [gym-abalone](https://github.com/towzeur/gym-abalone)
(Nicolas Larue, licence MIT) a relevé automatiquement 60 positions de
départ sur les images du blog Abalone Online. Avant d'en ajouter une seule,
sa fiabilité a été mesurée : 20 des 23 positions déjà présentes s'y
retrouvent identiques case par case, couleurs comprises, et Corners et Duel
sont identiques aux positions de départ des vraies parties AbalOnline. Une
erreur connue : sa « snakes-variation » a perdu une bille.

36 positions retenues, chacune avec sa fiche et son entrée dans le menu de
configuration (groupe « Positions du blog Abalone Online ») : Aliennage, April Fish, Boutonnière, Damier, Corners, Cross, Cœurs croisés, Crown, Def or Attack, Domination vs Daisy, Duel, Forcing, Fracture, French King Cake, Horseshoes, Infiltralien, Infiltration, Intimidation, Marguerite irlandaise, I'm a Robot, Labyrinth, Mosaic, Mquorric, Neko, Oath, Octopus, Scottish Daisy, Sibe, Slaloms, Snowflake, Araignée, Tinsels, Trench, True Daisy, Wheel, Xmas Star.

Écartées, à vérifier sur les images du blog : food-mill et windmill
(symétriques à une bille près, la marque d'une case mal lue).

En v2.94, deux images de Wikipédia (« Abalone arrow » et « Abalone snakes
variation ») ont tranché les deux autres cas. **The Arrow** y est identique,
case par case, au relevé de gym-abalone, 13 blanches comprises : 14 noires
contre 13 blanches est donc la position publiée. Elle est ajoutée, seule
disposition aux camps inégaux. **snakes-variation** est notre Snakes
variant, à qui gym-abalone avait fait perdre une bille : rien à ajouter, et
une troisième confirmation pour Snakes variant.

Sauf Corners et Duel, confirmées par 32 et 21 parties AbalOnline, chacune
n'a qu'une source : leurs fiches le disent.

### Ajoutées en v3.01 : 60 départs inventés par Abalassembly

Demandés par ocj94 : des positions de départ nouvelles, plus équilibrées
entre les deux joueurs. Elles ont été choisies parmi des milliers de
positions générées au hasard, avec quatre règles : 14 billes par camp ; les
Blancs sont le demi-tour exact des Noirs (même forme, même place) ; les deux
camps ne se touchent pas, personne ne peut pousser au premier coup ; aucune
bille seule. Aucune n'est une position déjà connue, même tournée ou
retournée (posRef de KAAH, vérifié par les tests).

**La mesure** : l'avantage du trait, le score que le moteur donne aux Noirs
après leur meilleure suite de 3 demi-coups (recherche à profondeur 3). Plus
il est proche de 0, plus le départ est équilibré. Pour comparer : Standard
+38, Marguerite belge +32, Marguerite allemande +50. Le test du site refait
une de ces mesures (Les Tenailles, +28).

| Série | Formes | Avantage du trait | Départs |
|---|---|---|---|
| 1 · formes compactes | un ou deux blocs par camp, chacun chez soi | de +12 à +38 | La Ruche, La Botte, Le Bastion, L’Éventail, La Dalle, La Flamme, Le Peigne, Le Donjon, La Fronde, La Vague, Les Tenailles, Le Bouclier, L’Écharpe, La Proue, La Colonne, La Voile, La Barque, Le Fanion, La Catapulte, Le Pavé |
| 2 · petits groupes | 4 groupes de 2 à 5 billes par camp, mêlés à ceux de l'adversaire | de +24 à +48 | L’Archipel, Les Sentinelles, Les Avant-postes, Les Escouades, Les Dominos, Le Semis, Les Lucioles, La Ronde, La Comète, Le Chapelet, La Garnison, Les Pléiades, La Faucille, Le Losange, Le Croissant, Les Vigies, La Lance, Le Mât, Les Rameaux, La Volée |
| 3 · petits groupes, suite | 4 ou 5 groupes par camp, dont 7 formes symétriques de gauche à droite | de +28 à +50 | La Patrouille, Le Diadème, Les Cornes, L’Escadrille, Le Trident, Le Javelot, Les Créneaux, La Constellation, Le Fer à cheval, Les Éclaireurs, Le Quinconce, Les Lanternes, Les Ricochets, Le Serpent, La Lyre, La Citadelle, L’Échelle, Le Phare, Les Grêlons, L’Envol |

Ce que la recherche a montré :

- **Plus un camp est compact, moins le premier coup rapporte.** Sur 90
  formes où chaque camp reste chez soi, l'avantage moyen passe de +51 pour
  un seul bloc à +72 pour deux et +109 pour trois.
- **Les petits groupes ne tiennent l'équilibre que mêlés à ceux de
  l'adversaire.** Gardés chacun dans sa moitié : +52 au mieux, le plus
  souvent de +80 à +120. Mêlés : 27 formes sur 103 font au plus +50, la
  meilleure +24.
- **À 5 groupes par camp, jamais sous +46** (11 formes sur 36 au plus +50).

Ce sont des mesures du moteur, pas des parties : entre humains, dans le
corpus du site, les Noirs gagnent 53 % des parties. Seul un grand nombre de
parties dira si ces départs ramènent ce taux à 50 %. Les fiches le disent :
aucune partie n'a encore été jouée depuis ces positions.

Dans le menu de configuration, elles forment trois groupes « Départs
inventés par Abalassembly » ; dans la galerie, le bouton « 🧪 Inventées »
les montre toutes.

### Documentées seulement (10 sur 130)

- **The Pillar** — sa description mentionne une bille neutre inamovible au
  centre : un troisième type de pièce que le moteur ne gère pas (seuls
  noir et blanc existent). Non pas "pas encore câblée", mais un mécanisme
  de jeu différent qui n'existe pas dans le moteur actuel.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** —
  aucune position de départ correspondante trouvée.
- **Concours-Blitz**, **Misère** — "blitz" existe ailleurs dans le code,
  mais uniquement comme filtre sur une page de classement de démonstration
  — pas comme mode de partie réel.
- **3, 4, 5, 6 joueurs** — les 120 positions de `LAYOUTS` sont toutes à 2
  camps (noir/blanc) ; un mode à plusieurs joueurs demanderait une
  structure de plateau différente. Voir la section 2 : ce mode a en fait
  sa propre page dédiée, distincte de ces fiches de galerie.

### Et dans l'autre sens : jouables mais pas dans la galerie (0 sur 120)

Il y en avait dix — Découverte, 69, Star, Alliances, Domination, Atomouche,
Centrifugeuse, Snakes variant, Korean Daisy, Anglattack. Elles ont toutes
leur fiche désormais : le fossé ne va plus que dans un sens, celui des
variantes documentées que le moteur ne sait pas jouer.

## 2. La page Apprendre : variantes multijoueurs, en attente assumée

Complètement différent de la galerie ci-dessus : la page Apprendre a une
section dédiée (« Jouer à 3 ou 4 joueurs ») qui décrit **en détail** quatre
vraies variantes multijoueurs officielles, avec règles complètes :

- **Abalone à 3 joueurs** — 3 couleurs, 11 billes chacun, victoire à 6
  éjections toutes couleurs confondues.
- **Abalone à 4 joueurs** — trois façons d'y jouer : en équipes (règle
  officielle, disposition en trapèze 4-3-2), chacun pour soi, ou en
  adaptant n'importe quelle marguerite symétrique existante sans ajouter
  de billes.
- **Abalone Quattro** — l'édition commerciale Schmidt Spiel à 4 jeux de 14
  billes.
- **Abalone+ (10 éjections)** — règles classiques à deux, mais 10
  éjections pour gagner (ou un objectif convenu entre 1 et 9), extension à
  4 billes déplaçables, et deux coups par tour.

Ces quatre variantes sont **honnêtement marquées non jouables** par un
encart explicite en fin de section : elles demandent plusieurs joueurs
autour du même plateau, et seront jouables en ligne une fois le mode
multijoueur disponible. Ce n'est pas un oubli — c'est écrit noir sur
blanc dans l'application elle-même.

## 3. Mentionnées seulement dans la FAQ

Trois noms de plus apparaissent dans les réponses de l'assistant intégré,
sans description détaillée ailleurs sur le site :

- **Grand Abalone** — plateau plus grand, 2 coups par tour, 10 éjections
  pour gagner ; disponible sur PlayStrategy, pas dans Abalassembly.
- **Offboard** — zones de score externes, édition 2025.
- **Abalone Junior** (1997) — édition simplifiée historique.

Ces trois-là n'ont pas de fiche galerie, pas de section Apprendre dédiée,
et pas de position jouable : un simple nom cité en réponse à une question,
rien de plus pour l'instant.

## 4. Combien de positions de départ peut-il exister ?

Avec 14 billes noires, 14 blanches et 61 trous (v3.00, aussi sur la page
Variantes du site) :

| Ce qu'on compte | Nombre |
|---|---:|
| Toutes les façons de poser les 28 billes | 7 691 345 017 184 661 959 133 000, environ 7,7 × 10²⁴ |
| Les formes vraiment différentes, en regroupant celles qui se déduisent l'une de l'autre en tournant ou en retournant le plateau (12 symétries) | environ 6,4 × 10²³ |
| Les départs **équitables** : les Blancs sont l'image exacte des Noirs vus de l'autre côté du plateau, comme la Standard ou la Marguerite belge | 2 382 605 107 200, environ 2 400 milliards |
| Les mêmes, en regroupant celles qui se déduisent l'une de l'autre en tournant ou en retournant le plateau | 198 550 991 616, environ 200 milliards |

Pour les départs équitables, le calcul est simple : le plateau se partage en
30 paires de cases face à face, plus la case du centre, qui ne peut servir à
aucun camp. On choisit 14 de ces paires (C(30, 14)), puis, dans chacune,
laquelle des deux cases reçoit la bille noire (2¹⁴). Les formes « vraiment
différentes » sont comptées exactement, en faisant la moyenne, sur les 12
symétries, du nombre de positions que chacune laisse inchangées (lemme de
Burnside) ; le test du site refait le calcul.

Ces nombres comptent aussi des positions absurdes : une éjection possible dès
le premier coup, des camps tout collés… Toute l'histoire de l'Abalone n'a
utilisé qu'une centaine de positions de départ : MiGs en proposait 42,
Abalassembly en propose 120, dont 60 qu'il a inventées (v3.01, section 1).
