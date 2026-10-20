# src/ — sources séparées d'Abalassembly

## Ce que c'est

`index.html` (à la racine, le fichier réellement déployé sur GitHub Pages)
est maintenant **généré** à partir des morceaux ici, dans l'ordre de
[`MANIFEST.txt`](MANIFEST.txt), par [`tools/build.js`](../tools/build.js).

```bash
node tools/build.js          # régénère index.html à la racine
node tools/build.js --check  # + vérifie qu'aucun octet n'a bougé par erreur
```

**Ne modifiez plus `index.html` directement.** Modifiez le morceau
concerné dans `src/`, relancez `node tools/build.js`, testez et déployez
`index.html` comme avant — rien ne change côté joueur ni côté CI.

## Pourquoi une concaténation plate, pas des modules ES6

Le code actuel communique entièrement par variables globales (`board`,
`currentTurn`, `humanColor`, `capturedByBlack`…) sans frontière de module
nulle part — des centaines d'appelants à travers le fichier. Une
concaténation plate (coller les morceaux bout à bout, dans l'ordre)
préserve exactement ce fonctionnement sans rien retoucher. De vrais
modules `import`/`export` obligeraient à retracer et corriger chaque
référence croisée : le même risque qu'il a été décidé de ne pas prendre
sur le fichier actuel. Choix délibéré, pas une étape provisoire.

## État actuel : le script principal est décomposé par thème

`main/` contient 42 fichiers, coupés aux frontières des bandeaux de
section déjà présents dans le code (`/* ═══ NOM DE SECTION ═══ */`), sans
aucune ligne déplacée ni réordonnée — une coupe séquentielle, pas une
réorganisation. Chaque nom de fichier regroupe un ou plusieurs bandeaux
adjacents et apparentés (ex. `12-positional-analysis.js` regroupe les 7
étages de l'empreinte positionnelle qui se suivaient déjà dans le fichier
d'origine).

Ce que ça donne concrètement : un contributeur qui veut lire le moteur
d'IA ouvre `main/11-ai-engine-search.js` (17 Ko) au lieu de chercher dans
un bloc de 7 Mo. Le Labo, le Gym Cerveau, la Formation Formateurs, les
tablebases ont chacun leur fichier.

**Toujours pas de vrais modules `import`/`export`** — voir la section
ci-dessus sur pourquoi (variables globales partagées partout, `board`/
`currentTurn`/`humanColor` en tête). L'ordre des fichiers dans
`MANIFEST.txt` reste l'unique dépendance : changer cet ordre changerait le
comportement, exactement comme changer l'ordre dans le fichier d'origine
l'aurait fait.

`main/15-opening-book.js` reste gros (5,6 Mo) : il contient les données
compressées en base64 (corpus MIGS/AbalOnline, arbres d'ouverture), pas du
code. Séparer les données du code qui les charge est un raffinement
possible, pas fait ici.

*(Mise à jour : fait. Voir `main/data/` ci-dessous. Même traitement
appliqué à `17-weakness-profile-history.js`, qui cachait les 138 puzzles
en JSON inline sans bannière de section propre — extraits vers
`main/data/17-puzzles.json`, le reste éclaté en 6 fichiers dont les noms
reflètent ce qu'ils contiennent vraiment, pas la bannière d'origine :
`17-puzzle-interaction-and-lab-start.js` mélangeait en réalité l'UI des
puzzles et le tout début du Labo SPSA, pas la suite du profil de
faiblesse.)*

Vérifié à chaque étape de ce découpage : reconstruction identique octet
pour octet à la version précédente (`node tools/build.js --check`), à
chaque fois avant de passer à l'étape suivante.

## Fichiers

| Fichier | Contenu |
|---|---|
| `00-html.part` … `12-html.part` (pairs) | Fragments HTML/CSS entre les blocs de script |
| `01-jsonld.part` | Métadonnées JSON-LD (SEO) |
| `03-script-utils-a.js`, `05-script-utils-b.js` | Deux petits scripts utilitaires en tête de page |
| `05b-script-i18n-en.js` | La langue (`currentLang`) et la version anglaise : dictionnaire, motifs, observateur. Bloc à part, lu **avant** le reste de la page pour qu'en anglais rien ne s'affiche d'abord en français |
| `main/00-*.js` … `main/40-*.js` | Le script principal, décomposé par thème (voir ci-dessus) ; `main/36-defi-du-jour-et-cartes.js` : le Défi du jour #N et les images à partager (v2.57) ; `main/37-liste-et-commentaires.js` : les onglets Liste et Commentaires de la partie (v2.58) ; `main/38-apprendre-vrai-plateau.js` : la page « Apprendre sur un vrai plateau », à partir de 3 ans — étapes, schémas SVG, carnet sur l'appareil (v2.61) ; `main/39-statistiques-billes.js` : les billes qui tombent, ce qui fait gagner, comment jouent les vrais joueurs, les comparaisons de Mes statistiques et la ligne de fin de partie, plus le rejeu qui produit leurs données (v2.63) ; à quel coup tombe chaque bille et l'échelle graduée de la carte des éjections (v2.65) ; `main/40-adresses-pages.js` : une adresse par page (`#corpus`, `#regles`…), bouton Retour compris (v2.64) ; la page Architecture est écrite par `main/34-architecture-diagrams-briefing.js` (`renderArchiPage`, chiffres dans `ARCHI_CHIFFRES`, vérifiés par un test — v2.66) |
| `main/data/15-code-01.js` … `15-code-08.js` | Le peu de VRAI code de l'ancien `15-opening-book.js` (livre d'ouvertures, profilage adverse, options NNUE) ; `15-code-08.js` : lecture des empreintes complémentaires (v2.59) |
| `main/data/15-nnue.b64`, `15-trees.b64`, `15-migs.b64`, `15-ao.b64`, `15-empreintes.b64`, `15-graph.b64`, `15-empreintes-complement.b64`, `15-stats-parties.b64` | Les 8 blobs de données, en base64 pur — plus une seule ligne de JS mélangée dedans. `15-empreintes-complement.b64` (v2.59) : les empreintes des parties PlayStrategy et de référence, produites par `node tools/empreintes-complement.js`. `15-stats-parties.b64` (v2.63) : les événements de chaque partie embarquée (éjections, sortes de coups, 12 dimensions camp contre camp), produits par `node tools/stats-parties.js` (quelques minutes). Les deux sont à relancer quand une partie embarquée change : un test le réclame |
| `main/data/17-puzzles.json` | Les 138 puzzles, en JSON pur — extraits du même genre de mélange code/données |
| `09-script-tablebase.js` | Chargement des tables de finale (copie thread principal) + arbre d'ouverture |
| `11-script-tail.js` | Script de fin de page |
| `MANIFEST.txt` | Ordre exact d'assemblage — source de vérité pour `tools/build.js` |

Les `.part` ne sont pas du HTML valide isolément (ce sont des coupures
brutes) — ils n'ont de sens qu'assemblés dans l'ordre du manifeste.
