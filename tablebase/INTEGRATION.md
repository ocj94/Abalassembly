# Intégration mono-fichier

`tablebase-inline.js` (79 Ko) contient **tout** : géométrie, symétries, générateur de
coups, et les deux tables encodées en base64. Aucun `fetch`, aucune dépendance,
fonctionne hors ligne — cohérent avec la philosophie d'Abalassembly.

Vérifié : les 17 596 entrées 3v2 et les 6 264 entrées 2v2 relues depuis le base64
sont **identiques** aux tables JSON de référence, et la décroissance du DTW du meilleur
coup est validée sur 1 042 gains tirés sous symétrie aléatoire.

## 1. Coller dans index.html

Colle le contenu de `tablebase-inline.js` dans un `<script>`, avant le bloc du moteur.
Il s'auto-initialise : `AbaTB.ready === true` dès le chargement.

## 2. Consultation

```js
var r = AbaTB.probe(board, 'black');
// null si la position n'est pas dans les tables (c'est le cas de tout le jeu standard)
// sinon { wdl:'WIN'|'DRAW'|'LOSS', dtw, moves:[{from,to,push,eject,after}] }
```

## 3. Brancher sur l'IA (optionnel — voir plus bas)

Dans `aiMove()`, avant la recherche :

```js
var tb = (typeof AbaTB !== 'undefined' && AbaTB.ready) ? AbaTB.probe(board, aiColor()) : null;
if (tb && tb.moves.length) {
  // apparie la position résultante de la table avec le coup du moteur
  var target = JSON.stringify(tb.moves[0].after);
  var mv = getAllMovesForColor(aiColor()).find(function (m) {
    var u = applyMove(m, aiColor()), k = JSON.stringify(board);
    undoMove(u);
    return k === target;
  });
  if (mv) { executeAIMove(mv); return; }
}
```

L'appariement passe par le plateau résultant, jamais par une notation : aucun risque
de divergence de convention entre la table et le moteur.

## 4. Ce que ça change réellement

**Rien, ou presque.** Les tables couvrent uniquement 2v2 et 3v2 en mode Découverte,
et 99,9 % de ces positions sont des nulles. Les gains qu'elles contiennent sont tous
en 7 demi-coups au plus — l'alpha-bêta les trouve déjà seul à cette profondeur.

Sa place utile est le **Labo**, en affichage : « cette finale est mathématiquement
nulle » ou « gain forcé en 5 coups », avec une certitude qu'aucune évaluation
heuristique ne peut donner. C'est une garantie affichable, pas un gain de force.
