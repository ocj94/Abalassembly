/* ============================================================================
   ABALASSEMBLY — POSREF + ARBRE D'OUVERTURE                  tablebase/opening.js
   ----------------------------------------------------------------------------
   Deux briques VERIFIEES, sans interface (l'interface viendra dessus) :

     1. posRef(board, camp)  — encode une position au format de l'outil KAA,
        exactement celui de la CSV KAA_NEXT_MOVE_REF. Certifie par croisement :
        le posRef genere ici pour la position de depart belge, et pour des
        positions atteintes apres des coups reels, coincide avec les entrees
        de la CSV (voir OPENING.md, section Validation).

     2. AbaOpening.probe(board, camp) — pour une position d'ouverture, renvoie
        les coups joues en tournoi depuis cette position, avec leur bilan
        Victoires / Nulles / Defaites tire de 137 045 parties reelles.

   Le format posRef :
     - un segment par camp, separes par "_", le camp AU TRAIT en premier ;
     - chaque segment = (billes ejectees de ce camp) puis, rangee par rangee
       de 'a' a 'i', la lettre suivie des numeros de colonnes occupes ;
     - la numerotation des cases est celle de coordToABAPRO (notation Abalone
       officielle), donc identique a tout le reste de l'application.

   IMPORTANT — portee de la certitude : le generateur est prouve identique au
   format KAA sur les positions PRESENTES dans la CSV, c'est-a-dire l'ouverture
   en Marguerite belge. Au-dela, il est vraisemblable mais non prouve. La CSV ne
   couvre que ce debut de partie ; l'arbre s'arrete donc naturellement la.
   ========================================================================== */
var AbaOpening = (function () {
  'use strict';

  var ROWS_LEN = [5, 6, 7, 8, 9, 8, 7, 6, 5];
  var LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

  // Notation officielle Abalone d'une case (r interne : 0 = haut, 8 = bas).
  // Reproduit coordToABAPRO du moteur ; garde ici pour rester autonome.
  function abapro(r, c) {
    var letter = LETTERS[8 - r];
    var offset = r < 4 ? (4 - r) : 0;
    return letter + (c + 1 + offset);
  }

  /* posRef d'un seul camp. board : { "r,c": "black"|"white" }. */
  function posRefSide(board, camp) {
    var groups = {}, n = 0, key, v, p, r, c, ab;
    for (key in board) {
      v = board[key];
      if (v !== camp) continue;
      n++;
      p = key.split(','); r = +p[0]; c = +p[1];
      ab = abapro(r, c);
      (groups[ab.charAt(0)] || (groups[ab.charAt(0)] = [])).push(parseInt(ab.slice(1), 10));
    }
    var seg = String(14 - n), i, L, col;
    for (i = 0; i < LETTERS.length; i++) {
      L = LETTERS[i];
      if (groups[L]) {
        groups[L].sort(function (a, b) { return a - b; });
        seg += L + groups[L].join('');
      }
    }
    return seg;
  }

  /* posRef complet : camp au trait d'abord, puis l'adversaire. */
  function posRef(board, camp) {
    var other = camp === 'black' ? 'white' : 'black';
    return posRefSide(board, camp) + '_' + posRefSide(board, other);
  }

  // ---- arbre d'ouverture (charge separement) ----
  var TREE = null;
  function load(base) {
    base = base || '';
    return fetch(base + 'opening_tree.json').then(function (r) { return r.json(); })
      .then(function (j) { TREE = j; return { positions: Object.keys(j).length }; });
  }
  function loadFrom(json) { TREE = json; return { positions: Object.keys(json).length }; }

  /* Consultation : pour la position courante, les coups d'ouverture connus.
     L'arbre est indexe par le posRef du camp au trait (segment avant "_"). */
  function probe(board, camp) {
    if (!TREE) return null;
    var key = posRefSide(board, camp);
    var node = TREE[key];
    if (!node) return null;
    var moves = [];
    for (var mv in node) {
      var w = node[mv][0], l = node[mv][1], d = node[mv][2], n = w + l + d;
      moves.push({ move: mv, w: w, l: l, d: d, games: n, winRate: n ? w / n : 0 });
    }
    moves.sort(function (a, b) { return b.games - a.games; });
    return { posRef: key, moves: moves };
  }

  return {
    posRef: posRef,
    posRefSide: posRefSide,
    abapro: abapro,
    load: load,
    loadFrom: loadFrom,
    probe: probe,
    ready: function () { return TREE !== null; }
  };
})();
if (typeof module !== 'undefined') module.exports = AbaOpening;
