/* ============================================================================
   ABALASSEMBLY — SOLVEUR D'EJECTION FORCEE                    tablebase/solver.js
   ----------------------------------------------------------------------------
   L'equivalent Abalone d'un solveur de mat. Ne calcule aucune evaluation :
   il ne renvoie que des faits demontres, ou "indetermine".

   Deux objectifs :

     AbaSolve.win(color, maxPlies)   Gain de PARTIE force : le camp atteint sa
                                     6e ejection quoi que fasse l'adversaire.
                                     Reponse positive = certitude absolue,
                                     avec le nombre de demi-coups minimal.

     AbaSolve.gain(color, maxPlies)  Gain MATERIEL force : +1 bille nette,
                                     conservee jusqu'a l'horizon. Reponse
                                     positive = certitude bornee a l'horizon
                                     (l'adversaire peut se refaire apres).

   Une reponse negative signifie toujours "pas de preuve dans cet horizon",
   jamais "impossible".

   Depend du moteur de la page : board, capturedByBlack, capturedByWhite,
   getAllMovesForColor, applyMove, undoMove, hashBoard.
   ========================================================================== */
var AbaSolve = (function () {
  'use strict';

  var ABORT = { abort: true };
  var ctx = null;

  function other(c) { return c === 'black' ? 'white' : 'black'; }
  function capturedBy(c) { return c === 'black' ? capturedByBlack : capturedByWhite; }

  // cle de transposition : plateau + trait. Les compteurs d'ejection se
  // deduisent du nombre de billes, donc le hash du plateau les porte deja.
  function ttKey(side) {
    var h = hashBoard() >>> 0;
    return side === 'black' ? h : (h ^ 0x9e3779b9) >>> 0;
  }

  function order(moves) {
    return moves.slice().sort(function (a, b) { return (a.code || 9) - (b.code || 9); });
  }

  /* Recherche ET/OU. Renvoie true si l'attaquant atteint l'objectif quoi que
     joue le defenseur, dans le budget de demi-coups restant. */
  function prove(side, plies) {
    if (++ctx.nodes > ctx.maxNodes) throw ABORT;
    if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) throw ABORT;

    // etats terminaux : la partie est finie, l'horizon ne compte plus
    if (capturedBy(ctx.attacker) >= 6) return true;
    if (capturedBy(ctx.defender) >= 6) return false;

    if (plies <= 0) {
      if (ctx.goal === 'win') return false;                    // pas de preuve
      var net = (capturedBy(ctx.attacker) - ctx.baseAtt) - (capturedBy(ctx.defender) - ctx.baseDef);
      return net >= ctx.target;
    }

    var key = ttKey(side), e = ctx.tt.get(key);
    // une preuve trouvee dans un budget plus court vaut pour un budget plus long ;
    // un echec constate dans un budget plus long vaut pour un budget plus court.
    if (e) {
      if (e.v === 1 && e.p <= plies) return true;
      if (e.v === 0 && e.p >= plies) return false;
    }

    var moves = order(getAllMovesForColor(side));
    var res;
    if (!moves.length) {
      res = (side === ctx.defender) ? true : false;   // camp bloque : rare, mais defini
    } else if (side === ctx.attacker) {
      res = false;
      for (var i = 0; i < moves.length && !res; i++) {
        var u = applyMove(moves[i], side);
        if (prove(ctx.defender, plies - 1)) { res = true; ctx.best[plies] = moves[i]; }
        undoMove(u);
      }
    } else {
      res = true;
      for (var j = 0; j < moves.length && res; j++) {
        var u2 = applyMove(moves[j], side);
        if (!prove(ctx.attacker, plies - 1)) res = false;
        undoMove(u2);
      }
    }
    ctx.tt.set(key, { p: plies, v: res ? 1 : 0 });
    return res;
  }

  /* 'win' : objectif monotone (la partie s'arrete a la 6e ejection), donc
     l'approfondissement iteratif donne la sequence la plus COURTE.
     'gain' : objectif NON monotone — un horizon court est une affirmation plus
     FAIBLE, pas une preuve plus courte. On y travaille donc a horizon fixe :
     "+1 bille nette, conservee pendant N demi-coups". */
  function run(color, maxPlies, goal, target, opts) {
    opts = opts || {};
    var t0 = Date.now(), totalNodes = 0;
    var from = (goal === 'win') ? 1 : maxPlies;
    for (var d = from; d <= maxPlies; d += 2) {
      ctx = {
        attacker: color, defender: other(color), goal: goal, target: target,
        baseAtt: capturedBy(color), baseDef: capturedBy(other(color)),
        tt: new Map(), best: {}, nodes: 0,
        maxNodes: opts.maxNodes || 3000000,
        deadline: t0 + (opts.timeMs || 4000)
      };
      var ok;
      try { ok = prove(color, d); }
      catch (err) {
        if (err !== ABORT) throw err;
        return { proved: false, aborted: true, plies: null, move: null, goal: goal,
                 nodes: totalNodes + ctx.nodes, ms: Date.now() - t0, searched: d - 2 };
      }
      totalNodes += ctx.nodes;
      if (ok) return { proved: true, aborted: false, plies: d, move: ctx.best[d] || null,
                       goal: goal, nodes: totalNodes, ms: Date.now() - t0, searched: d };
    }
    return { proved: false, aborted: false, plies: null, move: null,
             goal: goal, nodes: totalNodes, ms: Date.now() - t0, searched: maxPlies };
  }

  // profondeur unique, sans approfondissement iteratif (sert aux tests)
  function at(color, plies, goal, target, opts) {
    opts = opts || {};
    ctx = { attacker: color, defender: other(color), goal: goal, target: target || 1,
            baseAtt: capturedBy(color), baseDef: capturedBy(other(color)),
            tt: new Map(), best: {}, nodes: 0,
            maxNodes: opts.maxNodes || 3000000, deadline: Date.now() + (opts.timeMs || 10000) };
    try { return { proved: prove(color, plies), nodes: ctx.nodes }; }
    catch (e) { if (e !== ABORT) throw e; return { proved: null, nodes: ctx.nodes }; }
  }

  /* Detection de gaffe : apres le coup qui vient d'etre joue par `color`,
     l'adversaire dispose-t-il d'un gain force ? Sert a annoter une partie
     rejouee — c'est une erreur DEMONTREE, pas une baisse d'evaluation. */
  function threat(color, plies, opts) {
    return run(other(color), plies || 3, 'gain', 1, opts);
  }

  function ready() {
    return typeof board !== 'undefined' && typeof getAllMovesForColor === 'function' &&
           typeof applyMove === 'function' && typeof undoMove === 'function' &&
           typeof hashBoard === 'function';
  }

  return {
    _at: at,
    ready: ready,
    threat: threat,
    // gain de partie force (6e ejection) — certitude absolue si proved
    win: function (color, maxPlies, opts) { return run(color, maxPlies || 5, 'win', 0, opts); },
    // gain materiel force de n billes nettes, conserve jusqu'a l'horizon
    gain: function (color, maxPlies, n, opts) { return run(color, maxPlies || 5, 'gain', n || 1, opts); },
    // phrase prete a afficher, sans jamais surpromettre
    describe: function (r, color) {
      var camp = color === 'black' ? 'Noirs' : 'Blancs';
      if (r.aborted) return 'Indetermine : budget epuise apres ' + r.nodes.toLocaleString('fr-FR') + ' noeuds';
      if (!r.proved) return r.goal === 'win'
        ? 'Aucun gain de partie force en ' + r.searched + ' demi-coups'
        : 'Aucun gain materiel force tenable sur ' + r.searched + ' demi-coups';
      return r.goal === 'win'
        ? camp + ' gagnent par la force en ' + r.plies + ' demi-coup' + (r.plies > 1 ? 's' : '')
        : camp + ' gagnent une bille par la force, acquise et conservee sur ' + r.plies + ' demi-coups';
    }
  };
})();
if (typeof module !== 'undefined') module.exports = AbaSolve;
