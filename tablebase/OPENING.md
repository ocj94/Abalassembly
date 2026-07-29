# Ouvertures : posRef vérifié + arbre de statistiques

Brique **backend**, sans interface (elle viendra dessus une fois la descente
coup-à-coup testée dans le contexte réel du jeu). Deux éléments, tous deux vérifiés.

## 1. Générateur posRef

`AbaOpening.posRef(board, camp)` encode une position au format exact de l'outil
KAA — celui de la CSV `KAA_NEXT_MOVE_REF`. Format : un segment par camp séparés
par `_`, camp au trait en premier ; chaque segment est le nombre de billes
éjectées de ce camp, puis rangée par rangée de `a` à `i`, la lettre suivie des
colonnes occupées. La numérotation des cases est celle de `coordToABAPRO`, donc
identique au reste de l'application.

### Pourquoi c'est fiable : la double vérification

Le posRef vient de ton outil KAA externe ; `index.html` ne le calculait pas. Le
risque était que mon générateur reproduise mal ce format. Il est levé par
**croisement avec la CSV**, qui contient les posRef produits par KAA :

- La position de départ belge, encodée par ce générateur avec les noirs au trait,
  donne `0a12b123c23g78h789i89_0a45b456c56g45h456i56` — **présent tel quel dans la
  CSV**.
- Des positions atteintes après des coups réels, ré-encodées, retombent également
  sur des entrées de la CSV (au format complet, `_` compris).

Les deux méthodes — le format de KAA et le générateur d'ici — s'accordent. Ce
n'est pas une preuve que les chiffres sont *vrais* (même source), mais la preuve
que **le générateur reproduit exactement le format KAA**. C'est ce qui était
incertain, et c'est désormais un test qui passe.

**Portée honnête de la certitude.** Le croisement ne vaut que sur les positions
présentes dans la CSV, c'est-à-dire l'ouverture en Marguerite belge. Au-delà, le
générateur est vraisemblable mais non prouvé. La CSV ne couvre que ce début de
partie ; l'arbre s'arrête donc là, sans prétendre au-delà.

## 2. Arbre d'ouverture

`opening_tree.json` (35 Ko) : 90 positions d'ouverture jouées au moins 30 fois,
indexées par le posRef du camp au trait. Chaque position liste les coups joués en
tournoi avec leur bilan `[Victoires, Défaites, Nulles]`, agrégé sur 137 045
transitions de parties réelles (16 819 parties représentées dans les nœuds retenus).

Depuis la Marguerite belge :

| Coup | Parties | Taux de gain |
|------|--------:|-------------:|
| a1d4 | 1 615 | 56 % |
| i9f6 | 314 | 30 % |
| a2c4 | 58 | 26 % |

`a1d4` est le coup de référence : le plus joué, et le seul au-dessus de 50 %.

### Vérifications passées

- posRef du départ belge **identique** à l'entrée CSV correspondante ;
- les 90 clés de l'arbre sont des posRef bien formés (préfixe = billes éjectées, somme des billes = 14 − préfixe) ;
- l'arbre est indexé de façon cohérente avec `probe()`.

## Utilisation (quand l'interface sera branchée)

```js
AbaOpening.loadFrom(openingTreeJson);      // ou AbaOpening.load('tablebase/')
var r = AbaOpening.probe(board, 'black');  // null hors ouverture
// r.moves = [{move:'a1d4', games:1615, w, l, d, winRate:0.56}, ...] trié par fréquence
```

## Ce qui reste avant l'interface

La descente coup-à-coup dans l'arbre (jouer un coup → obtenir le posRef enfant →
afficher ses stats) doit être testée dans le contexte réel du jeu, où `board` est
la variable globale partagée par le moteur. Le harnais Node isolé capture mal
cette variable ; ce n'est pas un défaut du format ni de l'arbre, qui sont validés.
La page Ouvertures se branchera dessus au prochain passage.
