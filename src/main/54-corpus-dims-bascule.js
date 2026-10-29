/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : LA MATRICE DES 12 DIMENSIONS, LES DIMENSIONS AU FIL
   DE LA PARTIE, LE POINT DE NON-RETOUR (v2.86)
   Demande d'Olivier (« Go »), apres l'audit d'une nouvelle liste d'idees
   d'une autre IA : les trois qui n'etaient pas deja sur le site.
   1. la matrice complete des correlations des 12 dimensions (avant : les 5
      liens les plus forts seulement) ;
   2. les 12 dimensions au fil de la partie, pour le camp qui va gagner et
      celui qui va perdre ;
   3. le point de non-retour : le demi-coup a partir duquel le futur
      vainqueur n'est plus jamais rejoint au score (l'idee de « coup
      decisif », mesuree exactement sur le score plutot que sur une
      evaluation).
   Donnees : les empreintes des positions (12 dimensions) et STATS_PARTIES.
═══════════════════════════════════════════ */

/* ─── 1. La matrice des correlations (appelee par _dimsCorrelations, 34) ─── */
function _cdMatrice(corr){
  if (!corr || !corr.pairs) return '';
  const F = EMPREINTES_CHAMPS, R = {};
  corr.pairs.forEach(function(p){ R[p.a + '|' + p.b] = p.r; R[p.b + '|' + p.a] = p.r; });
  const lignes = F.map(function(ch, i){ return (i + 1) + '. ' + _labelDimension(ch); }), colonnes = F.map(function(ch, i){ return String(i + 1); });
  return '<div class="gr-titre">' + _tr('Toutes les paires', 'Every pair') + '</div><div class="gr-sous">'
    + _tr('La corrélation entre chaque paire de dimensions, en centièmes : 100, elles montent et descendent ensemble ; −100, l’une monte quand l’autre descend ; 0, aucun lien. Colonnes : le numéro de la dimension.',
          'The correlation between every pair of dimensions, in hundredths: 100, they rise and fall together; −100, one rises when the other falls; 0, no link. Columns: the dimension’s number.') + '</div>'
    + grCarte(lignes, colonnes, function(i, j){
      if (i === j) return { v: null, txt: '' };
      const r = R[F[i] + '|' + F[j]]; if (r == null) return { v: null, txt: '' };
      return { v: r, txt: String(Math.round(100 * r)).replace('-', '−'), tip: _labelDimension(F[i]) + ' ↔ ' + _labelDimension(F[j]) + _dimDp() + _dimDec(r, 3) };
    }, { echelle: 'signe', centre: 0, min: -1, max: 1, legende: [_tr('l’une monte, l’autre descend', 'one rises, the other falls'), _tr('elles vont ensemble', 'they go together')] });
}

/* ─── 2. Les 12 dimensions au fil de la partie ───
   Empreinte {m, c} : la position apres m + 1 demi-coups, vue du camp c qui vient de jouer. Parties au
   vainqueur connu des filtres de la page ; tranches de 10 demi-coups ; moyenne par camp (futur vainqueur,
   futur perdant). */
const CD_TRANCHE = 10, CD_NB = 16, CD_MIN = 200;
let _cdEvoCache = null;
function _cdEvolution(L){
  const K = (typeof _empCorpusDonnees === 'function') ? _empCorpusDonnees() : null;
  if (!K || typeof EMPREINTES_HISTORIQUES === 'undefined') return null;
  const cle = (_cfActif() ? _cfCle(_corpusFiltre) : '') + '|' + K.n;
  if (_cdEvoCache && _cdEvoCache.cle === cle) return _cdEvoCache.r;
  const D = STATS_PARTIES, P = EMPREINTES_HISTORIQUES, C = (typeof EMPREINTES_COMPLEMENT !== 'undefined' && EMPREINTES_COMPLEMENT) ? EMPREINTES_COMPLEMENT : null;
  const debut = [0, D.nb[0], D.nb[0] + D.nb[1], D.nb[0] + D.nb[1] + D.nb[2]];
  const gagnant = new Uint8Array(D.p.length); L.forEach(function(x){ if (x.p[0] === 1 || x.p[0] === 2) gagnant[x.k] = x.p[0]; });
  const ND = EMPREINTES_CHAMPS.length;
  // [camp : 0 futur vainqueur, 1 futur perdant][tranche] -> sommes par dimension, et nombre de positions ; et le total pour l'ecart-type
  const S = [new Float64Array(CD_NB * ND), new Float64Array(CD_NB * ND)], N = [new Float64Array(CD_NB), new Float64Array(CD_NB)];
  const T = new Float64Array(ND), T2 = new Float64Array(ND); let n = 0;
  const lire = function(i, k, m, couleur){
    const g = gagnant[k]; if (!g) return;
    const camp = (g === 1) === (couleur === 0) ? 0 : 1, b = Math.min(CD_NB - 1, Math.floor((m + 1) / CD_TRANCHE));
    N[camp][b]++; n++;
    for (let c = 0; c < ND; c++) { const v = K.cols[c][i]; S[camp][b * ND + c] += v; T[c] += v; T2[c] += v * v; }
  };
  for (let i = 0; i < K.nP; i++) { const p = P[i]; lire(i, (p.s === 'MIGS' ? debut[0] : debut[1]) + p.g, p.m, p.c === 'black' ? 0 : 1); }
  for (let j = 0; C && j < K.nC; j++) lire(K.nP + j, debut[2 + C.source[j]] + C.partie[j], C.m[j], C.couleur[j]);
  const dims = EMPREINTES_CHAMPS.map(function(ch, c){
    const moy = n ? T[c] / n : 0, et = n ? Math.sqrt(Math.max(0, T2[c] / n - moy * moy)) : 0;
    const serie = function(camp){ const out = []; for (let b = 0; b < CD_NB; b++) if (N[camp][b] >= CD_MIN) out.push([b * CD_TRANCHE, S[camp][b * ND + c] / N[camp][b] / 1000]); return out; };
    return { ch: ch, v: serie(0), p: serie(1), et: et / 1000 };
  });
  const r = { dims: dims, n: n };
  _cdEvoCache = { cle: cle, r: r };
  return r;
}
function _cdHtmlEvolution(L){
  const R = _cdEvolution(L);
  if (!R) return _carteStats(_tr('Les 12 dimensions au fil de la partie', 'The 12 dimensions through the game'), '<div class="gr-vide">' + _tr('Chargement des positions mesurées…', 'Loading the measured positions…') + '</div>');
  if (!R.n) return '';
  // l'ecart vainqueur - perdant, en ecarts-types, a la tranche des demi-coups 20 a 29 : ce qui se voit tot
  const ecart = function(d, b){ const a = d.v.find(function(p){ return p[0] === b; }), q = d.p.find(function(p){ return p[0] === b; }); return (a && q && d.et) ? (a[1] - q[1]) / d.et : null; };
  const tot = R.dims.map(function(d){ return { d: d, e: ecart(d, 20) }; }).filter(function(x){ return x.e != null && x.d.ch !== 'materialDiff'; }).sort(function(a, b){ return Math.abs(b.e) - Math.abs(a.e); }).slice(0, 3);
  const signe = function(e){ return (e > 0 ? '+' : '−') + grNb(Math.abs(e), 2); };
  let h = '<div class="gr-sous">' + _tr('Chaque petit graphique : la valeur moyenne de la dimension, par tranche de 10 demi-coups, pour le camp qui <b style="color:' + GR_POS + '">va gagner</b> et celui qui <b style="color:' + GR_NEG + '">va perdre</b> (parties au vainqueur connu). Les deux nombres en haut : la dernière tranche. Les courbes s’écartent là où la partie se joue.',
    'Each small chart: the average value of the dimension, per stretch of 10 plies, for the side that <b style="color:' + GR_POS + '">will win</b> and the one that <b style="color:' + GR_NEG + '">will lose</b> (games with a known winner). The two numbers at the top: the last stretch. The curves part where the game is decided.') + '</div>';
  h += grMultiples(0, R.dims.map(function(d){ return { nom: _labelDimension(d.ch), pts: d.v, pts2: d.p }; }), { couleurs: [GR_POS, GR_NEG], nomX: _tr('demi-coup ', 'ply '), fmt: function(v){ return grNb(v, Math.abs(v) >= 10 ? 0 : 2); } });
  if (tot.length) h += '<div class="gr-sous">' + _tr('Ce qui sépare déjà les deux camps entre les demi-coups 20 et 29, avant que les billes ne tombent vraiment (en écarts-types, futur vainqueur moins futur perdant) : ', 'What already sets the two sides apart between plies 20 and 29, before marbles really start falling (in standard deviations, future winner minus future loser): ')
    + tot.map(function(x){ return '<b>' + grEchapper(_labelDimension(x.d.ch)) + '</b> (' + signe(x.e) + ')'; }).join(', ') + '.</div>';
  h += grChiffres([_tr('Dimension', 'Dimension'), _tr('Demi-coups', 'Plies'), _tr('Futur vainqueur', 'Future winner'), _tr('Futur perdant', 'Future loser')],
    [].concat.apply([], R.dims.map(function(d){ return d.v.map(function(p){ const q = d.p.find(function(x){ return x[0] === p[0]; }); return [_labelDimension(d.ch), p[0] + '–' + (p[0] + CD_TRANCHE - 1), grNb(p[1], 3), q ? grNb(q[1], 3) : '—']; }); })));
  return _carteStats(_tr('Les 12 dimensions au fil de la partie', 'The 12 dimensions through the game') + _cfMarque(), h,
    _tr(grCompact(R.n) + ' positions mesurées. Une tranche a sa valeur à partir de ' + CD_MIN + ' positions par camp. Chaque position est vue du camp qui vient de jouer. C’est un lien, pas une cause.',
        grCompact(R.n) + ' measured positions. A stretch has its value from ' + CD_MIN + ' positions per side. Each position is seen from the side that has just moved. It is a link, not a cause.'));
}

/* ─── 3. Le point de non-retour ───
   Parties au vainqueur connu. Au fil des ejections, l'ecart au score du futur vainqueur ; le point de
   non-retour : l'ejection apres laquelle cet ecart reste positif jusqu'a la fin. Une partie gagnee sans
   mener au score a la fin (abandon, temps, a egalite ou mene) n'en a pas. */
function _cdPointPartie(p){
  const g = p[0]; if (g !== 1 && g !== 2) return null;
  const ej = p[4]; let w = 0, l = 0, point = null;
  for (let i = 0; i < ej.length; i += 2) {
    const parVainqueur = ((ej[i + 1] & 1) ? 1 : 2) === g;   // bit 1 : une bille blanche tombe, poussee par les Noirs
    const avant = w - l;
    if (parVainqueur) w++; else l++;
    if (w - l > 0 && avant <= 0) point = { ply: ej[i], w: w, l: l };   // l'ecart redevient positif : un nouveau candidat
    if (w - l <= 0) point = null;                                        // rejoint : le candidat tombe
  }
  return point;
}
function _cdBascule(L){
  const r = { n: 0, sans: 0, plies: [], parts: [], scores: {}, premiere: 0 };
  L.forEach(function(x){
    const g = x.p[0]; if (g !== 1 && g !== 2) return;
    r.n++;
    const pt = _cdPointPartie(x.p);
    if (!pt) { r.sans++; return; }
    r.plies.push(pt.ply); if (x.p[1]) r.parts.push(pt.ply / x.p[1]);
    const s = pt.w + '-' + pt.l; r.scores[s] = (r.scores[s] || 0) + 1;
    if (pt.w === 1 && pt.l === 0) r.premiere++;
  });
  return r;
}
function _cdHtmlBascule(L, W){
  const r = _cdBascule(L); if (!r.n || !r.plies.length) return '';
  const tri = r.plies.slice().sort(function(a, b){ return a - b; }), med = grQuantile(tri, 0.5);
  const avec = r.plies.length, top = Object.keys(r.scores).sort(function(a, b){ return r.scores[b] - r.scores[a]; }).slice(0, 5);
  let h = '<div class="gr-sous">' + _tr('Le point de non-retour : la bille après laquelle le futur vainqueur mène au score jusqu’à la fin, sans jamais être rejoint. Avant, la partie pouvait encore basculer ; après, elle ne bascule plus.',
    'The point of no return: the marble after which the future winner leads on the score to the end, never caught up again. Before it, the game could still turn; after it, it no longer does.') + '</div>';
  h += grTuiles([
    { lab: _tr('Point de non-retour (médiane)', 'Point of no return (median)'), v: _tr('demi-coup ', 'ply ') + grNb(med, 0), sous: _tr('8 sur 10 entre ', '8 in 10 between ') + grNb(grQuantile(tri, 0.1), 0) + _tr(' et ', ' and ') + grNb(grQuantile(tri, 0.9), 0) },
    { lab: _tr('À quel moment de la partie', 'At what point of the game'), v: r.parts.length ? grPct(grQuantile(r.parts.slice().sort(function(a, b){ return a - b; }), 0.5)) : '—', sous: _tr('de sa durée, en médiane', 'of its length, as a median') },
    { lab: _tr('Dès la première bille', 'From the very first marble'), v: grPct(r.premiere / avec), sous: _tr('le vainqueur mène 1-0 et n’est plus jamais rejoint', 'the winner leads 1-0 and is never caught up again') },
    { lab: _tr('Sans point de non-retour', 'With no point of no return'), v: grPct(r.sans / r.n), sous: _tr('gagnées sans mener au score à la fin (abandon, temps, à égalité ou mené)', 'won without leading on the score at the end (resignation, time, level or behind)') }
  ]);
  const bins = []; for (let b = 0; b < 16; b++) bins.push(0);
  r.plies.forEach(function(p){ bins[Math.min(15, Math.floor(p / 10))]++; });
  h += '<div class="gr-titre">' + _tr('Quand la partie ne bascule plus', 'When the game stops turning') + '</div>'
    + grColonnes(W, bins.map(function(v, b){ return { lab: b === 15 ? '150+' : String(b * 10), v: v, tip: (b === 15 ? _tr('150 demi-coups et plus', '150 plies and more') : _tr(b * 10 + ' à ' + (b * 10 + 9) + ' demi-coups', b * 10 + ' to ' + (b * 10 + 9) + ' plies')) + _dimDp() + grNb(v) + _tr(' parties', ' games') }; }), { titreX: _tr('demi-coups', 'plies'), aria: _tr('Demi-coup du point de non-retour', 'Ply of the point of no return') });
  h += '<div class="gr-titre">' + _tr('Le score au point de non-retour', 'The score at the point of no return') + '</div>'
    + grBarres(top.map(function(s){ const n = r.scores[s]; return { lab: s.replace('-', ' – '), v: n / avec, txt: grPct(n / avec) + ' <span class="sb-marge">' + grNb(n) + '</span>' }; }), { min: 0, max: Math.max.apply(null, top.map(function(s){ return r.scores[s] / avec; })) })
    + '<div class="gr-sous">' + _tr('Vainqueur – perdant, juste après la bille qui fait le point de non-retour.', 'Winner – loser, just after the marble that makes the point of no return.') + '</div>';
  return _carteStats(_tr('Le point de non-retour', 'The point of no return') + _cfMarque(), h,
    _tr('Mesuré sur le score, demi-coup par demi-coup, dans les ' + grNb(r.n) + ' parties au vainqueur connu : pas d’évaluation, pas d’avis. Les parties MIGS n’ont de vainqueur connu que si elles finissent au score : elles ont donc toutes un point de non-retour.',
        'Measured on the score, ply by ply, in the ' + grNb(r.n) + ' games with a known winner: no evaluation, no opinion. MIGS games only have a known winner when they end on the score, so they all have a point of no return.'));
}

/* ─── Tout redessiner (appele par _cfRendreTout, 48-corpus-plus.js) ─── */
function _cdRendreTout(){
  if (!STATS_PARTIES) return;
  const L = _cfParties();
  const hb = document.getElementById('corpus-bascule'); if (hb) hb.innerHTML = _cdHtmlBascule(L, grLargeur(hb, 640) - 40);
  const he = document.getElementById('dims-evolution'); if (he) he.innerHTML = _cdHtmlEvolution(L);
  if (!_cdEvolution(L) && typeof ensureEmpreintesHistoriques === 'function') {
    Promise.all([ensureEmpreintesHistoriques(), typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true]).then(function(){
      const el = document.getElementById('dims-evolution'); if (el && STATS_PARTIES) el.innerHTML = _cdHtmlEvolution(_cfParties());
    });
  }
  grSurRedim('corpus-cd', 'corpus-bascule', function(){ const el = document.getElementById('corpus-bascule'); if (el && STATS_PARTIES) el.innerHTML = _cdHtmlBascule(_cfParties(), grLargeur(el, 640) - 40); });
}
</script>
