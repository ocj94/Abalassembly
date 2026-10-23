/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : FILTRES ET NOUVELLES CARTES (v2.72)
   Demande d'Olivier : « plus de parametres, de graphiques, de metriques…
   pour le corpus ». Deuxieme partie, apres le Labo (v2.71).
   - Des filtres en tete de page : source (MIGS, AbalOnline, PlayStrategy,
     parties de reference), disposition, longueur. Ils recalculent les cartes
     marquees 🔎 : le resume, les billes qui tombent, ce qui fait gagner,
     comment jouent les vrais joueurs, et les trois cartes nouvelles :
   - gagner selon l'avance et le moment de la partie ;
   - les premiers coups, la longueur et la fin des parties ;
   - ou sont les billes (debut, milieu, fin) et d'ou partent les poussees.
   Donnees : les evenements de chaque partie (STATS_PARTIES, rejoues hors
   ligne) et les positions du Labo (LABO_POS). Rien d'ecrit a la main.
═══════════════════════════════════════════ */
const CF_SOURCES = ['MIGS', 'AbalOnline', 'PlayStrategy', 'Référence'];
function _cfNomSource(i){ return i === 3 ? _tr('Parties de référence', 'Reference games') : CF_SOURCES[i]; }
const CF_LONGUEURS = { courte: [0, 60], moyenne: [60, 120], longue: [120, 1e9] };
let _corpusFiltre = { source: 'tout', dispo: 'tout', longueur: 'tout' };
try { const f = JSON.parse(localStorage.getItem('abaCorpusFiltre') || 'null'); if (f) _corpusFiltre = Object.assign(_corpusFiltre, f); } catch (e) {}
function _cfCle(f){ return f.source + '|' + f.dispo + '|' + f.longueur; }
// le filtre actif, ou null quand rien n'est filtre (le cache commun de _sbAgreger sert alors)
function _cfActif(){ const f = _corpusFiltre; return (f.source === 'tout' && f.dispo === 'tout' && f.longueur === 'tout') ? null : f; }
// la source d'une partie : son rang global dans les banques (MIGS, AbalOnline, PlayStrategy, reference)
function _cfSourceDe(k, D){ let a = 0; for (let s = 0; s < D.nb.length; s++) { a += D.nb[s]; if (k < a) return s; } return D.nb.length - 1; }
function _cfGarder(k, p, D, f){
  if (!f) return true;
  if (f.source !== 'tout' && _cfSourceDe(k, D) !== +f.source) return false;
  if (f.dispo !== 'tout' && D.dispos[p[3]] !== f.dispo) return false;
  const L = CF_LONGUEURS[f.longueur]; if (L && !(p[1] >= L[0] && p[1] < L[1])) return false;
  return true;
}
function corpusFiltrer(k, v){
  _corpusFiltre[k] = v;
  try { localStorage.setItem('abaCorpusFiltre', JSON.stringify(_corpusFiltre)); } catch (e) {}
  _cfRendreTout();
}
// v2.74 : les memes noms que les billes qui tombent (« Disposition libre », « Swiss Daisy »…, en anglais en anglais) au lieu des cles brutes
function _cfNomDispo(d){ return (typeof _sbNomDispo === 'function') ? _sbNomDispo(d) : ((typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[d]) ? HEAT_VARIANT_LABEL[d] : d); }
function _cfMarque(){ return _cfActif() ? ' <span class="cf-marque">🔎 ' + _tr('filtré', 'filtered') + '</span>' : ''; }

/* ─── La barre des filtres ─── */
function _cfBarre(){
  const D = STATS_PARTIES; if (!D) return '';
  const f = _corpusFiltre, n = {};
  D.p.forEach(function(p){ if (p[2]) n[D.dispos[p[3]]] = (n[D.dispos[p[3]]] || 0) + 1; });
  const dispos = Object.keys(n).sort(function(a, b){ return n[b] - n[a]; });
  const sel = function(k, O){ return '<select onchange="corpusFiltrer(\'' + k + '\',this.value)">' + O.map(function(o){ return '<option value="' + o[0] + '"' + (String(f[k]) === String(o[0]) ? ' selected' : '') + '>' + grEchapper(o[1]) + '</option>'; }).join('') + '</select>'; };
  let h = '<div class="gr-filtres cf-filtres">'
    + '<label>' + _tr('Source', 'Source') + ' ' + sel('source', [['tout', _tr('toutes', 'all')]].concat(CF_SOURCES.map(function(s, i){ return [String(i), _cfNomSource(i)]; }))) + '</label>'
    + '<label>' + _tr('Disposition', 'Layout') + ' ' + sel('dispo', [['tout', _tr('toutes', 'all')]].concat(dispos.map(function(d){ return [d, _cfNomDispo(d) + ' (' + n[d] + ')']; }))) + '</label>'
    + '<label>' + _tr('Longueur', 'Length') + ' ' + sel('longueur', [['tout', _tr('toutes', 'all')], ['courte', _tr('moins de 60 demi-coups', 'under 60 plies')], ['moyenne', _tr('60 à 119', '60 to 119')], ['longue', _tr('120 et plus', '120 and more')]]) + '</label>';
  if (_cfActif()) h += '<button class="ctrl-btn cf-tout" onclick="corpusFiltrer(\'source\',\'tout\');corpusFiltrer(\'dispo\',\'tout\');corpusFiltrer(\'longueur\',\'tout\')">' + _tr('Tout le corpus', 'Whole corpus') + '</button>';
  h += '</div><div class="gr-sous">' + _tr('Les filtres recalculent les cartes marquées 🔎 (les autres, comme les 12 dimensions, portent toujours sur tout le corpus).', 'The filters recompute the cards marked 🔎 (the others, like the 12 dimensions, always cover the whole corpus).') + '</div>';
  return h;
}

/* ─── Les parties retenues, avec leur score demi-coup par demi-coup ─── */
function _cfParties(){
  const D = STATS_PARTIES; if (!D) return [];
  const f = _cfActif(), L = [];
  D.p.forEach(function(p, k){ if (p[2] && _cfGarder(k, p, D, f)) L.push({ k: k, p: p }); });
  return L;
}
// l'ecart (Noirs moins Blancs) au demi-coup « ply » : les ejections faites jusque-la
function _cfScoreA(ej, ply){ let nb = 0, nw = 0; for (let i = 0; i < ej.length; i += 2) { if (ej[i] > ply) break; if (ej[i + 1] & 1) nb++; else nw++; } return { nb: nb, nw: nw }; }

/* ─── 1. Le resume ─── */
function _cfHtmlResume(L){
  const dec = L.filter(function(x){ return x.p[0] === 1 || x.p[0] === 2; }), noirs = dec.filter(function(x){ return x.p[0] === 1; }).length;
  const lg = L.map(function(x){ return x.p[1]; }).sort(function(a, b){ return a - b; }), med = lg.length ? lg[Math.floor(lg.length / 2)] : null;
  const six = L.filter(function(x){ const s = _cfScoreA(x.p[4], 1e9); return s.nb >= 6 || s.nw >= 6; }).length;
  return _carteStats(_tr('En bref', 'In short') + _cfMarque(), grTuiles([
    { lab: _tr('Parties', 'Games'), v: grNb(L.length), sous: _tr('jouées depuis une position de départ', 'played from a starting position') },
    { lab: _tr('Les Noirs gagnent', 'Black wins'), v: dec.length ? grPct(noirs / dec.length, 1) : '—', sous: _tr('sur ', 'of ') + grNb(dec.length) + _tr(' parties au vainqueur connu', ' games with a known winner') },
    { lab: _tr('Durée médiane', 'Median length'), v: med != null ? grNb(med) + _tr(' demi-coups', ' plies') : '—', sous: _tr('notation lisible jusqu’au bout', 'notation readable to the end') },
    { lab: _tr('Finies à 6 billes', 'Ended at 6 marbles'), v: L.length ? grPct(six / L.length) : '—', sous: _tr('les autres : abandon, temps, partie interrompue', 'the others: resignation, time, interrupted game') }
  ]));
}

/* ─── 2. Gagner selon l'avance et le moment ───
   Aux demi-coups 20, 40… 140, l'ecart de billes ; la case : la part des parties que le camp
   qui mene a gagnees (parties au vainqueur connu, pas encore finies a ce moment). */
const CF_MOMENTS = [20, 40, 60, 80, 100, 120, 140];
function _cfAvance(L){
  const T = {}; for (let a = 1; a <= 5; a++) { T[a] = {}; CF_MOMENTS.forEach(function(m){ T[a][m] = { n: 0, g: 0 }; }); }
  L.forEach(function(x){
    const g = x.p[0]; if (g !== 1 && g !== 2) return;
    CF_MOMENTS.forEach(function(m){
      if (x.p[1] <= m) return;                               // partie deja finie
      const s = _cfScoreA(x.p[4], m), d = s.nb - s.nw;          // nb : billes blanches tombees (les Noirs menent si d > 0)
      if (!d || s.nb >= 6 || s.nw >= 6) return;
      const c = T[Math.min(5, Math.abs(d))][m]; c.n++; if ((d > 0 ? 1 : 2) === g) c.g++;
    });
  });
  return T;
}
function _cfHtmlAvance(L){
  const T = _cfAvance(L);
  const corps = '<div class="gr-sous">' + _tr('À chaque moment de la partie (en colonnes), le camp qui mène de 1, 2, 3… billes (en lignes) : la part des vraies parties qu’il a gagnées. Bleu : il gagne le plus souvent ; gris : pile ou face. Moins de 20 parties : case vide.', 'At each moment of the game (columns), the side ahead by 1, 2, 3… marbles (rows): the share of real games it won. Blue: it usually wins; grey: a coin toss. Fewer than 20 games: empty cell.') + '</div>'
    + grCarte([1, 2, 3, 4, 5].map(function(a){ return _tr('+' + a + ' bille' + (a > 1 ? 's' : ''), '+' + a + ' marble' + (a > 1 ? 's' : '')); }), CF_MOMENTS.map(function(m){ return String(m); }), function(i, j){
      const c = T[i + 1][CF_MOMENTS[j]];
      if (c.n < 20) return { v: null, txt: c.n ? '·' : '' };
      const p = c.g / c.n;
      return { v: 100 * p, txt: String(Math.round(100 * p)), tip: _tr('Mène de ' + (i + 1) + ' au demi-coup ' + CF_MOMENTS[j], 'Ahead by ' + (i + 1) + ' at ply ' + CF_MOMENTS[j]) + _dimDp() + _tr('gagne ', 'wins ') + c.g + ' / ' + c.n + ' (' + Math.round(100 * p) + ' %)' };
    }, { echelle: 'signe', centre: 50, min: 0, max: 100, legende: [_tr('perd souvent', 'often loses'), _tr('gagne souvent', 'usually wins')] })
    + '<div class="gr-sous">' + _tr('Colonnes : le demi-coup ; cases : en %.', 'Columns: the ply; cells: in %.') + '</div>';
  const lignes = []; [1, 2, 3, 4, 5].forEach(function(a){ CF_MOMENTS.forEach(function(m){ const c = T[a][m]; if (c.n) lignes.push(['+' + a, m, c.n, c.g, grPct(c.g / c.n)]); }); });
  return _carteStats(_tr('Gagner selon l’avance et le moment', 'Winning by lead and moment') + _cfMarque(), corps + grChiffres([_tr('Avance', 'Lead'), _tr('Demi-coup', 'Ply'), _tr('Parties', 'Games'), _tr('Gagnées', 'Won'), '%'], lignes),
    _tr('Vu dans le Labo : une bille d’avance au 66ᵉ demi-coup ne gagne que deux fois sur trois — c’est pourquoi elle ne suffit plus à départager deux IA.', 'Seen in the Lab: a one-marble lead at ply 66 wins only two times out of three — which is why it no longer settles a duel between two AIs.'));
}

/* ─── 3. Premiers coups, longueur, fins ─── */
function _cfHtmlOuvertures(L, W){
  const D = STATS_PARTIES, B = (typeof _sbBanques === 'function') ? _sbBanques() : null;
  let h = '';
  // la longueur
  const bins = []; for (let b = 0; b < 21; b++) bins.push(0);
  L.forEach(function(x){ bins[Math.min(20, Math.floor(x.p[1] / 10))]++; });
  h += '<div class="gr-titre">' + _tr('Longueur des parties', 'Game length') + '</div>' + grColonnes(W, bins.map(function(v, b){ return { lab: b === 20 ? '200+' : String(b * 10), v: v, tip: (b === 20 ? _tr('200 demi-coups et plus', '200 plies and more') : _tr(b * 10 + ' à ' + (b * 10 + 9) + ' demi-coups', b * 10 + ' to ' + (b * 10 + 9) + ' plies')) + _dimDp() + grNb(v) + _tr(' parties', ' games') }; }), { titreX: _tr('demi-coups', 'plies'), aria: _tr('Longueur des parties', 'Game length') });
  // les fins
  let six = 0, autre = 0, nul = 0, inconnu = 0;
  L.forEach(function(x){ const s = _cfScoreA(x.p[4], 1e9); if (s.nb >= 6 || s.nw >= 6) six++; else if (x.p[0] === 3) nul++; else if (x.p[0] === 1 || x.p[0] === 2) autre++; else inconnu++; });
  h += '<div class="gr-titre">' + _tr('Comment elles finissent', 'How they end') + '</div>' + grPile([{ nom: _tr('6 billes éjectées', '6 marbles pushed off'), v: six }, { nom: _tr('vainqueur sans 6 billes (abandon, temps)', 'winner without 6 marbles (resignation, time)'), v: autre }, { nom: _tr('nulle', 'draw'), v: nul }, { nom: _tr('vainqueur inconnu', 'unknown winner'), v: inconnu }]);
  // les premiers coups (une disposition a la fois : la filtree, sinon la Marguerite belge)
  if (B && B.every(function(b){ return b.length; })) {
    const dispo = _corpusFiltre.dispo !== 'tout' ? _corpusFiltre.dispo : 'belgian', C = {};
    let k0 = 0; const debut = D.nb.map(function(n){ const a = k0; k0 += n; return a; });
    L.forEach(function(x){
      if (D.dispos[x.p[3]] !== dispo) return;
      const src = _cfSourceDe(x.k, D), g = B[src][x.k - debut[src]]; if (!g) return;
      const j = _sbJetons(src, g)[0]; if (!j) return;
      const c = C[j] || (C[j] = { n: 0, dec: 0, g: 0 }); c.n++;
      if (x.p[0] === 1 || x.p[0] === 2) { c.dec++; if (x.p[0] === 1) c.g++; }
    });
    const tot = Object.keys(C).reduce(function(a, j){ return a + C[j].n; }, 0);
    const top = Object.keys(C).filter(function(j){ return C[j].n >= 10; }).sort(function(a, b){ return C[b].n - C[a].n; }).slice(0, 8);   // joues au moins 10 fois
    if (top.length) {
      h += '<div class="gr-titre">' + _tr('Les premiers coups des Noirs', 'Black’s first moves') + ' — ' + grEchapper(_cfNomDispo(dispo)) + '</div><div class="gr-sous">' + _tr('Ceux joués au moins 10 fois (notation Aba-Pro), avec leur part des parties, et la part gagnée par les Noirs après chacun (vainqueur connu). Le trait marque 50 %.', 'Those played at least 10 times (Aba-Pro notation), with their share of games, and the share Black won after each one (known winner). The tick marks 50%.') + '</div>';
      h += grBarres(top.map(function(j){ const c = C[j]; return { lab: j + ' · ' + grPct(c.n / tot, c.n / tot < 0.1 ? 1 : 0), v: c.dec ? c.g / c.dec : 0, ref: 0.5, txt: c.dec ? grPct(c.g / c.dec) + _tr(' sur ', ' of ') + c.dec : '—', tip: j + _dimDp() + _tr('joué ', 'played ') + c.n + _tr(' fois', ' times') + (c.dec ? ' · ' + _tr('Noirs gagnent ', 'Black wins ') + c.g + ' / ' + c.dec : '') }; }), { max: 1 });
    }
  }
  return _carteStats(_tr('Premiers coups, longueur et fins', 'First moves, length and endings') + _cfMarque(), h);
}

/* ─── 4. Ou sont les billes, d'ou partent les poussees (positions du Labo) ─── */
let _cfOccMoment = 'milieu', _cfOccCamp = 'black';
function corpusOccupation(k, v){ if (k === 'moment') _cfOccMoment = v; else _cfOccCamp = v; _cfRendreOccupation(); }
const CF_OCC_MOMENTS = { debut: [10, 30], milieu: [30, 70], fin: [70, 999] };
function _cfOccupation(){
  if (typeof LABO_POS === 'undefined' || !LABO_POS || !STATS_PARTIES) return null;
  const D = STATS_PARTIES, f = _cfActif(), M = CF_OCC_MOMENTS[_cfOccMoment];
  const occ = { black: new Array(61).fill(0), white: new Array(61).fill(0) }, pousse = new Array(61).fill(0);
  let n = 0, np = 0;
  for (let i = 0; i < LABO_POS.n; i++) {
    if (_lpEstDepart(i)) continue;
    const ply = _lpPly(i); if (ply < M[0] || ply >= M[1]) continue;
    const k = _lpPartie(i), p = D.p[k]; if (!p || !p[2] || !_cfGarder(k, p, D, f)) continue;
    const s = _lpChaine(i); n++;
    for (let c = 0; c < 61; c++) { const x = s.charAt(c); if (x === 'b') occ.black[c]++; else if (x === 'w') occ.white[c]++; }
    // le coup joue est-il une poussee ? la case de tete, vue du joueur (plateau retourne pour les Blancs)
    const cp = _lpCoup(i), t = _lpTrait(i), lui = t === 'black' ? 'w' : 'b';
    const d = _LP_DIRS[cp.d]; if (!d || cp.a === cp.b) continue;
    const A = _sbCase(cp.a), Bc = _sbCase(cp.b), xa = rcToAxial(A.r, A.c), xb = rcToAxial(Bc.r, Bc.c);
    const lq = xb.q - xa.q, lr = xb.r - xa.r, long = (Math.abs(lq) + Math.abs(lr) + Math.abs(lq + lr)) / 2;   // distance hexagonale
    if (!long) continue;
    const uq = lq / long, ur = lr / long;
    let tete, iTete;
    if (uq === d[0] && ur === d[1]) { tete = xb; iTete = cp.b; }
    else if (uq === -d[0] && ur === -d[1]) { tete = xa; iTete = cp.a; }
    else continue;                                                   // pas dans l'axe : coup lateral, jamais une poussee
    const dev = axialToRc(tete.q + d[0], tete.r + d[1]);
    if (!dev || s.charAt(_sbIndex(dev.r, dev.c)) !== lui) continue;   // devant la tete, une bille adverse : poussee
    pousse[t === 'black' ? iTete : 60 - iTete]++; np++;
  }
  return { occ: occ, pousse: pousse, n: n, np: np };
}
function _cfRendreOccupation(){
  const hote = document.getElementById('corpus-occupation'); if (!hote) return;
  const O = _cfOccupation();
  if (!O) { hote.innerHTML = ''; if (typeof ensureLaboPositions === 'function') ensureLaboPositions().then(function(ok){ if (ok && LABO_POS) _cfRendreOccupation(); }); return; }
  const W = Math.min(420, grLargeur(hote, 420)), selM = '<select onchange="corpusOccupation(\'moment\',this.value)">' + [['debut', _tr('début (demi-coups 10 à 29)', 'opening (plies 10 to 29)')], ['milieu', _tr('milieu (30 à 69)', 'middle (30 to 69)')], ['fin', _tr('fin (70 et plus)', 'end (70 and more)')]].map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === _cfOccMoment ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  const selC = '<select onchange="corpusOccupation(\'camp\',this.value)">' + [['black', _tr('Noirs', 'Black')], ['white', _tr('Blancs', 'White')]].map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === _cfOccCamp ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  const occ = O.occ[_cfOccCamp];
  let h = '<div class="gr-filtres"><label>' + _tr('Moment', 'Moment') + ' ' + selM + '</label><label>' + _tr('Camp', 'Side') + ' ' + selC + '</label><span>' + grNb(O.n) + _tr(' positions', ' positions') + '</span></div>';
  h += '<div class="cf-plateaux"><div><div class="gr-titre">' + _tr('Où sont les billes', 'Where the marbles are') + '</div><div class="gr-sous">' + _tr('Part des positions où la case porte une bille de ce camp (plateau vu des Noirs).', 'Share of positions where the cell holds a marble of this side (board seen from Black).') + '</div>'
    + grPlateau(W, function(r, c){ return O.n ? occ[_sbIndex(r, c)] / O.n : 0; }, { fmt: function(v){ return grPct(v); }, aria: _tr('Occupation du plateau', 'Board occupation') }) + '</div>';
  h += '<div><div class="gr-titre">' + _tr('D’où partent les poussées', 'Where pushes start from') + '</div><div class="gr-sous">' + _tr('La case de tête des groupes qui poussent (sumito), vue du joueur qui pousse ; les deux camps, ' + grNb(O.np) + ' poussées.', 'The leading cell of pushing groups (sumito), seen from the pushing player; both sides, ' + grNb(O.np) + ' pushes.') + '</div>'
    + grPlateau(W, function(r, c){ return O.pousse[_sbIndex(r, c)]; }, { aria: _tr('Cases d’où partent les poussées', 'Cells pushes start from') }) + '</div></div>';
  hote.innerHTML = _carteStats(_tr('Où sont les billes', 'Where the marbles are') + _cfMarque(), h, _tr('Positions calmes (aucune éjection possible pour le camp au trait) tirées des parties : jusqu’à 6 par partie. Les poussées comptées sont celles jouées dans ces positions, donc sans éjection.', 'Quiet positions (no ejection possible for the side to move) taken from the games: up to 6 per game. The pushes counted are those played in these positions, so without ejection.'));
}

/* ─── Tout redessiner (filtre change) ─── */
function _cfRendreTout(){
  const D = STATS_PARTIES; if (!D) return;
  const L = _cfParties();
  const hf = document.getElementById('corpus-filtres'); if (hf) hf.innerHTML = _cfBarre();
  const hr = document.getElementById('corpus-resume'); if (hr) hr.innerHTML = _cfHtmlResume(L);
  const ha = document.getElementById('corpus-avance'); if (ha) ha.innerHTML = _cfHtmlAvance(L);
  const ho = document.getElementById('corpus-ouvertures'); if (ho) ho.innerHTML = _cfHtmlOuvertures(L, grLargeur(ho, 640) - 40);
  _cfRendreOccupation();
  if (typeof _sbRendreCorpus === 'function') _sbRendreCorpus();
  grSurRedim('corpus', 'corpus-ouvertures', function(){ const h2 = document.getElementById('corpus-ouvertures'); if (h2 && STATS_PARTIES) h2.innerHTML = _cfHtmlOuvertures(_cfParties(), grLargeur(h2, 640) - 40); });
}
// appele par renderCorpusStatsPage (34) : les donnees d'abord, puis les cartes
async function corpusPlusRendre(){
  if (!(await ensureStatsParties())) return;
  if (typeof ensureGameBanks === 'function') { try { await ensureGameBanks(); } catch (e) {} }
  _cfRendreTout();
}
