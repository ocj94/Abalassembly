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

## Table 4 contre 2 (septembre 2026)

Ici, la conclusion ci-dessus ne tient plus. Le 4v2 contient des gains forcés jusqu'à
**97 demi-coups**, hors de portée de toute recherche alpha-bêta : la table apporte
un vrai gain de force, pas seulement une garantie affichable.

**Livraison.** Table découpée en 689 morceaux (`tablebase/4v2/`, 45 Mo, 9 à 81 Ko
chacun), plus une carte des orbites (5 Ko) et un manifeste d'empreintes SHA-256.
Un octet par position : la profondeur, dont la parité donne le statut. Rien n'est
chargé tant qu'une partie n'atteint pas le 4 contre 2 ; chaque morceau est vérifié
par son empreinte avant usage ; le service worker garde ceux déjà vus pour le
hors-ligne. Régénération à l'identique : `generate-4v2.c` (mode `shards`) puis
`pack-4v2.py`.

**Lecture (`AbaTB42`).** Retrouve exactement la case du solveur : mêmes cases, mêmes
12 symétries dans le même ordre, même représentant. Vérifiée contre le solveur C
sur 6 001 positions (valeur et profondeur identiques). Garde-fou : ne répond que
si les compteurs d'éjections correspondent à la règle de Découverte.

**Branchements.** L'IA calcule dans des workers, qui n'ont pas les morceaux : le 4v2
se consulte à la racine, sur le plateau réel.
- *IA* (hors niveau facile) : gagne au plus vite, sinon tient la nulle, sinon
  résiste au plus long. Morceaux absents : chargés, puis l'IA rejoue ; chargement
  impossible : IA habituelle.
- *Verdict* dans la barre d'état, en partie comme en rejeu : « Finale 4 contre 2 :
  les Noirs gagnent en N demi-coups ».
- *Page Tables de finale* : verdict et meilleur coup.
- *Trainer « Finale 4 contre 2 »* : gain en 9 à 25 demi-coups contre une défense
  parfaite. Coup qui laisse échapper le gain : refusé. Coup gagnant mais plus lent :
  accepté, son coût affiché. Si la défense éjecte une bille noire, l'exercice
  continue en 3 contre 2.

**Tests** (`tests/engine.test.js`, section 29) : valeurs de référence du solveur,
garde-fous, aller-retour adresse ↔ position, la victoire de 97 demi-coups rejouée
par le jeu lui-même, l'IA, le verdict, et le Trainer (coup optimal, coup perdant
refusé sur une position trouvée par le solveur).

