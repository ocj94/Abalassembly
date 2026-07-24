# Profil de performance

Un tableau de bord pensé pour un œil analytique : chaque indicateur est **défini**, **chiffré à partir de vraies données**, et **situé** contre un corpus réel de 2 589 parties (serveur MiGs).

## Où le trouver

Onglet **Profil**, sous le radar.

## Ce qui le distingue

- **Calcul brut affiché** : chaque ligne montre son numérateur et son dénominateur, par exemple `[24/57]` pour 24 poussées réussies sur 57 tentatives. Rien n'est à croire sur parole.
- **Référence réelle** : la colonne de droite situe votre valeur dans la distribution des 2 589 parties MiGs — par exemple « P75 » pour une longueur de partie, ou « dans l'écart médian » pour la première éjection (médiane du corpus : coup 27).
- **Pas de zéro trompeur** : une donnée absente affiche `—`, jamais `0`. Un dénominateur nul n'invente pas de chiffre.
- **Export** : un bouton exporte tout en **JSON** et **CSV** — mesures dérivées et compteurs bruts — pour analyse dans un tableur ou un notebook.

## Indicateurs

Taux de victoire, éjections par partie, part et efficacité des poussées, coups optimaux, contrôle du centre, cohésion moyenne, conversion des avantages, coups rapides, longueur de partie.

## Les références, comment elles sont calculées

Les distributions de référence sont mesurées en rejouant les 2 589 parties MiGs contre le moteur du jeu, puis échantillonnées en percentiles et embarquées dans le fichier. Un test de la suite de régression vérifie que la distribution reste monotone et couvre bien 0 à 100 %.
