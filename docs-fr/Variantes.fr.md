🇬🇧 [English version](../docs-en/Variantes.en.md)

# Variantes — jouables et documentées seulement

Le site documente des variantes à trois endroits différents, qui ne se
recouvrent pas entièrement. Cette page dit précisément lesquelles se
jouent réellement et lesquelles sont seulement décrites — vérifié
directement dans le code à chaque révision, jamais supposé.

## 1. La galerie « Variantes » face à l'écran de configuration

**La galerie** (menu → Explorer → Variantes) est une encyclopédie de 33
fiches — nom, joueurs, durée, difficulté, description, source historique.
Toucher une fiche ouvre ses explications juste en dessous. Pour les 23
fiches jouables, s'y ajoutent le plateau de départ, dessiné depuis la vraie
position du moteur, et un bouton **« ▶ Jouer cette variante »** qui ouvre la
configuration avec la variante déjà choisie.

**L'écran de configuration** (Jouer → Disposition de départ) propose 23
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

### Réellement jouables (23 sur 33)

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

### Documentées seulement (10 sur 33)

- **The Pillar** — sa description mentionne une bille neutre inamovible au
  centre : un troisième type de pièce que le moteur ne gère pas (seuls
  noir et blanc existent). Non pas "pas encore câblée", mais un mécanisme
  de jeu différent qui n'existe pas dans le moteur actuel.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** —
  aucune position de départ correspondante trouvée.
- **Concours-Blitz**, **Misère** — "blitz" existe ailleurs dans le code,
  mais uniquement comme filtre sur une page de classement de démonstration
  — pas comme mode de partie réel.
- **3, 4, 5, 6 joueurs** — les 23 positions de `LAYOUTS` sont toutes à 2
  camps (noir/blanc) ; un mode à plusieurs joueurs demanderait une
  structure de plateau différente. Voir la section 2 : ce mode a en fait
  sa propre page dédiée, distincte de ces fiches de galerie.

### Et dans l'autre sens : jouables mais pas dans la galerie (0 sur 23)

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
