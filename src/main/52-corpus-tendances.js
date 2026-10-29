/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : LE TRAIT, LES ANNEES, LES PREMIERES POUSSEES,
   LES REPETITIONS, LES COUPS POSSIBLES (v2.81)
   Demande d'ocj94 (« Je veux tout », sur cinq propositions) :
   1. l'avantage du trait disposition par disposition, avec sa marge ;
   2. le jeu au fil des annees : part gagnee par les Noirs, duree mediane,
      parties finies a 6 billes ;
   3. la premiere poussee de chaque type (2 contre 1, 3 contre 1, 3 contre 2) :
      quand elle arrive, et si le camp qui la joue le premier gagne plus souvent ;
   4. les positions repetees : combien de parties en ont, et quand ;
   5. le nombre de coups possibles aux 1er, 10e, 30e, 50e, 80e… demi-coups.
   Donnees : STATS_PARTIES (tools/stats-parties.js, rejeu de chaque partie
   avec le vrai moteur ; champs 9 a 11 ajoutes en v2.81). Memes parties que
   les autres cartes 🔎 : completes, filtrees, un doublon compte une fois.
═══════════════════════════════════════════ */
// une disposition a sa barre a partir de GR_PEU (100) parties au vainqueur connu, les autres sont regroupees (toutes restent
// dans « Voir les chiffres ») : avec 20 parties, la marge depasse 20 points et ecrase l'echelle de toutes les barres
const CT_MIN_DISPO = 20;   // depart (coups possibles) : une disposition a sa ligne a partir de 20 parties
const CT_MIN_ANNEE = 20;   // une annee a sa ligne a partir de 20 parties

/* ─── 1. L'avantage du trait, disposition par disposition ─── */
function _ctTrait(L){
  const D = STATS_PARTIES, T = {}, tout = { n: 0, g: 0 };
  L.forEach(function(x){
    const g = x.p[0]; if (g !== 1 && g !== 2) return;
    const d = D.dispos[x.p[3]], t = T[d] || (T[d] = { d: d, n: 0, g: 0 });
    t.n++; tout.n++; if (g === 1) { t.g++; tout.g++; }
  });
  const toutes = Object.keys(T).map(function(d){ return T[d]; }).sort(function(a, b){ return b.n - a.n; });
  const lignes = toutes.filter(function(t){ return t.n >= GR_PEU; }), petites = toutes.filter(function(t){ return t.n < GR_PEU; });
  const autres = petites.reduce(function(a, t){ a.n += t.n; a.g += t.g; a.nb++; return a; }, { d: null, n: 0, g: 0, nb: 0 });
  return { tout: tout, lignes: lignes, autres: autres, toutes: toutes };
}
// l'ecart a 50 %, en points, et sa marge : barres signees (bleu : les Noirs gagnent plus ; rouge : les Blancs)
function _ctBarreTrait(lab, t){
  const w = grWilson(t.g, t.n);
  return { lab: lab, v: 100 * (w.p - 0.5), bas: 100 * (w.bas - 0.5), haut: 100 * (w.haut - 0.5),
    txt: grPct(w.p, 1) + ' <span class="sb-marge">' + grMarge(t.g, t.n) + ' · ' + grNb(t.n) + (t.n < GR_PEU ? ' ⚠' : '') + '</span>',
    tip: lab + _dimDp() + _tr('les Noirs gagnent ', 'Black wins ') + t.g + ' / ' + t.n + ' (' + grFourchette(t.g, t.n) + ')' + grPeu(t.n) };
}
function _ctAxe(M){ return [grPct(0.5 - M / 100), '50 %', grPct(0.5 + M / 100)]; }
function _ctHtmlTrait(L){
  const R = _ctTrait(L);
  if (!R.tout.n) return '';
  const items = [_ctBarreTrait(_tr('Toutes', 'All'), R.tout)].concat(R.lignes.map(function(t){ return _ctBarreTrait(_cfNomDispo(t.d), t); }));
  if (R.autres.n) items.push(_ctBarreTrait(_tr('Autres (' + R.autres.nb + ' dispositions)', 'Others (' + R.autres.nb + ' layouts)'), R.autres));
  const M = Math.max(10, Math.ceil(Math.max.apply(null, items.map(function(i){ return Math.max(Math.abs(i.bas), Math.abs(i.haut)); })) / 5) * 5);
  // ce que les marges permettent d'affirmer : un avantage net quand la marge entiere est du meme cote de 50 %
  const net = [], blancs = [], flou = [];
  R.lignes.forEach(function(t){ const w = grWilson(t.g, t.n), nom = _cfNomDispo(t.d); if (w.bas > 0.5) net.push(nom); else if (w.haut < 0.5) blancs.push(nom); else flou.push(nom); });
  const liste = function(T){ return T.map(grEchapper).join(', '); };
  let phrase = '';
  if (net.length) phrase += _tr('Avantage des Noirs démontré (toute la marge au-dessus de 50 %) : ', 'Black’s advantage shown (the whole margin above 50 %): ') + liste(net) + '. ';
  if (blancs.length) phrase += _tr('Avantage des Blancs démontré : ', 'White’s advantage shown: ') + liste(blancs) + '. ';
  if (flou.length) phrase += _tr('Pas d’écart démontré (la marge contient 50 %) : ', 'No gap shown (the margin includes 50 %): ') + liste(flou) + '.';
  const corps = '<div class="gr-sous">' + _tr('La part des parties gagnées par les Noirs, qui commencent, dans chaque disposition (vainqueur connu). La barre part de 50 % : bleue, les Noirs gagnent plus souvent ; rouge, les Blancs. Le trait fin : la marge d’erreur à 95 %.',
      'The share of games won by Black, who moves first, in each layout (known winner). The bar starts from 50 %: blue, Black wins more often; red, White does. The thin line: the 95 % margin of error.') + '</div>'
    + grBarres(items, { min: -M, max: M, axe: _ctAxe(M) })
    + (phrase ? '<div class="gr-sous">' + phrase + '</div>' : '')
    + grChiffres([_tr('Disposition', 'Layout'), _tr('Parties', 'Games'), _tr('Noirs gagnent', 'Black wins'), '%', _tr('Marge', 'Margin')],
        [[_tr('Toutes', 'All'), R.tout.n, R.tout.g, grPct(R.tout.g / R.tout.n, 1), grMarge(R.tout.g, R.tout.n)]].concat(R.toutes.map(function(t){ return [_cfNomDispo(t.d), t.n, t.g, grPct(t.g / t.n, 1), grMarge(t.g, t.n) + (t.n < GR_PEU ? ' ⚠' : '')]; })));
  return _carteStats(_tr('L’avantage du trait, disposition par disposition', 'The first-move advantage, layout by layout') + _cfMarque(), corps,
    _tr('Mêmes parties que « En bref » : jouées depuis une position de départ, au vainqueur connu (les parties MIGS seulement quand elles finissent au score). Une disposition jouée moins de ' + GR_PEU + ' fois rejoint « Autres » : sa marge serait trop large pour dire quoi que ce soit. Toutes sont dans « Voir les chiffres ».',
        'Same games as “In short”: played from a starting position, with a known winner (MIGS games only when they end on the score). A layout played fewer than ' + GR_PEU + ' times joins “Others”: its margin would be too wide to say anything. All of them are in “See the numbers”.'));
}

/* ─── 2. Le jeu au fil des annees ─── */
function _ctAnnees(L){
  const D = STATS_PARTIES, A = {};
  L.forEach(function(x){
    const y = _cfAnnee(x.k), a = A[y] || (A[y] = { annee: y, n: 0, dec: 0, g: 0, six: 0, len: [], src: [0, 0, 0, 0] });
    a.n++; a.len.push(x.p[1]); a.src[_cfSourceDe(x.k, D)]++;
    if (x.p[0] === 1 || x.p[0] === 2) { a.dec++; if (x.p[0] === 1) a.g++; }
    const s = _cfScoreA(x.p[4], 1e9); if (s.nb >= 6 || s.nw >= 6) a.six++;
  });
  return Object.keys(A).sort().map(function(y){ const a = A[y]; a.len.sort(function(u, v){ return u - v; }); a.med = grQuantile(a.len, 0.5); return a; });
}
function _ctHtmlAnnees(L){
  const T0 = _ctAnnees(L), T = T0.filter(function(a){ return a.n >= CT_MIN_ANNEE; }), cachees = T0.filter(function(a){ return a.n < CT_MIN_ANNEE; });
  if (!T.length) return '';
  const cellPct = function(g, n, couleur){
    if (!n) return '<td>—</td>';
    const w = grWilson(g, n);
    return '<td><b' + (couleur ? ' style="color:' + (w.bas > 0.5 ? GR_POS : (w.haut < 0.5 ? GR_NEG : 'var(--text)')) + '"' : '') + '>' + grPct(w.p) + '</b> <i class="sb-marge">' + grMarge(g, n) + (n < GR_PEU ? ' ⚠' : '') + '</i></td>';
  };
  let h = '<div class="gr-sous">' + _tr('Pour chaque année : les parties retenues et leur site, la part gagnée par les Noirs (vainqueur connu ; en bleu quand toute la marge est au-dessus de 50 %), la durée médiane et la part des parties finies à 6 billes.',
    'For each year: the games kept and their site, the share won by Black (known winner; in blue when the whole margin is above 50 %), the median length and the share of games ended at 6 marbles.') + '</div>';
  h += '<div class="ct-tab-cadre"><table class="ct-tab"><thead><tr><th>' + _tr('Année', 'Year') + '</th><th>' + _tr('Parties', 'Games') + '</th><th>' + _tr('Noirs gagnent', 'Black wins') + '</th><th>' + _tr('Durée médiane', 'Median length') + '</th><th>' + _tr('Finies à 6 billes', 'Ended at 6 marbles') + '</th></tr></thead><tbody>';
  T.forEach(function(a){
    const src = a.src.map(function(n, s){ return n ? _cfNomSourceCourt(s) + (a.src.filter(Boolean).length > 1 ? ' ' + grNb(n) : '') : ''; }).filter(Boolean).join(', ');
    h += '<tr><td><b>' + grEchapper(a.annee === '?' ? _tr('inconnue', 'unknown') : a.annee) + '</b><small class="ct-src">' + grEchapper(src) + '</small></td><td>' + grNb(a.n) + '</td>' + cellPct(a.g, a.dec, true)
      + '<td>' + (a.med != null ? grNb(a.med, 0) : '—') + '</td>' + cellPct(a.six, a.n, false) + '</tr>';
  });
  h += '</tbody></table></div><div class="gr-sous">' + _tr('Durée en demi-coups.', 'Length in plies.') + '</div>';
  if (cachees.length) { const n = cachees.reduce(function(a, x){ return a + x.n; }, 0);
    h += '<div class="gr-sous">' + _tr('Non montrées (moins de ' + CT_MIN_ANNEE + ' parties) : ', 'Not shown (fewer than ' + CT_MIN_ANNEE + ' games): ') + cachees.map(function(a){ return grEchapper(a.annee === '?' ? _tr('année inconnue', 'unknown year') : a.annee) + ' (' + grNb(a.n) + ')'; }).join(', ') + '.</div>'; }
  return _carteStats(_tr('Le jeu au fil des années', 'The game over the years') + _cfMarque(), h,
    _tr('Prudence : presque chaque année vient d’un seul site (MIGS en 2016-2017, AbalOnline de 2020 à 2023, PlayStrategy en 2026), avec ses joueurs, ses dispositions et sa façon d’enregistrer les fins (une partie MIGS n’a de vainqueur connu que si elle finit au score). Un écart entre deux années dit d’abord que ce ne sont pas les mêmes parties, pas forcément que le jeu a changé.',
        'Caution: almost every year comes from a single site (MIGS in 2016-2017, AbalOnline from 2020 to 2023, PlayStrategy in 2026), with its own players, layouts and way of recording endings (a MIGS game only has a known winner when it ends on the score). A gap between two years first says these are not the same games, not necessarily that the game changed.'));
}

/* ─── 3. La premiere poussee de chaque type ───
   p[9] : demi-coup de la premiere poussee de chaque type, Noirs 0..2, Blancs 3..5 (0 : jamais). Les
   deux camps ne jouent jamais au meme demi-coup : il y a toujours un premier. Type 0 ici : la premiere
   poussee de la partie, tous types confondus. */
const CT_TYPES = [null, 0, 1, 2];
function _ctMinNonNul(t){ let m = 0; t.forEach(function(v){ if (v && (!m || v < m)) m = v; }); return m; }
function _ctPremieres(L){
  const R = CT_TYPES.map(function(){ return { n: 0, avec: 0, plies: [], dec: 0, g: 0, noirs: 0, parCamp: [null, { n: 0, g: 0 }, { n: 0, g: 0 }] }; });
  L.forEach(function(x){
    const fp = x.p[9]; if (!fp) return;
    const g = x.p[0], decide = g === 1 || g === 2;
    CT_TYPES.forEach(function(t, i){
      const fn = t == null ? _ctMinNonNul(fp.slice(0, 3)) : fp[t], fb = t == null ? _ctMinNonNul(fp.slice(3, 6)) : fp[3 + t], r = R[i];
      r.n++;
      if (!fn && !fb) return;
      const premier = (fn && (!fb || fn < fb)) ? 1 : 2;
      r.avec++; r.plies.push(premier === 1 ? fn : fb); if (premier === 1) r.noirs++;
      if (decide) { r.dec++; if (premier === g) r.g++; const c = r.parCamp[premier]; c.n++; if (premier === g) c.g++; }
    });
  });
  return R;
}
function _ctNomType(i){ return [_tr('La première poussée, tous types', 'The first push, any type'), _tr('2 contre 1', '2 against 1'), _tr('3 contre 1', '3 against 1'), _tr('3 contre 2', '3 against 2')][i]; }
function _ctHtmlPremieres(L){
  const R = _ctPremieres(L);
  if (!R[0].n) return '';
  let h = '<div class="gr-sous">' + _tr('Pour chaque type de poussée (sumito), le demi-coup où elle apparaît pour la première fois dans la partie, quel que soit le camp. La boîte : la moitié des parties ; le trait doré : la médiane ; la moustache : 8 parties sur 10.',
    'For each kind of push (sumito), the ply where it first appears in the game, whichever side plays it. The box: half of the games; the gold tick: the median; the whisker: 8 games in 10.') + '</div>';
  h += grBoites(R.map(function(r, i){ return { lab: _ctNomType(i) + ' · ' + grPct(r.avec / r.n), vals: r.plies,
    tip: _ctNomType(i) + _dimDp() + _tr('jouée dans ', 'played in ') + grPct(r.avec / r.n) + _tr(' des parties', ' of games') + ' (' + grNb(r.avec) + ' / ' + grNb(r.n) + ')' + (r.plies.length ? ' · ' + _tr('médiane : demi-coup ', 'median: ply ') + grNb(grQuantile(r.plies.slice().sort(function(a, b){ return a - b; }), 0.5), 0) : '') }; }), { min: 0 });
  h += '<div class="gr-sous">' + _tr('Le pourcentage après le nom : la part des parties où ce type de poussée est joué au moins une fois.', 'The percentage after the name: the share of games where this kind of push is played at least once.') + '</div>';
  // le camp qui la joue le premier gagne-t-il ?
  h += '<div class="gr-titre">' + _tr('Le camp qui la joue le premier gagne-t-il ?', 'Does the side that plays it first win?') + '</div><div class="gr-sous">'
    + _tr('Parties au vainqueur connu où cette poussée est jouée : la part gagnée par le camp qui l’a jouée le premier. La barre part de 50 % ; le trait fin : la marge à 95 %.',
          'Games with a known winner where this push is played: the share won by the side that played it first. The bar starts from 50 %; the thin line: the 95 % margin.') + '</div>';
  const items = R.map(function(r, i){
    if (!r.dec) return null;
    const w = grWilson(r.g, r.dec), cN = r.parCamp[1], cB = r.parCamp[2];
    return { lab: _ctNomType(i), v: 100 * (w.p - 0.5), bas: 100 * (w.bas - 0.5), haut: 100 * (w.haut - 0.5),
      txt: grPct(w.p) + ' <span class="sb-marge">' + grMarge(r.g, r.dec) + (r.dec < GR_PEU ? ' ⚠' : '') + '</span>',
      tip: _ctNomType(i) + _dimDp() + _tr('le camp qui la joue le premier gagne ', 'the side that plays it first wins ') + r.g + ' / ' + r.dec + ' (' + grFourchette(r.g, r.dec) + ')' + grPeu(r.dec)
        + ' · ' + _tr('Noirs les premiers : ', 'Black first: ') + cN.g + ' / ' + cN.n + ' · ' + _tr('Blancs les premiers : ', 'White first: ') + cB.g + ' / ' + cB.n
        + ' · ' + _tr('les Noirs la jouent les premiers dans ', 'Black plays it first in ') + grPct(r.noirs / r.avec) + _tr(' des parties', ' of games') };
  }).filter(Boolean);
  const M = Math.max(10, Math.ceil(Math.max.apply(null, items.map(function(i){ return Math.max(Math.abs(i.bas), Math.abs(i.haut)); })) / 5) * 5);
  h += grBarres(items, { min: -M, max: M, axe: _ctAxe(M) });
  // ce qu'on peut en dire : le type le plus parlant, separe par camp (les Noirs gagnent deja un peu plus souvent), et le moins parlant
  const types = [1, 2, 3].filter(function(i){ return R[i].dec >= GR_PEU && R[i].parCamp[1].n && R[i].parCamp[2].n; });
  if (types.length >= 2) {
    const taux = function(i){ return R[i].g / R[i].dec; };
    const fort = types.reduce(function(a, i){ return taux(i) > taux(a) ? i : a; }), faible = types.reduce(function(a, i){ return taux(i) < taux(a) ? i : a; });
    const r = R[fort], pN = r.parCamp[1].g / r.parCamp[1].n, pB = r.parCamp[2].g / r.parCamp[2].n;
    h += '<div class="gr-sous">' + _tr('Le plus parlant : <b>' + _ctNomType(fort) + '</b>. Le camp qui le joue le premier gagne ' + grPct(taux(fort)) + ' des parties — ' + grPct(pN) + ' quand ce sont les Noirs, ' + grPct(pB) + ' quand ce sont les Blancs : ce n’est donc pas l’avantage du trait qui parle.',
        'The most telling: <b>' + _ctNomType(fort) + '</b>. The side that plays it first wins ' + grPct(taux(fort)) + ' of games — ' + grPct(pN) + ' when it is Black, ' + grPct(pB) + ' when it is White: so it is not the first-move advantage speaking.')
      + (Math.abs(taux(faible) - 0.5) < 0.02 ? ' ' + _tr('Le ' + _ctNomType(faible) + ', lui, ne dit presque rien (' + grPct(taux(faible)) + ').', 'The ' + _ctNomType(faible) + ', on the other hand, says almost nothing (' + grPct(taux(faible)) + ').') : '')
      + ' ' + _tr('C’est un lien, pas une cause : pouvoir jouer un 3 contre 2 le premier, c’est souvent avoir déjà la meilleure position.', 'It is a link, not a cause: being able to play a 3 against 2 first often means already having the better position.') + '</div>';
  }
  h += grChiffres([_tr('Poussée', 'Push'), _tr('Parties', 'Games'), _tr('Jouée', 'Played'), _tr('Médiane (demi-coup)', 'Median (ply)'), _tr('Noirs les premiers', 'Black first'), _tr('Le premier gagne', 'First one wins'), _tr('Noirs les premiers : gagnent', 'Black first: wins'), _tr('Blancs les premiers : gagnent', 'White first: wins')],
    R.map(function(r, i){ const t = r.plies.slice().sort(function(a, b){ return a - b; }), c = function(x){ return x.n ? x.g + ' / ' + x.n + ' (' + grPct(x.g / x.n) + ')' : '—'; };
      return [_ctNomType(i), r.n, r.avec, t.length ? grNb(grQuantile(t, 0.5), 0) : '—', r.avec ? grPct(r.noirs / r.avec) : '—', r.dec ? r.g + ' / ' + r.dec + ' (' + grPct(r.g / r.dec) + ')' : '—', c(r.parCamp[1]), c(r.parCamp[2])]; }));
  return _carteStats(_tr('La première poussée de chaque type', 'The first push of each kind') + _cfMarque(), h,
    _tr('Une poussée : un groupe de 2 ou 3 billes en ligne qui déplace 1 ou 2 billes adverses (sumito). Celles qui éjectent comptent aussi ; la première de la partie éjecte rarement.',
        'A push: a line of 2 or 3 marbles moving 1 or 2 opposing marbles (sumito). Those that push a marble off count too; the first one of a game rarely does.'));
}

/* ─── 4. Les positions repetees ───
   p[10] : [premier demi-coup qui revoit une position deja vue (meme plateau, meme camp au trait),
   ecart avec sa premiere apparition, nombre de repetitions, plus grand nombre de passages par une meme
   position] ; 0 : aucune. Une position ne peut revenir qu'apres au moins 4 demi-coups (chaque camp
   defait son coup). */
function _ctRepetitions(L){
  const r = { n: 0, avec: 0, trois: 0, prem: [], cycles: {}, lenAvec: [], lenSans: [], finAvec: [0, 0, 0, 0], finSans: [0, 0, 0, 0] };
  L.forEach(function(x){
    if (x.p.length <= 10) return;
    const rep = x.p[10], g = x.p[0], six = (function(){ const s = _cfScoreA(x.p[4], 1e9); return s.nb >= 6 || s.nw >= 6; })();
    // fins : 0 a 6 billes, 1 autre victoire (abandon, temps), 2 nulle, 3 vainqueur inconnu
    const fin = six ? 0 : (g === 3 ? 2 : ((g === 1 || g === 2) ? 1 : 3));
    r.n++;
    if (rep) {
      r.avec++; r.prem.push(rep[0]); r.cycles[rep[1]] = (r.cycles[rep[1]] || 0) + 1; if (rep[3] >= 3) r.trois++;
      r.lenAvec.push(x.p[1]); r.finAvec[fin]++;
    } else { r.lenSans.push(x.p[1]); r.finSans[fin]++; }
  });
  return r;
}
function _ctHtmlRepetitions(L, W){
  const r = _ctRepetitions(L);
  if (!r.n) return '';
  const tri = function(t){ return t.slice().sort(function(a, b){ return a - b; }); };
  const cyc = Object.keys(r.cycles).map(Number).sort(function(a, b){ return a - b; }), cycMax = cyc.reduce(function(a, c){ return r.cycles[c] > (r.cycles[a] || 0) ? c : a; }, cyc[0]);
  const medAvec = grQuantile(tri(r.lenAvec), 0.5), medSans = grQuantile(tri(r.lenSans), 0.5);
  let h = grTuiles([
    { lab: _tr('Parties qui revoient une position', 'Games that see a position again'), v: grPct(r.avec / r.n, 1), sous: grMarge(r.avec, r.n) + ' · ' + grNb(r.avec) + ' / ' + grNb(r.n) + grPeu(r.n) },
    { lab: _tr('Une position vue 3 fois ou plus', 'A position seen 3 times or more'), v: grPct(r.trois / r.n, 1), sous: grNb(r.trois) + _tr(' parties', ' games') },
    { lab: _tr('Première répétition (médiane)', 'First repetition (median)'), v: r.prem.length ? _tr('demi-coup ', 'ply ') + grNb(grQuantile(tri(r.prem), 0.5), 0) : '—', sous: r.prem.length ? _tr('8 sur 10 entre ', '8 in 10 between ') + grNb(grQuantile(tri(r.prem), 0.1), 0) + _tr(' et ', ' and ') + grNb(grQuantile(tri(r.prem), 0.9), 0) : '' },
    { lab: _tr('Écart le plus fréquent', 'Most frequent gap'), v: cyc.length ? grNb(cycMax) + _tr(' demi-coups', ' plies') : '—', sous: cyc.length ? grPct(r.cycles[cycMax] / r.avec) + _tr(' des premières répétitions', ' of first repetitions') + (cycMax === 4 ? _tr(' : un aller-retour de chaque camp', ': each side moves there and back') : '') : '' }
  ]);
  if (r.prem.length) {
    const bins = []; for (let b = 0; b < 16; b++) bins.push(0);
    r.prem.forEach(function(p){ bins[Math.min(15, Math.floor(p / 10))]++; });
    h += '<div class="gr-titre">' + _tr('Quand la première répétition arrive', 'When the first repetition comes') + '</div>'
      + grColonnes(W, bins.map(function(v, b){ return { lab: b === 15 ? '150+' : String(b * 10), v: v, tip: (b === 15 ? _tr('150 demi-coups et plus', '150 plies and more') : _tr(b * 10 + ' à ' + (b * 10 + 9) + ' demi-coups', b * 10 + ' to ' + (b * 10 + 9) + ' plies')) + _dimDp() + grNb(v) + _tr(' parties', ' games') }; }), { titreX: _tr('demi-coups', 'plies'), aria: _tr('Demi-coup de la première répétition', 'Ply of the first repetition') });
  }
  // et ces parties-la, comment finissent-elles ?
  const nomsFin = [_tr('6 billes éjectées', '6 marbles pushed off'), _tr('vainqueur sans 6 billes', 'winner without 6 marbles'), _tr('nulle', 'draw'), _tr('vainqueur inconnu', 'unknown winner')];
  if (r.avec && r.n - r.avec) {
    h += '<div class="gr-titre">' + _tr('Comment elles finissent', 'How they end') + '</div>'
      + '<div class="gr-sous">' + _tr('Avec une position revue (' + grNb(r.avec) + ' parties, médiane ' + grNb(medAvec, 0) + ' demi-coups) :', 'With a position seen again (' + grNb(r.avec) + ' games, median ' + grNb(medAvec, 0) + ' plies):') + '</div>'
      + grPile(nomsFin.map(function(nom, i){ return { nom: nom, v: r.finAvec[i] }; }))
      + '<div class="gr-sous">' + _tr('Sans (' + grNb(r.n - r.avec) + ' parties, médiane ' + grNb(medSans, 0) + ' demi-coups) :', 'Without (' + grNb(r.n - r.avec) + ' games, median ' + grNb(medSans, 0) + ' plies):') + '</div>'
      + grPile(nomsFin.map(function(nom, i){ return { nom: nom, v: r.finSans[i] }; }));
  }
  h += grChiffres([_tr('Écart (demi-coups)', 'Gap (plies)'), _tr('Premières répétitions', 'First repetitions')], cyc.map(function(c){ return [c, r.cycles[c]]; }));
  return _carteStats(_tr('Les positions répétées', 'Repeated positions') + _cfMarque(), h,
    _tr('Une position « revue » : exactement le même plateau, avec le même camp au trait, qu’à un moment plus tôt de la même partie (comparaison case par case, pas un hachage). Il faut au moins 4 demi-coups : chacun des deux camps défait son coup. Les règles de l’Abalone n’interdisent pas la répétition ; certains sites la comptent comme nulle.',
        'A position “seen again”: exactly the same board, with the same side to move, as earlier in the same game (cell-by-cell comparison, not a hash). It takes at least 4 plies: each side undoes its move. The rules of Abalone do not forbid repetition; some sites score it as a draw.'));
}

/* ─── 5. Combien de coups possibles ───
   p[11] : le nombre de coups legaux du camp au trait aux demi-coups _SB_BRANCHES (0 : partie deja finie). */
function _ctBranchement(L){
  const D = STATS_PARTIES, V = _SB_BRANCHES.map(function(){ return []; }), depart = {};
  L.forEach(function(x){
    const br = x.p[11]; if (!br) return;
    br.forEach(function(v, i){ if (v) V[i].push(v); });
    if (br[0]) { const d = D.dispos[x.p[3]]; (depart[d] || (depart[d] = [])).push(br[0]); }
  });
  const pts = _SB_BRANCHES.map(function(ply, i){ const t = V[i].sort(function(a, b){ return a - b; }); return { ply: ply, n: t.length, p10: grQuantile(t, 0.1), med: grQuantile(t, 0.5), p90: grQuantile(t, 0.9), moy: t.length ? t.reduce(function(a, b){ return a + b; }, 0) / t.length : null }; });
  return { pts: pts, depart: depart };
}
function _ctHtmlBranchement(L, W){
  const B = _ctBranchement(L), P = B.pts.filter(function(p){ return p.n >= 20; });
  if (!P.length) return '';
  let h = '<div class="gr-sous">' + _tr('Le nombre de coups légaux du camp au trait, à différents moments de la partie. La courbe : la médiane ; la bande : 8 positions sur 10. Seules comptent les parties encore en cours à ce moment-là.',
    'The number of legal moves of the side to move, at different moments of the game. The line: the median; the band: 8 positions in 10. Only games still going at that moment count.') + '</div>';
  h += grLignes(W, [{ nom: _tr('médiane', 'median'), couleur: GR_OR, pts: P.map(function(p){ return [p.ply, p.med]; }), bande: P.map(function(p){ return [p.ply, p.p10, p.p90]; }), points: true }],
    { titreX: _tr('demi-coup', 'ply'), nomX: _tr('demi-coup', 'ply'), yMin: 0, aria: _tr('Coups possibles selon le moment de la partie', 'Possible moves by moment of the game'),
      fmtTip: function(v, sr, x){ const p = P.find(function(q){ return q.ply === x; }); return grNb(v, 0) + _tr(' coups (8 sur 10 entre ', ' moves (8 in 10 between ') + grNb(p.p10, 0) + _tr(' et ', ' and ') + grNb(p.p90, 0) + ') · ' + grNb(p.n) + _tr(' parties', ' games'); } });
  // ce que cela represente pour une recherche : la mediane au 30e demi-coup, a la puissance 4
  const p30 = B.pts.find(function(p){ return p.ply === 30 && p.n >= 20; });
  if (p30) {
    const m = Math.round(p30.med), arbre = Math.pow(m, 4);
    h += '<div class="gr-sous">' + _tr('Au 30ᵉ demi-coup, la médiane est de ' + grNb(m) + ' coups : regarder toutes les suites de 4 demi-coups, c’est déjà ' + grCompact(arbre) + ' positions (' + grNb(m) + '⁴). C’est pourquoi l’IA trie les coups et en coupe la plupart sans les examiner jusqu’au bout.',
      'At ply 30 the median is ' + grNb(m) + ' moves: looking at every sequence of 4 plies already means ' + grCompact(arbre) + ' positions (' + grNb(m) + '⁴). That is why the AI orders the moves and prunes most of them without looking at them to the end.') + '</div>';
  }
  // au depart, selon la disposition
  const medDep = function(d){ return grQuantile(B.depart[d].slice().sort(function(a, b){ return a - b; }), 0.5); };
  const dep = Object.keys(B.depart).filter(function(d){ return B.depart[d].length >= CT_MIN_DISPO; }).sort(function(a, b){ return (a === 'custom') - (b === 'custom') || medDep(b) - medDep(a); });
  if (dep.length) {
    h += '<div class="gr-titre">' + _tr('Au premier coup, selon la disposition', 'On the first move, by layout') + '</div><div class="gr-sous">' + _tr('Les coups possibles des Noirs dans la position de départ.', 'Black’s possible moves in the starting position.') + '</div>'
      + grBarres(dep.map(function(d){ const t = B.depart[d].slice().sort(function(a, b){ return a - b; }), med = grQuantile(t, 0.5), varie = t[0] !== t[t.length - 1];
        return { lab: _cfNomDispo(d), v: med, txt: grNb(med, 0) + _tr(' coups', ' moves') + (varie ? ' <span class="sb-marge">(' + _tr('médiane ; de ', 'median; from ') + t[0] + _tr(' à ', ' to ') + t[t.length - 1] + ')</span>' : ''),
          tip: _cfNomDispo(d) + _dimDp() + grNb(med, 0) + _tr(' coups possibles au départ', ' possible moves at the start') + (varie ? _tr(' (la position de départ varie d’une partie à l’autre)', ' (the starting position varies from game to game)') : '') + ' · ' + t.length + _tr(' parties', ' games') }; }), { min: 0 });
  }
  h += grChiffres([_tr('Demi-coup', 'Ply'), _tr('Parties en cours', 'Games still going'), _tr('10ᵉ centile', '10th percentile'), _tr('Médiane', 'Median'), _tr('Moyenne', 'Mean'), _tr('90ᵉ centile', '90th percentile')],
    B.pts.filter(function(p){ return p.n; }).map(function(p){ return [p.ply, p.n, grNb(p.p10, 0), grNb(p.med, 0), grNb(p.moy, 1), grNb(p.p90, 0)]; }));
  return _carteStats(_tr('Combien de coups possibles', 'How many possible moves') + _cfMarque(), h,
    _tr('Compté par le moteur du site sur chaque position rejouée : tous les coups légaux (1, 2 ou 3 billes, en ligne ou de côté, poussées comprises), chacun une seule fois.',
        'Counted by the site’s engine on each replayed position: every legal move (1, 2 or 3 marbles, inline or sideways, pushes included), each counted once.'));
}

/* ─── Tout redessiner (appele par _cfRendreTout, 48-corpus-plus.js) ─── */
function _ctRendreTout(){
  if (!STATS_PARTIES) return;
  const L = _cfParties();
  const pose = function(id, f){ const el = document.getElementById(id); if (el) el.innerHTML = f(el); };
  pose('corpus-trait', function(){ return _ctHtmlTrait(L); });
  pose('corpus-annees', function(){ return _ctHtmlAnnees(L); });
  pose('corpus-premieres', function(){ return _ctHtmlPremieres(L); });
  pose('corpus-repetitions', function(el){ return _ctHtmlRepetitions(L, grLargeur(el, 640) - 40); });
  pose('corpus-branchement', function(el){ return _ctHtmlBranchement(L, grLargeur(el, 640) - 40); });
  grSurRedim('corpus-rep', 'corpus-repetitions', function(){ const el = document.getElementById('corpus-repetitions'); if (el && STATS_PARTIES) el.innerHTML = _ctHtmlRepetitions(_cfParties(), grLargeur(el, 640) - 40); });
  grSurRedim('corpus-br', 'corpus-branchement', function(){ const el = document.getElementById('corpus-branchement'); if (el && STATS_PARTIES) el.innerHTML = _ctHtmlBranchement(_cfParties(), grLargeur(el, 640) - 40); });
}
