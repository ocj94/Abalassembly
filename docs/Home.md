# Abalassembly — wiki

Un jeu d'Abalone complet dans un seul fichier HTML : zéro dépendance, hors-ligne, GPL v3.

## Pages

- **[Mode Enfant](Mode-Enfant.md)** — laisser un jeune joueur seul devant l'écran, sortie protégée.
- **[Confort & accessibilité](Accessibilite.md)** — réglages qui changent réellement l'affichage et le rythme.
- **[Profil de performance](Profil-de-performance.md)** — indicateurs définis, calculés, situés contre un corpus réel.
- **[Échanger des parties](Echanger-des-parties.md)** — partie par code, format APGN.
- **[Puzzles](Puzzles.md)** — comment la bibliothèque est vérifiée contre le moteur.

## En bref

- **Jouer** : [ocj94.github.io/Abalassembly](https://ocj94.github.io/Abalassembly/)
- **4 480 parties** embarquées, rejouables coup par coup
- **2 589 parties MiGs** republiées en [APGN](../APGN.md), sauvées d'un serveur fermé en 2017
- **Vue à la première personne**, partie par code, analyse d'après-partie, puzzle du jour
- **12 langues** au sélecteur — anglais et hébreu avec traduction embarquée de la navigation, les autres via la traduction du navigateur ; hébreu en RTL (sidebar et mise en page basculent à droite)
- **IA multi-worker** — se partage entre plusieurs cœurs si l'appareil en offre (jusqu'à 4), sinon se comporte comme avant
- Suite de tests versionnée : `node tests/regression.js`
