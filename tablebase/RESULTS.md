# Tablebases de finale — Abalone

Résolution exhaustive des finales à faible matériel, par **induction rétrograde**,
pour le mode **Découverte** d'Abalassembly (7 billes par camp, 6 éjections = défaite).

## Pourquoi seulement le mode Découverte

En Abalone standard, chaque camp part à 14 billes et perd à la 6e éjection : un camp
a donc **toujours entre 9 et 14 billes** sur le plateau. Les positions à 4, 5 ou 6 billes
n'existent tout simplement pas. La plus petite classe de matériel réellement atteignable
est 9 contre 9 : environ **10¹⁹ positions** même après réduction par les 12 symétries,
soit plusieurs exaoctets. Une tablebase d'Abalone standard est hors d'atteinte, et une
tablebase « 3 contre 3 » ne serait jamais consultée une seule fois.

En mode Découverte (7 billes), un camp perd quand il tombe à 1 bille : les classes
2v2 et 3v2 sont donc atteignables, et calculables. C'est le seul terrain où la question
a un sens.

## Résultats

| Classe | Positions résolues | Gains | Pertes | Nulles | DTW max |
|--------|-------------------:|------:|-------:|-------:|--------:|
| 2 vs 2 | 6 262 260 | 6 264 (0,10 %) | 0 | 99,90 % | 1 |
| 3 vs 2 | 11 703 240 *(canoniques, réduction D6 ×10,2)* | 17 575 (0,15 %) | 21 | 99,85 % | 7 |

**Deux résultats démontrés, pas estimés :**

1. **En 2 contre 2, les seuls gains sont les éjections immédiates.** Aucun gain forcé en
   2 coups ou plus n'existe. Deux billes adjacentes ne peuvent jamais être poussées
   (2 contre 2 = pac) et peuvent toujours se déplacer : le défenseur qui garde sa paire
   soudée est imprenable. Sur les 6 264 gains, 5 976 supposent le défenseur déjà séparé.

2. **En 3 contre 2, le camp fort ne peut presque jamais forcer l'éjection** : 99,85 % de
   nulles, et les gains existants sont tous en **7 demi-coups au plus**. La propagation
   rétrograde s'éteint au niveau 8.

**Conséquence pour le moteur :** l'intégralité du contenu de ces tables est retrouvée par
une recherche à 7 demi-coups — profondeur que l'alpha-bêta d'Abalassembly atteint
instantanément avec 5 billes sur le plateau. Contrairement aux échecs, où le roi finit
acculé, le plateau d'Abalone est immense par rapport au matériel restant : le camp faible
a toujours 56 cases libres pour fuir. **Les tablebases n'apportent rien à Abalone.**
Ce dépôt les conserve parce que le résultat est intéressant en soi et qu'il ferme
définitivement la question — pas parce qu'elles renforcent l'IA.

## Méthode et validation

`generate.js` (Node, ~70 s) enchaîne :

1. **Géométrie** — 61 cases, 6 directions. Vérifié : voisinage réciproque sur toutes les
   arêtes, 37 cases à 6 voisins.
2. **Moteur de coups de référence** — lisible, non optimisé. 8 tests de règles : mouvement
   simple, sumito 2v1 et 3v2, refus du pac 2v2, éjection au bord, interdiction de
   l'auto-éjection, mouvement latéral, conservation du matériel.
3. **Symétries** — les 12 permutations du groupe diédral D6 en coordonnées cubiques,
   validées bijectives et préservant l'adjacence.
4. **Générateur rapide** — contre-vérifié coup par coup contre le moteur de référence sur
   6 classes de matériel (3v2, 2v2, 3v3, 1v2, 2v3, 3v1), ~9 600 positions aléatoires.
5. **Induction rétrograde par niveaux** — un gain en *d* demi-coups exige un coup vers une
   perte en *d−1* ; une perte en *d* exige que **tous** les coups mènent à un gain adverse,
   le plus long valant *d−1*. Les positions jamais résolues sont les nulles (jeu infini).
6. **Vérification de cohérence** a posteriori sur 200 000 positions tirées au hasard.

`probe.js` (navigateur, sans dépendance) est validé séparément : 887 aller-retours sous
symétrie aléatoire, 912 vérifications que le meilleur coup fait bien décroître le DTW de 1,
et déroulé complet de la variante principale du gain le plus profond jusqu'à l'éjection.

## Format des tables

`tb-2v2.json`, `tb-3v2.json` — **toute position absente est une nulle**. Les tables sont
exhaustives ; seules les 23 860 entrées non nulles sont stockées (85 Ko + 238 Ko, ~60 Ko gzippés).

```
entries: [ [index, wdl, dtw], ... ]      wdl : 1 = gain du camp au trait, 2 = perte
2v2 : index = (paireNoire*1830 + paireBlanche)*2 + trait
3v2 : index = (orbitePaireFaible*35990 + rangTripletFort)*2 + trait
      trait 0 = camp fort au trait ; orbit_reps donne les 180 représentants d'orbite
```

## Utilisation

```html
<script src="tablebase/probe.js"></script>
<script>
  AbaTB.load('tablebase/').then(function () {
    var r = AbaTB.probe(board, 'black');   // board = {"r,c": "black"|"white"}
    // null hors table, sinon { wdl:'WIN'|'DRAW'|'LOSS', dtw, moves:[{from,to,push,eject,after}] }
  });
</script>
```

`moves[].after` donne le plateau résultant : il suffit de l'apparier avec le coup
correspondant du moteur, sans dépendre d'une convention de notation.

## 4 contre 2 : résolu (septembre 2026)

Calculé par `generate-4v2.c` (C, un seul cœur, environ 20 minutes) — méthode,
vérifications et commandes en tête du fichier.

| Trait | Gains | Pertes | Nulles |
|---|---:|---:|---:|
| Camp fort (4 billes) | **70 287 840** | 0 | 0 |
| Camp faible (2 billes) | 0 | 70 147 792 | 140 048 |

140 575 680 positions légales. **Avec le trait, le camp fort gagne toujours**, en
**97 demi-coups au plus**. Avec le trait, le camp faible perd toujours, sauf dans
0,2 % des cas : ceux où il peut pousser une bille forte dehors et retomber dans
un 3 contre 2 nul.

C'est l'inverse du 3 contre 2, qui s'éteignait au 7ᵉ demi-coup. La conclusion
ci-dessus — « ajouter des billes augmente la mobilité du défenseur autant que la
puissance de l'attaquant » — tient à égalité de matériel (3v3 : 2 gains sur
224 millions), **pas avec deux billes d'avance**.

**La victoire la plus longue** (97 demi-coups) part des 4 billes noires dans
4 des 6 coins (i5, i9, e1, a5), les 2 blanches en c5 et b5 : le camp fort doit
d'abord se regrouper. La ligne complète est dans `4v2-plus-longue-victoire.txt`.

**Vérifications**, toutes reproductibles par les scripts du dossier :
- table 3v2 réutilisée identique à celle du jeu (7 000 consultations, dont
  4 000 gains ou pertes réels présentés sous symétrie aléatoire) ;
- générateur de coups identique au **vrai moteur du jeu** sur 10 000 positions,
  dont 5 263 éjections (`verify-4v2-engine.js`) ;
- méthode rapide (remontée vers les prédécesseurs) identique au balayage
  complet sur les niveaux 1 à 32, au décompte près ;
- **preuve exhaustive** : chacune des 140 575 680 positions recontrôlée contre
  les équations exactes, profondeur minimale des gains comprise — zéro
  incohérence (`./tb42 verifyall`) ;
- la victoire la plus longue rejouée coup par coup par le moteur du jeu :
  97 demi-coups sur 97 (`replay-4v2-pv.js`).

**Réserve sur le 3v3.** `generate-3v3.js` note toute victoire obtenue par
éjection vers le 3v2 comme « gagnée en 1 », quelle que soit la profondeur de la
position 3v2 atteinte. Son classement gain / perte / nulle reste juste ; ses
profondeurs peuvent être sous-estimées. `generate-4v2.c` compte, lui, la
profondeur de la position atteinte plus un.

**Utilisée dans le jeu** (mode Découverte) : découpée en 689 morceaux de 9 à 81 Ko
(`tablebase/4v2/`, 45 Mo en tout), chargés à la demande quand une partie atteint
le 4 contre 2 — IA parfaite, verdict « les Noirs gagnent en N demi-coups », page
Tables de finale et Trainer « Finale 4 contre 2 ». Voir `INTEGRATION.md`.

## Pour aller plus loin

Tailles recalculées. L'ancien tableau était décalé d'une ligne : les « ~2,5 G »
attribués au 4v2 étaient la taille du 4v3, et les « ~30 G » du 4v3 sa taille
brute, avant symétrie.

| Classe | Positions (après symétrie) | État |
|--------|---------------------:|-------------|
| 3 vs 3 | 224,7 M | calculée : 2 gains seulement |
| 4 vs 2 | 140,6 M légales | **résolue** : le camp fort au trait gagne toujours |
| 5 vs 2 | ~1,8 G | faisable sur 3 Go de mémoire en ne stockant que la profondeur (le statut s'en déduit par sa parité) ; dépend du 4v2 |
| 4 vs 3 | ~2,5 G | demande une machine plus grosse ; dépend du 3v3 et du 4v2 |
