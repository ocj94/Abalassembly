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

## État actuel : découpage grossier, pas encore la vraie modularisation

Ce premier découpage coupe uniquement aux frontières déjà réelles du
fichier (le méta JSON-LD, les 2 petits scripts utilitaires, l'énorme
script principal, le script des tables de finale, le script de fin) plus
les morceaux HTML entre eux. Il **prouve que le pipeline de build est
fiable et sans perte** (vérifié : identique octet pour octet, cmp + MD5 +
comparaison de contenu) mais ne réorganise rien à l'intérieur.

`07-script-main.js` fait à lui seul plus de 7 Mo — c'est tout le moteur,
l'IA, les pages, l'essentiel du site. Le découpage réel de *ce*
fichier-là en modules par thème (`engine/`, `ui/`, `puzzles/`, etc.) est
un chantier à part, plus long, pas commencé ici. C'est la partie qui
justifie « plusieurs sessions, pas un tour ».

## Fichiers

| Fichier | Contenu |
|---|---|
| `00-html.part` … `12-html.part` (pairs) | Fragments HTML/CSS entre les blocs de script |
| `01-jsonld.part` | Métadonnées JSON-LD (SEO) |
| `03-script-utils-a.js`, `05-script-utils-b.js` | Deux petits scripts utilitaires en tête de page |
| `07-script-main.js` | Le script principal — moteur, IA, toutes les pages (encore un seul bloc) |
| `09-script-tablebase.js` | Chargement des tables de finale (copie thread principal) + arbre d'ouverture |
| `11-script-tail.js` | Script de fin de page |
| `MANIFEST.txt` | Ordre exact d'assemblage — source de vérité pour `tools/build.js` |

Les `.part` ne sont pas du HTML valide isolément (ce sont des coupures
brutes) — ils n'ont de sens qu'assemblés dans l'ordre du manifeste.
