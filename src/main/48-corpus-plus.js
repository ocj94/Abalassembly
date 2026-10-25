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
let _corpusFiltre = { source: 'tout', dispo: 'tout', longueur: 'tout', periode: 'tout' };
try { const f = JSON.parse(localStorage.getItem('abaCorpusFiltre') || 'null'); if (f) _corpusFiltre = Object.assign(_corpusFiltre, f); } catch (e) {}
function _cfCle(f){ return f.source + '|' + f.dispo + '|' + f.longueur + '|' + (f.periode || 'tout'); }
// le filtre actif, ou null quand rien n'est filtre (le cache commun de _sbAgreger sert alors)
function _cfActif(){ const f = _corpusFiltre; return (f.source === 'tout' && f.dispo === 'tout' && f.longueur === 'tout' && (f.periode || 'tout') === 'tout') ? null : f; }
/* v2.77 (audit des statistiques, point 3) : l'annee de chaque partie, lue dans sa banque (MIGS : 2016-2017,
   AbalOnline : 2020-2023, PlayStrategy : 2026, reference : selon la partie). Rang = ordre de STATS_PARTIES. */
let _cfAnneesCache = null;
function _cfAnnee(k){
  const B = _sbBanques(), cle = B.map(function(b){ return b.length; }).join('-');
  if (!_cfAnneesCache || _cfAnneesCache.cle !== cle) {
    const a = []; B.forEach(function(banque, s){ banque.forEach(function(g){ const d = String((s === 0 || s === 2) ? g[1] : g[0]); a.push(/^\d{4}/.test(d) ? d.slice(0, 4) : '?'); }); });
    _cfAnneesCache = { cle: cle, a: a };
  }
  return _cfAnneesCache.a[k] || '?';
}
// la source d'une partie : son rang global dans les banques (MIGS, AbalOnline, PlayStrategy, reference)
function _cfSourceDe(k, D){ let a = 0; for (let s = 0; s < D.nb.length; s++) { a += D.nb[s]; if (k < a) return s; } return D.nb.length - 1; }
function _cfGarder(k, p, D, f){
  if (!f) return true;
  if (f.source !== 'tout' && _cfSourceDe(k, D) !== +f.source) return false;
  if (f.dispo !== 'tout' && D.dispos[p[3]] !== f.dispo) return false;
  const L = CF_LONGUEURS[f.longueur]; if (L && !(p[1] >= L[0] && p[1] < L[1])) return false;
  if (f.periode && f.periode !== 'tout' && _cfAnnee(k) !== f.periode) return false;
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
  const an = {};
  D.p.forEach(function(p, k){ if (p[2] && !_sbEstDoublon(k)) { n[D.dispos[p[3]]] = (n[D.dispos[p[3]]] || 0) + 1; const y = _cfAnnee(k); an[y] = (an[y] || 0) + 1; } });
  const annees = Object.keys(an).filter(function(y){ return y !== '?'; }).sort();
  const dispos = Object.keys(n).sort(function(a, b){ return n[b] - n[a]; });
  const sel = function(k, O){ return '<select onchange="corpusFiltrer(\'' + k + '\',this.value)">' + O.map(function(o){ return '<option value="' + o[0] + '"' + (String(f[k]) === String(o[0]) ? ' selected' : '') + '>' + grEchapper(o[1]) + '</option>'; }).join('') + '</select>'; };
  let h = '<div class="gr-filtres cf-filtres">'
    + '<label>' + _tr('Source', 'Source') + ' ' + sel('source', [['tout', _tr('toutes', 'all')]].concat(CF_SOURCES.map(function(s, i){ return [String(i), _cfNomSource(i)]; }))) + '</label>'
    + '<label>' + _tr('Disposition', 'Layout') + ' ' + sel('dispo', [['tout', _tr('toutes', 'all')]].concat(dispos.map(function(d){ return [d, _cfNomDispo(d) + ' (' + n[d] + ')']; }))) + '</label>'
    + '<label>' + _tr('Longueur', 'Length') + ' ' + sel('longueur', [['tout', _tr('toutes', 'all')], ['courte', _tr('moins de 60 demi-coups', 'under 60 plies')], ['moyenne', _tr('60 à 119', '60 to 119')], ['longue', _tr('120 et plus', '120 and more')]]) + '</label>'
    + '<label>' + _tr('Année', 'Year') + ' ' + sel('periode', [['tout', _tr('toutes', 'all')]].concat(annees.map(function(y){ return [y, y + ' (' + an[y] + ')']; }))) + '</label>';
  if (_cfActif()) h += '<button class="ctrl-btn cf-tout" onclick="corpusFiltrer(\'source\',\'tout\');corpusFiltrer(\'dispo\',\'tout\');corpusFiltrer(\'longueur\',\'tout\');corpusFiltrer(\'periode\',\'tout\')">' + _tr('Tout le corpus', 'Whole corpus') + '</button>';
  h += '</div><div class="gr-sous">' + _tr('Les filtres recalculent les cartes marquées 🔎 (les autres, comme les 12 dimensions, portent toujours sur tout le corpus).', 'The filters recompute the cards marked 🔎 (the others, like the 12 dimensions, always cover the whole corpus).') + '</div>';
  return h;
}

/* ─── Les parties retenues, avec leur score demi-coup par demi-coup ─── */
function _cfParties(){
  const D = STATS_PARTIES; if (!D) return [];
  const f = _cfActif(), L = [];
  D.p.forEach(function(p, k){ if (p[2] && !_sbEstDoublon(k) && _cfGarder(k, p, D, f)) L.push({ k: k, p: p }); });
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
    { lab: _tr('Les Noirs gagnent', 'Black wins'), v: dec.length ? grPct(noirs / dec.length, 1) : '—', sous: (dec.length ? grMarge(noirs, dec.length) + ' · ' : '') + _tr('sur ', 'of ') + grNb(dec.length) + _tr(' parties au vainqueur connu', ' games with a known winner') + grPeu(dec.length) },
    { lab: _tr('Durée médiane', 'Median length'), v: med != null ? grNb(med) + _tr(' demi-coups', ' plies') : '—', sous: _tr('notation lisible jusqu’au bout', 'notation readable to the end') },
    { lab: _tr('Finies à 6 billes', 'Ended at 6 marbles'), v: L.length ? grPct(six / L.length) : '—', sous: (L.length ? grMarge(six, L.length) + ' · ' : '') + _tr('les autres : abandon, temps, partie interrompue', 'the others: resignation, time, interrupted game') }
  ]) + '<div class="gr-sous">' + _tr('± : la marge d’erreur à 95 % (intervalle de Wilson) — la vraie valeur a 95 chances sur 100 d’être dans cette marge, si les parties du corpus sont représentatives. ⚠ : moins de ' + GR_PEU + ' parties, chiffre fragile.',
    '±: the 95 % margin of error (Wilson interval) — the true value has 95 chances in 100 of lying within it, if the corpus games are representative. ⚠: fewer than ' + GR_PEU + ' games, a fragile figure.') + '</div>');
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
      return { v: 100 * p, txt: String(Math.round(100 * p)), tip: _tr('Mène de ' + (i + 1) + ' au demi-coup ' + CF_MOMENTS[j], 'Ahead by ' + (i + 1) + ' at ply ' + CF_MOMENTS[j]) + _dimDp() + _tr('gagne ', 'wins ') + c.g + ' / ' + c.n + ' (' + Math.round(100 * p) + ' %, ' + grFourchette(c.g, c.n) + ')' + grPeu(c.n) };
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
      h += grBarres(top.map(function(j){ const c = C[j]; return { lab: j + ' · ' + grPct(c.n / tot, c.n / tot < 0.1 ? 1 : 0), v: c.dec ? c.g / c.dec : 0, ref: 0.5, txt: c.dec ? grPct(c.g / c.dec) + _tr(' sur ', ' of ') + c.dec : '—', tip: j + _dimDp() + _tr('joué ', 'played ') + c.n + _tr(' fois', ' times') + (c.dec ? ' · ' + _tr('Noirs gagnent ', 'Black wins ') + c.g + ' / ' + c.dec + ' (' + grFourchette(c.g, c.dec) + ')' + grPeu(c.dec) : ''),
        bas: c.dec ? grWilson(c.g, c.dec).bas : null, haut: c.dec ? grWilson(c.g, c.dec).haut : null }; }), { max: 1 });   // v2.77 : la moustache = la marge a 95 %
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
    const k = _lpPartie(i), p = D.p[k]; if (!p || !p[2] || _sbEstDoublon(k) || !_cfGarder(k, p, D, f)) continue;
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
/* ─── 5. L'explorateur des scores (v2.77) ───
   Specification proposee par ChatGPT a Olivier (« explorateur statistique du corpus ») : pour chaque
   score atteint en cours de partie (billes ejectees par les Noirs – par les Blancs), le moment ou il est
   atteint, et le camp etudie : victoires, defaites, nulles, parties au resultat inconnu (exclues du taux),
   le taux de victoire avec sa marge a 95 %, et les parties qui le composent, a rejouer.
   - Une partie compte au plus une fois par score : le score ne fait que monter, elle n'y passe qu'une fois.
   - Le moment : celui ou le score est atteint (debut : demi-coups 0 a 29, milieu : 30 a 69, fin : 70 et
     plus -- les memes qu'ailleurs sur le site). La specification proposait des phases par nombre
     d'ejections : redondant ici, le score les donne deja.
   - Le score, pas les « billes restantes » : toutes les dispositions ne partent pas de 14 billes.
   - Memes parties que les autres cartes 🔎 : completes, filtrees, doublons comptes une fois. */
let _cfExCamp = 'black', _cfExMoment = 'tout', _cfExOuvert = null;
const CF_EX_MOMENTS = { tout: null, debut: [0, 30], milieu: [30, 70], fin: [70, 1e9] };
function corpusExplorer(k, v){ if (k === 'camp') _cfExCamp = v; else if (k === 'moment') _cfExMoment = v; else if (k === 'ouvrir') _cfExOuvert = (_cfExOuvert === v ? null : v); _cfRendreExplorateur(); }
// rows[score] = { n, v, d, nul, inconnu, parties: [rangs] } pour le camp et le moment choisis
function _cfExplorer(L, camp, moment){
  const M = CF_EX_MOMENTS[moment], R = {};
  L.forEach(function(x){
    const g = x.p[0], ej = x.p[4];
    let nb = 0, nw = 0;
    const noter = function(ply){
      if (nb >= 6 || nw >= 6) return;                    // partie gagnee : rien a apprendre de ce score
      if (M && !(ply >= M[0] && ply < M[1])) return;
      const cle = nb + '-' + nw, r = R[cle] || (R[cle] = { nb: nb, nw: nw, n: 0, v: 0, d: 0, nul: 0, inconnu: 0, parties: [] });
      r.n++; r.parties.push(x.k);
      if (g === 3) r.nul++;
      else if (g !== 1 && g !== 2) r.inconnu++;
      else if ((g === 1) === (camp === 'black')) r.v++; else r.d++;
    };
    noter(0);
    for (let i = 0; i < ej.length; i += 2) { if (ej[i + 1] & 1) nb++; else nw++; noter(ej[i]); }
  });
  return Object.keys(R).map(function(c){ return R[c]; }).sort(function(a, b){ return (a.nb + a.nw) - (b.nb + b.nw) || (b.nb - b.nw) - (a.nb - a.nw); });
}
function _cfNomSourceCourt(s){ return ['MIGS', 'AbalOnline', 'PlayStrategy', _tr('Référence', 'Reference')][s] || '?'; }
// la partie de rang global k : sa banque, son rang dans la banque, et de quoi l'afficher
function _cfPartieDe(k){
  const D = STATS_PARTIES, B = _sbBanques(), s = _cfSourceDe(k, D);
  let i = k; for (let t = 0; t < s; t++) i -= D.nb[t];
  const g = B[s] && B[s][i]; if (!g) return null;
  const date = String((s === 0 || s === 2) ? g[1] : g[0]), nN = (s === 0 || s === 2) ? g[2] : g[1], nB = (s === 0 || s === 2) ? g[3] : g[2];
  return { s: s, i: i, g: g, date: date, noirs: nN, blancs: nB, p: D.p[k] };
}
function corpusRevoir(k){
  const x = _cfPartieDe(k); if (!x) return;
  if (x.s === 0) loadMigsGame(x.i);
  else if (x.s === 1) loadAOGame(x.i);
  else if (x.s === 2) { const j = PS_GAMES.findIndex(function(h){ return h[0] === x.g[0]; }); if (j >= 0) loadPSGame(j); else if (typeof showToast === 'function') showToast(_tr('Partie introuvable dans la bibliothèque', 'Game not found in the library')); }
  else { if (typeof showPage === 'function') showPage('game'); loadRefGame(x.i); }
}
function _cfHtmlExplorateur(L){
  const rows = _cfExplorer(L, _cfExCamp, _cfExMoment), camp = _cfExCamp === 'black' ? _tr('les Noirs', 'Black') : _tr('les Blancs', 'White');
  const bouton = function(k, v, txt){ const on = (k === 'camp' ? _cfExCamp : _cfExMoment) === v; return '<button type="button" class="sb-onglet" aria-pressed="' + on + '" onclick="corpusExplorer(\'' + k + '\',\'' + v + '\')">' + txt + '</button>'; };
  let h = '<div class="gr-sous">' + _tr('Pour chaque score atteint pendant la partie (billes éjectées par les Noirs – par les Blancs), ce que sont devenues ces parties. Une partie compte une fois par score : elle n’y passe qu’une fois. Le taux ne compte que les parties au vainqueur connu ; les nulles et les résultats inconnus sont donnés à part. Cliquer une ligne : ses parties, à rejouer.',
    'For each score reached during the game (marbles pushed off by Black – by White), what became of those games. A game counts once per score: it only passes through it once. The rate only counts games with a known winner; draws and unknown results are given apart. Click a row: its games, to replay.') + '</div>';
  h += '<div class="sb-onglets">' + bouton('camp', 'black', _tr('Camp : Noirs', 'Side: Black')) + bouton('camp', 'white', _tr('Camp : Blancs', 'Side: White')) + '</div>';
  h += '<div class="sb-onglets">' + bouton('moment', 'tout', _tr('Toute la partie', 'Whole game')) + bouton('moment', 'debut', _tr('Début (0–29)', 'Opening (0–29)')) + bouton('moment', 'milieu', _tr('Milieu (30–69)', 'Middle (30–69)')) + bouton('moment', 'fin', _tr('Fin (70 et +)', 'End (70+)')) + '</div>';
  if (!rows.length) return h + '<div class="gr-vide">' + _tr('Aucune partie avec ces réglages.', 'No game with these settings.') + '</div>';
  h += '<div class="cf-ex" role="table"><div class="cf-ex-l cf-ex-ent" role="row"><span>' + _tr('Score N–B', 'Score B–W') + '</span><span>' + _tr('Parties', 'Games') + '</span><span>' + _tr('V / D / N / ?', 'W / L / D / ?') + '</span><span>' + _tr('Taux de victoire de ', 'Win rate of ') + camp + '</span></div>';
  rows.forEach(function(r){
    const dec = r.v + r.d, w = dec ? grWilson(r.v, dec) : null, cle = r.nb + '-' + r.nw, ouvert = _cfExOuvert === cle;
    const barre = w ? '<span class="sb-div-piste"><span class="sb-div-barre" style="' + (w.p >= 0.5 ? 'left:50%' : 'right:50%') + ';width:' + (100 * Math.abs(w.p - 0.5)).toFixed(1) + '%;background:' + (w.p >= 0.5 ? _SB_VERT : _SB_ORANGE) + '"></span>'
      + '<span class="sb-div-ic" style="left:' + (100 * w.bas).toFixed(1) + '%;width:' + Math.max(0.4, 100 * (w.haut - w.bas)).toFixed(1) + '%"></span></span>' : '<span></span>';
    h += '<div class="cf-ex-l' + (ouvert ? ' cf-ex-ouvert' : '') + (dec < GR_PEU ? ' cf-ex-peu' : '') + '" role="row" tabindex="0" onclick="corpusExplorer(\'ouvrir\',\'' + cle + '\')" onkeydown="if(event.key===\'Enter\')corpusExplorer(\'ouvrir\',\'' + cle + '\')"'
      + ' title="' + grEchapper(r.v + _tr(' victoires, ', ' wins, ') + r.d + _tr(' défaites, ', ' losses, ') + r.nul + _tr(' nulles, ', ' draws, ') + r.inconnu + _tr(' au résultat inconnu', ' with an unknown result') + (w ? ' · ' + grFourchette(r.v, dec) : '') + grPeu(dec)) + '">'
      + '<span class="cf-ex-score">' + r.nb + ' – ' + r.nw + '</span><span>' + grNb(r.n) + '</span><span class="cf-ex-vdn">' + r.v + ' / ' + r.d + ' / ' + r.nul + ' / ' + r.inconnu + '</span>'
      + '<span class="cf-ex-taux">' + barre + '<b>' + (w ? grPct(w.p) : '—') + '</b> <i>' + (w ? grMarge(r.v, dec) : '') + (dec < GR_PEU ? ' ⚠' : '') + '</i></span></div>';
    if (ouvert) h += _cfHtmlExParties(r);
  });
  h += '</div>';
  return h;
}
// les parties d'une ligne : les 20 premieres, a rejouer
function _cfHtmlExParties(r){
  const res = function(g){ return g === 1 ? _tr('Noirs gagnent', 'Black wins') : (g === 2 ? _tr('Blancs gagnent', 'White wins') : (g === 3 ? _tr('nulle', 'draw') : _tr('résultat inconnu', 'unknown result'))); };
  let h = '<div class="cf-ex-parties">';
  r.parties.slice(0, 20).forEach(function(k){
    const x = _cfPartieDe(k); if (!x) return;
    h += '<div class="cf-ex-partie"><span>' + _cfNomSourceCourt(x.s) + ' · ' + grEchapper(x.date) + '</span><span>' + grEchapper(String(x.noirs || '?')) + ' – ' + grEchapper(String(x.blancs || '?')) + '</span><span>' + res(x.p[0]) + ' · ' + x.p[1] + _tr(' demi-coups', ' plies') + '</span>'
      + '<button type="button" class="ctrl-btn" onclick="event.stopPropagation();corpusRevoir(' + k + ')">▶ ' + _tr('Revoir', 'Replay') + '</button></div>';
  });
  if (r.parties.length > 20) h += '<div class="gr-sous">' + _tr('… et ', '… and ') + grNb(r.parties.length - 20) + _tr(' autres parties : un filtre (source, disposition, année) réduit la liste.', ' more games: a filter (source, layout, year) narrows the list.') + '</div>';
  return h + '</div>';
}
function _cfRendreExplorateur(){
  const he = document.getElementById('corpus-explorateur'); if (!he || !STATS_PARTIES) return;
  he.innerHTML = _carteStats(_tr('L’explorateur des scores', 'The score explorer') + _cfMarque(), _cfHtmlExplorateur(_cfParties()));
}
function _cfRendreTout(){
  const D = STATS_PARTIES; if (!D) return;
  const L = _cfParties();
  const hf = document.getElementById('corpus-filtres'); if (hf) hf.innerHTML = _cfBarre();
  const hr = document.getElementById('corpus-resume'); if (hr) hr.innerHTML = _cfHtmlResume(L);
  const ha = document.getElementById('corpus-avance'); if (ha) ha.innerHTML = _cfHtmlAvance(L);
  _cfRendreExplorateur();
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
