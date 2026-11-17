/* ═══════════════════════════════════════════
   CORPUS : CINQ CARTES DE PLUS (v3.39)
   Demande d'ocj94 (« Tout », sur dix-huit propositions ; ici les nos 1 à 5). Tout vient des données
   embarquées (STATS_PARTIES, un enregistrement par partie) et des banques de parties pour les dates et
   l'expérience : aucune partie n'est rejouée ici, rien n'est estimé.
   1. Séries et ripostes : après une bille tombée, qui fait tomber la suivante, et au bout de combien.
   2. Les changements de meneur : combien de fois l'avance change de camp.
   3. L'activité mois par mois : le corpus par année et par mois.
   4. L'expérience paie-t-elle ? Le camp qui a le plus de parties dans le corpus gagne-t-il plus souvent.
      Aucun pseudo n'est affiché : seulement des nombres de parties.
   5. La rose des directions : les 6 directions de jeu, par camp, par phase, et celles des poussées.
   Les filtres de la page (source, disposition, longueur, année, joueurs) s'appliquent : _cfParties()
   les a déjà passés ; les cartes portent la marque 🔎 comme les autres cartes filtrées.
═══════════════════════════════════════════ */
const CS_ECARTS = [[1, 2, '1'], [2, 4, '2-3'], [4, 7, '4-6'], [7, 11, '7-10'], [11, 21, '11-20'], [21, Infinity, '21+']];
const CS_MIN = 30;             // en dessous, une proportion ne veut rien dire : la carte le dit
const CS_EXP = [[0, 3, '1-2'], [3, 10, '3-9'], [10, 30, '10-29'], [30, 100, '30-99'], [100, Infinity, '100+']];

/* Les éjections d'une partie, dans l'ordre : [{ ply, camp }] -- camp 'black' quand une bille blanche tombe. */
function _csEjections(p) {
  const E = [], ej = p[4] || [];
  for (let i = 0; i < ej.length; i += 2) E.push({ ply: ej[i], camp: (ej[i + 1] & 1) ? 'black' : 'white' });
  return E;
}

/* ═══ 1. Séries et ripostes ═══ */
function _csSeries(L) {
  const r = { suites: 0, ripostes: 0, ecarts: CS_ECARTS.map(function () { return [0, 0]; }), parMoment: [[0, 0], [0, 0], [0, 0]], ecartsTous: [] };
  L.forEach(function (x) {
    const E = _csEjections(x.p);
    for (let i = 1; i < E.length; i++) {
      const suite = E[i].camp === E[i - 1].camp, d = Math.max(1, E[i].ply - E[i - 1].ply);
      if (suite) r.suites++; else r.ripostes++;
      r.ecartsTous.push(d);
      for (let t = 0; t < CS_ECARTS.length; t++) if (d >= CS_ECARTS[t][0] && d < CS_ECARTS[t][1]) { r.ecarts[t][suite ? 0 : 1]++; break; }
      // le moment : combien de billes etaient deja tombees avant cette reponse (i). La phase « ouverture »
      // n'existe pas ici : une reponse vient toujours apres au moins une bille.
      r.parMoment[i === 1 ? 0 : (i <= 3 ? 1 : 2)][suite ? 0 : 1]++;
    }
  });
  return r;
}
function _csHtmlSeries(L, W) {
  const r = _csSeries(L), n = r.suites + r.ripostes;
  if (n < CS_MIN) return _carteStats(_tr('Séries et ripostes', 'Runs and ripostes') + _cfMarque(),
    '<div class="gr-vide">' + _tr('Moins de ' + CS_MIN + ' billes tombées après une autre avec ces filtres.', 'Fewer than ' + CS_MIN + ' marbles pushed off after another with these filters.') + '</div>');
  const med = grQuantile(r.ecartsTous.slice().sort(function (a, b) { return a - b; }), 0.5);
  let h = '<div class="gr-sous">' + _tr('Quand une bille vient de tomber, qui fait tomber la suivante : le même camp (il enchaîne) ou l’autre (il riposte) ? Sur ' + grNb(n) + ' billes tombées après une autre.',
    'When a marble has just fallen, who pushes the next one off: the same side (a run) or the other (a riposte)? Over ' + grNb(n) + ' marbles pushed off after another.') + '</div>';
  h += grPile([{ nom: _tr('il enchaîne', 'a run'), v: r.suites, couleur: GR_SERIES[0] }, { nom: _tr('l’autre riposte', 'a riposte'), v: r.ripostes, couleur: GR_SERIES[1] }], {});
  h += grTuiles([
    { lab: _tr('Il enchaîne', 'A run'), v: grPct(r.suites / n), sous: grMarge(r.suites, n) + ' · ' + _tr('le même camp reprend une bille', 'the same side takes another marble') },
    { lab: _tr('Écart médian', 'Median gap'), v: grNb(med, 0) + _tr(' demi-coups', ' plies'), sous: _tr('entre deux billes qui tombent', 'between two marbles falling') },
    { lab: _tr('Réponse immédiate', 'Immediate answer'), v: grPct((r.ecarts[0][0] + r.ecarts[0][1]) / n), sous: _tr('la bille suivante tombe au demi-coup d’après', 'the next marble falls on the very next ply') }
  ]);
  h += '<div class="gr-sous">' + _tr('Au bout de combien de demi-coups tombe la bille suivante.', 'After how many plies the next marble falls.') + '</div>'
    + grColonnes(W, CS_ECARTS.map(function (t, i) {
      const v = r.ecarts[i][0] + r.ecarts[i][1];
      return { lab: t[2], v: v, tip: t[2] + _tr(' demi-coups', ' plies') + _dimDp() + grNb(v) + ' · ' + _tr('enchaîne ', 'run ') + grPct(v ? r.ecarts[i][0] / v : 0) };
    }), { titreX: _tr('demi-coups entre les deux', 'plies between the two'), aria: _tr('Écart entre deux billes qui tombent', 'Gap between two marbles falling') });
  const moments = [[_tr('après la 1ʳᵉ bille', 'after the 1st marble')], [_tr('après la 2ᵉ ou la 3ᵉ', 'after the 2nd or 3rd')], [_tr('après la 4ᵉ ou plus', 'after the 4th or later')]];
  h += '<div class="gr-sous">' + _tr('Et selon le moment de la partie : la part où le même camp enchaîne.', 'And by the moment of the game: the share where the same side keeps going.') + '</div>'
    + grBarres(moments.map(function (nom, i) {
      const t = r.parMoment[i][0] + r.parMoment[i][1];
      return { lab: nom[0], v: t ? r.parMoment[i][0] / t : 0, ref: r.suites / n, txt: t ? grPct(r.parMoment[i][0] / t) + ' · ' + grNb(t) : '—' };
    }), { max: 1 });
  return _carteStats(_tr('Séries et ripostes', 'Runs and ripostes') + _cfMarque(), h,
    _tr('Le repère sur chaque barre : la moyenne de tout le corpus filtré. Le moment se compte en billes déjà tombées dans la partie, les deux camps confondus.',
      'The mark on each bar: the average over the whole filtered corpus. The moment is counted in marbles already fallen in the game, both sides together.'));
}

/* ═══ 2. Les changements de meneur ═══ */
function _csMeneurs(L) {
  const r = { parties: 0, changements: [0, 0, 0, 0, 0], total: 0, longueurs: [[], [], [], [], []], premierGagne: { n: 0, g: 0 }, jamaisRattrape: 0 };
  L.forEach(function (x) {
    const p = x.p, E = _csEjections(p);
    if (!E.length) return;
    r.parties++;
    let nb = 0, nw = 0, meneur = 0, chg = 0, premier = E[0].camp === 'black' ? 1 : 2, rattrape = false;
    E.forEach(function (e) {
      if (e.camp === 'black') nb++; else nw++;
      const m = nb > nw ? 1 : (nw > nb ? 2 : 0);
      if (m && meneur && m !== meneur) { chg++; rattrape = true; }
      if (m) meneur = m;
    });
    const k = Math.min(4, chg);
    r.changements[k]++; r.total += chg; r.longueurs[k].push(p[1]);
    if (!rattrape) r.jamaisRattrape++;
    if (p[0] === 1 || p[0] === 2) { r.premierGagne.n++; if (p[0] === premier) r.premierGagne.g++; }
  });
  return r;
}
function _csHtmlMeneurs(L, W) {
  const r = _csMeneurs(L);
  if (r.parties < CS_MIN) return _carteStats(_tr('Les changements de meneur', 'Changes of leader') + _cfMarque(),
    '<div class="gr-vide">' + _tr('Moins de ' + CS_MIN + ' parties avec une bille tombée.', 'Fewer than ' + CS_MIN + ' games with a marble pushed off.') + '</div>');
  let h = '<div class="gr-sous">' + _tr('Le meneur, c’est le camp qui a fait tomber le plus de billes. Combien de fois change-t-il, du début à la fin d’une partie ? Sur ' + grNb(r.parties) + ' parties où au moins une bille tombe.',
    'The leader is the side that has pushed off the most marbles. How many times does it change, from the start of a game to its end? Over ' + grNb(r.parties) + ' games where at least one marble falls.') + '</div>';
  h += grColonnes(W, r.changements.map(function (v, i) {
    const med = r.longueurs[i].length ? grQuantile(r.longueurs[i].slice().sort(function (a, b) { return a - b; }), 0.5) : null;
    return { lab: i === 4 ? '4+' : String(i), v: v, tip: (i === 4 ? _tr('4 changements ou plus', '4 changes or more') : i + _tr(' changement', ' change') + (i > 1 ? 's' : '')) + _dimDp()
      + grNb(v) + _tr(' parties', ' games') + (med != null ? ' · ' + _tr('longueur médiane ', 'median length ') + grNb(med, 0) : '') };
  }), { titreX: _tr('changements de meneur', 'changes of leader'), aria: _tr('Changements de meneur par partie', 'Changes of leader per game') });
  h += grTuiles([
    { lab: _tr('Jamais rattrapé', 'Never caught'), v: grPct(r.jamaisRattrape / r.parties), sous: _tr('le premier à mener garde la tête jusqu’au bout', 'the first to lead keeps it to the end') },
    { lab: _tr('Changements par partie', 'Changes per game'), v: grNb(r.total / r.parties, 1), sous: _tr('en moyenne', 'on average') },
    { lab: _tr('La première bille gagne', 'The first marble wins'), v: r.premierGagne.n ? grPct(r.premierGagne.g / r.premierGagne.n) : '—',
      sous: (r.premierGagne.n ? grMarge(r.premierGagne.g, r.premierGagne.n) + ' · ' : '') + _tr('sur ', 'over ') + grNb(r.premierGagne.n) + _tr(' parties au vainqueur connu', ' games with a known winner') + grPeu(r.premierGagne.n) }
  ]);
  // la longueur médiane selon le nombre de changements
  const dispo = r.changements.map(function (v, i) { return { i: i, v: v }; }).filter(function (x) { return r.longueurs[x.i].length >= 10; });
  if (dispo.length >= 2) h += '<div class="gr-sous">' + _tr('Une partie disputée dure-t-elle plus longtemps ? La longueur médiane selon le nombre de changements.',
    'Does a see-saw game last longer? The median length by number of changes.') + '</div>'
    + grBarres(dispo.map(function (x) {
      const T = r.longueurs[x.i].slice().sort(function (a, b) { return a - b; });
      return { lab: (x.i === 4 ? '4+' : x.i) + _tr(' chang.', ' chg.'), v: grQuantile(T, 0.5), txt: grNb(grQuantile(T, 0.5), 0) + _tr(' demi-coups · ', ' plies · ') + grNb(T.length) + _tr(' parties', ' games') };
    }), {});
  return _carteStats(_tr('Les changements de meneur', 'Changes of leader') + _cfMarque(), h,
    _tr('Un changement de meneur : le camp qui menait au nombre de billes passe derrière. Les parties qui restent à égalité tout du long comptent zéro changement.',
      'A change of leader: the side ahead on marbles falls behind. Games that stay level throughout count zero changes.'));
}

/* ═══ 3. L'activité mois par mois ═══ */
// La date d'une partie, telle que les banques la portent (MIGS et PlayStrategy : rang 1 ; les autres : rang 0).
function _csDate(k) {
  const B = (typeof _sbBanques === 'function') ? _sbBanques() : null;
  if (!B) return null;
  let a = 0;
  for (let s = 0; s < B.length; s++) {
    if (k < a + B[s].length) { const g = B[s][k - a]; const d = String((s === 0 || s === 2) ? g[1] : g[0]); return /^\d{4}-\d{2}/.test(d) ? d : null; }
    a += B[s].length;
  }
  return null;
}
function _csHtmlMois(L) {
  const M = {}, annees = {};
  let datees = 0;
  L.forEach(function (x) {
    const d = _csDate(x.k); if (!d) return;
    datees++;
    const an = d.slice(0, 4), mo = +d.slice(5, 7);
    annees[an] = 1; (M[an] = M[an] || new Array(12).fill(0))[mo - 1]++;
  });
  if (!datees) return _carteStats(_tr('L’activité mois par mois', 'Activity month by month') + _cfMarque(),
    '<div class="gr-vide">' + _tr('Aucune partie datée avec ces filtres.', 'No dated game with these filters.') + '</div>');
  const A = Object.keys(annees).sort();
  const mois = currentLang() === 'EN' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                      : ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  let h = '<div class="gr-sous">' + _tr('Quand les parties du corpus ont été jouées : ' + grNb(datees) + ' parties datées, de ' + A[0] + ' à ' + A[A.length - 1] + '.',
    'When the corpus games were played: ' + grNb(datees) + ' dated games, from ' + A[0] + ' to ' + A[A.length - 1] + '.') + '</div>';
  h += grCarte(A, mois, function (i, j) {
    const v = M[A[i]][j];
    return { v: v || null, txt: v ? grNb(v) : '', tip: mois[j] + ' ' + A[i] + _dimDp() + grNb(v) + _tr(' parties', ' games') };
  }, { echelle: 'or', legende: [_tr('aucune partie', 'no game'), _tr('beaucoup', 'many')] });
  // le total par année, pour lire la carte d'un coup d'œil
  h += grBarres(A.map(function (an) {
    const t = M[an].reduce(function (a, b) { return a + b; }, 0);
    return { lab: an, v: t, txt: grNb(t) };
  }), {});
  return _carteStats(_tr('L’activité mois par mois', 'Activity month by month') + _cfMarque(), h,
    _tr('Les parties sans date lisible ne sont pas comptées. Une année creuse ne dit rien sur le jeu : c’est le corpus qui a été constitué ainsi.',
      'Games without a readable date are left out. A thin year says nothing about the game itself: that is how the corpus was put together.'));
}

/* ═══ 4. L'expérience paie-t-elle ? ═══ */
// Combien de parties chaque joueur a dans le corpus. La clé porte la source : le même pseudo sur deux
// sites n'est pas la même personne. Rien de tout cela n'est affiché : seuls les nombres le sont.
let _csExpCache = null;
function _csExperience() {
  const B = (typeof _sbBanques === 'function') ? _sbBanques() : null;
  if (!B) return null;
  const cle = B.map(function (b) { return b.length; }).join('-');
  if (_csExpCache && _csExpCache.cle === cle) return _csExpCache;
  const n = {}, parPartie = [];
  let k = 0;
  B.forEach(function (banque, s) {
    banque.forEach(function (g) {
      const noirs = String((s === 0 || s === 2) ? g[2] : g[1] || '').trim();
      const blancs = String((s === 0 || s === 2) ? g[3] : g[2] || '').trim();
      const a = noirs ? s + '§' + noirs.toLowerCase() : null, b = blancs ? s + '§' + blancs.toLowerCase() : null;
      if (a) n[a] = (n[a] || 0) + 1;
      if (b) n[b] = (n[b] || 0) + 1;
      parPartie[k++] = [a, b];
    });
  });
  _csExpCache = { cle: cle, n: n, parPartie: parPartie };
  return _csExpCache;
}
function _csHtmlExperience(L, W) {
  const X = _csExperience();
  const titre = _tr('L’expérience paie-t-elle ?', 'Does experience pay off?') + _cfMarque();
  if (!X) return _carteStats(titre, '<div class="gr-vide">' + _tr('Les parties ne sont pas encore chargées.', 'The games are not loaded yet.') + '</div>');
  const ecarts = CS_EXP.map(function () { return { n: 0, g: 0 }; });
  let total = 0, egales = 0;
  const campsIA = (typeof _cfCampsIA === 'function');
  L.forEach(function (x) {
    const p = x.p;
    if (p[0] !== 1 && p[0] !== 2) return;                       // vainqueur inconnu
    if (campsIA && _cfCampsIA(x.k)) return;                     // au moins un programme : ce n'est pas de l'expérience humaine
    const c = X.parPartie[x.k]; if (!c || !c[0] || !c[1] || c[0] === c[1]) return;
    const a = X.n[c[0]] || 0, b = X.n[c[1]] || 0;
    if (!a || !b) return;
    total++;
    if (a === b) { egales++; return; }
    const plus = a > b ? 1 : 2, rapport = Math.max(a, b) / Math.min(a, b);
    let i = CS_EXP.length - 1;
    for (let t = 0; t < CS_EXP.length; t++) if (rapport >= CS_EXP[t][0] && rapport < CS_EXP[t][1]) { i = t; break; }
    ecarts[i].n++; if (p[0] === plus) ecarts[i].g++;
  });
  const dispo = ecarts.map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.n >= 10; });
  if (!dispo.length) return _carteStats(titre, '<div class="gr-vide">' + _tr('Pas assez de parties entre deux joueurs d’expérience différente avec ces filtres.',
    'Not enough games between two players of different experience with these filters.') + '</div>');
  const sommeN = dispo.reduce(function (a, x) { return a + x.e.n; }, 0), sommeG = dispo.reduce(function (a, x) { return a + x.e.g; }, 0);
  let h = '<div class="gr-sous">' + _tr('« Expérimenté » veut dire ici : qui a beaucoup de parties dans ce corpus — rien de plus. Pour chaque partie entre deux humains, on regarde si le camp qui en a le plus a gagné. Aucun nom n’est affiché.',
    '“Experienced” here means: who has many games in this corpus — nothing more. For each game between two humans, we look at whether the side with more of them won. No name is shown.') + '</div>';
  h += grBarres(dispo.map(function (x) {
    return { lab: '× ' + CS_EXP[x.i][2], v: x.e.g / x.e.n, ref: 0.5, couleur: x.e.g / x.e.n > 0.5 ? GR_POS : GR_NEG,
      txt: grPct(x.e.g / x.e.n) + ' ' + grMarge(x.e.g, x.e.n) + ' · ' + grNb(x.e.n),
      tip: _tr('Le camp le plus expérimenté a ', 'The more experienced side has ') + CS_EXP[x.i][2] + _tr(' fois plus de parties', ' times more games') + _dimDp()
        + grPct(x.e.g / x.e.n) + _tr(' de victoires sur ', ' wins over ') + grNb(x.e.n) + _tr(' parties', ' games') };
  }), { max: 1 });
  h += grTuiles([
    { lab: _tr('Parties comparées', 'Games compared'), v: grNb(sommeN), sous: _tr('entre deux humains d’expérience différente', 'between two humans of different experience') },
    { lab: _tr('Le plus expérimenté gagne', 'The more experienced wins'), v: grPct(sommeG / sommeN), sous: grMarge(sommeG, sommeN) + grPeu(sommeN) },
    { lab: _tr('Même expérience', 'Same experience'), v: grNb(egales), sous: _tr('parties écartées : les deux camps ont autant de parties', 'games left out: both sides have as many games') }
  ]);
  return _carteStats(titre, h,
    _tr('Un joueur très présent dans le corpus n’est pas forcément un joueur fort : il peut simplement avoir beaucoup joué sur un site bien archivé. Les parties où un programme joue sont écartées.',
      'A player who appears a lot in the corpus is not necessarily a strong player: they may simply have played a lot on a well-archived site. Games where a program plays are left out.'));
}

/* ═══ 5. La rose des directions ═══ */
// p[14] : 24 compteurs pour les Noirs puis 24 pour les Blancs (0-17 : 6 directions × 3 phases ; 18-23 : les poussées).
const CS_DIRS = [['la droite (Est)', 'the right (east)'], ['la gauche (Ouest)', 'the left (west)'], ['le haut-droite (Nord-Est)', 'the upper right (north-east)'],
  ['le haut (Nord)', 'the top (north)'], ['le bas-gauche (Sud-Ouest)', 'the lower left (south-west)'], ['le bas (Sud)', 'the bottom (south)']];
const CS_DIRS_COURT = [['→', '→'], ['←', '←'], ['↗', '↗'], ['↑', '↑'], ['↙', '↙'], ['↓', '↓']];
function _csRose(L) {
  const z = function () { return [0, 0, 0, 0, 0, 0]; };
  const r = { N: { phases: [z(), z(), z()], pouss: z(), tot: 0 }, B: { phases: [z(), z(), z()], pouss: z(), tot: 0 }, parties: 0 };
  L.forEach(function (x) {
    const d = x.p[14]; if (!d || d.length !== 48) return;
    r.parties++;
    [['N', 0], ['B', 24]].forEach(function (c) {
      const o = r[c[0]], b = c[1];
      for (let ph = 0; ph < 3; ph++) for (let i = 0; i < 6; i++) { const v = d[b + ph * 6 + i]; o.phases[ph][i] += v; o.tot += v; }
      for (let i = 0; i < 6; i++) o.pouss[i] += d[b + 18 + i];
    });
  });
  return r;
}
function _csHtmlRose(L, W) {
  const r = _csRose(L);
  const titre = _tr('La rose des directions', 'The compass of directions') + _cfMarque();
  if (!r.parties || !(r.N.tot + r.B.tot)) return _carteStats(titre, '<div class="gr-vide">'
    + _tr('Pas de directions enregistrées avec ces filtres (relancer node tools/stats-parties.js).', 'No directions recorded with these filters (re-run node tools/stats-parties.js).') + '</div>');
  const somme = function (t) { return t.reduce(function (a, b) { return a + b; }, 0); };
  const tous = function (o) { return o.phases.reduce(function (a, p) { return a.map(function (v, i) { return v + p[i]; }); }, [0, 0, 0, 0, 0, 0]); };
  const N = tous(r.N), B = tous(r.B), tN = somme(N), tB = somme(B);
  let h = '<div class="gr-sous">' + _tr('Dans quelle direction partent les coups, sur ' + grNb(r.parties) + ' parties et ' + grNb(tN + tB) + ' coups. Les six directions sont celles du plateau à l’écran, les mêmes pour les deux camps.',
    'Which way the moves go, over ' + grNb(r.parties) + ' games and ' + grNb(tN + tB) + ' moves. The six directions are those of the board on screen, the same for both sides.') + '</div>';
  h += grBarres(CS_DIRS.map(function (d, i) {
    return { lab: _tr(d[0], d[1]), v: tN ? N[i] / tN : 0, ref: tB ? B[i] / tB : null, couleur: GR_SERIES[i % GR_SERIES.length],
      txt: grPct(tN ? N[i] / tN : 0) + ' · ' + _tr('Blancs ', 'White ') + grPct(tB ? B[i] / tB : 0),
      tip: _tr(d[0], d[1]) + _dimDp() + _tr('Noirs ', 'Black ') + grNb(N[i]) + _tr(' coups (', ' moves (') + grPct(tN ? N[i] / tN : 0) + ') · ' + _tr('Blancs ', 'White ') + grNb(B[i]) + ' (' + grPct(tB ? B[i] / tB : 0) + ')' };
  }), { max: Math.max(0.35, Math.max.apply(null, N.map(function (v) { return tN ? v / tN : 0; }))) });
  h += '<div class="gr-sous">' + _tr('La barre : les Noirs. Le repère : les Blancs. Sur le plateau standard, les Noirs occupent le bas de l’écran et les Blancs le haut : chaque camp pousse surtout vers la moitié d’en face. Dans la Marguerite belge, chaque camp a des billes des deux côtés, ce qui atténue l’écart.',
    'The bar: Black. The mark: White. On the standard board, Black holds the bottom of the screen and White the top: each side mostly pushes towards the opposite half. In Belgian Daisy each side has marbles on both sides, which softens the gap.') + '</div>';
  // par phase, pour les Noirs et les Blancs ensemble (la direction est lue du côté de celui qui joue)
  const ph = [_tr('ouverture', 'opening'), _tr('milieu', 'middlegame'), _tr('finale', 'endgame')];
  h += '<div class="gr-titre">' + _tr('Selon le moment de la partie', 'By the moment of the game') + '</div>'
    + grCarte(ph, CS_DIRS.map(function (d, i) { return _tr(CS_DIRS_COURT[i][0], CS_DIRS_COURT[i][1]); }), function (i, j) {
      const v = r.N.phases[i][j] + r.B.phases[i][j], t = somme(r.N.phases[i]) + somme(r.B.phases[i]);
      return { v: t ? v / t : null, txt: t ? grPct(v / t) : '', tip: ph[i] + ' · ' + _tr(CS_DIRS[j][0], CS_DIRS[j][1]) + _dimDp() + grNb(v) + _tr(' coups (', ' moves (') + grPct(t ? v / t : 0) + ')' };
    }, { echelle: 'or', legende: [_tr('rare', 'rare'), _tr('fréquent', 'frequent')] });
  // les poussées
  const pN = r.N.pouss, pB = r.B.pouss, tpN = somme(pN), tpB = somme(pB);
  if (tpN + tpB >= CS_MIN) {
    h += '<div class="gr-titre">' + _tr('Et les poussées', 'And the pushes') + '</div>'
      + '<div class="gr-sous">' + _tr('Sur ' + grNb(tpN + tpB) + ' poussées : dans quelle direction on pousse l’adversaire.', 'Over ' + grNb(tpN + tpB) + ' pushes: which way the opponent is shoved.') + '</div>'
      + grBarres(CS_DIRS.map(function (d, i) {
        return { lab: _tr(d[0], d[1]), v: tpN ? pN[i] / tpN : 0, ref: tpB ? pB[i] / tpB : null, couleur: GR_SERIES[i % GR_SERIES.length],
          txt: grPct(tpN ? pN[i] / tpN : 0) + ' · ' + _tr('Blancs ', 'White ') + grPct(tpB ? pB[i] / tpB : 0) };
      }), { max: Math.max(0.35, Math.max.apply(null, pN.map(function (v) { return tpN ? v / tpN : 0; }))) });
  }
  return _carteStats(titre, h,
    _tr('Une poussée compte une fois, dans la direction où elle pousse. Les six directions sont celles de AX_DIRS, les mêmes que les flèches du plateau.',
      'A push counts once, in the direction it shoves. The six directions are those of AX_DIRS, the same as the board’s arrows.'));
}

/* ═══ Les cinq cartes, posées par _cfRendreTout ═══ */
function _csRendreTout() {
  if (!STATS_PARTIES) return;
  const L = _cfParties();
  const pose = function (id, f) { const el = document.getElementById(id); if (el) el.innerHTML = f(grLargeur(el, 640) - 40); };
  pose('corpus-series', function (W) { return _csHtmlSeries(L, W); });
  pose('corpus-meneurs', function (W) { return _csHtmlMeneurs(L, W); });
  pose('corpus-mois', function () { return _csHtmlMois(L); });
  pose('corpus-experience', function (W) { return _csHtmlExperience(L, W); });
  pose('corpus-rose', function (W) { return _csHtmlRose(L, W); });
}
