# Puzzles — comment ils sont vérifiés

La bibliothèque contient 78 puzzles tirés de vraies parties. Chacun est une position réelle avec une solution en un ou deux coups.

## Le vérificateur

`tests/puzzles.js` rejoue chaque puzzle contre le moteur du jeu — la même approche que pour les parties APGN : on ne fait pas confiance aux données, on les rejoue. Il contrôle six choses :

1. **Coordonnées valides** — chaque bille tombe sur une case réelle du plateau.
2. **Pas de collision** — aucune case n'est à la fois noire et blanche.
3. **Effectif plausible** — au plus 14 billes par camp, captures entre 0 et 6, et billes en jeu plus billes sorties ne dépassant jamais 14.
4. **Solution légale** — le coup proposé est accepté par le moteur depuis la position, pour le camp au trait.
5. **Notation exacte** — le label affiché correspond bien au coup joué, dans la notation officielle Aba-Pro.
6. **Défense cohérente** — pour un puzzle de parade, les coups alternatifs sont tous légaux.

```
node tests/puzzles.js
```

Le rapport liste, puzzle par puzzle, le champ fautif. Code de sortie 1 s'il reste un problème.

## Ce que l'audit a corrigé

Un premier passage a trouvé huit puzzles fautifs sur les quatre-vingts d'origine :

- **Six labels faux.** Le coup se jouait correctement, mais la notation écrite désignait une autre case — trompeuse pour qui apprend en la lisant. Ils ont été recalculés par le moteur.
- **Deux positions impossibles.** Plus de quatorze billes en comptant les éjectées. Le score d'origine étant inconnu, ces puzzles ont été retirés plutôt que corrigés au jugé.

Deux garde-fous de la suite de régression vérifient désormais qu'aucune coordonnée ni aucun effectif ne dérape à l'avenir.
