🇬🇧 [English version](Variantes.en.md)

# Variantes — jouables et documentées seulement

Le site a deux systèmes de variantes séparés, qui ne se recouvrent pas
entièrement. Cette page dit précisément lesquelles se jouent réellement et
lesquelles sont seulement décrites — vérifié directement dans le code, pas
supposé.

## Les deux systèmes

**La galerie « Variantes »** (menu → Explorer → Variantes) est une
encyclopédie de 20 fiches — nom, joueurs, durée, difficulté, description,
source historique. Cliquer sur une fiche l'affiche en détail. **Aucune
fiche n'a de bouton « jouer »** : c'est un catalogue de lecture, pas un
point d'entrée vers une partie.

**L'écran de configuration** (Jouer → Disposition de départ) propose 19
positions de départ réelles, chacune avec sa propre miniature et ses
propres coordonnées de plateau — c'est ce que le moteur sait effectivement
charger.

Les deux listes ne correspondent pas terme à terme.

## Réellement jouables (10 sur 20)

Ces fiches de la galerie ont une vraie position de départ derrière elles,
sous un nom parfois différent dans l'écran de configuration :

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

## Documentées seulement (10 sur 20)

Ces fiches existent et se lisent, mais rien dans l'application ne permet
de démarrer une partie dans cette configuration précise :

- **The Pillar** — sa description mentionne une bille neutre inamovible au
  centre : un troisième type de pièce que le moteur ne gère pas (seuls
  noir et blanc existent). Non pas "pas encore câblée", mais un mécanisme
  de jeu différent qui n'existe pas dans le moteur actuel.
- **Abafoot / Save Princess**, **Bagdad Thief**, **Berlin Thief** —
  aucune position de départ correspondante trouvée.
- **Concours-Blitz**, **Misère** — "blitz" existe ailleurs dans le code,
  mais uniquement comme filtre sur une page de classement de démonstration
  — pas comme mode de partie réel.
- **3, 4, 5, 6 joueurs** — les 20 positions de `LAYOUTS` sont toutes à 2
  camps (noir/blanc) ; un mode à plusieurs joueurs demanderait une
  structure de plateau différente, pas encore construite.

## Et dans l'autre sens

Quelques positions de l'écran de configuration n'ont pas de fiche dans la
galerie — jouables, mais pas décrites : Star, Alliances, Domination,
Atomouche, Centrifuge, Korean Daisy, Anglattack, et la disposition « 69 ».
Le fossé va donc dans les deux sens, pas seulement celui qu'on pourrait
deviner en premier.
