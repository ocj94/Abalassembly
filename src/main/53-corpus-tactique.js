/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : TEMPS MORTS, SORTIE DU CORPUS, POSITIONS DEJA VUES,
   BILLES SEULES, CONTACTS, CE QUI SE DEGRADE AVANT UNE BILLE PERDUE (v2.83)
   Demande d'Olivier (« Toute ») : les propositions retenues apres l'audit de
   deux listes d'idees d'une autre IA (les chiffres annonces y etaient des
   paris ; ici, tout est compte sur les vraies parties).
   1. la plus longue periode sans bille tombee ;
   2. la sortie du corpus : a quel demi-coup une partie ne ressemble plus a
      aucune autre ;
   3. les positions deja vues dans une autre partie, et les transpositions ;
   4. les billes seules : combien de temps elles tiennent, et leur risque ;
   5. les contacts entre billes noires et blanches, et les ejections qui suivent ;
   6. ce qui se degrade, dans les 12 dimensions, juste avant de perdre une bille.
   Donnees : STATS_PARTIES (champs 12 et 13, et ext, ecrits en v2.83 par
   tools/stats-parties.js) et les empreintes des positions (12 dimensions).
═══════════════════════════════════════════ */
const C3_MIN_GROUPE = 20;   // sortie du corpus, positions deja vues : parties parties d'une position que 20 parties au moins partagent

function _c3Med(t){ return grQuantile(t.slice().sort(function(a, b){ return a - b; }), 0.5); }
function _c3Pct(x){ return grPct(x, x != null && x < 0.1 ? 1 : 0); }   // une decimale sous 10 % : « 0,5 % », pas « 0 % »

/* ─── 1. Les temps morts : la plus longue periode sans bille tombee ───
   Une periode : du debut a la 1re bille, entre deux billes, ou de la derniere bille a la fin. */
function _c3Periodes(p){
  const ej = p[4], n = p[1], ecarts = [];
  let prec = 0, max = 0, apres = 0;
  for (let i = 0; i < ej.length; i += 2) { const d = ej[i] - prec; if (d > max) max = d; if (i) { ecarts.push(d); if (d > apres) apres = d; } prec = ej[i]; }
  const fin = n - prec; if (fin > max) max = fin; if (ej.length && fin > apres) apres = fin;
  return { max: max, apres: ej.length ? apres : null, ecarts: ecarts };
}
function _c3TempsMorts(L){
  const r = { max: [], apres: [], ecarts: [], record: null };
  L.forEach(function(x){
    const P = _c3Periodes(x.p);
    r.max.push(P.max); if (P.apres != null) r.apres.push(P.apres); P.ecarts.forEach(function(e){ r.ecarts.push(e); });
    if (!r.record || P.max > r.record.d) r.record = { d: P.max, k: x.k };
  });
  return r;
}
function _c3HtmlTempsMorts(L, W){
  const r = _c3TempsMorts(L); if (!r.max.length) return '';
  const longues = r.max.filter(function(d){ return d >= 60; }).length;
  let h = grTuiles([
    { lab: _tr('Plus longue période sans bille tombée', 'Longest stretch without a marble falling'), v: grNb(_c3Med(r.max), 0) + _tr(' demi-coups', ' plies'), sous: _tr('médiane, partie par partie (début compris)', 'median, game by game (opening included)') },
    { lab: _tr('Après la première bille', 'After the first marble'), v: r.apres.length ? grNb(_c3Med(r.apres), 0) + _tr(' demi-coups', ' plies') : '—', sous: _tr('la plus longue, en médiane', 'the longest, as a median') },
    { lab: _tr('Entre deux billes', 'Between two marbles'), v: r.ecarts.length ? grNb(_c3Med(r.ecarts), 0) + _tr(' demi-coups', ' plies') : '—', sous: _tr('écart médian entre deux billes qui tombent', 'median gap between two falling marbles') },
    { lab: _tr('Au moins 60 demi-coups sans bille', 'At least 60 plies without a marble'), v: grPct(longues / r.max.length), sous: grMarge(longues, r.max.length) + ' · ' + grNb(longues) + _tr(' parties', ' games') }
  ]);
  const bins = []; for (let b = 0; b < 16; b++) bins.push(0);
  r.max.forEach(function(d){ bins[Math.min(15, Math.floor(d / 10))]++; });
  h += '<div class="gr-titre">' + _tr('La plus longue période sans bille, partie par partie', 'The longest stretch without a marble, game by game') + '</div>'
    + grColonnes(W, bins.map(function(v, b){ return { lab: b === 15 ? '150+' : String(b * 10), v: v, tip: (b === 15 ? _tr('150 demi-coups et plus', '150 plies and more') : _tr(b * 10 + ' à ' + (b * 10 + 9) + ' demi-coups', b * 10 + ' to ' + (b * 10 + 9) + ' plies')) + _dimDp() + grNb(v) + _tr(' parties', ' games') }; }), { titreX: _tr('demi-coups', 'plies'), aria: _tr('Plus longue période sans bille', 'Longest stretch without a marble') });
  if (r.record) {
    const x = _cfPartieDe(r.record.k);
    if (x) h += '<div class="gr-sous">' + _tr('Le record : ' + grNb(r.record.d) + ' demi-coups sans qu’aucune bille ne tombe', 'The record: ' + grNb(r.record.d) + ' plies without any marble falling') + ' (' + _cfNomSourceCourt(x.s) + ', ' + grEchapper(x.date) + ', ' + grEchapper(String(x.noirs || '?')) + ' – ' + grEchapper(String(x.blancs || '?')) + '). '
      + '<button type="button" class="ctrl-btn" style="width:auto;padding:3px 10px" onclick="corpusRevoir(' + r.record.k + ')">▶ ' + _tr('Revoir', 'Replay') + '</button></div>';
  }
  return _carteStats(_tr('Les temps morts', 'The quiet stretches') + _cfMarque(), h,
    _tr('Une période : du début à la première bille, entre deux billes, ou de la dernière bille à la fin de la partie. Une longue période sans bille n’est pas forcément calme : les deux camps peuvent manœuvrer sans jamais laisser d’ouverture.',
        'A stretch: from the start to the first marble, between two marbles, or from the last marble to the end of the game. A long stretch without a marble is not necessarily quiet: both sides may manoeuvre without ever leaving an opening.'));
}

/* ─── 2. La sortie du corpus ───
   p[13] = [sortie, vue, groupe, reperes] (voir tools/stats-parties.js). Seules les parties parties d'une
   position partagee par C3_MIN_GROUPE parties au moins : une disposition rare sort « tout de suite ». */
function _c3Groupe(L){ return L.filter(function(x){ return x.p[13] && x.p[13][2] >= C3_MIN_GROUPE; }); }
function _c3Sortie(L){
  const D = STATS_PARTIES, T = {};
  _c3Groupe(L).forEach(function(x){
    const d = D.dispos[x.p[3]]; if (d === 'custom') return;
    const t = T[d] || (T[d] = { d: d, n: 0, sorties: [], jamais: 0 });
    t.n++; if (x.p[13][0]) t.sorties.push(x.p[13][0]); else t.jamais++;
  });
  return Object.keys(T).map(function(d){ return T[d]; }).sort(function(a, b){ return b.n - a.n; });
}
// part des parties encore « dans le corpus » apres t demi-coups (une partie jamais sortie y reste)
function _c3EncoreDedans(t, ply){ return t.n ? (t.sorties.filter(function(s){ return s > ply; }).length + t.jamais) / t.n : null; }
function _c3HtmlSortie(L, W){
  const T = _c3Sortie(L).filter(function(t){ return t.n >= C3_MIN_GROUPE; });
  if (!T.length) return '';
  const t0 = T[0], med0 = t0.sorties.length ? _c3Med(t0.sorties) : null;
  let h = '<div class="gr-sous">' + _tr('Le demi-coup où la suite des coups d’une partie ne se retrouve plus dans aucune autre partie du corpus partie de la même position — comme aux échecs, quand une partie « sort du livre ». Un coup est reconnu à ses billes et à sa direction, quelle que soit son écriture.',
    'The ply where a game’s sequence of moves no longer appears in any other corpus game from the same position — like a chess game “leaving the book”. A move is recognised by its marbles and direction, whatever its notation.') + '</div>';
  h += grTuiles([
    { lab: _tr('Sortie du corpus', 'Out of the corpus') + ' — ' + _cfNomDispo(t0.d), v: med0 != null ? _tr('demi-coup ', 'ply ') + grNb(med0, 0) : '—', sous: _tr('médiane, sur ', 'median, over ') + grNb(t0.n) + _tr(' parties', ' games') },
    { lab: _tr('Encore dans le corpus au 10ᵉ demi-coup', 'Still in the corpus at ply 10'), v: _c3Pct(_c3EncoreDedans(t0, 10)), sous: _cfNomDispo(t0.d) },
    { lab: _tr('Au 20ᵉ demi-coup', 'At ply 20'), v: _c3Pct(_c3EncoreDedans(t0, 20)), sous: _cfNomDispo(t0.d) },
    { lab: _tr('Jamais sorties', 'Never out'), v: grNb(t0.jamais), sous: _tr('suite identique à une autre partie jusqu’à leur fin (ou au-delà de 80 demi-coups)', 'same sequence as another game to their end (or beyond 80 plies)') }
  ]);
  // la courbe : part des parties encore dans le corpus, demi-coup par demi-coup, pour les 4 dispositions les plus jouees
  const plies = []; for (let p = 0; p <= 30; p++) plies.push(p);
  const series = T.slice(0, 4).map(function(t, i){ return { nom: _cfNomDispo(t.d) + ' (' + grNb(t.n) + ')', couleur: GR_SERIES[i], pts: plies.map(function(p){ return [p, 100 * _c3EncoreDedans(t, p)]; }) }; });
  h += '<div class="gr-titre">' + _tr('Encore dans le corpus, demi-coup après demi-coup', 'Still in the corpus, ply after ply') + '</div>'
    + grLignes(W, series, { yMin: 0, yMax: 100, titreX: _tr('demi-coup', 'ply'), nomX: _tr('demi-coup', 'ply'), fmtY: function(v){ return grNb(v, 0) + ' %'; }, aria: _tr('Part des parties encore dans le corpus', 'Share of games still in the corpus') });
  h += '<div class="gr-titre">' + _tr('Le demi-coup de sortie, disposition par disposition', 'The ply of exit, layout by layout') + '</div>'
    + grBoites(T.slice(0, 10).map(function(t){ return { lab: _cfNomDispo(t.d) + ' · ' + grNb(t.n), vals: t.sorties }; }), { min: 0 });
  return _carteStats(_tr('Quand une partie sort du corpus', 'When a game leaves the corpus') + _cfMarque(), h,
    _tr('Mesuré contre toutes les parties du corpus (toutes sources), même quand un filtre est posé : le filtre choisit les parties montrées, pas celles auxquelles on les compare. Plus le corpus grandit, plus les parties en sortent tard. Seules comptent les parties dont la position de départ est partagée par au moins ' + C3_MIN_GROUPE + ' parties ; la disposition libre est exclue.',
        'Measured against every corpus game (all sources), even with a filter: the filter picks the games shown, not those they are compared with. The bigger the corpus, the later games leave it. Only games whose starting position is shared by at least ' + C3_MIN_GROUPE + ' games count; the custom layout is left out.'));
}

/* ─── 3. Les positions deja vues ───
   reperes (p[13][3]) : aux demi-coups _SB_BRANCHES, '.' pas atteinte, '0' nouvelle, '1' dans une autre partie
   par le meme chemin, '2' dans une autre partie par d'autres coups (transposition). */
function _c3DejaVues(L){
  const G = _c3Groupe(L), R = _SB_BRANCHES.map(function(ply){ return { ply: ply, n: 0, vue: 0, trans: 0 }; }), vue = [];
  G.forEach(function(x){
    const b = x.p[13][3];
    for (let i = 0; i < R.length; i++) { const c = b.charAt(i); if (c === '.' || !c) continue; R[i].n++; if (c !== '0') R[i].vue++; if (c === '2') R[i].trans++; }
    vue.push(x.p[13][1]);
  });
  return { pts: R, vue: vue, n: G.length };
}
function _c3HtmlDejaVues(L, W){
  const V = _c3DejaVues(L), P = V.pts.filter(function(p){ return p.n >= GR_PEU && p.ply <= 60; });   // au-dela, presque rien n'est deja vu
  if (!P.length) return '';
  const a = function(ply){ return V.pts.find(function(p){ return p.ply === ply; }); };
  const tuile = function(ply){ const p = a(ply); return { lab: _tr('Au ' + ply + 'ᵉ demi-coup', 'At ply ' + ply), v: p && p.n ? _c3Pct(p.vue / p.n) : '—', sous: p && p.n ? _tr('des positions existent dans une autre partie', 'of positions exist in another game') + ' · ' + grNb(p.n) : '' }; };
  let h = '<div class="gr-sous">' + _tr('La position au moment de jouer (le plateau exact, et le camp au trait) existe-t-elle dans une autre partie du corpus, à n’importe quel moment de celle-ci ? Comparaison case par case.',
    'Does the position at the moment of moving (the exact board, and the side to move) exist in another corpus game, at any point of it? Cell-by-cell comparison.') + '</div>';
  h += grTuiles([tuile(10), tuile(20), tuile(30), { lab: _tr('En terrain connu jusqu’au', 'On known ground until'), v: V.vue.length ? _tr('demi-coup ', 'ply ') + grNb(_c3Med(V.vue), 0) : '—', sous: _tr('médiane : la dernière position de la partie qu’on retrouve ailleurs', 'median: the last position of the game found elsewhere') }]);
  h += grLignes(W, [
    { nom: _tr('déjà vue dans une autre partie', 'already seen in another game'), couleur: GR_OR, pts: P.map(function(p){ return [p.ply, 100 * p.vue / p.n]; }), points: true },
    { nom: _tr('atteinte là-bas par d’autres coups (transposition)', 'reached there by other moves (transposition)'), couleur: GR_SERIES[0], pts: P.map(function(p){ return [p.ply, 100 * p.trans / p.n]; }), points: true }
  ], { yMin: 0, yMax: 100, titreX: _tr('demi-coup', 'ply'), nomX: _tr('demi-coup', 'ply'), fmtY: function(v){ return grNb(v, 0) + ' %'; }, aria: _tr('Positions déjà vues selon le moment', 'Positions already seen by moment'),
    fmtTip: function(v, sr, x){ const p = a(x); return grNb(v, 1) + ' % (' + grNb(p.n) + _tr(' parties', ' games') + ')'; } });
  const t10 = a(10);
  if (t10 && t10.vue) h += '<div class="gr-sous">' + _tr('Au 10ᵉ demi-coup, parmi les positions déjà vues ailleurs, ' + _c3Pct(t10.trans / t10.vue) + ' y ont été atteintes au même demi-coup par un autre ordre de coups : deux chemins pour arriver au même endroit (une transposition).',
    'At ply 10, among the positions already seen elsewhere, ' + _c3Pct(t10.trans / t10.vue) + ' were reached there at the same ply through another order of moves: two paths to the same place (a transposition).') + '</div>';
  h += grChiffres([_tr('Demi-coup', 'Ply'), _tr('Parties', 'Games'), _tr('Déjà vue', 'Already seen'), _tr('Transposition', 'Transposition')], V.pts.filter(function(p){ return p.n; }).map(function(p){ return [p.ply, p.n, grPct(p.vue / p.n, 1), grPct(p.trans / p.n, 1)]; }));
  return _carteStats(_tr('Les positions déjà vues', 'Positions already seen') + _cfMarque(), h,
    _tr('Comparé à toutes les parties du corpus, doublons exacts comptés une fois. Mêmes parties que la carte de la sortie du corpus (position de départ partagée par au moins ' + C3_MIN_GROUPE + ' parties).',
        'Compared with every corpus game, exact duplicates counted once. Same games as the card on leaving the corpus (starting position shared by at least ' + C3_MIN_GROUPE + ' games).'));
}

/* ─── 4. Les billes seules ───
   p[12] (rec.iso) : par camp, demi-coups passes seule / accompagnee par ses billes, billes tombees seules /
   accompagnees ; puis les periodes d'isolement finies par la chute, une voisine retrouvee, la fin.
   STATS_PARTIES.ext : les durees de ces periodes, sur tout le corpus. */
function _c3Seules(L){
  const r = { expS: 0, expA: 0, tomS: 0, tomA: 0, fin: [0, 0, 0], vainqueur: [0, 0], perdant: [0, 0] };
  L.forEach(function(x){
    const t = x.p[12]; if (!t) return;
    for (let c = 0; c < 2; c++) {
      const o = c * 4; r.expS += t[o]; r.expA += t[o + 1]; r.tomS += t[o + 2]; r.tomA += t[o + 3];
      const g = x.p[0]; if (g === 1 || g === 2) { const cible = (g === 1) === (c === 0) ? r.vainqueur : r.perdant; cible[0] += t[o]; cible[1] += t[o] + t[o + 1]; }
    }
    for (let i = 0; i < 3; i++) r.fin[i] += t[8 + i];
  });
  return r;
}
function _c3HtmlSeules(L, W){
  const r = _c3Seules(L), E = STATS_PARTIES.ext;
  if (!r.expS || !r.expA) return '';
  const risqueS = r.tomS / r.expS, risqueA = r.tomA / r.expA, nPer = r.fin[0] + r.fin[1] + r.fin[2];
  let h = '<div class="gr-sous">' + _tr('Une bille « seule » : aucune des six cases voisines ne porte une bille de sa couleur. Le risque : la part des demi-coups où une telle bille tombe au coup suivant de l’adversaire.',
    'A “lone” marble: none of its six neighbouring cells holds a marble of its colour. The risk: the share of plies where such a marble falls on the opponent’s next move.') + '</div>';
  h += grTuiles([
    { lab: _tr('Une bille seule tombe', 'A lone marble falls'), v: risqueA ? grNb(risqueS / risqueA, 1) + _tr(' fois plus', ' times more') : '—', sous: _tr('souvent qu’une bille accompagnée : ', 'often than an accompanied one: ') + grPct(risqueS, 2) + _tr(' de risque par demi-coup contre ', ' risk per ply against ') + grPct(risqueA, 2) },
    { lab: _tr('Billes tombées alors qu’elles étaient seules', 'Marbles that fell while alone'), v: grPct(r.tomS / (r.tomS + r.tomA)), sous: _tr('alors que les billes ne sont seules que ', 'while marbles are alone only ') + grPct(r.expS / (r.expS + r.expA), 1) + _tr(' du temps', ' of the time') },
    { lab: _tr('Une bille laissée seule…', 'A marble left alone…'), v: nPer ? grPct(r.fin[0] / nPer) + _tr(' tombe', ' falls') : '—', sous: nPer ? grPct(r.fin[1] / nPer) + _tr(' retrouve une voisine, ', ' finds a neighbour again, ') + grPct(r.fin[2] / nPer) + _tr(' reste seule jusqu’à la fin', ' stays alone to the end') : '' },
    { lab: _tr('Le perdant laisse ses billes seules', 'The loser leaves his marbles alone'), v: r.perdant[1] ? grPct(r.perdant[0] / r.perdant[1], 1) : '—', sous: r.vainqueur[1] ? _tr('du temps, le vainqueur ', 'of the time, the winner ') + grPct(r.vainqueur[0] / r.vainqueur[1], 1) : '' }
  ]);
  if (E && E.isoTombe) {
    // sur tout le corpus : la part des periodes d'isolement deja finies par la chute (ou par une voisine) apres t demi-coups
    const M = E.isoTombe.length - 1, tot = E.isoTombe.reduce(function(a, b){ return a + b; }, 0) + E.isoRejoint.reduce(function(a, b){ return a + b; }, 0) + _c3FinsCorpus();
    if (tot) {
      let cT = 0, cR = 0; const pT = [], pR = [];
      for (let t = 1; t <= Math.min(20, M); t++) { cT += E.isoTombe[t]; cR += E.isoRejoint[t]; pT.push([t, 100 * cT / tot]); pR.push([t, 100 * cR / tot]); }
      const medT = (function(){ const n = E.isoTombe.reduce(function(a, b){ return a + b; }, 0); let c = 0; for (let t = 0; t <= M; t++) { c += E.isoTombe[t]; if (c >= n / 2) return t; } return null; })();
      h += '<div class="gr-titre">' + _tr('Ce que devient une bille laissée seule', 'What becomes of a marble left alone') + '</div><div class="gr-sous">'
        + _tr('Sur 100 billes qui se retrouvent seules : combien sont déjà tombées, ou ont déjà retrouvé une voisine, t demi-coups plus tard. Quand elle tombe, c’est en médiane ' + grNb(medT) + ' demi-coups après s’être retrouvée seule.',
              'Out of 100 marbles left alone: how many have already fallen, or found a neighbour again, t plies later. When it falls, it is a median ' + grNb(medT) + ' plies after being left alone.') + '</div>'
        + grLignes(W, [{ nom: _tr('déjà tombée', 'already fallen'), couleur: GR_NEG, pts: pT }, { nom: _tr('voisine retrouvée', 'neighbour found again'), couleur: GR_POS, pts: pR }],
          { yMin: 0, titreX: _tr('demi-coups seule', 'plies alone'), nomX: _tr('après ', 'after '), fmtY: function(v){ return grNb(v, 0) + ' %'; }, aria: _tr('Devenir d’une bille seule', 'Fate of a lone marble') });
    }
  }
  return _carteStats(_tr('Les billes seules', 'Lone marbles') + _cfMarque(), h,
    _tr('Chaque bille est suivie d’un coup à l’autre, même poussée par l’adversaire. Les tuiles suivent les filtres ; la courbe porte sur tout le corpus (parties complètes, doublons comptés une fois). « Seule » ne veut pas dire « perdue » : dans les parties, la plupart des billes seules retrouvent une voisine.',
        'Every marble is followed from one move to the next, even when pushed by the opponent. The tiles follow the filters; the curve covers the whole corpus (complete games, duplicates counted once). “Alone” does not mean “lost”: in the games, most lone marbles find a neighbour again.'));
}
// periodes d'isolement finies par la fin de la partie, sur tout le corpus (meme perimetre que ext)
function _c3FinsCorpus(){
  const D = STATS_PARTIES; let n = 0;
  D.p.forEach(function(p, k){ if (p[2] && p[12] && !_sbEstDoublon(k)) n += p[12][10]; });
  return n;
}

/* ─── 5. Les contacts ───
   ext.contacts[c] = [positions avec c contacts (paires noire-blanche voisines), suivies d'une bille tombee
   dans les 3 demi-coups]. Tout le corpus. */
function _c3HtmlContacts(W){
  const E = STATS_PARTIES.ext; if (!E || !E.contacts) return '';
  const C = E.contacts, M = C.length - 1, P = [];
  C.forEach(function(h, c){ if (h[0] >= GR_PEU) { const w = grWilson(h[1], h[0]); P.push({ c: c, n: h[0], e: h[1], w: w }); } });
  if (!P.length) return '';
  const groupe = function(a, b){ let n = 0, e = 0; for (let c = a; c <= Math.min(b, M); c++) { n += C[c][0]; e += C[c][1]; } return { n: n, e: e }; };
  const G = [[0, 4], [5, 9], [10, 14], [15, M]].map(function(ab){ const g = groupe(ab[0], ab[1]); return { lab: ab[1] === M ? ab[0] + _tr(' et plus', ' and more') : ab[0] + '–' + ab[1], n: g.n, e: g.e }; });
  let h = '<div class="gr-sous">' + _tr('Les contacts : les paires de cases voisines qui portent une bille noire et une bille blanche. Pour chaque nombre de contacts, la part des positions où une bille tombe dans les 3 demi-coups suivants.',
    'Contacts: the pairs of neighbouring cells holding a black and a white marble. For each number of contacts, the share of positions where a marble falls within the next 3 plies.') + '</div>';
  h += grTuiles(G.map(function(g){ return { lab: _tr('Contacts : ', 'Contacts: ') + g.lab, v: g.n ? grPct(g.e / g.n) : '—', sous: g.n ? _tr('une bille tombe dans les 3 demi-coups', 'a marble falls within 3 plies') + ' · ' + grCompact(g.n) + _tr(' positions', ' positions') : '' }; }));
  h += grLignes(W, [{ nom: _tr('bille tombée dans les 3 demi-coups', 'marble fallen within 3 plies'), couleur: GR_OR, pts: P.map(function(p){ return [p.c, 100 * p.w.p]; }), bande: P.map(function(p){ return [p.c, 100 * p.w.bas, 100 * p.w.haut]; }) }],
    { yMin: 0, titreX: _tr('contacts', 'contacts'), nomX: _tr('contacts : ', 'contacts: '), fmtY: function(v){ return grNb(v, 0) + ' %'; }, aria: _tr('Éjections selon les contacts', 'Ejections by contacts'),
      fmtTip: function(v, sr, x){ const p = P.find(function(q){ return q.c === x; }); return grNb(v, 1) + ' % (' + grFourchette(p.e, p.n) + ', ' + grCompact(p.n) + _tr(' positions)', ' positions)'); } });
  h += grChiffres([_tr('Contacts', 'Contacts'), _tr('Positions', 'Positions'), _tr('Bille tombée dans les 3 demi-coups', 'Marble fallen within 3 plies'), '%'], C.map(function(x, c){ return [c === M ? c + '+' : c, x[0], x[1], x[0] ? grPct(x[1] / x[0], 1) : '—']; }).filter(function(l){ return l[1]; }));
  return _carteStats(_tr('Les contacts et les billes qui tombent', 'Contacts and falling marbles'), h,
    _tr('Tout le corpus : parties complètes, doublons comptés une fois, positions qui ont encore 3 demi-coups devant elles. La bande : la marge à 95 %. C’est un lien, pas une règle : beaucoup de contacts, c’est une position où les deux camps se touchent, donc où l’on peut pousser.',
        'The whole corpus: complete games, duplicates counted once, positions with 3 more plies ahead of them. The band: the 95 % margin. It is a link, not a rule: many contacts means a position where both sides touch, so where pushes are possible.'));
}

/* ─── 6. Ce qui se degrade avant une bille perdue ───
   Les empreintes (12 dimensions) sont enregistrees apres chaque coup, vues du camp qui vient de jouer :
   {m, c} = la position apres m + 1 demi-coups, vue de c. Une bille de V tombe au demi-coup P (joue par
   l'adversaire) : l'empreinte de V juste avant est celle de son dernier coup, m = P - 2 ; deux et trois de
   ses coups avant : m = P - 4, P - 6. Chaque valeur est comparee aux positions du meme moment de la
   partie (tranches de 10 demi-coups) : l'ecart en ecarts-types (z), moyenne sur toutes les billes perdues. */
let _c3AvantCache = null;
function _c3AvantPerte(L){
  const K = (typeof _empCorpusDonnees === 'function') ? _empCorpusDonnees() : null;
  if (!K || typeof EMPREINTES_HISTORIQUES === 'undefined') return null;
  const cle = (_cfActif() ? _cfCle(_corpusFiltre) : '') + '|' + K.n;
  if (_c3AvantCache && _c3AvantCache.cle === cle) return _c3AvantCache.r;
  const D = STATS_PARTIES, P = EMPREINTES_HISTORIQUES, C = (typeof EMPREINTES_COMPLEMENT !== 'undefined' && EMPREINTES_COMPLEMENT) ? EMPREINTES_COMPLEMENT : null;
  const debut = [0, D.nb[0], D.nb[0] + D.nb[1], D.nb[0] + D.nb[1] + D.nb[2]];
  const garde = new Uint8Array(D.p.length); L.forEach(function(x){ garde[x.k] = 1; });
  // les evenements : partie, coup m de l'empreinte, couleur de la victime (0 Noirs, 1 Blancs), et combien de ses coups avant (0, 1, 2)
  const evts = new Map();
  L.forEach(function(x){
    const ej = x.p[4];
    for (let i = 0; i < ej.length; i += 2) {
      const v = (ej[i + 1] & 1) ? 1 : 0;   // bit 1 : la bille tombee est blanche
      for (let j = 0; j < 3; j++) { const m = ej[i] - 2 - 2 * j, cle = x.k * 8192 + m * 2 + v, deja = evts.get(cle); if (m >= 0 && (deja === undefined || j < deja)) evts.set(cle, j); }
    }
  });
  const ND = EMPREINTES_CHAMPS.length, NB = 16;
  const S = new Float64Array(NB * ND), S2 = new Float64Array(NB * ND), N = new Float64Array(NB);
  const avant = [0, 1, 2].map(function(){ return { n: 0, z: new Float64Array(ND), idx: [] }; });
  const lire = function(i, k, m, couleur){
    if (!garde[k]) return;
    const b = Math.min(NB - 1, Math.floor((m + 1) / 10));
    N[b]++;
    for (let c = 0; c < ND; c++) { const v = K.cols[c][i]; S[b * ND + c] += v; S2[b * ND + c] += v * v; }
    const j = evts.get(k * 8192 + m * 2 + couleur);
    if (j !== undefined) avant[j].idx.push(i, b);
  };
  for (let i = 0; i < K.nP; i++) { const p = P[i]; lire(i, (p.s === 'MIGS' ? debut[0] : debut[1]) + p.g, p.m, p.c === 'black' ? 0 : 1); }
  for (let j = 0; C && j < K.nC; j++) lire(K.nP + j, debut[2 + C.source[j]] + C.partie[j], C.m[j], C.couleur[j]);
  avant.forEach(function(a){
    for (let t = 0; t < a.idx.length; t += 2) {
      const i = a.idx[t], b = a.idx[t + 1];
      if (N[b] < 2) continue;
      a.n++;
      for (let c = 0; c < ND; c++) {
        const moy = S[b * ND + c] / N[b], et = Math.sqrt(Math.max(0, S2[b * ND + c] / N[b] - moy * moy));
        if (et > 0) a.z[c] += (K.cols[c][i] - moy) / et;
      }
    }
    for (let c = 0; c < ND; c++) a.z[c] = a.n ? a.z[c] / a.n : 0;
    delete a.idx;
  });
  const r = { avant: avant, positions: N.reduce(function(s, x){ return s + x; }, 0) };
  _c3AvantCache = { cle: cle, r: r };
  return r;
}
function _c3HtmlAvantPerte(L){
  const R = _c3AvantPerte(L);
  if (!R) return _carteStats(_tr('Ce qui se dégrade avant une bille perdue', 'What deteriorates before a lost marble'), '<div class="gr-vide">' + _tr('Chargement des positions mesurées…', 'Loading the measured positions…') + '</div>');
  const A = R.avant[0]; if (!A.n) return '';
  const fmt = function(z){ return (z > 0 ? '+' : '') + grNb(z, 2); };
  const ordre = EMPREINTES_CHAMPS.map(function(ch, c){ return c; }).sort(function(a, b){ return Math.abs(A.z[b]) - Math.abs(A.z[a]); });
  const M = Math.max(0.5, Math.ceil(Math.max.apply(null, ordre.map(function(c){ return Math.abs(A.z[c]); })) * 4) / 4);
  let h = '<div class="gr-sous">' + _tr('Juste avant de perdre une bille (après son dernier coup), le camp qui va la perdre est-il différent de d’habitude ? Pour chacune des 12 dimensions, l’écart à la moyenne des positions du même moment de la partie, en écarts-types : 0, rien de spécial ; ±0,5, un écart net ; ±1, très marqué. Bleu : plus haut que d’habitude ; rouge : plus bas.',
    'Just before losing a marble (after its last move), is the side about to lose it different from usual? For each of the 12 dimensions, the gap to the average of positions at the same moment of the game, in standard deviations: 0, nothing special; ±0.5, a clear gap; ±1, very marked. Blue: higher than usual; red: lower.') + '</div>';
  h += grBarres(ordre.map(function(c){ const ch = EMPREINTES_CHAMPS[c];
    return { lab: _labelDimension(ch), v: A.z[c], txt: fmt(A.z[c]), tip: _labelDimension(ch) + _dimDp() + _tr('juste avant ', 'just before ') + fmt(A.z[c]) + ' · ' + _tr('2 coups avant ', '2 moves before ') + fmt(R.avant[1].z[c]) + ' · ' + _tr('3 coups avant ', '3 moves before ') + fmt(R.avant[2].z[c]) }; }),
    { min: -M, max: M, axe: ['−' + grNb(M, 2).replace('-', ''), '0', '+' + grNb(M, 2)] });
  // ce qui bouge le plus entre 3 coups avant et juste avant : ce qui « s'effondre »
  const pente = EMPREINTES_CHAMPS.map(function(ch, c){ return { c: c, d: A.z[c] - R.avant[2].z[c] }; }).sort(function(a, b){ return Math.abs(b.d) - Math.abs(a.d); });
  const top = pente.slice(0, 3).map(function(x){ return '<b>' + grEchapper(_labelDimension(EMPREINTES_CHAMPS[x.c])) + '</b> (' + fmt(R.avant[2].z[x.c]) + ' → ' + fmt(A.z[x.c]) + ')'; }).join(', ');
  h += '<div class="gr-sous">' + _tr('Ce qui change le plus entre trois coups avant et juste avant la perte : ', 'What changes the most between three moves before and just before the loss: ') + top + '.</div>';
  h += grChiffres([_tr('Dimension', 'Dimension'), _tr('3 coups avant', '3 moves before'), _tr('2 coups avant', '2 moves before'), _tr('Juste avant', 'Just before')],
    ordre.map(function(c){ return [_labelDimension(EMPREINTES_CHAMPS[c]), fmt(R.avant[2].z[c]), fmt(R.avant[1].z[c]), fmt(A.z[c])]; }));
  return _carteStats(_tr('Ce qui se dégrade avant une bille perdue', 'What deteriorates before a lost marble') + _cfMarque(), h,
    _tr(grNb(A.n) + ' billes perdues, comparées à ' + grCompact(R.positions) + ' positions mesurées des mêmes parties. C’est un lien, pas une cause : ces dimensions décrivent la position où l’on perd des billes, sans dire laquelle a fait la différence. La différence matérielle compte aussi le retard déjà pris.',
        grNb(A.n) + ' lost marbles, compared with ' + grCompact(R.positions) + ' measured positions of the same games. It is a link, not a cause: these dimensions describe the position where marbles are lost, without saying which one made the difference. The material difference also counts the deficit already taken.'));
}

/* ─── Tout redessiner (appele par _cfRendreTout, 48-corpus-plus.js) ─── */
function _c3RendreTout(){
  if (!STATS_PARTIES || !STATS_PARTIES.ext) return;
  const L = _cfParties();
  const pose = function(id, f){ const el = document.getElementById(id); if (el) el.innerHTML = f(grLargeur(el, 640) - 40); };
  pose('corpus-tempsmorts', function(W){ return _c3HtmlTempsMorts(L, W); });
  pose('corpus-sortie', function(W){ return _c3HtmlSortie(L, W); });
  pose('corpus-dejavues', function(W){ return _c3HtmlDejaVues(L, W); });
  pose('corpus-seules', function(W){ return _c3HtmlSeules(L, W); });
  pose('corpus-contacts', function(W){ return _c3HtmlContacts(W); });
  pose('corpus-avantperte', function(){ return _c3HtmlAvantPerte(L); });
  // les empreintes arrivent plus tard (chargement de la carte des 12 dimensions) : on redessine cette carte-la quand elles sont la
  if (!_c3AvantPerte(L) && typeof ensureEmpreintesHistoriques === 'function') {
    Promise.all([ensureEmpreintesHistoriques(), typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true]).then(function(){
      const el = document.getElementById('corpus-avantperte'); if (el && STATS_PARTIES) el.innerHTML = _c3HtmlAvantPerte(_cfParties());
    });
  }
  grSurRedim('corpus-c3', 'corpus-tempsmorts', function(){ _c3RendreTout(); });
}
