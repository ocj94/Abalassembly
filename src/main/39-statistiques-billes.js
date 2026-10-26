/* ═══════════════════════════════════════════
   LES BILLES QUI TOMBENT, CE QUI FAIT GAGNER, COMMENT JOUENT LES VRAIS JOUEURS (v2.63)
   Demande d'Olivier, apres un coup d'oeil a ClickHouse : reprendre l'idee de
   ses fonctions d'analyse de sequences (sequenceMatch, windowFunnel) -- suivre
   les enchainements d'evenements d'une partie -- et l'appliquer aux vraies
   parties, sans rien installer. Dix statistiques :
   - page Statistiques du jeu : qui fait tomber la premiere bille gagne-t-il,
     le tableau des remontees, a quel coup tombe la premiere bille, le score
     final, la carte des ejections, ce qui fait gagner (les 12 dimensions,
     camp contre camp), comment jouent les vrais joueurs ;
   - page Mes statistiques (carte Ejections) : tes remontees, ou tombent tes
     billes, toi face aux vrais joueurs ;
   - et une ligne sur l'ecran de fin de partie, tiree du tableau des remontees.

   D'ou viennent les chiffres. Chaque partie embarquee (MIGS, AbalOnline,
   tournoi PlayStrategy, parties de reference) est REJOUEE coup par coup avec
   le vrai moteur par _sbRejouerPartie ci-dessous : ejections (demi-coup, case,
   camp), types de coups, occasions d'ejection, et aux 20e, 40e et 60e
   demi-coups la comparaison des 12 dimensions des deux camps (calculerEmpreinte).
   Ce rejeu prend plusieurs minutes : il est fait hors ligne par
   tools/stats-parties.js (cette meme fonction, chargee depuis index.html), et
   son resultat est embarque compresse (STATS_PARTIES_B64). Un test rejoue un
   echantillon de parties et compare au fichier, et verifie la signature des
   parties : une partie ajoutee ou modifiee sans relancer l'outil le fait echouer.
   La page n'a plus qu'a additionner (quelques millisecondes).

   v2.65, demande d'Olivier : « fais-le pour toutes les billes ». La carte
   « a quel coup tombe la premiere bille » devient « a quel coup tombent les
   billes » : de la 1re a la 11e bille de la partie, plus la derniere (la 6e
   du vainqueur, celle qui finit la partie). Rien a recalculer hors ligne : le
   demi-coup de chaque ejection est deja dans les donnees embarquees. Et
   l'echelle de couleurs de la carte des ejections recoit ses graduations
   chiffrees, de 0 au maximum.
═══════════════════════════════════════════ */

const _SB_ETAPES = [20, 40, 60];      // demi-coups ou l'on compare les 12 dimensions des deux camps
const _SB_SOURCES = ['MIGS', 'AO', 'PS', 'REF'];
const _SB_DERNIERE = 11;              // dans les listes « billes » : 0..10 = la 1re..11e bille de la partie, 11 = la derniere (6e du vainqueur)

function _sbBanques(){
  return [
    (typeof MIGS_GAMES !== 'undefined') ? MIGS_GAMES : [],
    (typeof AO_GAMES !== 'undefined') ? AO_GAMES : [],
    (typeof PS_TOURNOI_YEARLY_2026 !== 'undefined') ? PS_TOURNOI_YEARLY_2026 : [],
    (typeof PARTIES_REFERENCE !== 'undefined') ? PARTIES_REFERENCE : []
  ];
}
// case (r, c) <-> rang 0..60, rangee par rangee. Le demi-tour du plateau envoie le rang i sur 60 - i.
function _sbIndex(r, c){ let i = 0; for (let k = 0; k < r; k++) i += ROWS[k]; return i + c; }
function _sbCase(i){ let r = 0; while (r < 9 && i >= ROWS[r]) { i -= ROWS[r]; r++; } return { r: r, c: i }; }

// Disposition de depart d'une partie : MIGS et PlayStrategy jouent la Marguerite belge
/* v2.77 (audit des statistiques, point 2) : les doublons exacts du corpus -- une partie enregistree
   deux fois a l'identique dans la meme banque (3 dans AbalOnline, en 2020 : meme date, memes joueurs,
   memes coups). Ils restent dans la bibliotheque (rien n'est retire des donnees embarquees) mais ne
   comptent qu'une fois dans les statistiques. global : rangs dans l'ordre des banques (celui de
   STATS_PARTIES) ; parBanque[s] : rangs dans la banque s. */
let _sbDoublonsCache = null;
function _sbDoublons(){
  const B = _sbBanques(), cle = B.map(function(b){ return b.length; }).join('-');
  if (_sbDoublonsCache && _sbDoublonsCache.cle === cle) return _sbDoublonsCache;
  const r = { cle: cle, global: new Set(), parBanque: B.map(function(){ return new Set(); }), n: 0, exemples: [] };
  let base = 0;
  B.forEach(function(banque, s){
    const vus = new Map();
    banque.forEach(function(g, i){
      const k = JSON.stringify(g);
      if (vus.has(k)) { r.global.add(base + i); r.parBanque[s].add(i); r.n++; if (r.exemples.length < 10) r.exemples.push({ source: s, premier: vus.get(k), doublon: i }); }
      else vus.set(k, i);
    });
    base += banque.length;
  });
  _sbDoublonsCache = r;
  return r;
}
function _sbEstDoublon(k){ return _sbDoublons().global.has(k); }
function _sbDispo(src, g){ return (src === 0 || src === 2) ? 'belgian' : String(g[4] || '?'); }
function _sbDepart(src, g){
  if (src === 1) return _empDepartPartie('AO', g);   // AbalOnline : position (et score) de depart enregistres avec la partie
  const L = LAYOUTS[_sbDispo(src, g)];
  if (!L) return null;
  const bd = {};
  L.black.forEach(function(p){ bd[p[0] + ',' + p[1]] = 'black'; });
  L.white.forEach(function(p){ bd[p[0] + ',' + p[1]] = 'white'; });
  return { board: bd, cb: 0, cw: 0 };
}
function _sbJetons(src, g){
  return String(((src === 0 || src === 2) ? g[5] : g[6]) || '').replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
}
/* Vainqueur : 0 inconnu, 1 Noirs, 2 Blancs, 3 nul. MIGS : seulement les parties
   « Au score » (6 billes ejectees au rejeu) -- les archives ne disent pas qui a
   abandonne ou perdu au temps. AbalOnline et reference : le nom enregistre.
   PlayStrategy : le resultat du serveur, abandons compris. */
function _sbGagnant(src, g, cb, cw){
  if (src === 0) {
    if (g[4] === 'Match nul') return 3;
    if (g[4] !== 'Au score') return 0;
    return cb >= 6 ? 1 : (cw >= 6 ? 2 : 0);
  }
  if (src === 2) return g[4] === g[2] + ' gagne' ? 1 : (g[4] === g[3] + ' gagne' ? 2 : 0);
  const w = g[3];
  return (w && w === g[1]) ? 1 : ((w && w === g[2]) ? 2 : 0);
}
// Les 12 dimensions des deux camps, sur le plateau courant : '+' les Noirs ont la plus grande valeur, '-' les Blancs, '=' egalite
function _sbComparerDims(){
  const eN = calculerEmpreinte('black'), eB = calculerEmpreinte('white');
  return EMPREINTES_CHAMPS.map(function(ch){ const d = eN[ch] - eB[ch]; return Math.abs(d) < 1e-9 ? '=' : (d > 0 ? '+' : '-'); }).join('');
}
/* Types de coups, par camp (8 compteurs) :
   0 une bille · 1 deux en ligne · 2 trois en ligne · 3 deux de cote · 4 trois de cote
   5 poussees (sumito) · 6 ejections · 7 occasions (au moins un coup qui ejecte etait possible) */
function _sbClasser(t, mv, info){
  const n = mv.cells.length;
  if (info.type === 'broadside') t[n === 3 ? 4 : 3]++;
  else t[n === 1 ? 0 : (n === 2 ? 1 : 2)]++;
  if (info.type === 'push') t[5]++;
}
/* v2.80 (demande d'Olivier, « les types de sumito ») : le type d'une poussee -- 0 : 2 contre 1, 1 : 3 contre 1,
   2 : 3 contre 2 ; -1 pour un coup qui ne pousse pas. info.push : le nombre de billes adverses poussees. */
function _sbTypePoussee(mv, info){
  if (!info || info.type !== 'push') return -1;
  const n = mv.cells.length, m = info.push;
  return n === 2 && m === 1 ? 0 : (n === 3 && m === 1 ? 1 : (n === 3 && m === 2 ? 2 : -1));
}
// Case d'ou tombe la bille ejectee par ce coup (la derniere bille adverse de la ligne poussee)
function _sbCaseEjectee(mv, info){
  if (!info || info.type !== 'push' || !info.ejection) return null;
  return axialToRc(info.oppStart.q + (info.push - 1) * mv.dir.q, info.oppStart.r + (info.push - 1) * mv.dir.r);
}

/* Rejoue une partie du corpus. Ne touche jamais au jeu en cours : le plateau global
   est permute le temps du rejeu (resolveAbaProToken et calculerEmpreinte le lisent),
   puis restaure, meme en cas d'erreur. */
function _sbRejouerPartie(src, g, avecDims){
  const dep = _sbDepart(src, g);
  if (!dep) return null;
  const jetons = _sbJetons(src, g);
  let nN = 0, nB = 0;
  for (const k in dep.board) { if (dep.board[k] === 'black') nN++; else if (dep.board[k] === 'white') nB++; }
  // « partie complete » : jouee depuis une position de depart (score 0-0, au moins 12 billes chacun),
  // pas depuis une position de probleme -- seules celles-ci entrent dans les statistiques
  const rec = { n: 0, nj: jetons.length, complet: (dep.cb === 0 && dep.cw === 0 && Math.min(nN, nB) >= 12) ? 1 : 0,
    ej: [], tN: [0, 0, 0, 0, 0, 0, 0, 0], tB: [0, 0, 0, 0, 0, 0, 0, 0], dims: null, cb: dep.cb, cw: dep.cw, g: 0,
    pN: [0, 0, 0, 0, 0, 0], pB: [0, 0, 0, 0, 0, 0] };   // v2.80 : poussees 2 c. 1, 3 c. 1, 3 c. 2 ; puis les memes qui ejectent
  const dimsUtiles = avecDims && rec.complet && (src === 0 ? g[4] === 'Au score' : [1, 2].indexOf(_sbGagnant(src, g, 0, 0)) >= 0);
  if (dimsUtiles) rec.dims = _SB_ETAPES.map(function(){ return ''; });
  const sauve = board;
  try {
    board = Object.assign({}, dep.board);
    let col = 'black';
    for (let k = 0; k < jetons.length; k++) {
      const legal = getAllMovesForColor(col);
      const mv = resolveAbaProToken(jetons[k], col, legal);
      if (!mv) break;                            // comme le rejeu du site : arret au premier coup illisible
      const info = mv.info;
      const t = col === 'black' ? rec.tN : rec.tB;
      if (legal.some(function(m){ return m.info && m.info.type === 'push' && m.info.ejection; })) t[7]++;
      _sbClasser(t, mv, info);
      const caseEj = _sbCaseEjectee(mv, info);
      const tp = _sbTypePoussee(mv, info);
      if (tp >= 0) (col === 'black' ? rec.pN : rec.pB)[tp]++;
      if (abApplyMove(mv.cells, mv.dir, col, info).ejected) {
        if (tp >= 0) (col === 'black' ? rec.pN : rec.pB)[tp + 3]++;
        t[6]++;
        if (col === 'black') rec.cb++; else rec.cw++;
        // [demi-coup, rang de la case x 2 + 1 si la bille tombee est blanche]
        rec.ej.push(k + 1, (caseEj ? _sbIndex(caseEj.r, caseEj.c) : 127) * 2 + (col === 'black' ? 1 : 0));
      }
      rec.n = k + 1;
      if (dimsUtiles) { const e = _SB_ETAPES.indexOf(k + 1); if (e >= 0) rec.dims[e] = _sbComparerDims(); }
      col = col === 'black' ? 'white' : 'black';
      if (rec.cb >= 6 || rec.cw >= 6) break;      // partie gagnee
    }
  } finally { board = sauve; }
  rec.g = _sbGagnant(src, g, rec.cb, rec.cw);
  return rec;
}
// Forme embarquee d'une partie (tools/stats-parties.js) : [vainqueur, demi-coups rejoues, complete, disposition, ejections, coups Noirs, coups Blancs, dimensions]
function _sbEncoder(rec, dispo){ return [rec.g, rec.n, rec.complet, dispo, rec.ej, rec.tN, rec.tB, rec.dims || 0, rec.pN.concat(rec.pB)]; }   // v2.80 : [8] les poussees par type

/* Signature des parties couvertes : une partie ajoutee, retiree ou modifiee
   (coups, resultat, disposition) sans relancer tools/stats-parties.js ne
   correspond plus, et un test le signale. */
function _sbSignature(){
  let h = 2166136261;
  const fnv = function(s){ for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  const B = _sbBanques();
  B[0].forEach(function(g){ fnv('M|' + g[0] + '|' + g[4] + '|' + (g[5] || '') + '\n'); });
  B[1].forEach(function(g){ fnv('A|' + g[1] + '|' + g[2] + '|' + g[3] + '|' + g[4] + '|' + g[5] + '|' + (g[6] || '') + '\n'); });
  B[2].forEach(function(g){ fnv('P|' + g[0] + '|' + g[2] + '|' + g[3] + '|' + g[4] + '|' + (g[5] || '') + '\n'); });
  B[3].forEach(function(g){ fnv('R|' + g[1] + '|' + g[2] + '|' + g[3] + '|' + g[4] + '|' + (g[6] || '') + '\n'); });
  return B.map(function(b){ return b.length; }).join('-') + '-' + h.toString(16);
}

/* ─── Chargement des donnees embarquees ─── */
let STATS_PARTIES = null, _sbPret = null, _sbCache = null;
function ensureStatsParties(){
  if (_sbPret) return _sbPret;
  if (typeof DecompressionStream === 'undefined' || typeof STATS_PARTIES_B64 === 'undefined' || !STATS_PARTIES_B64) { _sbPret = Promise.resolve(false); return _sbPret; }
  _sbPret = _inflB64(STATS_PARTIES_B64).then(function(txt){
    const d = JSON.parse(txt);
    if (!d || d.v !== 1 || !Array.isArray(d.p) || !Array.isArray(d.champs) || d.champs.join() !== EMPREINTES_CHAMPS.join()) return false;
    STATS_PARTIES = d; _sbCache = null;
    return true;
  }).catch(function(){ return false; });
  return _sbPret;
}

/* ─── Les additions ───
   Seules les parties « completes » comptent (jouees depuis une position de
   depart). Celles qui demandent le vainqueur ne gardent que les parties ou on
   le connait. Les etats « 6-x » (partie finie) ne sont pas des remontees. */
/* v2.71 : f = filtres de la page Statistiques du jeu (source, disposition, longueur ; voir
   48-corpus-plus.js). Sans f : tout le corpus -- c'est ce que lisent Mes statistiques et l'ecran
   de fin de partie, jamais filtres. Un resultat par jeu de filtres, garde en memoire. */
function _sbAgreger(f){
  const D = STATS_PARTIES;
  if (!D) return null;
  const cleF = (f && typeof _cfCle === 'function') ? _cfCle(f) : '';
  if (_sbCache && _sbCache.d === D && _sbCache.m[cleF]) return _sbCache.m[cleF];
  const nDims = D.champs.length, cartes = {}, quandParDispo = {}, billesParDispo = {};
  const billes = []; for (let k = 0; k <= _SB_DERNIERE; k++) billes.push([]);
  const v = {
    nParties: D.p.length, nComplets: 0, nDecides: 0, nAvecEj: 0, nIncomplets: 0,
    premiere: { n: 0, gagne: 0 },              // le camp qui fait tomber la premiere bille gagne
    quand: billes[0],                          // demi-coup de la premiere ejection de chaque partie
    billes: billes,                            // billes[k] : demi-coups ou tombe la (k+1)e bille de la partie (k = 0..10) ; billes[11] : la derniere, la 6e du vainqueur
    billesParDispo: billesParDispo,            // dispo -> les memes 12 listes, pour les parties de cette disposition
    remontees: {},                             // 'a-b' (a > b, a < 6) -> { n, g } : le camp qui mene a-b gagne g fois sur n
    finals: [0, 0, 0, 0, 0, 0],                // parties gagnees 6-x : x = 0..5
    types: [0, 0, 0, 0, 0, 0, 0, 0],
    dims: _SB_ETAPES.map(function(){ const t = []; for (let j = 0; j < nDims; j++) t.push({ n: 0, g: 0 }); return t; }),
    nDimsParties: _SB_ETAPES.map(function(){ return 0; }),
    camp: { ej: 0, camps: 0, premiereSomme: 0, premiereN: 0, phases: { ouverture: 0, milieu: 0, finale: 0 } },
    cartes: cartes, quandParDispo: quandParDispo, dispos: D.dispos,
    poussees: { types: [0, 0, 0, 0, 0, 0], plus: [{ n: 0, g: 0 }, { n: 0, g: 0 }, { n: 0, g: 0 }] }   // v2.80
  };
  D.p.forEach(function(p, k){
    const gagnant = p[0], complet = p[2], dispo = D.dispos[p[3]], ej = p[4], dims = p[7];
    if (_sbEstDoublon(k)) return;   // v2.77 : un doublon ne compte qu'une fois
    if (cleF && !_cfGarder(k, p, D, f)) return;
    if (!complet) { v.nIncomplets++; return; }   // v2.77 : comptees (avant : deduites du total, faux avec un filtre)
    v.nComplets++;
    const decide = (gagnant === 1 || gagnant === 2);
    if (decide) v.nDecides++;
    for (let k = 0; k < 8; k++) v.types[k] += p[5][k] + p[6][k];
    /* v2.80 : les poussees par type ; et, partie par partie, le camp qui en a fait le plus de ce type
       (sans compter celles qui ejectent : la bille tombee dirait deja qui gagne) a-t-il gagne ? */
    if (p[8]) for (let t = 0; t < 6; t++) {
      v.poussees.types[t] += p[8][t] + p[8][t + 6];
      if (decide && t < 3) { const a = p[8][t] - p[8][t + 3], b = p[8][6 + t] - p[8][6 + t + 3]; if (a !== b) { const c = v.poussees.plus[t]; c.n++; if ((a > b ? 1 : 2) === gagnant) c.g++; } }
    }
    v.camp.camps += 2; v.camp.ej += ej.length / 2;
    const carte = cartes[dispo] || (cartes[dispo] = new Array(61).fill(0));
    const parDispo = billesParDispo[dispo] || (billesParDispo[dispo] = billes.map(function(){ return []; }));
    let nb = 0, nw = 0, premN = 0, premB = 0, fin = 0;
    for (let i = 0; i < ej.length; i += 2) {
      const ply = ej[i], code = ej[i + 1], blancheTombe = code & 1, idx = code >> 1;
      // phase AVANT ce coup, meme regle que la carte Ejections de Mes statistiques
      const phase = (nb === 0 && nw === 0) ? 'ouverture' : (Math.max(nb, nw) >= 3 ? 'finale' : 'milieu');
      v.camp.phases[phase]++;
      if (blancheTombe) { nb++; if (!premN) premN = ply; } else { nw++; if (!premB) premB = ply; }
      // la (i/2 + 1)e bille de la partie, et la 6e d'un camp : celle qui finit la partie
      if (i / 2 < _SB_DERNIERE) { billes[i / 2].push(ply); parDispo[i / 2].push(ply); }
      if (!fin && (nb === 6 || nw === 6)) fin = ply;
      // la carte : vue du joueur qui perd la bille, comme sur son ecran (plateau retourne pour les Blancs, boardRotation = 180)
      if (idx < 61) carte[blancheTombe ? 60 - idx : idx]++;
      if (decide && nb !== nw && Math.max(nb, nw) < 6) {
        const cle = Math.max(nb, nw) + '-' + Math.min(nb, nw), e = v.remontees[cle] || (v.remontees[cle] = { n: 0, g: 0 });
        e.n++; if ((nb > nw ? 1 : 2) === gagnant) e.g++;
      }
    }
    if (premN) { v.camp.premiereSomme += premN; v.camp.premiereN++; }
    if (premB) { v.camp.premiereSomme += premB; v.camp.premiereN++; }
    if (fin) { billes[_SB_DERNIERE].push(fin); parDispo[_SB_DERNIERE].push(fin); }
    if (ej.length) {
      v.nAvecEj++;
      quandParDispo[dispo] = parDispo[0];
      if (decide) { v.premiere.n++; if (((ej[1] & 1) ? 1 : 2) === gagnant) v.premiere.gagne++; }
    }
    if (decide && Math.max(nb, nw) === 6) v.finals[Math.min(nb, nw)]++;
    if (decide && dims) {
      for (let s = 0; s < _SB_ETAPES.length; s++) {
        const str = dims[s];
        if (!str) continue;
        v.nDimsParties[s]++;
        for (let j = 0; j < nDims; j++) {
          const c = str.charAt(j);
          if (c === '=') continue;
          const t = v.dims[s][j]; t.n++;
          if ((c === '+' ? 1 : 2) === gagnant) t.g++;
        }
      }
    }
  });
  const trier = function(t){ t.sort(function(a, b){ return a - b; }); };
  billes.forEach(trier);                      // v.quand et quandParDispo sont les premieres de ces listes : triees du meme coup
  Object.keys(billesParDispo).forEach(function(d){ billesParDispo[d].forEach(trier); });
  const tous = new Array(61).fill(0);
  Object.keys(cartes).forEach(function(k){ cartes[k].forEach(function(x, i){ tous[i] += x; }); });
  cartes['*'] = tous;
  if (!_sbCache || _sbCache.d !== D) _sbCache = { d: D, m: {} };
  _sbCache.m[cleF] = v;
  return v;
}
// Le camp qui mene a-b : part des vraies parties qu'il gagne (null si moins de 30 parties)
function _sbTauxRemontee(a, b){
  const v = _sbAgreger(); if (!v) return null;
  const e = v.remontees[Math.max(a, b) + '-' + Math.min(a, b)];
  return (e && e.n >= 30) ? { pct: e.g / e.n * 100, n: e.n } : null;
}
function _sbMediane(t){ return t.length ? t[Math.floor(t.length / 2)] : null; }
function _sbQuantile(t, q){ return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * q))] : null; }

/* ═══════════════════════════════════════════
   AFFICHAGE — page Statistiques du jeu
   Couleurs : celles des graphiques des 12 dimensions (vert-bleu = « plus
   souvent », orange = « moins souvent ») et l'or du site pour les barres
   d'une seule serie ; la carte des ejections reprend l'echelle de la carte
   de chaleur du profil (heatColor). Paire vert-bleu / orange verifiee pour
   les daltonismes (ecart 8,4 sur fond sombre) ; chaque valeur est aussi
   ecrite en clair, jamais portee par la couleur seule.
═══════════════════════════════════════════ */
const _SB_VERT = '#2f9e7f', _SB_ORANGE = '#d9773f';
const _SB_COINS = [0, 4, 26, 34, 56, 60];          // rangs des 6 cases de coin
const _SB_NOMS_AO = { german_daisy: 'german', swiss_daisy: 'swiss', dutch_daisy: 'dutch', centrifugeuse: 'centrifuge' };
const _SB_NOMS_EN = { french: 'French Daisy', decouverte: 'Discovery', face_a_face: 'Face to face', centrifuge: 'Centrifuge', pyramide: 'Pyramid' };
const _SB_HISTO_L = 10, _SB_HISTO_NB = 24;         // histogramme des billes : tranches de 10 coups, la derniere ouverte (231 et plus)
let _sbOngletCarte = 'belgian', _sbEtape = 1, _sbEtroitRendu = null, _sbBille = 0;

function _sbNomDispo(d){
  if (d === '*') return _tr('Toutes', 'All');
  if (d === 'custom') return _tr('Disposition libre', 'Custom layout');
  const k = _SB_NOMS_AO[d] || d;
  if (currentLang() === 'EN' && _SB_NOMS_EN[k]) return _SB_NOMS_EN[k];   // v2.74 : les noms francais, en anglais
  if (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[k]) return HEAT_VARIANT_LABEL[k];
  return String(d).replace(/_/g, ' ').replace(/^./, function(c){ return c.toUpperCase(); });
}
function _sbTitre(t, sous){ return '<h3 class="sb-titre">' + t + '</h3>' + (sous ? '<p class="sb-sous">' + sous + '</p>' : ''); }
function _sbEtroit(){ const h = document.getElementById('billes-section') || document.getElementById('corpus-stats-body'); return !!(h && h.clientWidth && h.clientWidth < 520); }
function _sbS(n){ return n > 1 ? 's' : ''; }
function _sbPct(p){ return _dimPct(p).replace(' %', '\u00a0%'); }
function _sbGrosPct(p){ const t = _dimPct(p).replace(' %', ''); return t + '<span class="sb-gros-pct">%</span>'; }
// barre verticale arrondie en haut, carree a la base (bord arrondi de 3 px)
function _sbBarre(x, y, w, h, style, titre){
  if (h <= 0) return '';
  const r = Math.min(3, h, w / 2);
  const d = 'M' + x.toFixed(1) + ',' + (y + h).toFixed(1) + ' V' + (y + r).toFixed(1) + ' Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + r).toFixed(1) + ',' + y.toFixed(1)
    + ' H' + (x + w - r).toFixed(1) + ' Q' + (x + w).toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + w).toFixed(1) + ',' + (y + r).toFixed(1) + ' V' + (y + h).toFixed(1) + ' Z';
  return '<path d="' + d + '" style="' + style + '" tabindex="0">' + (titre ? '<title>' + titre + '</title>' : '') + '</path>';
}

/* Histogramme du coup ou tombe une bille : tranches de 10 coups, la derniere ouverte (231 et plus).
   Memes axes pour toutes les billes (o.pctMax, commun) : d'une bille a la suivante, on voit la
   bosse glisser vers la droite et s'etaler. o.axe : titre de l'axe ; o.aria : description. */
function _sbHistoBins(t){
  const L = _SB_HISTO_L, NB = _SB_HISTO_NB, bins = new Array(NB).fill(0);
  t.forEach(function(x){ bins[Math.max(0, Math.min(NB - 1, Math.floor((x - 1) / L)))]++; });
  return bins;
}
function _sbHistoSVG(t, etroit, o){
  o = o || {};
  const L = _SB_HISTO_L, NB = _SB_HISTO_NB, bins = _sbHistoBins(t);
  const W = etroit ? 360 : 560, H = 196, g = etroit ? 30 : 38, d = 8, haut = 30, bas = 30;
  const lw = W - g - d, lh = H - haut - bas, pas = lw / NB, bw = Math.max(2, Math.min(18, pas - 3)), n = t.length || 1;
  const pctMax = Math.max(o.pctMax || 0, (Math.max.apply(null, bins) || 1) / n * 100);
  const pasGrad = pctMax > 12 ? 5 : (pctMax > 6 ? 2 : 1);
  let s = '<svg id="sb-histo" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.aria || _tr('Histogramme du coup où tombe la bille', 'Histogram of the move on which the marble falls')) + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;font-family:\'DM Sans\',sans-serif">';
  for (let v = 0; v <= pctMax + 1e-9; v += pasGrad) {     // graduations en % des parties
    const y = haut + lh - v / pctMax * lh;
    s += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:var(--border)" stroke-width="1"/>'
      + '<text x="' + (g - 5) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" style="fill:var(--muted)">' + v + ' %</text>';
  }
  bins.forEach(function(b, i){
    const h = (b / n * 100) / pctMax * lh, x = g + i * pas + (pas - bw) / 2, de = i * L + 1, a = (i === NB - 1) ? null : (i + 1) * L;
    const titre = (a ? _tr('Coups ' + de + ' à ' + a, 'Moves ' + de + ' to ' + a) : _tr('Coup ' + de + ' et plus', 'Move ' + de + ' and later')) + _dimDp()
      + _dimNb(b) + ' ' + _tr('partie' + _sbS(b), 'game' + _sbS(b)) + ' (' + _sbPct(b / n * 100) + ')';
    s += _sbBarre(x, haut + lh - h, bw, h, 'fill:var(--gold)', titre);
  });
  // l'axe : les bords de tranche 0, 50, 100, 150, 200 ; la derniere tranche, ouverte, sous son milieu
  [0, 50, 100, 150, 200].forEach(function(c){
    s += '<text x="' + (g + c / L * pas).toFixed(1) + '" y="' + (haut + lh + 15) + '" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">' + c + '</text>';
  });
  s += '<text x="' + (g + (NB - 0.5) * pas).toFixed(1) + '" y="' + (haut + lh + 15) + '" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">' + ((NB - 1) * L + 1) + '+</text>';
  s += '<text x="' + (W - d) + '" y="' + (H - 2) + '" text-anchor="end" font-size="10.5" style="fill:var(--muted)">' + (o.axe || _tr('coup où tombe la bille', 'move on which the marble falls')) + '</text>';
  const med = _sbMediane(t);
  if (med) {
    const xm = g + Math.min(NB, (med - 0.5) / L) * pas, aGauche = xm > g + lw * 0.62;   // trop a droite : l'etiquette passe a gauche du trait
    s += '<line x1="' + xm.toFixed(1) + '" x2="' + xm.toFixed(1) + '" y1="' + (haut - 8) + '" y2="' + (haut + lh) + '" style="stroke:var(--text)" stroke-width="1.5"/>'
      + '<text x="' + (aGauche ? xm - 5 : xm + 5).toFixed(1) + '" y="' + (haut - 12) + '"' + (aGauche ? ' text-anchor="end"' : '') + ' font-size="11" font-weight="700" style="fill:var(--text)">' + _tr('médiane : coup ', 'median: move ') + med + '</text>';
  }
  return s + '</svg>';
}

/* Colonnes du score final (6-0 ... 6-5), pourcentage ecrit sur chaque colonne */
function _sbScoreSVG(f, etroit){
  const tot = f.reduce(function(a, b){ return a + b; }, 0) || 1;
  const W = etroit ? 360 : 480, H = 170, g = 10, d = 10, haut = 24, bas = 26;
  const lw = W - g - d, lh = H - haut - bas, pas = lw / 6, bw = Math.min(24, pas - 8), max = Math.max.apply(null, f) || 1;
  let s = '<svg id="sb-score" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + _tr('Répartition des scores finaux', 'Distribution of final scores') + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:' + W + 'px;height:auto;display:block;margin:0 auto;font-family:\'DM Sans\',sans-serif">'
    + '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + (haut + lh) + '" y2="' + (haut + lh) + '" style="stroke:var(--border)" stroke-width="1"/>';
  f.forEach(function(v, i){
    const h = v / max * lh, x = g + i * pas + (pas - bw) / 2, y = haut + lh - h;
    s += _sbBarre(x, y, bw, h, 'fill:var(--gold)', '6-' + i + _dimDp() + _dimNb(v) + ' ' + _tr('partie' + _sbS(v), 'game' + _sbS(v)))
      + '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--text)">' + _sbPct(v / tot * 100) + '</text>'
      + '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (haut + lh + 16) + '" text-anchor="middle" font-size="11" style="fill:var(--muted)">6-' + i + '</text>';
  });
  return s + '</svg>';
}

/* La carte : un plateau, chaque case coloree selon le nombre de billes tombees de cette case.
   Meme echelle que la carte de chaleur du profil. Les nombres ne sont ecrits que s'ils restent petits. */
function _sbCarteSVG(cnt, nombres, aria){
  let max = 0; for (let i = 0; i < 61; i++) if (cnt[i] > max) max = cnt[i];
  const tot = cnt.reduce(function(a, b){ return a + b; }, 0) || 1;
  const SIZE = 280, sc = SIZE / 640, R = HEX_RADIUS * sc * 0.92;
  let s = '', x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < 61; i++) {
    const rc = _sbCase(i), p = hexCoord(rc.r, rc.c, true), x = p.x * sc, y = p.y * sc, n = cnt[i] || 0;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    const fill = heatColor(n && max ? n / max : 0);
    const titre = _dimNb(n) + ' ' + _tr('bille' + _sbS(n) + ' tombée' + _sbS(n) + ' de cette case', 'marble' + _sbS(n) + ' pushed off from this spot') + (n ? ' (' + _sbPct(n / tot * 100) + ')' : '');
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + R.toFixed(1) + '" fill="' + fill + '" stroke="rgba(255,255,255,0.10)" stroke-width="1"><title>' + titre + '</title></circle>';
    if (nombres && n) s += '<text x="' + x.toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="700" fill="' + (_heatIsLight(fill) ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)') + '" pointer-events="none">' + n + '</text>';
  }
  const m = R + 3, vw = x1 - x0 + 2 * m, vh = y1 - y0 + 2 * m;
  return '<svg viewBox="' + (x0 - m).toFixed(1) + ' ' + (y0 - m).toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1) + '" role="img" aria-label="' + aria + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:' + Math.round(vw) + 'px;height:auto;display:block;margin:0 auto">' + s + '</svg>';
}
/* Les graduations de l'echelle de couleurs (v2.65, demande d'Olivier) : 0, quelques valeurs
   rondes, le maximum. Placees la ou heatColor met leur couleur : le nombre c est a (c / max)^0,6
   de la largeur (le meme gamma 0,6 qui etale le bas de l'echelle). Jusqu'a 6, chaque nombre ;
   au-dela, trois valeurs au plus, visees au quart, a la moitie et aux trois quarts de la barre :
   pour chacune, la valeur ronde la plus proche (1, 2, 2,5 ou 5 fois une puissance de 10 ; a
   defaut 1,5, 3, 4, 6, 7,5 ou 8) qui laisse ses chiffres a l'ecart de leurs voisins sur une
   legende etroite (250 px, celle d'un petit telephone). */
function _sbPosEchelle(c, max){ return max > 0 ? Math.pow(Math.max(0, Math.min(1, c / max)), 0.6) : 0; }
function _sbGraduations(max){
  max = Math.max(0, Math.round(max || 0));
  const t = [0];
  if (!max) return t;
  if (max <= 6) { for (let c = 1; c <= max; c++) t.push(c); return t; }
  const L = 250, chiffre = 6.2, marge = 8;   // largeur prudente de la legende, d'un caractere, ecart minimum entre deux nombres (px)
  const larg = function(c){ return String(_dimNb(c)).length * chiffre; };
  // le 0 est aligne a gauche, le maximum a droite, les autres centres sous leur trait
  const gauche = function(c){ return c === max ? L - larg(c) : _sbPosEchelle(c, max) * L - larg(c) / 2; };
  const droite = function(c){ return c === 0 ? larg(c) : _sbPosEchelle(c, max) * L + larg(c) / 2; };
  const ecart = function(a, b){ return _sbPosEchelle(b, max) - _sbPosEchelle(a, max) >= 0.12; };   // traits pas trop serres
  // les valeurs a essayer pres de x, les plus rondes d'abord, chaque groupe de la plus proche a la plus lointaine
  const candidats = function(x){
    const proche = function(a, b){ return Math.abs(a - x) - Math.abs(b - x); };
    if (x < 10 && max < 50) return [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(proche);
    let e = 1; while (e * 10 <= x) e *= 10;
    const groupe = function(ms){
      const g = [];
      ms.forEach(function(m){ [e / 10, e, e * 10].forEach(function(p){ const c = Math.round(m * p * 1000) / 1000; if (Number.isInteger(c) && c >= 1 && Math.abs(c - x) <= x / 2) g.push(c); }); });
      return g.sort(proche);
    };
    return groupe([1, 2, 2.5, 5]).concat(groupe([1.5, 3, 4, 6, 7.5, 8]));
  };
  [0.25, 0.5, 0.75].forEach(function(p){
    const der = t[t.length - 1];
    const c = candidats(max * Math.pow(p, 1 / 0.6)).filter(function(c){
      return c > der && c < max && ecart(der, c) && ecart(c, max) && gauche(c) - droite(der) >= marge && gauche(max) - droite(c) >= marge;
    })[0];
    if (c) t.push(c);
  });
  t.push(max);
  return t;
}
function _sbLegendeCarte(max){
  const n = HEATMAP_SCALE.length - 1, grad = _sbGraduations(max);
  const stops = HEATMAP_SCALE.map(function(c, i){ return c + ' ' + (i / n * 100).toFixed(2) + '%'; }).join(',');
  let reperes = '';
  grad.forEach(function(c, i){
    const p = (_sbPosEchelle(c, max) * 100).toFixed(2), dernier = i === grad.length - 1 && i > 0;
    // les deux bouts restent dans la barre : le 0 aligne a gauche, le maximum a droite
    const ou = dernier ? 'right:0' : 'left:' + p + '%';
    reperes += '<span class="sb-leg-trait" style="' + ou + '"></span>'
      + '<span class="sb-leg-nb" style="' + ou + (i === 0 || dernier ? '' : ';transform:translateX(-50%)') + '">' + _dimNb(c) + '</span>';
  });
  return '<div class="sb-leg" role="img" aria-label="' + _tr('Échelle des couleurs : de 0 à ' + _dimNb(max) + ' bille' + _sbS(max) + ' tombée' + _sbS(max) + ' d’une même case', 'Color scale: from 0 to ' + _dimNb(max) + ' marble' + _sbS(max) + ' pushed off from one spot') + '">'
    + '<div class="sb-leg-barre" style="background:linear-gradient(90deg,' + HEATMAP_EMPTY + ' 0%,' + stops + ')"></div>'
    + '<div class="sb-leg-reperes" aria-hidden="true">' + reperes + '</div>'
    + '<div class="sb-leg-titre" aria-hidden="true">' + _tr('billes tombées de la case', 'marbles pushed off from the spot') + '</div></div>';
}
// Ce que la carte dit en clair : moitie du plateau du joueur (en bas, comme sur son ecran), moitie d'en face, coins
function _sbLireCarte(cnt){
  const tot = cnt.reduce(function(a, b){ return a + b; }, 0);
  if (!tot) return null;
  let bas = 0, haut = 0;
  for (let i = 0; i < 61; i++) { const r = _sbCase(i).r; if (r > 4) bas += cnt[i]; else if (r < 4) haut += cnt[i]; }
  const coins = _SB_COINS.reduce(function(a, i){ return a + cnt[i]; }, 0);
  return { tot: tot, basPct: bas / tot * 100, hautPct: haut / tot * 100, coinsPct: coins / tot * 100 };
}

/* ─── A quel coup tombent les billes (v2.65) ───
   Une ligne par bille, de la 1re a la 11e, puis la derniere : la mediane (le
   point) et 8 parties sur 10 (le trait, du 10e au 90e centile), toutes sur la
   meme echelle de coups. Choisir une ligne montre en dessous le detail de
   cette bille : sa phrase, son histogramme (memes axes pour toutes) et ses
   medianes selon la disposition de depart. */
// Les billes montrees : celles tombees dans au moins 50 parties (la 1re des qu'il y en a une)
function _sbLignesBilles(v){
  const t = [];
  for (let k = 0; k <= _SB_DERNIERE; k++) { const n = v.billes[k].length; if (n >= 50 || (k === 0 && n > 0)) t.push(k); }
  return t;
}
// « 1ʳᵉ », « 5ᵉ », « Dernière » ; en anglais « 1st », « 5th », « Last »
function _sbNomBille(k){
  if (k === _SB_DERNIERE) return _tr('Dernière', 'Last');
  const n = k + 1, u = n % 10, d = n % 100;
  return _tr(n === 1 ? '1ʳᵉ' : n + 'ᵉ', n + ((u === 1 && d !== 11) ? 'st' : (u === 2 && d !== 12) ? 'nd' : (u === 3 && d !== 13) ? 'rd' : 'th'));
}
// « la 5ᵉ bille », « la dernière bille » ; « the 5th marble », « the last marble »
function _sbLaBille(k){ return k === _SB_DERNIERE ? _tr('la dernière bille', 'the last marble') : _tr('la ' + _sbNomBille(k) + ' bille', 'the ' + _sbNomBille(k) + ' marble'); }
function _sbPhraseBille(k, t){
  const med = _sbMediane(t), a = _sbQuantile(t, 0.1), b = _sbQuantile(t, 0.9), n = _dimNb(t.length);
  if (k === 0) return _tr('La moitié des parties ont leur première éjection avant le <b>coup ' + med + '</b> ; dans 8 parties sur 10, elle arrive entre le coup ' + a + ' et le coup ' + b + '.',
                          'Half of all games see their first ejection before <b>move ' + med + '</b>; in 8 games out of 10 it comes between move ' + a + ' and move ' + b + '.');
  if (k === _SB_DERNIERE) return _tr('Dans les ' + n + ' parties gagnées en faisant tomber 6 billes, la dernière, celle qui fait gagner, tombe avant le <b>coup ' + med + '</b> une fois sur deux ; dans 8 parties sur 10, entre le coup ' + a + ' et le coup ' + b + '.',
                                     'In the ' + n + ' games won by pushing off 6 marbles, the last one, the marble that wins, falls before <b>move ' + med + '</b> half the time; in 8 games out of 10, between move ' + a + ' and move ' + b + '.');
  return _tr('Dans les ' + n + ' parties où au moins ' + (k + 1) + ' billes sont tombées, la ' + _sbNomBille(k) + ' tombe avant le <b>coup ' + med + '</b> une fois sur deux ; dans 8 parties sur 10, entre le coup ' + a + ' et le coup ' + b + '.',
             'In the ' + n + ' games in which at least ' + (k + 1) + ' marbles fell, the ' + _sbNomBille(k) + ' falls before <b>move ' + med + '</b> half the time; in 8 games out of 10, between move ' + a + ' and move ' + b + '.');
}
function _sbHtmlQuand(v, lignes, etroit){
  const k = _sbBille, t = v.billes[k], X = _SB_HISTO_L * _SB_HISTO_NB;
  const num = lignes.filter(function(j){ return j !== _SB_DERNIERE; }), aDerniere = lignes.indexOf(_SB_DERNIERE) >= 0;
  const med = function(j){ return _sbMediane(v.billes[j]); };
  // 1. la phrase d'ensemble : la 1re, le rythme, quelques reperes, la derniere
  const k0 = num[0], kz = num[num.length - 1];
  let fr = 'La ' + _sbNomBille(k0) + ' bille tombe vers le <b>coup ' + med(k0) + '</b> (médiane)', en = 'The ' + _sbNomBille(k0) + ' marble falls around <b>move ' + med(k0) + '</b> (median)';
  if (kz > k0) {
    const ecart = Math.max(1, Math.round((med(kz) - med(k0)) / (kz - k0)));
    const ex = [5, kz].filter(function(j, i, a){ return j > k0 && num.indexOf(j) >= 0 && a.indexOf(j) === i; });
    fr += ', puis il en tombe une autre à peu près tous les ' + ecart + ' coups' + (ex.length ? ' : ' + ex.map(function(j){ return 'la ' + _sbNomBille(j) + ' vers le coup ' + med(j); }).join(', ') : '');
    en += ', then another one falls roughly every ' + ecart + ' moves' + (ex.length ? ': ' + ex.map(function(j){ return 'the ' + _sbNomBille(j) + ' around move ' + med(j); }).join(', ') : '');
  }
  fr += '.'; en += '.';
  if (aDerniere) {
    fr += ' La dernière, la 6ᵉ du vainqueur, celle qui finit la partie, tombe vers le <b>coup ' + med(_SB_DERNIERE) + '</b>.';
    en += ' The last one, the winner’s 6th, which ends the game, falls around <b>move ' + med(_SB_DERNIERE) + '</b>.';
  }
  // 2. une ligne par bille, sur la meme echelle de coups que l'histogramme (0 a 240)
  const pos = function(c){ return Math.max(0, Math.min(X, c)) / X * 100; };
  let liste = '<div class="sb-cad" role="group" aria-label="' + _tr('Les billes, de la première à la dernière', 'The marbles, from the first to the last') + '">';
  lignes.forEach(function(j){
    const tj = v.billes[j], m = _sbMediane(tj), a = _sbQuantile(tj, 0.1), b = _sbQuantile(tj, 0.9);
    const desc = _tr(_sbNomBille(j) + ' bille : vers le coup ' + m + ' (médiane), 8 parties sur 10 entre le coup ' + a + ' et le coup ' + b + ', sur ' + _dimNb(tj.length) + ' parties',
                     _sbNomBille(j) + ' marble: around move ' + m + ' (median), 8 games out of 10 between move ' + a + ' and move ' + b + ', over ' + _dimNb(tj.length) + ' games');
    if (j === _SB_DERNIERE) liste += '<div class="sb-cad-sep" aria-hidden="true"></div>';
    liste += '<button type="button" class="sb-cad-l" id="sb-bille-' + j + '" aria-pressed="' + (j === k) + '" aria-label="' + desc + '" title="' + desc + '" onclick="_sbChoisirBille(' + j + ')">'
      + '<span class="sb-cad-nom">' + _sbNomBille(j) + '</span>'
      + '<span class="sb-cad-piste"><span class="sb-cad-trait" style="left:' + pos(a).toFixed(2) + '%;width:' + (pos(b) - pos(a)).toFixed(2) + '%"></span><span class="sb-cad-point" style="left:' + pos(m).toFixed(2) + '%"></span></span>'
      + '<span class="sb-cad-val">' + _tr('coup ', 'move ') + m + '</span></button>';
  });
  liste += '<div class="sb-cad-axe" aria-hidden="true"><span></span><span class="sb-cad-piste">' + [0, 50, 100, 150, 200].map(function(c){ return '<i style="left:' + pos(c).toFixed(2) + '%">' + c + '</i>'; }).join('') + '</span><span></span></div>'
    + '<div class="sb-cad-leg"><span><i class="sb-cad-leg-point"></i>' + _tr('médiane', 'median') + '</span><span><i class="sb-cad-leg-trait"></i>' + _tr('8 parties sur 10', '8 games out of 10') + '</span><span>' + _tr('Choisir une ligne pour voir son détail plus bas.', 'Pick a row to see its details below.') + '</span></div></div>';
  // 3. le detail de la bille choisie : histogramme aux axes communs, medianes par disposition
  const pctMax = Math.max.apply(null, lignes.map(function(j){ const tj = v.billes[j]; return tj.length ? Math.max.apply(null, _sbHistoBins(tj)) / tj.length * 100 : 0; }));
  const parD = Object.keys(v.billesParDispo).map(function(d){ return [d, v.billesParDispo[d][k]]; }).filter(function(x){ return x[1].length >= 50; })
    .sort(function(a, b){ return b[1].length - a[1].length; });
  let tab = '';
  if (parD.length) {
    tab = '<div class="sb-tab-titre">' + _tr('Selon la disposition de départ', 'By starting layout') + '</div>'
      + '<div class="sb-tab"><div class="sb-tab-l sb-tab-ent"><span>' + _tr('Disposition', 'Layout') + '</span><span>' + _tr('Parties', 'Games') + '</span><span>' + _tr('Médiane', 'Median') + '</span></div>';
    parD.forEach(function(x){ tab += '<div class="sb-tab-l"><span>' + _sbNomDispo(x[0]) + '</span><span>' + _dimNb(x[1].length) + '</span><span>' + _tr('coup ', 'move ') + _sbMediane(x[1]) + '</span></div>'; });
    tab += '</div>';
  }
  const la = _sbLaBille(k), La = la.charAt(0).toUpperCase() + la.slice(1);
  return '<div class="sb-phrase">' + _tr(fr, en) + '</div>' + liste
    + '<div class="sb-tab-titre sb-quand-titre" id="sb-quand-detail">' + La + _tr(' en détail', ' in detail') + '</div>'
    + '<div class="sb-phrase">' + _sbPhraseBille(k, t) + '</div>'
    + _sbHistoSVG(t, etroit, { pctMax: pctMax, axe: _tr('coup où tombe ' + la, 'move on which ' + la + ' falls'), aria: _tr('Histogramme du coup où tombe ' + la, 'Histogram of the move on which ' + la + ' falls') })
    + tab;
}
function _sbNoteQuand(v, lignes){
  const num = lignes.filter(function(j){ return j !== _SB_DERNIERE; }), a = num[0], z = num[num.length - 1];
  const nA = _dimNb(v.billes[a].length), nZ = _dimNb(v.billes[z].length), nD = lignes.indexOf(_SB_DERNIERE) >= 0 ? _dimNb(v.billes[_SB_DERNIERE].length) : null;
  return _tr('Un coup = le coup d’un joueur, comme pour la durée des parties. Chaque bille ne compte que les parties où elle est tombée : ' + nA + ' pour la ' + _sbNomBille(a) + (z > a ? ', ' + nZ + ' pour la ' + _sbNomBille(z) : '') + '.'
               + (nD ? ' La dernière : la 6ᵉ bille du vainqueur, dans les ' + nD + ' parties gagnées en faisant tomber 6 billes.' : '') + ' L’histogramme garde la même échelle d’une bille à l’autre ; tableau : dispositions jouées au moins 50 fois.',
             'One move = one player’s move, as for game length. Each marble only counts the games in which it fell: ' + nA + ' for the ' + _sbNomBille(a) + (z > a ? ', ' + nZ + ' for the ' + _sbNomBille(z) : '') + '.'
               + (nD ? ' The last one: the winner’s 6th marble, in the ' + nD + ' games won by pushing off 6 marbles.' : '') + ' The histogram keeps the same scale from one marble to the next; table: layouts played at least 50 times.');
}

/* ─── Les sections de la page ─── */
function _sbHtmlBilles(v){
  const etroit = _sbEtroit(); _sbEtroitRendu = etroit;
  const dp = _dimDp(), h = [];
  h.push(_sbTitre(_tr('Les billes qui tombent', 'Falling marbles'),
    _tr('Chaque bille éjectée, dans chaque vraie partie : qui la fait tomber, à quel coup, de quelle case, et ce que ça change pour la suite. Calculé en rejouant coup par coup les <b>' + _dimNb(v.nComplets) + ' parties</b> jouées depuis une position de départ ; les ' + _dimNb(v.nIncomplets) + ' parties AbalOnline commencées sur une position de problème sont laissées de côté.',
        'Every marble pushed off, in every real game: who pushes it, on which move, from which spot, and what it changes for the rest of the game. Computed by replaying, move by move, the <b>' + _dimNb(v.nComplets) + ' games</b> played from a starting position; the ' + _dimNb(v.nIncomplets) + ' AbalOnline games that began from a puzzle position are left out.')));
  // 1. la premiere bille
  const p = v.premiere, pct = p.n ? p.gagne / p.n * 100 : null;
  if (pct !== null) h.push(_carteStats(_tr('Qui fait tomber la première bille gagne-t-il ?', 'Does the side that pushes off the first marble win?') + (typeof _cfMarque === 'function' ? _cfMarque() : ''),
    '<div class="sb-hero"><span class="sb-hero-val">' + _sbGrosPct(pct) + '</span><span class="sb-hero-txt">' + _tr('des parties sont gagnées par le camp qui fait tomber la première bille', 'of games are won by the side that pushes off the first marble') + ' <span class="sb-marge">(' + grMarge(p.gagne, p.n) + ')</span>.</span></div>'
    + '<div class="sb-phrase">' + _tr('Celui qui perd la première bille gagne quand même <b>' + _sbPct(100 - pct) + '</b> des parties.', 'The side that loses the first marble still wins <b>' + _sbPct(100 - pct) + '</b> of games.') + '</div>',
    _tr('Sur ' + _dimNb(p.n) + ' parties dont on connaît le vainqueur et où au moins une bille est tombée.', 'Over ' + _dimNb(p.n) + ' games with a known winner in which at least one marble was pushed off.')));
  // 2. a quel coup tombe chaque bille
  const lignesB = _sbLignesBilles(v);
  if (lignesB.length) {
    if (lignesB.indexOf(_sbBille) < 0) _sbBille = lignesB[0];
    h.push('<div id="sb-carte-quand">' + _carteStats(_tr('À quel coup tombent les billes', 'When the marbles fall') + (typeof _cfMarque === 'function' ? _cfMarque() : ''), _sbHtmlQuand(v, lignesB, etroit), _sbNoteQuand(v, lignesB)) + '</div>');
  }
  // 3. les remontees
  const r = function(a, b){ const e = v.remontees[a + '-' + b]; return (e && e.n >= 30) ? e.g / e.n * 100 : null; };
  let grille = '<div class="sb-grille" role="table" aria-label="' + _tr('Tableau des remontées', 'Comeback table') + '">'
    + '<div class="sb-g-coin" role="columnheader">' + _tr('mène ↓ · l’autre →', 'leader ↓ · other →') + '</div>';
  for (let b = 0; b < 5; b++) grille += '<div class="sb-g-ent" role="columnheader">' + b + '</div>';
  for (let a = 1; a <= 5; a++) {
    grille += '<div class="sb-g-ent" role="rowheader">' + a + '</div>';
    for (let b = 0; b < 5; b++) {
      if (b >= a) { grille += '<div class="sb-g-vide" role="cell"></div>'; continue; }
      const e = v.remontees[a + '-' + b], q = r(a, b);
      if (q === null) { grille += '<div class="sb-g-case sb-g-rare" role="cell" title="' + _tr('Moins de 30 parties', 'Fewer than 30 games') + '">—</div>'; continue; }
      const alpha = 0.14 + Math.max(0, q - 50) / 50 * 0.8, clair = alpha > 0.55;
      grille += '<div class="sb-g-case" role="cell" tabindex="0" style="background:rgba(47,158,127,' + alpha.toFixed(2) + ');color:' + (clair ? '#fff' : 'var(--text)') + '" title="'
        + _tr('À ' + a + '-' + b + ', le camp qui mène gagne ' + _sbPct(q) + ' de ' + _dimNb(e.n) + ' parties', 'At ' + a + '-' + b + ', the leading side wins ' + _sbPct(q) + ' of ' + _dimNb(e.n) + ' games') + ' (' + grFourchette(e.g, e.n) + ')' + grPeu(e.n) + '">' + Math.round(q) + ' %</div>';
    }
  }
  grille += '</div>';
  const r10 = r(1, 0), r20 = r(2, 0), r30 = r(3, 0), r31 = r(3, 1);
  h.push(_carteStats(_tr('Le tableau des remontées', 'The comeback table') + (typeof _cfMarque === 'function' ? _cfMarque() : ''),
    '<div class="sb-phrase">' + _tr('À <b>1-0</b>, celui qui mène gagne ' + _sbPct(r10) + ' des parties ; à <b>3-0</b>, ' + _sbPct(r30) + '. Mené <b>0-2</b>, on gagne encore ' + _sbPct(100 - r20) + ' du temps.',
                                    'At <b>1-0</b>, the leader wins ' + _sbPct(r10) + ' of games; at <b>3-0</b>, ' + _sbPct(r30) + '. Trailing <b>0-2</b>, a side still wins ' + _sbPct(100 - r20) + ' of the time.') + '</div>'
    + '<div class="sb-legende-grille">' + _tr('Lignes : billes que le camp qui mène a fait tomber. Colonnes : celles de l’autre camp. Case : part des parties gagnées par celui qui mène.', 'Rows: marbles pushed off by the leading side. Columns: by the other side. Cell: share of games won by the leader.') + '</div>'
    + grille,
    _tr('Lecture : à 3-1, le camp qui a fait tomber 3 billes contre 1 gagne ' + _sbPct(r31) + ' des parties passées par ce score. Chaque partie compte une fois par score atteint. Cases de moins de 30 parties laissées vides. Parties dont on connaît le vainqueur : les parties MIGS terminées par abandon ou au temps sont exclues, faute de savoir qui a abandonné.',
        'Reading: at 3-1, the side that has pushed off 3 marbles against 1 wins ' + _sbPct(r31) + ' of the games that reached that score. Each game counts once per score reached. Cells with fewer than 30 games left empty. Games with a known winner: MIGS games ended by resignation or on time are excluded, since nobody knows who resigned.')));
  // 4. le score final
  const tf = v.finals.reduce(function(a, b){ return a + b; }, 0);
  if (tf) {
    let im = 0; v.finals.forEach(function(x, i){ if (x > v.finals[im]) im = i; });
    h.push(_carteStats(_tr('Le score final', 'The final score') + (typeof _cfMarque === 'function' ? _cfMarque() : ''),
      '<div class="sb-phrase">' + _tr('Le score le plus fréquent est <b>6-' + im + '</b> (' + _sbPct(v.finals[im] / tf * 100) + '). Une victoire sans perdre une bille, 6-0, arrive dans ' + _sbPct(v.finals[0] / tf * 100) + ' des parties ; la plus serrée, 6-5, dans ' + _sbPct(v.finals[5] / tf * 100) + '.',
                                      'The most frequent score is <b>6-' + im + '</b> (' + _sbPct(v.finals[im] / tf * 100) + '). A win without losing a marble, 6-0, happens in ' + _sbPct(v.finals[0] / tf * 100) + ' of games; the closest, 6-5, in ' + _sbPct(v.finals[5] / tf * 100) + '.') + '</div>'
      + _sbScoreSVG(v.finals, etroit),
      _tr('Sur les ' + _dimNb(tf) + ' parties gagnées en faisant tomber 6 billes (les parties gagnées par abandon s’arrêtent avant et ne sont pas comptées ici).', 'Over the ' + _dimNb(tf) + ' games won by pushing off 6 marbles (games won by resignation stop earlier and are not counted here).')));
  }
  // 5. la carte
  const onglets = ['belgian', 'standard', '*'].filter(function(k){ return v.cartes[k] && v.cartes[k].some(function(x){ return x > 0; }); });
  if (onglets.indexOf(_sbOngletCarte) < 0) _sbOngletCarte = onglets[0] || '*';
  const cnt = v.cartes[_sbOngletCarte] || new Array(61).fill(0), lc = _sbLireCarte(cnt);
  if (lc) {
    const boutons = onglets.map(function(k){ return '<button type="button" class="sb-onglet" aria-pressed="' + (k === _sbOngletCarte) + '" onclick="_sbChoisirCarte(\'' + k + '\')">' + _sbNomDispo(k) + '</button>'; }).join('');
    const max = Math.max.apply(null, cnt);
    h.push('<div id="sb-carte-carte">' + _carteStats(_tr('La carte des éjections', 'The ejection map') + (typeof _cfMarque === 'function' ? _cfMarque() : ''),
      '<div class="sb-onglets">' + boutons + '</div>'
      + '<div class="sb-phrase">' + _tr('<b>' + _sbPct(lc.basPct) + '</b> des billes tombent de la moitié du plateau du joueur qui les perd, ' + _sbPct(lc.hautPct) + ' de la moitié d’en face (le reste, de la rangée du milieu). Les 6 coins n’en donnent que ' + _sbPct(lc.coinsPct) + ', alors qu’ils font un quart des cases du bord.',
                                      '<b>' + _sbPct(lc.basPct) + '</b> of marbles fall from the half of the board of the player who loses them, ' + _sbPct(lc.hautPct) + ' from the far half (the rest from the middle row). The 6 corners give only ' + _sbPct(lc.coinsPct) + ', although they make up a quarter of the edge spots.') + '</div>'
      + _sbCarteSVG(cnt, false, _tr('Carte des cases d’où tombent les billes', 'Map of the spots marbles are pushed off from')) + _sbLegendeCarte(max),
      _tr('Vue du joueur qui perd la bille, comme sur son écran : sa moitié du plateau en bas (pour les Blancs, le plateau est retourné, comme en partie). ' + _dimNb(lc.tot) + ' billes tombées dans les parties « ' + _sbNomDispo(_sbOngletCarte) + ' ». Survoler une case donne son nombre.',
          'Seen by the player who loses the marble, as on their screen: their half of the board at the bottom (for White the board is turned round, as during a game). ' + _dimNb(lc.tot) + ' marbles pushed off in “' + _sbNomDispo(_sbOngletCarte) + '” games. Hover a spot for its count.')) + '</div>');
  }
  return h.join('');
}

function _sbHtmlGagner(v){
  const D = STATS_PARTIES, s = Math.max(0, Math.min(_SB_ETAPES.length - 1, _sbEtape)), et = _SB_ETAPES[s];
  const lignes = D.champs.map(function(ch, j){ const t = v.dims[s][j]; return { ch: ch, n: t.n, g: t.g, p: t.n ? t.g / t.n * 100 : null }; })
    .filter(function(x){ return x.n >= 50; }).sort(function(a, b){ return Math.abs(b.p - 50) - Math.abs(a.p - 50); });
  const boutons = _SB_ETAPES.map(function(e, k){ return '<button type="button" class="sb-onglet" aria-pressed="' + (k === s) + '" onclick="_sbChoisirEtape(' + k + ')">' + _tr('Au ' + e + 'ᵉ coup', 'At move ' + e) + '</button>'; }).join('');
  let barres = '<div class="sb-div" role="table">';
  lignes.forEach(function(x){
    const plus = x.p >= 50, larg = Math.abs(x.p - 50);     // en points de pourcentage, la demi-largeur valant 50 points
    const w = grWilson(x.g, x.n);   // v2.77 : la marge a 95 %, en moustache (la piste va de 0 a 100 %)
    barres += '<div class="sb-div-l" role="row" tabindex="0" title="' + _tr('Le camp qui a la valeur la plus haute gagne ' + _sbPct(x.p) + ' de ' + _dimNb(x.n) + ' parties', 'The side with the higher value wins ' + _sbPct(x.p) + ' of ' + _dimNb(x.n) + ' games') + ' (' + grFourchette(x.g, x.n) + ')' + grPeu(x.n) + '">'
      + '<span class="sb-div-nom" role="rowheader">' + _labelDimension(x.ch) + '</span>'
      + '<span class="sb-div-piste" role="presentation"><span class="sb-div-barre" style="' + (plus ? 'left:50%' : 'right:50%') + ';width:' + larg + '%;background:' + (plus ? _SB_VERT : _SB_ORANGE) + '"></span>'
      + '<span class="sb-div-ic" style="left:' + (100 * w.bas).toFixed(1) + '%;width:' + Math.max(0.4, 100 * (w.haut - w.bas)).toFixed(1) + '%"></span></span>'
      + '<span class="sb-div-val" role="cell">' + _sbPct(x.p) + '</span></div>';
  });
  barres += '</div><div class="sb-div-axe" aria-hidden="true"><span></span><span><i>' + _tr('← gagne moins', '← wins less') + '</i><i>50\u00a0%</i><i>' + _tr('gagne plus →', 'wins more →') + '</i></span><span></span></div>';
  // la phrase : la dimension la plus parlante apres le nombre de billes
  const hors = lignes.filter(function(x){ return x.ch !== 'materialDiff'; })[0], mat = lignes.filter(function(x){ return x.ch === 'materialDiff'; })[0];
  let phrase = '';
  if (hors) phrase = _tr((mat ? 'Avoir plus de billes que l’adversaire fait gagner ' + _sbPct(mat.p) + ' des parties. Ensuite, ' : '') + 'c’est « <b>' + _labelDimension(hors.ch) + '</b> » qui distingue le plus le futur gagnant : le camp qui ' + (hors.p >= 50 ? 'a la valeur la plus haute' : 'a la valeur la plus basse') + ' gagne ' + _sbPct(hors.p >= 50 ? hors.p : 100 - hors.p) + ' des parties.',
    (mat ? 'Having more marbles than the opponent wins ' + _sbPct(mat.p) + ' of games. After that, ' : '') + '“<b>' + _labelDimension(hors.ch) + '</b>” best tells the future winner apart: the side with the ' + (hors.p >= 50 ? 'higher' : 'lower') + ' value wins ' + _sbPct(hors.p >= 50 ? hors.p : 100 - hors.p) + ' of games.');
  return _sbTitre(_tr('Ce qui fait gagner', 'What wins games'), _tr('Les 12 dimensions, camp contre camp : sur la même position, lequel des deux est devant, et gagne-t-il à la fin ?', 'The 12 dimensions, side against side: on the same position, which side is ahead, and does it win in the end?'))
    + _carteStats(_tr('Le camp qui mène sur chaque dimension', 'The side ahead on each dimension') + (typeof _cfMarque === 'function' ? _cfMarque() : ''),
      '<div class="sb-onglets">' + boutons + '</div>' + (phrase ? '<div class="sb-phrase">' + phrase + '</div>' : '') + barres,
      _tr('Au ' + et + 'ᵉ coup de ' + _dimNb(v.nDimsParties[s]) + ' parties dont on connaît le vainqueur, on mesure chaque dimension pour les deux camps sur la même position. « Gagne 62 % » : le camp qui a la valeur la plus haute gagne 62 % de ces parties (égalités exclues). Vert-bleu : avoir plus aide ; orange : avoir plus est mauvais signe. Un lien constaté, pas une preuve de cause : une dimension peut accompagner une bonne position sans en être la raison.',
          'At move ' + et + ' of ' + _dimNb(v.nDimsParties[s]) + ' games with a known winner, each dimension is measured for both sides on the same position. “Wins 62 %”: the side with the higher value wins 62 % of those games (ties left out). Blue-green: having more helps; orange: having more is a bad sign. A link observed, not proof of cause: a dimension can go with a good position without being its reason.'));
}

function _sbHtmlJeu(v){
  const T = v.types, coups = T[0] + T[1] + T[2] + T[3] + T[4] || 1;
  const sortes = [[_tr('1 bille', '1 marble'), T[0]], [_tr('2 billes en ligne', '2 marbles in line'), T[1]], [_tr('3 billes en ligne', '3 marbles in line'), T[2]], [_tr('2 billes de côté', '2 marbles sideways'), T[3]], [_tr('3 billes de côté', '3 marbles sideways'), T[4]]];
  const max = Math.max.apply(null, sortes.map(function(x){ return x[1]; })) || 1;
  let barres = '<div class="sb-hb">';
  sortes.forEach(function(x){
    const p = x[1] / coups * 100;
    barres += '<div class="sb-hb-l"><span class="sb-hb-nom">' + x[0] + '</span><span class="sb-hb-piste"><span class="sb-hb-barre" style="width:' + (x[1] / max * 100).toFixed(1) + '%"></span></span><span class="sb-hb-val">' + _sbPct(p) + '</span></div>';
  });
  barres += '</div>';
  const tuiles = '<div class="sb-tuiles">'
    + '<div class="sb-tuile"><div class="sb-tuile-val">' + _sbGrosPct(T[5] / coups * 100) + '</div><div class="sb-tuile-nom">' + _tr('des coups poussent des billes adverses (sumito)', 'of moves push opposing marbles (sumito)') + '</div></div>'
    + '<div class="sb-tuile"><div class="sb-tuile-val">' + _sbGrosPct(T[6] / coups * 100) + '</div><div class="sb-tuile-nom">' + _tr('des coups font tomber une bille', 'of moves push a marble off') + '</div></div>'
    + '<div class="sb-tuile"><div class="sb-tuile-val">' + (T[7] ? _sbGrosPct(T[6] / T[7] * 100) : '—') + '</div><div class="sb-tuile-nom">' + _tr('des occasions de faire tomber une bille sont saisies', 'of chances to push a marble off are taken') + '</div></div>'
    + '</div>';
  return _sbTitre(_tr('Comment jouent les vrais joueurs', 'How real players play'), _tr('Tous les coups des vraies parties, rangés par sorte.', 'Every move of the real games, sorted by kind.'))
    + _carteStats(_tr('Les coups joués', 'The moves played') + (typeof _cfMarque === 'function' ? _cfMarque() : ''), barres + tuiles + _sbHtmlPoussees(v),
      _tr('Sur les ' + _dimNb(coups) + ' coups des ' + _dimNb(v.nComplets) + ' parties jouées depuis une position de départ. « De côté » : la ligne de billes avance de biais, chaque bille vers une case vide. Occasion : un moment où au moins un coup permettait de faire tomber une bille ; « saisie » quand une bille tombe à ce coup.',
          'Over the ' + _dimNb(coups) + ' moves of the ' + _dimNb(v.nComplets) + ' games played from a starting position. “Sideways”: the line of marbles moves at an angle, each marble into an empty spot. Chance: a moment when at least one move could push a marble off; “taken” when a marble falls on that move.'));
}

/* v2.80 : les poussees par type -- leur part, la part qui fait tomber une bille, et le camp qui en a
   reussi au moins une de ce type : gagne-t-il ? (parties au vainqueur connu ; marge a 95 %) */
function _sbHtmlPoussees(v){
  const P = v.poussees; if (!P) return '';
  const tot = P.types[0] + P.types[1] + P.types[2]; if (!tot) return '';
  const noms = [_tr('2 contre 1', '2 against 1'), _tr('3 contre 1', '3 against 1'), _tr('3 contre 2', '3 against 2')];
  let h = '<div class="gr-titre">' + _tr('Les poussées (sumitos), par type', 'Pushes (sumitos), by type') + '</div>';
  h += grBarres(noms.map(function(nm, t){ const n = P.types[t]; return { lab: nm, v: n / tot, txt: _sbPct(100 * n / tot),
    tip: nm + _dimDp() + _dimNb(n) + _tr(' poussées, dont ', ' pushes, of which ') + _dimNb(P.types[t + 3]) + _tr(' font tomber une bille (', ' push a marble off (') + _sbPct(n ? 100 * P.types[t + 3] / n : 0) + ')' }; }), { min: 0, max: 1, fmt: function(x){ return _sbPct(100 * x); } });
  h += '<div class="gr-sous">' + _tr('Font tomber une bille : ', 'Push a marble off: ') + noms.map(function(nm, t){ return nm + ' ' + _sbPct(P.types[t] ? 100 * P.types[t + 3] / P.types[t] : 0); }).join(' · ') + '.</div>';
  h += '<div class="gr-titre">' + _tr('Celui qui pousse le plus gagne-t-il ?', 'Does the side that pushes more win?') + '</div>';
  h += grBarres(noms.map(function(nm, t){ const c = P.plus[t], w = grWilson(c.g, c.n); return { lab: nm, v: w ? w.p : 0, bas: w ? w.bas : null, haut: w ? w.haut : null, ref: 0.5, txt: w ? _sbPct(100 * w.p) : '—',
    tip: _tr('Le camp qui a fait le plus de poussées ' + nm + ' gagne ' + c.g + ' parties sur ' + c.n, 'The side that made more ' + nm + ' pushes wins ' + c.g + ' games out of ' + c.n) + (w ? ' (' + grFourchette(c.g, c.n) + ')' : '') + grPeu(c.n) }; }), { min: 0, max: 1, fmt: function(x){ return _sbPct(100 * x); } });
  h += '<div class="gr-sous">' + _tr('Dans chaque partie au vainqueur connu, le camp qui a fait le plus de poussées de ce type, sans compter celles qui font tomber une bille (la bille tombée dirait déjà qui gagne). Le trait marque 50 %. C’est un lien, pas une cause : pousser à 3 contre 2 demande déjà une position dominante.',
    'In each game with a known winner, the side that made more pushes of that type, not counting those that push a marble off (the fallen marble would already tell who wins). The tick marks 50 %. It is a link, not a cause: pushing 3 against 2 already takes a dominant position.') + '</div>';
  return h;
}
// La section « Les billes qui tombent », avec l'alerte des parties pas encore comptees (gardee a chaque nouveau rendu)
function _sbAlerteEcart(){
  const B = _sbBanques(), nb = (STATS_PARTIES && STATS_PARTIES.nb) || [];
  const ecart = B.every(function(b){ return b.length; }) ? B.reduce(function(a, b, i){ return a + Math.max(0, b.length - (nb[i] || 0)); }, 0) : 0;
  return ecart ? '<div class="sb-alerte">⚠ ' + _tr(ecart + ' partie' + _sbS(ecart) + ' ajoutée' + _sbS(ecart) + ' depuis le dernier calcul n’' + (ecart > 1 ? 'y sont' : 'y est') + ' pas encore comptée' + _sbS(ecart) + '.', ecart + ' game' + _sbS(ecart) + ' added since the last computation ' + (ecart > 1 ? 'are' : 'is') + ' not counted yet.') + '</div>' : '';
}
function _sbRemplirBilles(host, v){ host.innerHTML = _sbHtmlBilles(v) + _sbAlerteEcart(); }
function _sbChoisirCarte(k){
  _sbOngletCarte = k;
  const v = _sbAgreger(_cfActif()), host = document.getElementById('billes-section');
  if (v && host) _sbRemplirBilles(host, v);
}
function _sbChoisirBille(k){
  _sbBille = k;
  const v = _sbAgreger(_cfActif()), host = document.getElementById('billes-section');
  if (!v || !host) return;
  _sbRemplirBilles(host, v);
  // le bouton redessine garde le focus (clavier) ; sur telephone, le detail est sous la liste : on le fait entrer dans l'ecran
  const b = document.getElementById('sb-bille-' + k), hi = document.getElementById('sb-histo');
  if (b && typeof b.focus === 'function') { try { b.focus({ preventScroll: true }); } catch (e) {} }
  if (hi && typeof hi.getBoundingClientRect === 'function' && typeof hi.scrollIntoView === 'function') {
    const r = hi.getBoundingClientRect(), hEcran = window.innerHeight || 0;
    if (hEcran && r.bottom > hEcran) {
      const doux = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      try { hi.scrollIntoView({ block: 'nearest', behavior: doux ? 'smooth' : 'auto' }); } catch (e) {}
    }
  }
}
function _sbChoisirEtape(k){
  _sbEtape = k;
  const v = _sbAgreger(_cfActif()), host = document.getElementById('gagner-section');
  if (v && host) host.innerHTML = _sbHtmlGagner(v);
}

/* Les trois sections de la page Statistiques du jeu : elles n'attendent ni les
   12 dimensions ni le reste (les evenements sont deja calcules, embarques). */
async function _sbRendreCorpus(){
  const hb = document.getElementById('billes-section'), hg = document.getElementById('gagner-section'), hj = document.getElementById('jeu-section');
  if (!hb && !hg && !hj) return;
  const ok = await ensureStatsParties();
  const v = ok ? _sbAgreger(_cfActif()) : null;
  if (!v) {
    if (hb) hb.innerHTML = _carteStats(_tr('Les billes qui tombent', 'Falling marbles'), '<div style="font-size:12px;color:var(--muted)">' + _tr('Ce navigateur ne sait pas lire les données compressées du site : ces statistiques ne peuvent pas s’afficher.', 'This browser cannot read the site’s compressed data: these statistics cannot be shown.') + '</div>');
    return;
  }
  // parties ajoutees au site depuis le dernier calcul : dites, jamais comptees en silence (_sbAlerteEcart)
  if (hb) _sbRemplirBilles(hb, v);
  if (hg) hg.innerHTML = _sbHtmlGagner(v);
  if (hj) hj.innerHTML = _sbHtmlJeu(v);
}
window.addEventListener('resize', function(){
  clearTimeout(_sbRendreCorpus._t);
  _sbRendreCorpus._t = setTimeout(function(){
    const host = document.getElementById('billes-section');
    if (host && host.isConnected && host.innerHTML && STATS_PARTIES && _sbEtroit() !== _sbEtroitRendu) _sbRemplirBilles(host, _sbAgreger(_cfActif()));
  }, 200);
});

/* ═══════════════════════════════════════════
   MES STATISTIQUES — carte Ejections : tes remontees, toi face aux vrais
   joueurs, ou tombent tes billes. Les chiffres « toi » viennent de
   computeEjectionStats (tes parties, rejouees sur cet appareil) ; ceux des
   vrais joueurs, des memes additions que la page Statistiques du jeu, avec
   les memes definitions (meme phase, memes sortes de coups, meme occasion).
═══════════════════════════════════════════ */
function _sbHtmlPerso(s){
  if (!s) return '';
  const v = STATS_PARTIES ? _sbAgreger() : null;
  const attente = '<span style="color:var(--muted)">…</span>';
  const pct = function(a, b){ return b ? _sbPct(a / b * 100) : '—'; };
  const ligne = function(nom, toi, eux){ return '<div class="sb-cmp-l"><span>' + nom + '</span><span>' + toi + '</span><span>' + (v ? eux : attente) + '</span></div>'; };
  const entete = '<div class="sb-cmp-l sb-cmp-ent"><span></span><span>' + _tr('Toi', 'You') + '</span><span>' + _tr('Vrais joueurs', 'Real players') + '</span></div>';
  const P = s.premiere || { perdue: { n: 0, g: 0 }, faite: { n: 0, g: 0 } };
  const pc = (v && v.premiere.n) ? v.premiere.gagne / v.premiere.n * 100 : null;
  const sur = function(x){ return x.n ? _dimNb(x.g) + '/' + _dimNb(x.n) + ' · ' + _sbPct(x.g / x.n * 100) : '—'; };
  let h = '<div id="sb-perso">';
  // 1. tes remontees
  h += '<div class="sb-perso"><div class="sb-perso-titre">' + _tr('Tes remontées', 'Your comebacks') + '</div><div class="sb-cmp">' + entete
    + ligne(_tr('Victoires après avoir perdu la 1ʳᵉ bille', 'Wins after losing the 1st marble'), sur(P.perdue), pc === null ? '—' : _sbPct(100 - pc))
    + ligne(_tr('Victoires quand tu fais tomber la 1ʳᵉ bille', 'Wins when you push off the 1st marble'), sur(P.faite), pc === null ? '—' : _sbPct(pc))
    + '</div><div style="font-size:11px;color:var(--muted);margin-top:6px">' + _tr('Tes parties terminées avec un vainqueur et au moins une bille tombée. Le tableau complet des remontées est sur la page Statistiques du jeu.', 'Your finished games with a winner and at least one marble pushed off. The full comeback table is on the Game statistics page.') + '</div></div>';
  // 2. toi face aux vrais joueurs
  const S = s.sortes || [0, 0, 0, 0, 0, 0, 0, 0], coups = S[0] + S[1] + S[2] + S[3] + S[4];
  const T = v ? v.types : null, coupsV = T ? T[0] + T[1] + T[2] + T[3] + T[4] : 0;
  const ph = s.byPhase || { ouverture: 0, milieu: 0, finale: 0 }, phT = ph.ouverture + ph.milieu + ph.finale;
  const phV = v ? v.camp.phases : null, phVT = phV ? phV.ouverture + phV.milieu + phV.finale : 0;
  const trois = function(o, t){ return t ? Math.round(o.ouverture / t * 100) + ' / ' + Math.round(o.milieu / t * 100) + ' / ' + Math.round(o.finale / t * 100) + ' %' : '—'; };
  h += '<div class="sb-perso"><div class="sb-perso-titre">' + _tr('Toi face aux vrais joueurs', 'You against real players') + '</div><div class="sb-cmp">' + entete
    + ligne(_tr('Éjections par partie', 'Ejections per game'), _dimDec(s.parPartie, 2), v ? _dimDec(v.camp.ej / v.camp.camps, 2) : '')
    + ligne(_tr('Occasions d’éjection saisies', 'Ejection chances taken'), s.efficacite != null ? _sbPct(s.efficacite) : '—', T ? pct(T[6], T[7]) : '')
    + ligne(_tr('1ʳᵉ éjection en moyenne', '1st ejection on average'), s.premiereEjectionMoyenne != null ? _tr('coup ', 'move ') + _dimDec(s.premiereEjectionMoyenne, 1) : '—', v && v.camp.premiereN ? _tr('coup ', 'move ') + _dimDec(v.camp.premiereSomme / v.camp.premiereN, 1) : '—')
    + ligne(_tr('Coups à 3 billes', '3-marble moves'), pct(S[2] + S[4], coups), T ? pct(T[2] + T[4], coupsV) : '')
    + ligne(_tr('Déplacements de côté', 'Sideways moves'), pct(S[3] + S[4], coups), T ? pct(T[3] + T[4], coupsV) : '')
    + ligne(_tr('Poussées (sumito)', 'Pushes (sumito)'), pct(S[5], coups), T ? pct(T[5], coupsV) : '')
    + ligne(_tr('Éjections : ouverture / milieu / finale', 'Ejections: opening / middle / endgame'), trois(ph, phT), phV ? trois(phV, phVT) : '')
    + '</div><div style="font-size:11px;color:var(--muted);margin-top:6px">' + _tr('Vrais joueurs : les ' + (v ? _dimNb(v.nComplets) + ' ' : '') + 'parties du corpus jouées depuis une position de départ, les deux camps comptés. Mêmes définitions des deux côtés : occasion = un coup permettait de faire tomber une bille ; phases comme ci-dessus.',
                                                                              'Real players: the ' + (v ? _dimNb(v.nComplets) + ' ' : '') + 'corpus games played from a starting position, both sides counted. Same definitions on both sides: chance = a move could push a marble off; phases as above.') + '</div></div>';
  // 3. ou tombent tes billes
  const cnt = s.carteSubies || new Array(61).fill(0), lc = _sbLireCarte(cnt);
  h += '<div class="sb-perso"><div class="sb-perso-titre">' + _tr('Où tombent tes billes', 'Where your marbles fall') + '</div>';
  if (!lc) h += '<div style="font-size:12px;color:var(--muted)">' + _tr('Aucune de tes billes n’est encore tombée dans tes parties archivées.', 'None of your marbles has been pushed off yet in your archived games.') + '</div>';
  else {
    const lv = v ? _sbLireCarte(v.cartes['*']) : null;
    h += '<div class="sb-phrase">' + _tr('<b>' + _sbPct(lc.basPct) + '</b> de tes billes tombent de ta moitié du plateau', '<b>' + _sbPct(lc.basPct) + '</b> of your marbles fall from your half of the board') + (lv ? _tr(' (vrais joueurs : ' + _sbPct(lv.basPct) + ')', ' (real players: ' + _sbPct(lv.basPct) + ')') : '') + '.</div>'
      + _sbCarteSVG(cnt, true, _tr('Carte des cases d’où sont tombées tes billes', 'Map of the spots your marbles were pushed off from')) + _sbLegendeCarte(Math.max.apply(null, cnt))
      + '<div style="font-size:11px;color:var(--muted);margin-top:6px">' + _tr('Vue de ton côté, comme sur ton écran : quand tu as les Blancs, le plateau est retourné. ' + _dimNb(lc.tot) + ' bille' + _sbS(lc.tot) + ' perdue' + _sbS(lc.tot) + '.', 'Seen from your side, as on your screen: when you play White, the board is turned round. ' + _dimNb(lc.tot) + ' marble' + _sbS(lc.tot) + ' lost.') + '</div>';
  }
  return h + '</div></div>';
}

/* ═══════════════════════════════════════════
   ECRAN DE FIN DE PARTIE — une ligne tiree des vraies parties
   Le moment le plus parlant de la partie : la plus grosse remontee du
   vainqueur (ou l'avance que le perdant n'a pas su garder), sinon la
   premiere bille. Jamais en mode Enfant, jamais sur moins de 30 parties,
   rien si aucune bille n'est tombee.
═══════════════════════════════════════════ */
function _sbRepereFinDePartie(winner, moi, deuxJoueurs){
  if (!STATS_PARTIES || (winner !== 'black' && winner !== 'white')) return '';
  if (typeof kidsMode !== 'undefined' && kidsMode) return '';
  const snaps = (typeof boardSnapshots !== 'undefined' && boardSnapshots) ? boardSnapshots : [];
  if (!snaps.length || (snaps[0].capturedByBlack || 0) + (snaps[0].capturedByWhite || 0) > 1) return '';   // partie commencee sur une position avec un score
  const perdant = winner === 'black' ? 'white' : 'black';
  const nomCamp = function(x){ return x === 'black' ? _tr('Noirs', 'Black') : _tr('Blancs', 'White'); };
  // le score le plus mal engage pour le futur vainqueur : celui ou, dans les vraies parties, le camp qui menait gagnait le plus souvent
  let pire = null, t = null, premier = null, avant = 0;
  snaps.forEach(function(sn){
    const sW = winner === 'black' ? sn.capturedByBlack : sn.capturedByWhite, sL = winner === 'black' ? sn.capturedByWhite : sn.capturedByBlack;
    if (sW + sL > avant && premier === null) premier = (sW > 0) ? winner : perdant;
    avant = sW + sL;
    if (sL > sW && sL < 6) { const x = _sbTauxRemontee(sL, sW); if (x && (!t || x.pct > t.pct)) { t = x; pire = [sW, sL]; } }
  });
  if (premier === null) return '';
  const vous = !deuxJoueurs;
  if (pire) {
    const a = pire[0] + ' ' + _tr('à', 'to') + ' ' + pire[1], b = pire[1] + ' ' + _tr('à', 'to') + ' ' + pire[0];
    if (vous && winner === moi) return _tr('Belle remontée ! Vous étiez mené ' + a + '. Dans les vraies parties, le camp mené ' + a + ' ne gagne que ' + _sbPct(100 - t.pct) + ' du temps.',
                                          'What a comeback! You were behind ' + a + '. In real games, the side trailing ' + a + ' wins only ' + _sbPct(100 - t.pct) + ' of the time.');
    if (vous) return _tr('Vous meniez ' + b + '. Dans les vraies parties, celui qui mène ' + b + ' gagne ' + _sbPct(t.pct) + ' du temps : l’adversaire a réussi une remontée rare.',
                         'You were ahead ' + b + '. In real games, the side leading ' + b + ' wins ' + _sbPct(t.pct) + ' of the time: your opponent pulled off a rare comeback.');
    return _tr('Les ' + nomCamp(winner) + ' ont remonté un retard de ' + a + '. Dans les vraies parties, le camp mené ' + a + ' ne gagne que ' + _sbPct(100 - t.pct) + ' du temps.',
               nomCamp(winner) + ' came back from ' + a + ' down. In real games, the side trailing ' + a + ' wins only ' + _sbPct(100 - t.pct) + ' of the time.');
  }
  const v = _sbAgreger(); if (!v || v.premiere.n < 30) return '';
  const pc = v.premiere.gagne / v.premiere.n * 100;
  if (vous) return (premier === moi)
    ? _tr('Vous avez fait tomber la première bille. Dans les vraies parties, le camp qui fait tomber la première bille gagne ' + _sbPct(pc) + ' du temps.', 'You pushed off the first marble. In real games, the side that pushes off the first marble wins ' + _sbPct(pc) + ' of the time.')
    : _tr('L’adversaire a fait tomber la première bille. Dans les vraies parties, le camp qui fait tomber la première bille gagne ' + _sbPct(pc) + ' du temps.', 'Your opponent pushed off the first marble. In real games, the side that pushes off the first marble wins ' + _sbPct(pc) + ' of the time.');
  return _tr('Les ' + nomCamp(premier) + ' ont fait tomber la première bille. Dans les vraies parties, ce camp gagne ' + _sbPct(pc) + ' du temps.', nomCamp(premier) + ' pushed off the first marble. In real games, that side wins ' + _sbPct(pc) + ' of the time.');
}

