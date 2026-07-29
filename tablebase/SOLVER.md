# Solveur d'éjection forcée

L'équivalent Abalone d'un solveur de mat. Il ne calcule aucune évaluation : il ne
renvoie que des faits démontrés, ou « indéterminé ». Recherche ET/OU sur le moteur
du jeu, avec table de transposition, tri des coups par le code ULA (éjections
d'abord) et budget en temps et en nœuds.

## Deux objectifs, deux natures de certitude

| Appel | Question | Portée de la réponse positive |
|-------|----------|-------------------------------|
| `AbaSolve.win(color, N)` | le camp atteint-il sa 6ᵉ éjection quoi que fasse l'adversaire ? | **absolue** — la partie s'arrête, l'horizon ne compte plus. Donne le nombre minimal de demi-coups. |
| `AbaSolve.gain(color, N)` | le camp gagne-t-il +1 bille nette, **conservée** jusqu'à l'horizon ? | **bornée à l'horizon** — l'adversaire peut se refaire au-delà. |
| `AbaSolve.threat(color, N)` | après le coup de `color`, l'adversaire a-t-il un gain forcé ? | détection de gaffe démontrée |

Une réponse négative signifie toujours *« pas de preuve dans cet horizon »*, jamais
*« impossible »*. Le champ `aborted` distingue « aucune séquence » de « budget épuisé ».

Détail important : `win` procède par approfondissement itératif, car l'objectif est
monotone — une fois la 6ᵉ éjection atteinte la partie est finie. `gain` travaille à
**horizon fixe**, car un horizon court y est une affirmation plus *faible*, pas une
preuve plus courte : gagner une bille en 1 demi-coup ne dit rien si elle est reprise
au coup suivant.

## Validation

Le solveur est comparé à un minimax exhaustif naïf (sans table, sans coupe) sur
**360 comparaisons** — positions de vraies parties et milieux de partie joués au
hasard, aux horizons 1 et 3, sur les deux objectifs : **accord total**. La
répartition des verdicts est équilibrée (environ deux tiers prouvés, un tiers non),
donc le test ne passe pas par trivialité.

## Mesures

Sur le moteur du jeu, ~60 à 75 k nœuds/s.

| Situation | Horizon | Prouvé | Temps moyen |
|-----------|--------:|-------:|------------:|
| Positions de vraies parties, gain matériel | 3 | 40/40 | 25 ms |
| Positions de vraies parties, gain matériel | 5 | 40/40 | 635 ms |
| Milieu de partie dense (14 billes), gain matériel | 3 | 9/30 | 58 ms |
| Milieu de partie dense (14 billes), gain matériel | 5 | 4/30 | 2,2 s |
| Camp à 5 éjections, **sans** éjection immédiate, gain de partie | 3 et 5 | **0/55** | 51 ms / 2,1 s |

Deux enseignements. L'horizon 3 est utilisable **en direct** (25 à 60 ms). Et le gain
de partie forcé au-delà de l'éjection immédiate ne se rencontre pas : 0 sur 55
positions réelles, et à l'horizon 7 le budget est épuisé avant toute conclusion.
C'est cohérent avec les tablebases de finale (`RESULTS.md`) : en Abalone, le défenseur
dispose de trop de liberté pour que des séquences forcées longues existent.

**Ce qui existe en revanche, c'est le gain matériel forcé : environ un tiers des
positions de milieu de partie en contiennent un à l'horizon 3.** C'est là que le
solveur sert.

## Ce qu'il a déjà trouvé

Passé sur les 78 puzzles embarqués — extraits des parties réelles sur un écart
d'évaluation, jamais vérifiés par preuve — l'audit donne :

- **66 offensifs certifiés** : gain d'une bille démontré par la force
- **5 défensifs certifiés** : la solution enregistrée fait bien partie des rares coups qui évitent la perte
- **1 trivial** (`a1b1`, partie Gramgroum vs Patate) : 44 coups sur 55 conviennent
- **6 à corriger** :

| # | Coup | Verdict | Partie |
|---|------|---------|--------|
| 67 | d1c1 | solution fausse (1/68 coups saufs) | vincent vs Seohee Park |
| 69 | d8e8 | sans solution (0/59) | saabalone vs pianoman |
| 72 | i8i9 | solution fausse (2/67) | Kihece vs Vind313 |
| 73 | e8d7 | sans solution (0/71) | kihece vs saabalone |
| 74 | c1d1 | sans solution (0/62) | anniii0000 vs tallox19 |
| 77 | h8h7 | sans solution (0/58) | Claudie vs Amatino |

« Sans solution » : la position est perdue quoi qu'on joue, le puzzle n'a pas de
réponse. « Solution fausse » : des coups évitent la perte, mais pas celui enregistré —
le puzzle enseigne le mauvais coup.

Un écart d'évaluation dit que le moteur *préfère* un coup. Il ne dit pas qu'il gagne.
C'est précisément l'écart que ce solveur mesure.

## Utilisation

```js
if (AbaSolve.ready()) {
  var r = AbaSolve.gain('black', 3);          // {proved, plies, move, nodes, ms, aborted}
  AbaSolve.describe(r, 'black');              // phrase prête à afficher
}
```

Trois branchements naturels :

1. **Analyse / Labo** — annoter la position courante : « gain forcé d'une bille en 3 demi-coups ».
2. **Revue de partie** — après chaque coup rejoué, `AbaSolve.threat(couleurQuiVientDeJouer, 3)` signale les gaffes *démontrées*, pas les baisses d'évaluation.
3. **Extraction de puzzles** — remplacer le critère `gap` par une preuve, et faire tourner `audit-puzzles.js` en test de non-régression.

Le brancher dans l'IA est possible mais peu utile : la quiescence explore déjà les
éjections. Sa valeur est la **certitude affichable**, pas la force de jeu.

## Audit en continu

```bash
node tablebase/audit-puzzles.js index.html    # code de sortie 1 si un puzzle est cassé
```
