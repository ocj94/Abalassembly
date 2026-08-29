# Abalassembly — wiki

Un jeu d'Abalone complet dans un seul fichier HTML : zéro dépendance, hors-ligne, GPL v3.

## Pages

- **[Mode Enfant](Mode-Enfant.md)** — laisser un jeune joueur seul devant l'écran, sortie protégée.
- **[Confort & accessibilité](Accessibilite.md)** — réglages qui changent réellement l'affichage et le rythme.
- **[Profil de performance](Profil-de-performance.md)** — indicateurs définis, calculés, situés contre un corpus réel.
- **[Échanger des parties](Echanger-des-parties.md)** — partie par code, format APGN.
- **[Puzzles](Puzzles.md)** — comment la bibliothèque est vérifiée contre le moteur.
- **[Historique](Historique.md)** — tes parties passées, filtrables et rejouables.
- **[Empreintes historiques](Empreintes-historiques.md)** — rareté, trajectoire, corrélations avec la victoire.
- **[Benchmark moteur](Benchmark-moteur.md)** — méthodologie et chiffres réellement mesurés.
- **[Calcul distribué](Calcul-distribue.md)** — pourquoi il n'y a pas de grille de calcul volontaire.
- **[Moteur multi-worker](Moteur-multi-worker.md)** — ce qui marche, et une vraie limite non résolue, documentée honnêtement.

## En bref

- **Jouer** : [ocj94.github.io/Abalassembly](https://ocj94.github.io/Abalassembly/)
- **4 479 parties** embarquées, rejouables coup par coup
- **2 589 parties MiGs** republiées en [APGN](../APGN.md), sauvées d'un serveur fermé en 2017
- **Vue à la première personne**, partie par code, analyse d'après-partie, puzzle du jour
- **12 langues** au sélecteur — anglais et hébreu avec traduction embarquée de la navigation, les autres via la traduction du navigateur ; hébreu en RTL (sidebar et mise en page basculent à droite)
- **IA multi-worker** — se partage entre plusieurs cœurs si l'appareil en offre (jusqu'à 4), sinon se comporte comme avant
- **Cache de recherche plafonné selon la RAM** — s'adapte à l'appareil plutôt que de grossir sans limite, surtout utile en mode Minimax (recherche non bornée en temps)
- **Mode technique** — sur les pages qui en ont (Tables de finale, Ouvertures, Labo, Statistiques, Analyse), un bouton révèle méthode et chiffres bruts sans encombrer la vue par défaut
- **Moteur de compréhension** (page Analyse) — sur n'importe quelle position : décomposition spatiale, faiblesse de soutien, potentiel de sumito, menaces immédiates, profondeur tactique, mobilité à 2 coups, et une recherche de menace ciblée sur demande
- **Empreinte positionnelle** (même page) — capture une position comme référence, compare toute position suivante à elle (distance + détail par dimension en mode technique). Invariant au miroir gauche-droite : deux positions en miroir exact sont reconnues comme identiques
- **418 595 positions historiques** embarquées, avec pourcentile de la position courante contre ce corpus réel
- **Bibliothèque de motifs tactiques** — détection invariante par rotation, taux de victoire réel calculé sur les vraies parties
- **Graphe des positions** — transpositions réelles entre parties différentes, jusqu'à 20 plis
- **Carte tactique** — mobilité, soutien, menace et proximité du bord par bille, en overlay sur le plateau
- **Explorateur d'ouverture** navigable, avec indicateur de confiance statistique par branche
- Suite de tests versionnée : `node tests/regression.js`
