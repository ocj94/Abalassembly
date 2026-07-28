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

## Pour aller plus loin

| Classe | Positions (après D6) | Faisabilité |
|--------|---------------------:|-------------|
| 3 vs 3 | ~185 M | quelques heures hors ligne, ~200 Mo bruts |
| 4 vs 2 | ~2,5 G | cluster ou indexation combinatoire sérieuse |
| 4 vs 3 | ~30 G | hors de portée en JavaScript |

Au vu des résultats 2v2 et 3v2, la probabilité que 3v3 change la conclusion est faible :
ajouter des billes augmente la mobilité du défenseur autant que la puissance de l'attaquant.
