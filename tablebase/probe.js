/* ============================================================================
   ABALASSEMBLY — CONSULTATION DES TABLEBASES DE FINALE            tablebase/probe.js
   ----------------------------------------------------------------------------
   Tables exactes, resolues par induction retrograde exhaustive :
     - 2v2 : 6 262 260 positions, resolues integralement
     - 3v2 : 11 703 240 positions canoniques (reduction D6), resolues integralement
   Valables pour le mode DECOUVERTE (7 billes/camp, 6 ejections = defaite),
   seul mode ou ces classes de materiel sont atteignables. En Abalone standard
   (14 billes) elles ne surviennent jamais : voir tablebase/RESULTS.md.

   Dependances : aucune. Reconstruit sa propre geometrie et ne touche pas au
   moteur du jeu — il se contente de comparer des positions.

   Usage :
     await AbaTB.load('tablebase/');        // charge les deux .json
     const r = AbaTB.probe(board, 'black'); // board = objet {"r,c":"black"|"white"}
     // r = null si hors table, sinon {wdl:'WIN'|'DRAW'|'LOSS', dtw, moves:[...]}
   ========================================================================== */
var AbaTB = (function () {
  'use strict';

  // ---------- geometrie : 61 cases, rangees 5..9..5 ----------
  var L = [5, 6, 7, 8, 9, 8, 7, 6, 5], N = 61;
  var IDX = [], RC = [], i, r, c;
  (function () { var k = 0; for (r = 0; r < 9; r++) { IDX[r] = []; for (c = 0; c < L[r]; c++) { IDX[r][c] = k; RC[k] = [r, c]; k++; } } })();
  function cell(r, c) { return (r < 0 || r > 8 || c < 0 || c >= L[r]) ? -1 : IDX[r][c]; }
  var NB = new Int32Array(N * 6).fill(-1);
  for (i = 0; i < N; i++) {
    r = RC[i][0]; c = RC[i][1];
    var dn = (r < 4) ? [cell(r + 1, c), cell(r + 1, c + 1)] : [cell(r + 1, c - 1), cell(r + 1, c)];
    var up = (r <= 4) ? [cell(r - 1, c - 1), cell(r - 1, c)] : [cell(r - 1, c), cell(r - 1, c + 1)];
    NB[i * 6] = cell(r, c + 1); NB[i * 6 + 1] = dn[1]; NB[i * 6 + 2] = dn[0];
    NB[i * 6 + 3] = cell(r, c - 1); NB[i * 6 + 4] = up[0]; NB[i * 6 + 5] = up[1];
  }

  // ---------- les 12 symetries (D6) ----------
  var CUBE = [], CIDX = {};
  for (i = 0; i < N; i++) { var z = RC[i][0] - 4, x = RC[i][1] + Math.max(-4, -4 - z); CUBE[i] = [x, -x - z, z]; CIDX[CUBE[i].join(',')] = i; }
  var SYM = [];
  (function () {
    function rot(v) { return [-v[2], -v[0], -v[1]]; }
    function ref(v) { return [v[0], v[2], v[1]]; }
    for (var m = 0; m < 2; m++) for (var k = 0; k < 6; k++) {
      var p = new Int8Array(N);
      for (var i = 0; i < N; i++) { var v = CUBE[i].slice(); if (m) v = ref(v); for (var t = 0; t < k; t++) v = rot(v); p[i] = CIDX[v.join(',')]; }
      SYM.push(p);
    }
  })();

  // ---------- index des paires / triplets ----------
  var PAIRS = [], PIDX = new Int32Array(N * N).fill(-1);
  for (i = 0; i < N; i++) for (var j = i + 1; j < N; j++) { PIDX[i * N + j] = PAIRS.length; PAIRS.push([i, j]); }
  var NP = PAIRS.length;
  function pid(a, b) { return a < b ? PIDX[a * N + b] : PIDX[b * N + a]; }
  var TIDX = new Int32Array(N * N * N).fill(-1), NT = 0;
  for (i = 0; i < N; i++) for (var j2 = i + 1; j2 < N; j2++) for (var k2 = j2 + 1; k2 < N; k2++) TIDX[(i * N + j2) * N + k2] = NT++;
  function tid(a, b, cc) { var t, x = a, y = b, z = cc; if (x > y) { t = x; x = y; y = t; } if (y > z) { t = y; y = z; z = t; } if (x > y) { t = x; x = y; y = t; } return TIDX[(x * N + y) * N + z]; }

  var canonG = new Int8Array(NP), canonRep = new Int32Array(NP), REPS = null;
  function buildCanon(reps) {
    REPS = reps; var rank = {}; for (var q = 0; q < reps.length; q++) rank[reps[q]] = q;
    for (var p = 0; p < NP; p++) {
      var a = PAIRS[p][0], b = PAIRS[p][1], best = p, bg = 0;
      for (var g = 0; g < 12; g++) { var u = pid(SYM[g][a], SYM[g][b]); if (u < best) { best = u; bg = g; } }
      canonRep[p] = rank[best]; canonG[p] = bg;
    }
  }

  // ---------- generateur de coups (lisible ; appele une fois par coup) ----------
  function genMoves(occ, me) {
    var opp = me === 1 ? 2 : 1, out = [], own = [], i;
    for (i = 0; i < N; i++) if (occ[i] === me) own.push(i);
    var groups = [];
    for (i = 0; i < own.length; i++) groups.push({ g: [own[i]], a: -1 });
    for (i = 0; i < own.length; i++) for (var a = 0; a < 3; a++) {
      var p = own[i], q = NB[p * 6 + a];
      if (q === -1 || occ[q] !== me) continue;
      groups.push({ g: [p, q], a: a });
      var s = NB[q * 6 + a];
      if (s !== -1 && occ[s] === me) groups.push({ g: [p, q, s], a: a });
    }
    for (var gi = 0; gi < groups.length; gi++) {
      var G = groups[gi].g, ax = groups[gi].a, n = G.length;
      for (var d = 0; d < 6; d++) {
        var inline = (n === 1) || (d === ax) || (d === (ax + 3) % 6);
        if (inline) {
          var head = (n === 1) ? G[0] : (d === ax ? G[n - 1] : G[0]);
          var tail = (n === 1) ? G[0] : (d === ax ? G[0] : G[n - 1]);
          var front = NB[head * 6 + d];
          if (front === -1 || occ[front] === me) continue;
          if (occ[front] === 0) { out.push({ cells: G.slice(), d: d, k: 0, tail: tail, front: front }); continue; }
          var k = 0, p2 = front;
          while (p2 !== -1 && occ[p2] === opp && k < 3) { k++; p2 = NB[p2 * 6 + d]; }
          if (k >= n || k > 2) continue;
          if (p2 !== -1 && occ[p2] !== 0) continue;
          out.push({ cells: G.slice(), d: d, k: k, tail: tail, front: front });
        } else {
          var ok = true;
          for (var z2 = 0; z2 < n; z2++) { var t2 = NB[G[z2] * 6 + d]; if (t2 === -1 || occ[t2] !== 0) { ok = false; break; } }
          if (ok) out.push({ cells: G.slice(), d: d, k: 0, tail: null, front: null });
        }
      }
    }
    return out;
  }
  function applyMove(occ, mv, me) {
    var b = Int8Array.from(occ), opp = me === 1 ? 2 : 1, ejected = false, i;
    if (mv.k > 0) {
      var pushed = [], q = mv.front;
      for (i = 0; i < mv.k; i++) { pushed.push(q); q = NB[q * 6 + mv.d]; }
      for (i = pushed.length - 1; i >= 0; i--) {
        var to = NB[pushed[i] * 6 + mv.d];
        b[pushed[i]] = 0;
        if (to === -1) ejected = true; else b[to] = opp;
      }
    }
    for (i = 0; i < mv.cells.length; i++) b[mv.cells[i]] = 0;
    for (i = 0; i < mv.cells.length; i++) b[NB[mv.cells[i] * 6 + mv.d]] = me;
    return { occ: b, eject: ejected };
  }

  // ---------- tables ----------
  var T22 = null, T32 = null;
  function toMap(json) { var m = new Map(); for (var i = 0; i < json.entries.length; i++) m.set(json.entries[i][0], json.entries[i]); return m; }

  function loadFrom(j22, j32) {
    T22 = toMap(j22); T32 = toMap(j32); buildCanon(j32.orbit_reps);
    return { '2v2': T22.size, '3v2': T32.size };
  }
  function load(base) {
    base = base || '';
    return Promise.all([fetch(base + 'tb-2v2.json').then(function (r) { return r.json(); }),
                        fetch(base + 'tb-3v2.json').then(function (r) { return r.json(); })])
      .then(function (a) { return loadFrom(a[0], a[1]); });
  }

  // ---------- conversion depuis le plateau du jeu ----------
  function fromBoard(board) {
    var occ = new Int8Array(N);
    for (var key in board) {
      var v = board[key]; if (v !== 'black' && v !== 'white') continue;
      var p = key.split(','), idx = cell(+p[0], +p[1]);
      if (idx !== -1) occ[idx] = (v === 'black') ? 1 : 2;
    }
    return occ;
  }
  function cellsOf(occ, col) { var a = []; for (var i = 0; i < N; i++) if (occ[i] === col) a.push(i); return a; }
  function rc(i) { return RC[i][0] + ',' + RC[i][1]; }

  // ---------- consultation ----------
  // renvoie la valeur pour le camp au trait : 1 gain, 2 perte, 0 nulle ; ou null hors table
  function lookup(occ, me) {
    var B = cellsOf(occ, 1), W = cellsOf(occ, 2);
    var mine = me === 1 ? B : W, his = me === 1 ? W : B;
    if (mine.length === 2 && his.length === 2) {
      if (!T22) return null;
      var idx = (pid(B[0], B[1]) * NP + pid(W[0], W[1])) * 2 + (me === 1 ? 0 : 1);
      var e = T22.get(idx);
      return e ? { v: e[1], dtw: e[2] } : { v: 0, dtw: 0 };
    }
    var strong = (B.length === 3 && W.length === 2) ? B : (W.length === 3 && B.length === 2) ? W : null;
    if (!strong) return null;
    if (!T32) return null;
    var weak = (strong === B) ? W : B;
    var turn = (mine === strong) ? 0 : 1;
    var wp = pid(weak[0], weak[1]), g = canonG[wp], S = SYM[g];
    var idx2 = (canonRep[wp] * NT + tid(S[strong[0]], S[strong[1]], S[strong[2]])) * 2 + turn;
    var e2 = T32.get(idx2);
    return e2 ? { v: e2[1], dtw: e2[2] } : { v: 0, dtw: 0 };
  }

  // consultation publique + meilleurs coups (par comparaison des positions filles)
  function probe(board, color) {
    var me = (color === 'black') ? 1 : 2, occ = fromBoard(board);
    var here = lookup(occ, me);
    if (!here) return null;
    var moves = genMoves(occ, me), best = [], bestRank = null;
    for (var i = 0; i < moves.length; i++) {
      var res = applyMove(occ, moves[i], me), rank;
      if (res.eject) rank = { v: 1, dtw: 1 };                       // ejection : voir RESULTS.md
      else {
        var ch = lookup(res.occ, me === 1 ? 2 : 1);
        if (!ch) continue;
        rank = (ch.v === 2) ? { v: 1, dtw: ch.dtw + 1 } : (ch.v === 1) ? { v: 2, dtw: ch.dtw + 1 } : { v: 0, dtw: 0 };
      }
      // preference : gain (0) > nulle (1) > perte (2) ; gain le plus court, perte la plus longue
      rank.pref = (rank.v === 1) ? 0 : (rank.v === 0) ? 1 : 2;
      rank.after = res.occ;
      var better = !bestRank || rank.pref < bestRank.pref ||
        (rank.pref === bestRank.pref && (rank.pref === 0 ? rank.dtw < bestRank.dtw : rank.dtw > bestRank.dtw));
      if (better) { bestRank = rank; best = [{ m: moves[i], r: rank }]; }
      else if (rank.pref === bestRank.pref && rank.dtw === bestRank.dtw) best.push({ m: moves[i], r: rank });
    }
    return {
      wdl: here.v === 1 ? 'WIN' : here.v === 2 ? 'LOSS' : 'DRAW',
      dtw: here.dtw,
      moves: best.map(function (e) {
        var m = e.m, after = {};
        for (var q = 0; q < N; q++) if (e.r.after[q]) after[rc(q)] = (e.r.after[q] === 1) ? 'black' : 'white';
        return {
          from: m.cells.map(rc),
          to: m.cells.map(function (x) { return rc(NB[x * 6 + m.d]); }),
          push: m.k,
          eject: (m.k > 0 && NB[m.front * 6 + m.d] === -1) || (m.k === 2 && NB[NB[m.front * 6 + m.d] * 6 + m.d] === -1),
          after: after            // plateau resultant : sert a apparier avec le coup du moteur
        };
      })
    };
  }

  return { load: load, loadFrom: loadFrom, probe: probe, _internals: { fromBoard: fromBoard, lookup: lookup, RC: RC, PAIRS: PAIRS, SYM: SYM } };
})();
if (typeof module !== 'undefined') module.exports = AbaTB;
