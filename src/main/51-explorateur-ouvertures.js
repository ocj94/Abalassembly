/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : L'EXPLORATEUR D'OUVERTURES DU CORPUS (v2.80)
   Demande d'ocj94 (point 2 des propositions d'IA) : comme l'explorateur d'ouvertures des
   echecs, mais sur TOUT le corpus -- les 4 577 parties distinctes, toutes les dispositions
   (sauf la disposition libre, ou chaque partie part d'un plateau different), et les filtres
   de la page (source, longueur, annee). La page Ouvertures garde le sien (2 126 parties de
   tournoi en Marguerite belge, 90 positions).
   - Un coup est reconnu a ses billes et a sa direction (canonId), pas a son ecriture : MIGS et
     AbalOnline ne notent pas les coups de la meme facon. Libelle affiche : l'ecriture la plus
     frequente parmi ses parties.
   - Les parties sont rejouees a la demande, un niveau a la fois (position gardee a chaque
     niveau du chemin) : le premier niveau rejoue un coup de chaque partie (environ une seconde
     pour les 2 700 parties de la Marguerite belge), les suivants beaucoup moins.
   - Pour chaque suite : le nombre de parties, la part gagnee par les Noirs (vainqueur connu),
     avec sa marge a 95 %, et la longueur mediane des parties.
═══════════════════════════════════════════ */
let _eoDispo = 'belgian', _eoChemin = [], _eoEtat = null, _eoTravail = null;
const EO_MIN_PARTIES = 30;          // une disposition a explorer : au moins 30 parties
const EO_ENFANTS = 12;              // suites montrees (les autres sont regroupees)
function _eoDispoActive(){ return (_corpusFiltre.dispo && _corpusFiltre.dispo !== 'tout') ? _corpusFiltre.dispo : _eoDispo; }
function _eoCle(){ return _cfCle(_corpusFiltre) + '#' + _eoDispoActive(); }
function _eoDisposPossibles(){
  const D = STATS_PARTIES, n = {};
  _cfParties().forEach(function(x){ const d = D.dispos[x.p[3]]; n[d] = (n[d] || 0) + 1; });
  return Object.keys(n).filter(function(d){ return d !== 'custom' && n[d] >= EO_MIN_PARTIES; }).sort(function(a, b){ return n[b] - n[a]; }).map(function(d){ return [d, n[d]]; });
}
// (re)part de la position de depart : les parties de la disposition, chacune avec son plateau
function _eoRacine(){
  const D = STATS_PARTIES, dispo = _eoDispoActive(), parties = [];
  _cfParties().forEach(function(x){
    if (D.dispos[x.p[3]] !== dispo) return;
    const pd = _cfPartieDe(x.k); if (!pd) return;
    const dep = _sbDepart(pd.s, pd.g); if (!dep) return;
    parties.push({ k: x.k, p: x.p, jetons: _sbJetons(pd.s, pd.g), board: dep.board, col: 'black' });
  });
  _eoEtat = { cle: _eoCle(), niveaux: [{ parties: parties, suite: null }] };
}
// le coup suivant de chaque partie du dernier niveau, par tranches (la page reste utilisable)
function _eoCalculerSuite(fin){
  const niv = _eoEtat.niveaux[_eoEtat.niveaux.length - 1], d = _eoEtat.niveaux.length - 1, P = niv.parties, suite = new Array(P.length);
  const jeton = {}; _eoTravail = jeton;
  let i = 0;
  const tranche = function(){
    if (_eoTravail !== jeton) return;
    const sauve = board;
    try {
      for (let n = 0; n < 150 && i < P.length; n++, i++) {
        const x = P[i]; if (x.jetons.length <= d) continue;
        board = x.board;
        const legal = getAllMovesForColor(x.col), mv = resolveAbaProToken(x.jetons[d], x.col, legal);
        if (mv) suite[i] = { id: canonId(mv), mv: mv, tok: x.jetons[d] };
      }
    } finally { board = sauve; }
    if (i < P.length) { _eoRendre(_tr('⏳ Lecture des parties : ', '⏳ Reading the games: ') + Math.round(100 * i / P.length) + ' %'); setTimeout(tranche, 0); }
    else { niv.suite = suite; _eoTravail = null; fin(); }
  };
  tranche();
}
function corpusOuvertureAller(niveau, id){
  if (!_eoEtat) return;
  _eoEtat.niveaux.length = niveau + 1; _eoChemin.length = niveau;
  if (id != null) {
    const niv = _eoEtat.niveaux[niveau], enfants = [], sauve = board;
    try {
      niv.parties.forEach(function(x, i){
        const s = niv.suite && niv.suite[i]; if (!s || s.id !== id) return;
        const b = Object.assign({}, x.board); board = b;
        abApplyMove(s.mv.cells, s.mv.dir, x.col, s.mv.info);
        enfants.push({ k: x.k, p: x.p, jetons: x.jetons, board: b, col: x.col === 'black' ? 'white' : 'black' });
      });
    } finally { board = sauve; }
    _eoEtat.niveaux.push({ parties: enfants, suite: null }); _eoChemin.push(id);
  }
  _eoRendreTout();
}
function corpusOuvertureDispo(d){ _eoDispo = d; _eoChemin = []; _eoEtat = null; _eoRendreTout(); }
// les suites du dernier niveau : nombre, Noirs gagnants, longueurs, libelle le plus frequent
function _eoEnfants(){
  const niv = _eoEtat.niveaux[_eoEtat.niveaux.length - 1], G = {};
  niv.parties.forEach(function(x, i){
    const s = niv.suite[i]; if (!s) return;
    const e = G[s.id] || (G[s.id] = { id: s.id, n: 0, dec: 0, noirs: 0, len: [], toks: {}, ks: [] });
    e.n++; e.len.push(x.p[1]); e.toks[s.tok] = (e.toks[s.tok] || 0) + 1; e.ks.push(x.k);
    if (x.p[0] === 1 || x.p[0] === 2) { e.dec++; if (x.p[0] === 1) e.noirs++; }
  });
  return Object.keys(G).map(function(id){ const e = G[id]; e.lab = Object.keys(e.toks).sort(function(a, b){ return e.toks[b] - e.toks[a]; })[0]; return e; }).sort(function(a, b){ return b.n - a.n; });
}
function _eoHtml(msg){
  const D = STATS_PARTIES, dispos = _eoDisposPossibles();
  let h = '<div class="gr-sous">' + _tr('Toutes les vraies parties de la disposition, coup par coup, comme l’explorateur d’ouvertures des échecs : pour chaque suite, le nombre de parties, la part gagnée par les Noirs (vainqueur connu, avec sa marge) et la longueur médiane. Cliquer un coup pour descendre. Les filtres de la page s’appliquent.',
    'All the real games of the layout, move by move, like the chess opening explorer: for each line, the number of games, the share won by Black (known winner, with its margin) and the median length. Click a move to go down. The page filters apply.') + '</div>';
  if (_corpusFiltre.dispo === 'tout') h += '<div class="gr-filtres"><label>' + _tr('Disposition', 'Layout') + ' <select onchange="corpusOuvertureDispo(this.value)">' + dispos.map(function(x){ return '<option value="' + x[0] + '"' + (x[0] === _eoDispoActive() ? ' selected' : '') + '>' + grEchapper(_cfNomDispo(x[0])) + ' (' + x[1] + ')</option>'; }).join('') + '</select></label></div>';
  else if (_eoDispoActive() === 'custom') return h + '<div class="gr-vide">' + _tr('La disposition libre n’a pas de position de départ commune : choisis une autre disposition dans les filtres.', 'The custom layout has no common starting position: pick another layout in the filters.') + '</div>';
  if (msg) return h + '<div class="lab-etat">' + msg + '</div>';
  if (!_eoEtat || !_eoEtat.niveaux[_eoEtat.niveaux.length - 1].suite) return h;
  // le chemin
  const libelles = [];
  for (let d = 0; d < _eoChemin.length; d++) { const niv = _eoEtat.niveaux[d], i = niv.parties.findIndex(function(x, j){ return niv.suite[j] && niv.suite[j].id === _eoChemin[d]; }); libelles.push(i >= 0 ? niv.suite[i].tok : '?'); }
  h += '<div class="eo-chemin"><button type="button" class="eo-pas" onclick="corpusOuvertureAller(0)">' + _tr('Départ', 'Start') + '</button>'
    + libelles.map(function(l, d){ return ' › <button type="button" class="eo-pas"' + (d === libelles.length - 1 ? ' aria-current="step"' : '') + ' onclick="corpusOuvertureAller(' + (d + 1) + ')">' + (d + 1) + '. ' + grEchapper(l) + '</button>'; }).join('') + '</div>';
  const niv = _eoEtat.niveaux[_eoEtat.niveaux.length - 1], P = niv.parties;
  const dec = P.filter(function(x){ return x.p[0] === 1 || x.p[0] === 2; }), noirs = dec.filter(function(x){ return x.p[0] === 1; }).length;
  const trait = (_eoChemin.length % 2 === 0) ? _tr('aux Noirs de jouer', 'Black to move') : _tr('aux Blancs de jouer', 'White to move');
  h += '<div class="gr-sous">' + grNb(P.length) + _tr(' parties arrivent ici', ' games reach this point') + ' · ' + trait + (dec.length ? ' · ' + _tr('les Noirs gagnent ', 'Black wins ') + grPct(noirs / dec.length) + ' ' + grMarge(noirs, dec.length) + grPeu(dec.length) : '') + '</div>';
  const E = _eoEnfants();
  if (E.length) {
    const montres = E.slice(0, EO_ENFANTS), autres = E.slice(EO_ENFANTS), nAutres = autres.reduce(function(a, e){ return a + e.n; }, 0);
    h += '<div class="eo-table" role="table"><div class="eo-l eo-ent" role="row"><span>' + _tr('Coup', 'Move') + '</span><span>' + _tr('Parties', 'Games') + '</span><span>' + _tr('Les Noirs gagnent', 'Black wins') + '</span><span>' + _tr('Longueur', 'Length') + '</span></div>';
    montres.forEach(function(e){
      const w = e.dec ? grWilson(e.noirs, e.dec) : null, med = grQuantile(e.len.slice().sort(function(a, b){ return a - b; }), 0.5);
      const barre = w ? '<span class="sb-div-piste"><span class="sb-div-barre" style="' + (w.p >= 0.5 ? 'left:50%' : 'right:50%') + ';width:' + (100 * Math.abs(w.p - 0.5)).toFixed(1) + '%;background:' + (w.p >= 0.5 ? _SB_VERT : _SB_ORANGE) + '"></span><span class="sb-div-ic" style="left:' + (100 * w.bas).toFixed(1) + '%;width:' + Math.max(0.4, 100 * (w.haut - w.bas)).toFixed(1) + '%"></span></span>' : '<span></span>';
      h += '<div class="eo-l" role="row" tabindex="0" onclick="corpusOuvertureAller(' + _eoChemin.length + ',\'' + e.id + '\')" onkeydown="if(event.key===\'Enter\')corpusOuvertureAller(' + _eoChemin.length + ',\'' + e.id + '\')"'
        + ' title="' + grEchapper(e.lab + _dimDp() + e.n + _tr(' parties', ' games') + (w ? ' · ' + _tr('Noirs gagnent ', 'Black wins ') + e.noirs + ' / ' + e.dec + ' (' + grFourchette(e.noirs, e.dec) + ')' : '') + grPeu(e.dec)) + '">'
        + '<span class="eo-coup">' + grEchapper(e.lab) + '</span><span>' + grNb(e.n) + ' <i>' + grPct(e.n / P.length) + '</i></span>'
        + '<span class="cf-ex-taux">' + barre + '<b>' + (w ? grPct(w.p) : '—') + '</b> <i>' + (w ? grMarge(e.noirs, e.dec) : '') + (e.dec && e.dec < GR_PEU ? ' ⚠' : '') + '</i></span>'
        + '<span>' + grNb(med, 0) + '</span></div>';
    });
    if (nAutres) h += '<div class="eo-l eo-autres" role="row"><span>' + _tr('autres', 'others') + ' (' + autres.length + ')</span><span>' + grNb(nAutres) + '</span><span></span><span></span></div>';
    h += '</div>';
  } else h += '<div class="gr-vide">' + _tr('Les parties s’arrêtent ici.', 'The games stop here.') + '</div>';
  if (P.length && P.length <= 20 && typeof _cfHtmlExParties === 'function') h += '<div class="gr-titre">' + _tr('Les parties', 'The games') + '</div>' + _cfHtmlExParties({ parties: P.map(function(x){ return x.k; }) });
  return h;
}
function _eoRendre(msg){
  const he = document.getElementById('corpus-explorateur-ouv'); if (!he || !STATS_PARTIES) return;
  he.innerHTML = _carteStats(_tr('L’explorateur d’ouvertures', 'The opening explorer') + _cfMarque(), _eoHtml(msg));
}
// appele par _cfRendreTout (48) : un filtre change -> on repart du depart
function _eoRendreTout(){
  if (!STATS_PARTIES) return;
  if (_eoDispoActive() === 'custom') { _eoEtat = null; _eoRendre(); return; }
  if (!_eoEtat || _eoEtat.cle !== _eoCle()) { _eoChemin = []; _eoRacine(); }
  const niv = _eoEtat.niveaux[_eoEtat.niveaux.length - 1];
  if (niv.suite) { _eoRendre(); return; }
  _eoCalculerSuite(function(){ _eoRendre(); });
}
