# Puzzles — comment ils sont vérifiés

La bibliothèque contient 138 puzzles tirés de vraies parties : 78 en un coup (vérifiés hors-ligne, voir ci-dessous) et 60 en deux coups, ajoutés depuis (vérifiés autrement, voir plus bas).

## Les 78 puzzles à un coup

### Le vérificateur hors-ligne

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

### Ce que l'audit a corrigé

Un premier passage a trouvé huit puzzles fautifs sur les quatre-vingts d'origine :

- **Six labels faux.** Le coup se jouait correctement, mais la notation écrite désignait une autre case — trompeuse pour qui apprend en la lisant. Ils ont été recalculés par le moteur.
- **Deux positions impossibles.** Plus de quatorze billes en comptant les éjectées. Le score d'origine étant inconnu, ces puzzles ont été retirés plutôt que corrigés au jugé.

Deux garde-fous de la suite de régression vérifient désormais qu'aucune coordonnée ni aucun effectif ne dérape à l'avenir.

## Les 60 puzzles à deux coups

Ajoutés après coup, minés depuis le corpus réel de parties MIGS (Belgian Daisy). Contrairement aux 78 premiers, la solution demande deux coups du joueur (trois demi-coups en tout, avec une réponse adverse au milieu) — aucun des 78 originaux ne dépassait un seul coup.

### Comment ils ont été trouvés et vérifiés

Le minage utilise `AbaSolve`, le solveur à preuve du moteur (recherche ET/OU exhaustive, pas une heuristique) : pour chaque position candidate, on vérifie qu'aucun coup ne gagne en un seul coup (sinon la position appartient déjà aux 78 premiers), puis qu'un gain est **prouvé** en exactement trois demi-coups.

Un premier passage de minage contenait un vrai bug : la position stockée était une référence vers l'état du plateau en cours de calcul, pas une copie — les coups joués pendant le minage corrompaient silencieusement la position d'origine. Une vérification indépendante (rejouer chaque puzzle depuis zéro, sans réutiliser l'état du minage) l'a révélé : 0 sur 60 passait ce contrôle. Après correction du clonage de position, 60 sur 60 sont passés.

### Ce qui n'est PAS encore fait

`tests/puzzles.js` (le script hors-ligne ci-dessus) ne couvre encore que les 78 premiers — il n'a pas été étendu pour rejouer les séquences à trois demi-coups des 60 nouveaux. Leur vérification reste, pour l'instant, celle faite au moment du minage plus le badge de certification côté client (voir ci-dessous). Étendre `tests/puzzles.js` à ce format reste à faire.

## Certification côté client (nouveau)

Le site vérifie maintenant aussi les puzzles directement dans le navigateur, contre le moteur réellement chargé par le joueur — pas seulement hors-ligne au moment du commit. Pour un puzzle à un coup : le coup annoncé doit être légal et produire la capture (ou faire disparaître la menace, pour un puzzle de parade). Pour un puzzle à deux coups : toute la séquence — coup, réponse adverse stockée, coup final — est rejouée et doit aboutir à une vraie capture. Un badge « 🏅 Certifié » s'affiche sur les puzzles du jour/du mois quand la vérification réussit.


## Révision espacée (nouveau)

Séparée du puzzle du jour et du problème du mois (qui restent tirés au sort de façon déterministe par date, jamais touchés par ce système), une file de révision personnelle apparaît quand des puzzles déjà tentés redeviennent dus.

Principe simple, à cases croissantes : rater un puzzle le fait revenir dès le lendemain. Le réussir repousse sa prochaine apparition — 3 jours, puis 7, puis 14, 30, jusqu'à 90 jours pour un puzzle vraiment maîtrisé. Un nouvel échec, même après une longue série de réussites, ramène directement à « revoir demain ».

La carte **« À réviser »** apparaît sur la page Puzzles uniquement quand au moins un puzzle est dû. Le bouton « Réviser maintenant » enchaîne les puzzles dus les uns après les autres, en commençant par les plus fragiles (case la plus basse), avec passage automatique au suivant après chaque réussite.
