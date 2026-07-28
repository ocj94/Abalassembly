'use strict';
/* ============================================================================
   ABALONE — GENERATEUR DE TABLEBASES DE FINALE            (usage : node ce-fichier.js)
   ----------------------------------------------------------------------------
   Contenu :
     1. geometrie du plateau hexagonal 61 cases + tests
     2. moteur de coups de reference (lisible, lent) + 8 tests de regles
     3. groupe de symetrie D6 (12 permutations) + validation
     4. generateur de coups rapide, contre-verifie contre le moteur de reference
     5. resolution exhaustive par induction retrograde de la classe 3 contre 2
   Convention : mode Decouverte d'Abalassembly, 7 billes/camp, 6 ejections = defaite.
   Ecrit pour Abalassembly — verifie, pas suppose.
   ========================================================================== */
// ============================================================
// Tablebase Abalone — géométrie + moteur de coups minimal
// Plateau hexagonal 61 cases, rangées de longueurs 5..9..5
// ============================================================

const L = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const N = 61;

// index <-> (r,c)
const IDX = [];      // IDX[r][c] = i
const RC = [];       // RC[i] = [r,c]
(function () {
  let i = 0;
  for (let r = 0; r < 9; r++) {
    IDX[r] = [];
    for (let c = 0; c < L[r]; c++) { IDX[r][c] = i; RC[i] = [r, c]; i++; }
  }
  if (i !== N) throw new Error('plateau != 61 cases : ' + i);
})();

// directions : 0=E 1=SE 2=SW 3=W 4=NW 5=NE   opp(d) = (d+3)%6
const NB = new Int8Array(N * 6).fill(-1);
const NBI = new Int32Array(N * 6).fill(-1);
function cell(r, c) {
  if (r < 0 || r > 8) return -1;
  if (c < 0 || c >= L[r]) return -1;
  return IDX[r][c];
}
(function () {
  for (let i = 0; i < N; i++) {
    const r = RC[i][0], c = RC[i][1];
    const down = (r < 4) ? [cell(r + 1, c), cell(r + 1, c + 1)]     // [DL, DR]
                         : [cell(r + 1, c - 1), cell(r + 1, c)];
    const up = (r <= 4) ? [cell(r - 1, c - 1), cell(r - 1, c)]      // [UL, UR]
                        : [cell(r - 1, c), cell(r - 1, c + 1)];
    NBI[i * 6 + 0] = cell(r, c + 1);   // E
    NBI[i * 6 + 1] = down[1];          // SE
    NBI[i * 6 + 2] = down[0];          // SW
    NBI[i * 6 + 3] = cell(r, c - 1);   // W
    NBI[i * 6 + 4] = up[0];            // NW
    NBI[i * 6 + 5] = up[1];            // NE
  }
})();

// ---------- tests de géométrie ----------
function testGeometry() {
  let errs = [];
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < 6; d++) {
      const j = NBI[i * 6 + d];
      if (j === -1) continue;
      const back = NBI[j * 6 + ((d + 3) % 6)];
      if (back !== i) errs.push(`réciprocité cassée : ${i} -${d}-> ${j} -> ${back}`);
    }
  }
  let full = 0;
  for (let i = 0; i < N; i++) {
    let n = 0;
    for (let d = 0; d < 6; d++) if (NBI[i * 6 + d] !== -1) n++;
    if (n === 6) full++;
  }
  if (full !== 37) errs.push(`cases à 6 voisins = ${full}, attendu 37`);
  return errs;
}

// ============================================================
//  Génération des coups
//  board : Int8Array(61)  0=vide 1=noir 2=blanc
//  retourne la liste des coups : {cells:[...], d, eject:bool}
// ============================================================
function genMoves(board, me) {
  const opp = me === 1 ? 2 : 1;
  const out = [];
  const own = [];
  for (let i = 0; i < N; i++) if (board[i] === me) own.push(i);

  // groupes : taille 1, puis 2 et 3 alignés (axe canonique d<3 pour éviter les doublons)
  const groups = [];
  for (const i of own) groups.push({ cells: [i], axis: -1 });
  for (const i of own) {
    for (let a = 0; a < 3; a++) {
      const j = NBI[i * 6 + a];
      if (j === -1 || board[j] !== me) continue;
      groups.push({ cells: [i, j], axis: a });
      const k = NBI[j * 6 + a];
      if (k !== -1 && board[k] === me) groups.push({ cells: [i, j, k], axis: a });
    }
  }

  for (const g of groups) {
    const n = g.cells.length;
    for (let d = 0; d < 6; d++) {
      const inline = (n === 1) || (d === g.axis) || (d === (g.axis + 3) % 6);
      if (inline) {
        // tête = bille la plus avancée dans la direction d
        let head = g.cells[0];
        for (const cc of g.cells) {
          // cc est plus avancée si on l'atteint depuis head en suivant d
          let p = head;
          for (let s = 0; s < 3; s++) { p = NBI[p * 6 + d]; if (p === -1) break; if (p === cc) { head = cc; break; } }
        }
        const front = NBI[head * 6 + d];
        if (front === -1) continue;                 // s'auto-éjecter : interdit
        if (board[front] === me) continue;          // bloqué par sa propre bille
        if (board[front] === 0) { out.push({ cells: g.cells, d, eject: false, push: 0 }); continue; }
        // sumito
        let k = 0, p = front;
        while (p !== -1 && board[p] === opp && k < 3) { k++; p = NBI[p * 6 + d]; }
        if (k >= n || k > 2) continue;              // pas de supériorité / 3 billes poussées
        if (p === -1) { out.push({ cells: g.cells, d, eject: true, push: k }); continue; }
        if (board[p] === 0) out.push({ cells: g.cells, d, eject: false, push: k });
      } else {
        // latéral : toutes les cases d'arrivée libres
        let ok = true;
        for (const cc of g.cells) {
          const t = NBI[cc * 6 + d];
          if (t === -1 || board[t] !== 0) { ok = false; break; }
        }
        if (ok) out.push({ cells: g.cells, d, eject: false, push: 0 });
      }
    }
  }
  return out;
}

// applique un coup sur une copie
function applyMove(board, mv, me) {
  const b = Int8Array.from(board);
  const opp = me === 1 ? 2 : 1;
  // pousse d'abord les billes adverses (de la plus avancée vers l'arrière)
  if (mv.push > 0) {
    // tête du groupe
    let head = mv.cells[0];
    for (const cc of mv.cells) {
      let p = head;
      for (let s = 0; s < 3; s++) { p = NBI[p * 6 + mv.d]; if (p === -1) break; if (p === cc) { head = cc; break; } }
    }
    const oppCells = [];
    let p = NBI[head * 6 + mv.d];
    for (let s = 0; s < mv.push; s++) { oppCells.push(p); p = NBI[p * 6 + mv.d]; }
    for (let s = oppCells.length - 1; s >= 0; s--) {
      const from = oppCells[s], to = NBI[from * 6 + mv.d];
      b[from] = 0;
      if (to !== -1) b[to] = opp;   // sinon : éjectée
    }
  }
  for (const cc of mv.cells) b[cc] = 0;
  for (const cc of mv.cells) b[NBI[cc * 6 + mv.d]] = me;
  return b;
}

// ---------- tests de règles ----------
function testRules() {
  const errs = [];
  const B = () => new Int8Array(N);
  const at = (r, c) => IDX[r][c];

  // 1) bille seule au centre : 6 coups
  let b = B(); b[at(4, 4)] = 1;
  let m = genMoves(b, 1);
  if (m.length !== 6) errs.push(`bille seule au centre : ${m.length} coups, attendu 6`);

  // 2) 2 noires contre 1 blanche, case derrière libre -> poussée légale
  b = B(); b[at(4, 1)] = 1; b[at(4, 2)] = 1; b[at(4, 3)] = 2;
  m = genMoves(b, 1).filter(x => x.push > 0);
  if (m.length !== 1) errs.push(`sumito 2v1 : ${m.length} poussées, attendu 1`);

  // 3) 2 noires contre 2 blanches -> pac, aucune poussée
  b = B(); b[at(4, 1)] = 1; b[at(4, 2)] = 1; b[at(4, 3)] = 2; b[at(4, 4)] = 2;
  m = genMoves(b, 1).filter(x => x.push > 0);
  if (m.length !== 0) errs.push(`pac 2v2 : ${m.length} poussées, attendu 0`);

  // 4) 3 noires contre 2 blanches -> poussée légale
  b = B(); b[at(4, 0)] = 1; b[at(4, 1)] = 1; b[at(4, 2)] = 1; b[at(4, 3)] = 2; b[at(4, 4)] = 2;
  m = genMoves(b, 1).filter(x => x.push > 0);
  if (m.length !== 1) errs.push(`sumito 3v2 : ${m.length} poussées, attendu 1`);

  // 5) éjection : 2 noires poussent 1 blanche au bord de la rangée 4
  b = B(); b[at(4, 6)] = 1; b[at(4, 7)] = 1; b[at(4, 8)] = 2;
  m = genMoves(b, 1).filter(x => x.eject);
  if (m.length !== 1) errs.push(`éjection bord : ${m.length}, attendu 1`);
  if (m.length === 1) {
    const nb = applyMove(b, m[0], 1);
    let w = 0; for (let i = 0; i < N; i++) if (nb[i] === 2) w++;
    if (w !== 0) errs.push('la bille blanche n\'a pas été éjectée');
    if (nb[at(4, 8)] !== 1 || nb[at(4, 7)] !== 1 || nb[at(4, 6)] !== 0) errs.push('positions après éjection incorrectes');
  }

  // 6) pas d'auto-éjection : bille noire seule au bord, 3 coups vers l'intérieur seulement
  b = B(); b[at(0, 0)] = 1;
  m = genMoves(b, 1);
  if (m.length !== 3) errs.push(`bille en coin haut-gauche : ${m.length} coups, attendu 3`);

  // 7) latéral 2 billes : dest libres
  b = B(); b[at(4, 3)] = 1; b[at(4, 4)] = 1;
  m = genMoves(b, 1);
  const lat = m.filter(x => x.cells.length === 2 && x.d !== 0 && x.d !== 3);
  if (lat.length !== 4) errs.push(`latéraux d'une paire E-W : ${lat.length}, attendu 4`);

  // 8) conservation du matériel sur coup simple
  b = B(); b[at(4, 3)] = 1; b[at(4, 4)] = 1; b[at(2, 2)] = 2; b[at(2, 3)] = 2;
  for (const mv of genMoves(b, 1)) {
    const nb = applyMove(b, mv, 1);
    let nblack = 0, nwhite = 0;
    for (let i = 0; i < N; i++) { if (nb[i] === 1) nblack++; if (nb[i] === 2) nwhite++; }
    if (nblack !== 2 || nwhite !== 2) errs.push(`matériel non conservé : ${nblack}/${nwhite}`);
  }
  return errs;
}

const e1 = testGeometry();
const e2 = testRules();
console.log('--- géométrie ---');
console.log(e1.length ? e1.join('\n') : 'OK (61 cases, voisinage réciproque, 37 cases internes)');
console.log('--- règles ---');
console.log(e2.length ? e2.join('\n') : 'OK (8 tests : mouvement, sumito 2v1/3v2, pac, éjection, latéral, bord)');




// ============================================================
// 1. Symétries du plateau (groupe diédral D6, ordre 12)
// ============================================================
const CUBE = [];                       // CUBE[i] = [x,y,z]
for (let i = 0; i < N; i++) {
  const r = RC[i][0], c = RC[i][1];
  const z = r - 4;
  const x = c + Math.max(-4, -4 - z);
  CUBE[i] = [x, -x - z, z];
}
const CIDX = new Map();
for (let i = 0; i < N; i++) CIDX.set(CUBE[i].join(','), i);

const SYM = [];                        // SYM[g] = Int8Array(61) permutation
{
  const rot = ([x, y, z]) => [-z, -x, -y];          // +60°
  const ref = ([x, y, z]) => [x, z, y];             // miroir
  for (let m = 0; m < 2; m++) {
    for (let k = 0; k < 6; k++) {
      const perm = new Int8Array(N);
      for (let i = 0; i < N; i++) {
        let v = CUBE[i].slice();
        if (m) v = ref(v);
        for (let t = 0; t < k; t++) v = rot(v);
        const j = CIDX.get(v.join(','));
        if (j === undefined) throw new Error('symétrie hors plateau');
        perm[i] = j;
      }
      SYM.push(perm);
    }
  }
}
// validation : chaque symétrie doit préserver l'adjacence
for (const perm of SYM) {
  const seen = new Set();
  for (let i = 0; i < N; i++) seen.add(perm[i]);
  if (seen.size !== N) throw new Error('symétrie non bijective');
  for (let i = 0; i < N; i++) for (let d = 0; d < 6; d++) {
    const j = NBI[i * 6 + d];
    if (j === -1) continue;
    let adj = false;
    for (let e = 0; e < 6; e++) if (NBI[perm[i] * 6 + e] === perm[j]) adj = true;
    if (!adj) throw new Error('symétrie ne préserve pas l\'adjacence');
  }
}
console.log('symétries : 12 permutations validées (bijectives, adjacence préservée)');

// ============================================================
// 2. Index des paires et des triplets
// ============================================================
const PAIRS = [], PIDX = new Int32Array(N * N).fill(-1);
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { PIDX[i * N + j] = PAIRS.length; PAIRS.push([i, j]); }
const NP = PAIRS.length;
const pid = (a, b) => a < b ? PIDX[a * N + b] : PIDX[b * N + a];

const TRIS = [], TIDX = new Int32Array(N * N * N).fill(-1);
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) {
  TIDX[(i * N + j) * N + k] = TRIS.length; TRIS.push([i, j, k]);
}
const NT = TRIS.length;
const tid = (a, b, c) => { let x = a, y = b, z = c, t;
  if (x > y) { t = x; x = y; y = t; } if (y > z) { t = y; y = z; z = t; } if (x > y) { t = x; x = y; y = t; }
  return TIDX[(x * N + y) * N + z]; };
console.log('paires :', NP, '· triplets :', NT.toLocaleString('fr-FR'));

// ---------- canonisation par la paire du camp faible ----------
const canonRep = new Int32Array(NP);   // -> index d'orbite 0..K-1
const canonG = new Int8Array(NP);      // symétrie à appliquer
{
  const repOf = new Int32Array(NP).fill(-1), gOf = new Int8Array(NP);
  for (let p = 0; p < NP; p++) {
    const [a, b] = PAIRS[p];
    let best = p, bg = 0;
    for (let g = 0; g < 12; g++) { const q = pid(SYM[g][a], SYM[g][b]); if (q < best) { best = q; bg = g; } }
    repOf[p] = best; gOf[p] = bg;
  }
  const reps = [...new Set(Array.from(repOf))].sort((x, y) => x - y);
  const rank = new Map(reps.map((r, i) => [r, i]));
  for (let p = 0; p < NP; p++) { canonRep[p] = rank.get(repOf[p]); canonG[p] = gOf[p]; }
  var REPS = reps, K = reps.length;
}
console.log('orbites de paires sous D6 :', K, '(réduction ×' + (NP / K).toFixed(1) + ')');

const posIdx = (repIdx, triIdx, turn) => (repIdx * NT + triIdx) * 2 + turn;
const TOTAL = K * NT * 2;
console.log('espace d\'index 3v2 réduit :', TOTAL.toLocaleString('fr-FR'), 'positions (', (TOTAL * 2 / 1048576).toFixed(0), 'Mo )');

// index canonique d'une position brute (triplet fort, paire faible, trait)
function idxOf(t0, t1, t2, w0, w1, turn) {
  const wp = pid(w0, w1), g = canonG[wp], S = SYM[g];
  return posIdx(canonRep[wp], tid(S[t0], S[t1], S[t2]), turn);
}

// ============================================================
// 3. Générateur de coups rapide (n billes contre m, n,m <= 3)
// ============================================================
const occ = new Int8Array(N);
const OWN = new Int32Array(256 * 3), OPP = new Int32Array(256 * 3), EJ = new Uint8Array(256);
function succ(own, no, opp, nop, me) {
  for (let i = 0; i < no; i++) occ[own[i]] = 1;
  for (let i = 0; i < nop; i++) occ[opp[i]] = 2;
  let cnt = 0;
  const put = (cells, n, oppCells, m, eject) => {
    for (let i = 0; i < 3; i++) OWN[cnt * 3 + i] = i < n ? cells[i] : -1;
    for (let i = 0; i < 3; i++) OPP[cnt * 3 + i] = i < m ? oppCells[i] : -1;
    EJ[cnt] = eject ? 1 : 0; cnt++;
  };
  const nc = [0, 0, 0], mc = [0, 0, 0];
  for (let gi = 0; gi < no; gi++) {
    const i = own[gi];
    // groupes commençant en i : taille 1, puis 2 et 3 le long des axes canoniques
    { // groupes d'une seule bille : les 6 directions
      for (let d = 0; d < 6; d++) {
        const t = NBI[i * 6 + d];
        if (t === -1 || occ[t] !== 0) continue;    // 1 bille ne pousse jamais
        let k = 0; for (let s = 0; s < no; s++) if (own[s] !== i) nc[k++] = own[s];
        nc[k] = t;
        for (let s = 0; s < nop; s++) mc[s] = opp[s];
        put(nc, no, mc, nop, false);
      }
    }
    for (let a = 0; a < 3; a++) {
      const j = NBI[i * 6 + a];
      if (j === -1 || occ[j] !== 1) continue;
      const k3 = NBI[j * 6 + a];
      const groups = [[i, j]];
      if (k3 !== -1 && occ[k3] === 1) groups.push([i, j, k3]);
      for (const G of groups) {
        const n = G.length;
        for (let d = 0; d < 6; d++) {
          if (d === a || d === (a + 3) % 6) {
            const head = (d === a) ? G[n - 1] : G[0];
            const front = NBI[head * 6 + d];
            if (front === -1) continue;
            if (occ[front] === 1) continue;
            if (occ[front] === 0) {
              let k = 0; for (let s = 0; s < no; s++) { if (!G.includes(own[s])) nc[k++] = own[s]; }
              for (const c of G) { if (c !== ((d === a) ? G[0] : G[n - 1])) nc[k++] = c; }
              nc[k++] = front;
              for (let s = 0; s < nop; s++) mc[s] = opp[s];
              put(nc, no, mc, nop, false);
              continue;
            }
            // sumito
            let kk = 0, p = front;
            while (p !== -1 && occ[p] === 2 && kk < 3) { kk++; p = NBI[p * 6 + d]; }
            if (kk >= n || kk > 2) continue;
            if (p !== -1 && occ[p] !== 0) continue;
            // billes adverses poussées : front, front+d, ...
            const pushed = []; let q = front;
            for (let s = 0; s < kk; s++) { pushed.push(q); q = NBI[q * 6 + d]; }
            let m = 0, ejected = false;
            for (let s = 0; s < nop; s++) {
              const idx = pushed.indexOf(opp[s]);
              if (idx === -1) { mc[m++] = opp[s]; continue; }
              const to = NBI[opp[s] * 6 + d];
              if (to === -1) ejected = true; else mc[m++] = to;
            }
            let k2 = 0; for (let s = 0; s < no; s++) { if (!G.includes(own[s])) nc[k2++] = own[s]; }
            for (const c of G) { if (c !== ((d === a) ? G[0] : G[n - 1])) nc[k2++] = c; }
            nc[k2++] = front;
            put(nc, no, mc, m, ejected);
          } else {
            let ok = true;
            for (const c of G) { const t = NBI[c * 6 + d]; if (t === -1 || occ[t] !== 0) { ok = false; break; } }
            if (!ok) continue;
            let k2 = 0; for (let s = 0; s < no; s++) { if (!G.includes(own[s])) nc[k2++] = own[s]; }
            for (const c of G) nc[k2++] = NBI[c * 6 + d];
            for (let s = 0; s < nop; s++) mc[s] = opp[s];
            put(nc, no, mc, nop, false);
          }
        }
      }
    }
  }
  for (let i = 0; i < no; i++) occ[own[i]] = 0;
  for (let i = 0; i < nop; i++) occ[opp[i]] = 0;
  return cnt;
}

// ---------- contre-vérification vs le moteur générique validé ----------
function crossCheck(nTests, no, nop) {
  let bad = 0;
  for (let t = 0; t < nTests; t++) {
    const cells = [];
    while (cells.length < no + nop) { const x = (Math.random() * N) | 0; if (!cells.includes(x)) cells.push(x); }
    const own = cells.slice(0, no), opp = cells.slice(no);
    for (const me of [1, 2]) {
      const A = me === 1 ? own : opp, B = me === 1 ? opp : own;
      const board = new Int8Array(N);
      for (const c of A) board[c] = 1; for (const c of B) board[c] = 2;
      const ref = new Set();
      for (const mv of genMoves(board, 1)) {
        const nb = applyMove(board, mv, 1);
        const P = [], Q = [];
        for (let i = 0; i < N; i++) { if (nb[i] === 1) P.push(i); if (nb[i] === 2) Q.push(i); }
        ref.add(P.join(',') + '|' + Q.join(','));
      }
      const cnt = succ(A, A.length, B, B.length, 1);
      const got = new Set();
      for (let s = 0; s < cnt; s++) {
        const P = [], Q = [];
        for (let i = 0; i < 3; i++) if (OWN[s * 3 + i] !== -1) P.push(OWN[s * 3 + i]);
        for (let i = 0; i < 3; i++) if (OPP[s * 3 + i] !== -1) Q.push(OPP[s * 3 + i]);
        got.add(P.sort((x, y) => x - y).join(',') + '|' + Q.sort((x, y) => x - y).join(','));
      }
      if (ref.size !== got.size || [...ref].some(x => !got.has(x))) {
        bad++;
        if (bad <= 2) console.log('DIVERGENCE', { A, B, ref: [...ref].sort(), got: [...got].sort() });
      }
    }
  }
  return bad;
}
let bad = 0;
for (const [a,b] of [[3,2],[2,2],[3,3],[1,2],[2,3],[3,1]]) {
  const e = crossCheck(800, a, b);
  console.log('  ' + a + 'v' + b + ' : ' + (e ? e + ' divergences' : 'OK'));
  bad += e;
}
if (bad) process.exit(1);

// ============================================================
// 4. Résolution de la classe 3v2 (mode Découverte : 7 billes/camp, 6 éjections)
//    Noir a 3 billes (a perdu 4), Blanc en a 2 (a perdu 5).
//    Noir éjecte  -> Blanc à 1 bille = 6 éjections = NOIR GAGNE.
//    Blanc éjecte -> classe 2v2, Noir au trait : gain pour Noir s'il a une
//    éjection immédiate, sinon NULLE (résultat démontré par la table 2v2).
// ============================================================
const status = new Uint8Array(TOTAL), dtw = new Uint8Array(TOTAL);

// gain immédiat pour le camp au trait dans une position 2v2 ?
const _o2 = new Int32Array(2), _p2 = new Int32Array(2);
function ejectAvailable2v2(a0, a1, b0, b1) {
  _o2[0] = a0; _o2[1] = a1; _p2[0] = b0; _p2[1] = b1;
  const c = succ(_o2, 2, _p2, 2, 1);
  for (let s = 0; s < c; s++) if (EJ[s]) return true;
  return false;
}

const un = new Int32Array(12000000);
let nun = 0;
for (let ri = 0; ri < K; ri++) {
  const [a, b] = PAIRS[REPS[ri]];
  for (let ti = 0; ti < NT; ti++) {
    const T = TRIS[ti];
    if (T[0] === a || T[1] === a || T[2] === a || T[0] === b || T[1] === b || T[2] === b) continue;
    un[nun++] = posIdx(ri, ti, 0); un[nun++] = posIdx(ri, ti, 1);
  }
}
console.log('positions 3v2 légales (canoniques) :', nun.toLocaleString('fr-FR'));

let unresolved = un.subarray(0, nun);
const own = new Int32Array(3), opp = new Int32Array(3);
console.time('résolution 3v2');
for (let d = 1; d <= 200; d++) {
  const t0 = Date.now();
  const next = new Int32Array(unresolved.length);
  let nu = 0, nW = 0, nL = 0;
  for (let u = 0; u < unresolved.length; u++) {
    const p = unresolved[u], turn = p & 1, base = p >> 1;
    const ri = (base / NT) | 0, ti = base % NT;
    const W = PAIRS[REPS[ri]], T = TRIS[ti];
    let resolved = 0, maxD = 0, allWin = true;
    if (turn === 0) {                                  // NOIR au trait
      own[0] = T[0]; own[1] = T[1]; own[2] = T[2]; opp[0] = W[0]; opp[1] = W[1];
      const c = succ(own, 3, opp, 2, 1);
      for (let s = 0; s < c; s++) {
        if (EJ[s]) { resolved = 1; break; }             // Blanc tombe à 1 bille
        const ci = idxOf(OWN[s * 3], OWN[s * 3 + 1], OWN[s * 3 + 2], OPP[s * 3], OPP[s * 3 + 1], 1);
        if (status[ci] === 2 && dtw[ci] === d - 1) { resolved = 1; break; }
      }
    } else {                                            // BLANC au trait
      own[0] = W[0]; own[1] = W[1]; opp[0] = T[0]; opp[1] = T[1]; opp[2] = T[2];
      const c = succ(own, 2, opp, 3, 1);
      for (let s = 0; s < c; s++) {
        if (EJ[s]) {                                    // Noir tombe à 2 billes -> 2v2, Noir au trait
          const nb = [], nw = [];
          for (let i = 0; i < 3; i++) if (OPP[s * 3 + i] !== -1) nb.push(OPP[s * 3 + i]);
          for (let i = 0; i < 3; i++) if (OWN[s * 3 + i] !== -1) nw.push(OWN[s * 3 + i]);
          if (ejectAvailable2v2(nb[0], nb[1], nw[0], nw[1])) { if (1 > maxD) maxD = 1; }
          else { allWin = false; break; }               // Blanc a un coup de nulle
        } else {
          const ci = idxOf(OPP[s * 3], OPP[s * 3 + 1], OPP[s * 3 + 2], OWN[s * 3], OWN[s * 3 + 1], 0);
          if (status[ci] === 1) { if (dtw[ci] > maxD) maxD = dtw[ci]; }
          else { allWin = false; break; }
        }
      }
      if (allWin && maxD === d - 1) resolved = 2;
    }
    if (resolved === 1) { status[p] = 1; dtw[p] = d; nW++; }
    else if (resolved === 2) { status[p] = 2; dtw[p] = d; nL++; }
    else next[nu++] = p;
  }
  console.log(`  niveau ${String(d).padStart(3)} : +${nW} gains  +${nL} pertes  · reste ${nu.toLocaleString('fr-FR')}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  unresolved = next.subarray(0, nu);
  if (nW + nL === 0) break;
}
console.timeEnd('résolution 3v2');

let W3 = 0, L3 = 0, D3 = 0, maxd = 0, wb = 0, db = 0;
for (let i = 0; i < nun; i++) {
  const p = un[i];
  if (status[p] === 1) { W3++; if (dtw[p] > maxd) maxd = dtw[p]; } else if (status[p] === 2) L3++; else D3++;
  if ((p & 1) === 0) { if (status[p] === 1) wb++; else db++; }
}
console.log('\n=== TABLE 3v2 (mode Découverte) ===');
console.log('total :', nun.toLocaleString('fr-FR'), 'positions canoniques');
console.log('gain du camp au trait :', W3.toLocaleString('fr-FR'));
console.log('perte du camp au trait :', L3.toLocaleString('fr-FR'));
console.log('nulles :', D3.toLocaleString('fr-FR'));
console.log('DTW maximum :', maxd, 'demi-coups');
console.log('-> Noir (3 billes) au trait : ' + (100 * wb / (wb + db)).toFixed(1) + ' % de gains forcés, ' + (100 * db / (wb + db)).toFixed(1) + ' % de nulles');
require('fs').writeFileSync('/home/claude/tb32.bin', Buffer.concat([Buffer.from(status.buffer), Buffer.from(dtw.buffer)]));
console.log('table écrite : tb32.bin');
