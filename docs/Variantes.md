🇬🇧 [English version](Variantes.en.md)

# Variantes — jouables et documentées seulement

Le site documente des variantes à trois endroits différents, qui ne se
recouvrent pas entièrement. Cette page dit précisément lesquelles se
jouent réellement et lesquelles sont seulement décrites — vérifié
directement dans le code à chaque révision, jamais supposé.

## 1. La galerie « Variantes » face à l'écran de configuration

**La galerie** (menu → Explorer → Variantes) est une encyclopédie de 21
fiches — nom, joueurs, durée, difficulté, description, source historique.
Cliquer sur une fiche l'affiche en détail. **Aucune fiche n'a de bouton
« jouer »** : c'est un catalogue de lecture, pas un point d'entrée vers
une partie.

**L'écran de configuration** (Jouer → Disposition de départ) propose 21
positions de départ réelles dans son menu déroulant, chacune avec sa
propre miniature — c'est ce que le moteur sait effectivement charger.

Les deux listes ne correspondent pas terme à terme.

### Réellement jouables (11 sur 21)

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

### Documentées seulement (10 sur 21)

- **The Pillar** — sa description mentionne une bille neutre inamovible au
  centre : un troisième type de pièce que le moteur ne gère pas (seuls
  noir et blanc existent). Non pas "pas encore câblée", mais un mécanisme
  de jeu différent qui n'existe pas dans le moteur actuel.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** —
  aucune position de départ correspondante trouvée.
- **Concours-Blitz**, **Misère** — "blitz" existe ailleurs dans le code,
  mais uniquement comme filtre sur une page de classement de démonstration
  — pas comme mode de partie réel.
- **3, 4, 5, 6 joueurs** — les 21 positions de `LAYOUTS` sont toutes à 2
  camps (noir/blanc) ; un mode à plusieurs joueurs demanderait une
  structure de plateau différente. Voir la section 2 : ce mode a en fait
  sa propre page dédiée, distincte de ces fiches de galerie.

### Et dans l'autre sens : jouables mais pas dans la galerie (10 sur 21)

Découverte, 69, Star, Alliances, Domination, Atomouche, Centrifuge, Snakes
variant, Korean Daisy, Anglattack. Le fossé va donc dans les deux sens.

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
