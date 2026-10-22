/* ═══════════════════════════════════════════
   LABO : LES POSITIONS DU CORPUS (v2.70)
   Demande d'Olivier : « amelioration du Labo », puis « les 6 » (les six outils
   proposes). Un audit avait montre que les parties du Labo ne ressemblaient pas
   aux vraies : toujours la disposition Standard, 6 coups tires au hasard, alors
   que 2 688 des 4 580 parties du corpus sont en Marguerite belge (384 en
   Standard). Les outils du Labo partent maintenant de vraies positions.

   Ecrit hors ligne par tools/labo-positions.js (rejouer tout le corpus prend
   plusieurs minutes : trop long sur un telephone). Pour chaque partie complete
   du corpus (jouee depuis une position de depart) :
     - jusqu'a 6 positions « calmes » (le camp au trait ne peut ejecter aucune
       bille), a partir du 10e demi-coup, reparties sur la partie, avec le coup
       que le joueur y a joue et le resultat de la partie : la methode Texel
       (le resultat) et « comme les humains » (le coup) ;
     - une position de depart pour les duels, entre le 8e et le 16e demi-coup,
       au score de 0-0.

   Format (binaire, compresse) : [longueur de l'en-tete, 4 octets][en-tete JSON]
   puis des enregistrements de 21 octets :
     0-12  le plateau : 61 cases, 0 vide / 1 noire / 2 blanche, 5 cases par octet
     13    bit 0 camp au trait (1 = Blancs) ; bits 1-2 resultat (0 inconnu,
           1 Noirs gagnent, 2 Blancs gagnent, 3 nul) ; bit 3 position de depart
     14    billes ejectees par les Noirs (3 bits) et par les Blancs (3 bits)
     15    demi-coup (255 au plus)
     16    disposition (rang dans l'en-tete)
     17-18 numero de la partie dans le corpus
     19-20 le coup joue : premiere case (6 bits), derniere case (6 bits), direction (3 bits)
═══════════════════════════════════════════ */
const _LP_TAILLE = 21;
const _LP_TEXEL_MAX = 6, _LP_TEXEL_DEBUT = 10, _LP_DEPART_MIN = 8, _LP_DEPART_MAX = 16;
// les 6 directions axiales, dans un ordre fixe (le codage du coup en depend)
const _LP_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const _LP_CLES = (function(){ const t = []; for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) t.push(r + ',' + c); return t; })();

/* ─── Ecriture (tools/labo-positions.js) ─── */
function _lpEcrirePlateau(bd, out, o){
  let i = 0;
  for (let k = 0; k < 13; k++) {
    let v = 0, m = 1;
    for (let t = 0; t < 5; t++, i++) {
      const s = i < 61 ? bd[_LP_CLES[i]] : null;
      v += (s === 'black' ? 1 : (s === 'white' ? 2 : 0)) * m; m *= 3;
    }
    out[o + k] = v;
  }
}
function _lpCoderCoup(mv){
  const idx = mv.cells.map(function(x){ return _sbIndex(x.r, x.c); }).sort(function(a, b){ return a - b; });
  const d = _LP_DIRS.findIndex(function(v){ return v[0] === mv.dir.q && v[1] === mv.dir.r; });
  return idx[0] | (idx[idx.length - 1] << 6) | ((d < 0 ? 7 : d) << 12);
}
/* Rejoue une partie du corpus et renvoie ses enregistrements (ou null si elle ne
   compte pas : partie qui ne part pas d'une position de depart). Comme
   _sbRejouerPartie : le plateau global est permute le temps du rejeu, puis restaure. */
function _lpExtrairePartie(src, g, numero, dispoIdx){
  const dep = _sbDepart(src, g);
  if (!dep) return null;
  let nN = 0, nB = 0;
  for (const k in dep.board) { if (dep.board[k] === 'black') nN++; else if (dep.board[k] === 'white') nB++; }
  if (!(dep.cb === 0 && dep.cw === 0 && Math.min(nN, nB) >= 12)) return null;
  const jetons = _sbJetons(src, g), calmes = [], departs = [];
  let cb = 0, cw = 0;
  const sauve = board;
  try {
    board = Object.assign({}, dep.board);
    let col = 'black';
    for (let k = 0; k < jetons.length; k++) {
      const legal = getAllMovesForColor(col);
      const mv = resolveAbaProToken(jetons[k], col, legal);
      if (!mv) break;
      const peutEjecter = legal.some(function(m){ return m.info && m.info.type === 'push' && m.info.ejection; });
      const photo = (k >= _LP_TEXEL_DEBUT && !peutEjecter) || (k >= _LP_DEPART_MIN && k <= _LP_DEPART_MAX && cb === 0 && cw === 0);
      if (photo) {
        const e = { k: k, col: col, cb: cb, cw: cw, coup: _lpCoderCoup(mv), plateau: new Uint8Array(13) };
        _lpEcrirePlateau(board, e.plateau, 0);
        if (k >= _LP_TEXEL_DEBUT && !peutEjecter) calmes.push(e);
        if (k >= _LP_DEPART_MIN && k <= _LP_DEPART_MAX && cb === 0 && cw === 0) departs.push(e);
      }
      if (abApplyMove(mv.cells, mv.dir, col, mv.info).ejected) { if (col === 'black') cb++; else cw++; }
      col = col === 'black' ? 'white' : 'black';
      if (cb >= 6 || cw >= 6) break;
    }
  } finally { board = sauve; }
  const res = _sbGagnant(src, g, cb, cw);
  const choisis = [];
  const n = Math.min(_LP_TEXEL_MAX, calmes.length);
  for (let j = 0; j < n; j++) choisis.push([calmes[Math.floor((j + 0.5) * calmes.length / n)], 0]);
  if (departs.length) choisis.push([departs[(numero * 7) % departs.length], 1]);
  return choisis.map(function(c){
    const e = c[0], r = new Uint8Array(_LP_TAILLE);
    r.set(e.plateau, 0);
    r[13] = (e.col === 'white' ? 1 : 0) | (res << 1) | (c[1] << 3);
    r[14] = e.cb | (e.cw << 3);
    r[15] = Math.min(255, e.k);
    r[16] = dispoIdx;
    r[17] = numero & 255; r[18] = numero >> 8;
    r[19] = e.coup & 255; r[20] = e.coup >> 8;
    return r;
  });
}

/* ─── Lecture ─── */
let LABO_POS = null, _lpPret = null;
function ensureLaboPositions(){
  if (_lpPret) return _lpPret;
  if (typeof DecompressionStream === 'undefined' || typeof LABO_POSITIONS_B64 === 'undefined' || !LABO_POSITIONS_B64) { _lpPret = Promise.resolve(false); return _lpPret; }
  _lpPret = _inflB64(LABO_POSITIONS_B64, true).then(function(buf){
    const u = new Uint8Array(buf);
    const lg = u[0] | (u[1] << 8) | (u[2] << 16) | (u[3] << 24);
    const h = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + lg)));
    if (!h || h.v !== 1 || h.taille !== _LP_TAILLE) return false;
    const recs = u.subarray(4 + lg);
    LABO_POS = { h: h, u: recs, n: Math.floor(recs.length / _LP_TAILLE), departs: {} };
    return true;
  }).catch(function(){ return false; });
  return _lpPret;
}
function _lpN(){ return LABO_POS ? LABO_POS.n : 0; }
function _lpOct(i, k){ return LABO_POS.u[i * _LP_TAILLE + k]; }
// plateau sous forme de 61 caracteres ('.', 'b', 'w'), rang par rang : ce qu'on envoie aux fils de calcul
function _lpChaine(i){
  let s = '';
  for (let k = 0; k < 13; k++) { let v = _lpOct(i, k); for (let t = 0; t < 5 && s.length < 61; t++) { const x = v % 3; v = (v - x) / 3; s += x === 1 ? 'b' : (x === 2 ? 'w' : '.'); } }
  return s;
}
function _lpPlateauDeChaine(s){ const bd = {}; for (let i = 0; i < 61; i++) { const x = s.charAt(i); if (x === 'b') bd[_LP_CLES[i]] = 'black'; else if (x === 'w') bd[_LP_CLES[i]] = 'white'; } return bd; }
function _lpPlateau(i){ return _lpPlateauDeChaine(_lpChaine(i)); }
function _lpTrait(i){ return (_lpOct(i, 13) & 1) ? 'white' : 'black'; }
function _lpResultat(i){ return (_lpOct(i, 13) >> 1) & 3; }       // 0 inconnu, 1 Noirs, 2 Blancs, 3 nul
function _lpEstDepart(i){ return !!(_lpOct(i, 13) & 8); }
function _lpCb(i){ return _lpOct(i, 14) & 7; }
function _lpCw(i){ return (_lpOct(i, 14) >> 3) & 7; }
function _lpPly(i){ return _lpOct(i, 15); }
function _lpDispo(i){ return LABO_POS.h.dispos[_lpOct(i, 16)] || '?'; }
function _lpPartie(i){ return _lpOct(i, 17) | (_lpOct(i, 18) << 8); }
function _lpCoup(i){ const v = _lpOct(i, 19) | (_lpOct(i, 20) << 8); return { a: v & 63, b: (v >> 6) & 63, d: (v >> 12) & 7 }; }
// la position telle que l'attendent les fils de calcul
function _lpPourFil(i){ return { s: _lpChaine(i), t: _lpTrait(i), cb: _lpCb(i), cw: _lpCw(i) }; }

/* Positions de depart des duels. 'belgian' (par defaut : la disposition des
   tournois, celle des parties d'Olivier) ou 'corpus' (toutes les dispositions,
   dans leurs proportions du corpus). */
const LP_MODES_DEPART = ['belgian', 'corpus'];
function _lpDeparts(mode){
  if (!LABO_POS) return [];
  const m = LP_MODES_DEPART.indexOf(mode) >= 0 ? mode : 'belgian';
  if (LABO_POS.departs[m]) return LABO_POS.departs[m];
  const L = [];
  for (let i = 0; i < LABO_POS.n; i++) if (_lpEstDepart(i) && (m === 'corpus' || _lpDispo(i) === 'belgian')) L.push(i);
  LABO_POS.departs[m] = L;
  return L;
}
// la meme graine donne toujours la meme position (les deux parties d'une paire partent de la meme)
function _lpHache(x){ let h = (x | 0) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; }
function _lpDepartPour(graine, mode){
  const L = _lpDeparts(mode);
  if (!L.length) return null;
  const i = L[_lpHache(graine) % L.length];
  const d = _lpPourFil(i);
  d.ref = _lpPartie(i) + '@' + _lpPly(i);
  return d;
}
// positions calmes au resultat connu (methode Texel) ; les parties dont le numero se termine par 0 ou 5 sont gardees pour le controle
function _lpTexelIndices(){
  const app = [], ctl = [];
  if (!LABO_POS) return { app: app, ctl: ctl };
  for (let i = 0; i < LABO_POS.n; i++) {
    if (_lpEstDepart(i) || !_lpResultat(i)) continue;
    (_lpPartie(i) % 5 === 0 ? ctl : app).push(i);
  }
  return { app: app, ctl: ctl };
}
