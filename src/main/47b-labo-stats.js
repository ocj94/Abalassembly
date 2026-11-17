/* ═══════════════════════════════════════════
   LABO : CINQ LECTURES DU JOURNAL (v3.37)
   Demande d'ocj94 (« Tout », sur dix-huit propositions ; ici les nos 6 à 10) : plus de chiffres et de
   graphiques sur ce que le Labo a réellement joué. Tout vient du journal des parties (les 2 000 dernières,
   clé abaLabData) et de l'historique des tests : aucune partie n'est rejouée, rien n'est estimé.
   Les filtres du tableau de bord (période, phase) s'appliquent, sauf là où la phase est imposée par la
   lecture elle-même (le parcours des tests ne regarde que la confirmation, les réglages que le tri).
    6. Le résultat des paires : la même position jouée deux fois, couleurs inversées.
    7. Le parcours des tests : l'avance du mutant, paire après paire, jusqu'au verdict.
    8. Quels réglages paient : pour chaque poids monté ou baissé, le score des mutants, avec sa marge.
    9. Le score final des parties, à côté de celui des vraies parties du corpus.
   10. La vitesse de calcul, séance après séance.
═══════════════════════════════════════════ */
const LAB_ST_SEANCE = 600000;   // deux parties à moins de 10 min l'une de l'autre : même séance (comme _labTbDebit)
const LAB_ST_MIN_PAIRES = 3;    // en dessous, une courbe de test ne dit rien : on ne la trace pas
const LAB_ST_MIN_REGLAGE = 6;   // parties minimum pour afficher le score d'un réglage

/* Le score du camp A d'une partie du journal : 1 gagné, 0,5 nulle, 0 perdu. */
function _labStScoreA(r) { return r.winner === 'A' ? 1 : (r.winner === 'D' ? 0.5 : 0); }
/* La couleur qui a gagné ('black', 'white' ou null pour une nulle) : A joue colorA. */
function _labStCouleurGagnante(r) {
  if (r.winner === 'D') return null;
  const a = r.colorA === 'white' ? 'white' : 'black';
  return r.winner === 'A' ? a : (a === 'black' ? 'white' : 'black');
}
/* Les paires complètes : même test (génération, phase, mutant) et même numéro de paire, deux parties de
   couleurs opposées. Rend { score, position } -- position : les deux parties gagnées par la même couleur,
   donc c'est le départ qui a décidé, pas les réglages. */
function _labStPaires(L) {
  const par = {};
  L.forEach(function (r) {
    if (r.paire == null || r.paire === '') return;
    const k = (r.gen || 0) + '|' + r.phase + '|' + (r.mutant || '') + '|' + r.paire;
    (par[k] = par[k] || []).push(r);
  });
  const P = [];
  Object.keys(par).forEach(function (k) {
    const g = par[k];
    if (g.length !== 2 || g[0].colorA === g[1].colorA) return;   // paire incomplète, ou rejouée : on ne devine pas
    const s = _labStScoreA(g[0]) + _labStScoreA(g[1]);
    const c0 = _labStCouleurGagnante(g[0]), c1 = _labStCouleurGagnante(g[1]);
    P.push({ cle: k, phase: g[0].phase, mutant: g[0].mutant, gen: g[0].gen, t: Math.max(g[0].t, g[1].t), score: s,
      position: !!(c0 && c1 && c0 === c1), plies: (g[0].plies || 0) + (g[1].plies || 0), ms: (g[0].ms || 0) + (g[1].ms || 0) });
  });
  return P.sort(function (a, b) { return a.t - b.t; });
}
const LAB_ST_RESULTATS = [[2, '2 – 0', 'le mutant gagne les deux', 'the mutant wins both'], [1.5, '1½ – ½', 'une victoire, une nulle', 'one win, one draw'],
  [1, '1 – 1', 'un partout, ou deux nulles', 'one all, or two draws'], [0.5, '½ – 1½', 'une nulle, une défaite', 'one draw, one loss'], [0, '0 – 2', 'le mutant perd les deux', 'the mutant loses both']];

/* ═══ 6. Le résultat des paires ═══ */
function _labStHtmlPaires(L, W) {
  const P = _labStPaires(L);
  if (P.length < 2) return '<div class="gr-titre">' + _tr('Le résultat des paires', 'How the pairs ended') + '</div><div class="gr-vide">'
    + _tr('Il faut au moins deux paires complètes dans le journal.', 'At least two complete pairs are needed in the journal.') + '</div>';
  const n = P.length, compte = {};
  LAB_ST_RESULTATS.forEach(function (x) { compte[x[0]] = 0; });
  P.forEach(function (p) { compte[p.score] = (compte[p.score] || 0) + 1; });
  const position = P.filter(function (p) { return p.position; }).length;
  const equilibre = compte[1] || 0, decisives = n - equilibre;
  let h = '<div class="gr-titre">' + _tr('Le résultat des paires', 'How the pairs ended') + '</div>'
    + '<div class="gr-sous">' + _tr('Une paire, c’est la même position jouée deux fois, les couleurs inversées : c’est ainsi que le Labo tranche, pour que l’avantage du premier joueur s’annule. Résultat du camp testé sur les deux parties.',
      'A pair is the same position played twice with the colours swapped: that is how the Lab decides, so that the first player’s advantage cancels out. Score of the tested side over the two games.') + '</div>';
  h += grBarres(LAB_ST_RESULTATS.map(function (x) {
    return { lab: x[1], v: compte[x[0]] || 0, couleur: x[0] > 1 ? GR_POS : (x[0] < 1 ? GR_NEG : GR_REF),
      txt: grNb(compte[x[0]] || 0) + ' · ' + grPct((compte[x[0]] || 0) / n), tip: _tr(x[2], x[3]) + _dimDp() + (compte[x[0]] || 0) + _tr(' paires sur ', ' pairs out of ') + n };
  }), {});
  h += grTuiles([
    { lab: _tr('Paires complètes', 'Complete pairs'), v: grNb(n), sous: _tr('deux parties, couleurs inversées', 'two games, colours swapped') },
    { lab: _tr('Paires départagées', 'Pairs with a winner'), v: grPct(decisives / n), sous: grNb(decisives) + _tr(' paires sur ', ' pairs out of ') + n + _tr(' ; les autres finissent à égalité', '; the others end level') },
    { lab: _tr('La position décide', 'The position decides'), v: grPct(position / n), sous: grMarge(position, n) + ' · ' + _tr('la même couleur gagne les deux parties', 'the same colour wins both games') + grPeu(n) }
  ]);
  h += '<div class="gr-sous">' + _tr('« La position décide » : les deux parties de la paire sont gagnées par la même couleur, quel que soit le camp qui la jouait. Le départ pesait alors plus que les réglages testés — c’est justement ce que les paires servent à repérer.',
    '“The position decides”: both games of the pair are won by the same colour, whichever side was playing it. The starting position then weighed more than the settings being tested — which is exactly what pairs are there to reveal.') + '</div>';
  return h;
}

/* ═══ 7. Le parcours des tests (confirmation) ═══ */
// Les tests de confirmation du journal, du plus récent au plus ancien, avec leur verdict s'il est connu.
function _labStTests(L, st) {
  const P = _labStPaires(L).filter(function (p) { return p.phase === 'confirm'; }), par = {};
  P.forEach(function (p) { const k = (p.gen || 0) + '|' + (p.mutant || ''); (par[k] = par[k] || []).push(p); });
  const H = (st && st.history) || [];
  return Object.keys(par).map(function (k) {
    const G = par[k].sort(function (a, b) { return a.t - b.t; }), gen = G[0].gen, nom = G[0].mutant;
    let cumul = 0;
    const pts = G.map(function (p, i) { cumul += p.score - 1; return [i + 1, cumul]; });   // avance du mutant, en paires
    // le verdict : la première entrée de l'historique qui porte ce nom et cette génération
    const e = H.find(function (x) { return x && x.name === nom && (x.gen === gen || x.gen === gen + 1) && /adopté|rejeté|indécis/.test(String(x.type || '')); });
    const v = e ? (/adopté/.test(e.type) ? 'adopte' : (/rejeté/.test(e.type) ? 'rejete' : 'indecis')) : null;
    return { cle: k, gen: gen, nom: nom, paires: G.length, fin: cumul, t: G[G.length - 1].t, pts: pts, verdict: v, elo: e && e.elo };
  }).filter(function (x) { return x.paires >= LAB_ST_MIN_PAIRES; }).sort(function (a, b) { return b.t - a.t; });
}
const LAB_ST_VERDICTS = { adopte: ['adopté', 'adopted', GR_POS], rejete: ['rejeté', 'rejected', GR_NEG], indecis: ['indécis', 'undecided', GR_REF] };
function _labStHtmlParcours(L, st, W) {
  const T = _labStTests(L, st);
  let h = '<div class="gr-titre">' + _tr('Le parcours des tests', 'How the tests unfolded') + '</div>';
  if (!T.length) return h + '<div class="gr-vide">' + _tr('Aucun test de confirmation d’au moins ' + LAB_ST_MIN_PAIRES + ' paires dans le journal.', 'No confirmation test with at least ' + LAB_ST_MIN_PAIRES + ' pairs in the journal.') + '</div>';
  const V = T.slice(0, 6);   // au-delà, les courbes se mélangent
  h += '<div class="gr-sous">' + _tr('L’avance du mutant sur le champion, paire après paire : +1 par paire gagnée, −1 par paire perdue, 0 à égalité. Le test s’arrête dès que le SPRT tranche, ou au plafond de paires. Les ' + V.length + ' derniers tests.',
    'The mutant’s lead over the champion, pair after pair: +1 for a pair won, −1 for a pair lost, 0 when level. The test stops as soon as the SPRT decides, or at the cap on pairs. The last ' + V.length + ' tests.') + '</div>';
  h += grLignes(W, V.map(function (x, i) {
    const vd = LAB_ST_VERDICTS[x.verdict];
    return { nom: 'G' + x.gen + ' ' + (x.nom || '?') + (vd ? ' · ' + _tr(vd[0], vd[1]) : ''), couleur: vd ? vd[2] : GR_SERIES[i % GR_SERIES.length], pts: x.pts, points: x.paires <= 30 };
  }), { zero: true, nomX: _tr('Paire', 'Pair'), gauche: 36, aria: _tr('Avance du mutant paire après paire', 'The mutant’s lead pair after pair') });
  h += grChiffres([_tr('Test', 'Test'), _tr('Paires', 'Pairs'), _tr('Avance finale', 'Final lead'), _tr('Verdict', 'Verdict'), 'Elo'],
    T.map(function (x) { const vd = LAB_ST_VERDICTS[x.verdict];
      return ['G' + x.gen + ' ' + (x.nom || '?'), x.paires, (x.fin > 0 ? '+' : '') + grNb(x.fin, x.fin % 1 ? 1 : 0), vd ? _tr(vd[0], vd[1]) : '—', x.elo || '—']; }));
  return h;
}

/* ═══ 8. Quels réglages paient ═══ */
// Les parties de tri (phase 'cand'), regroupées par poids essayé et par sens (monté ou baissé).
// Le sens vient des poids de la partie elle-même : wA (le mutant) contre wB (le champion).
function _labStReglages(L) {
  const R = {};
  L.forEach(function (r) {
    if (r.phase !== 'cand' || !r.mutKey) return;
    const a = (r.wA && r.wA[r.mutKey]) || 0, b = (r.wB && r.wB[r.mutKey]) || 0;
    if (a === b) return;
    const k = r.mutKey + '|' + (a > b ? '+' : '−');
    const x = R[k] = R[k] || { cle: r.mutKey, sens: a > b ? '+' : '−', n: 0, p: 0, v: 0, d: 0 };
    x.n++; x.p += _labStScoreA(r);
    if (r.winner === 'A') x.v++; else if (r.winner === 'D') x.d++;
  });
  return Object.keys(R).map(function (k) { return R[k]; }).filter(function (x) { return x.n >= LAB_ST_MIN_REGLAGE; })
    .sort(function (a, b) { return b.p / b.n - a.p / a.n; });
}
function _labStHtmlReglages(L, W) {
  const R = _labStReglages(L);
  let h = '<div class="gr-titre">' + _tr('Quels réglages paient', 'Which settings pay off') + '</div>';
  if (!R.length) return h + '<div class="gr-vide">' + _tr('Pas encore assez de parties de tri (' + LAB_ST_MIN_REGLAGE + ' au moins par réglage).', 'Not enough sorting games yet (' + LAB_ST_MIN_REGLAGE + ' at least per setting).') + '</div>';
  h += '<div class="gr-sous">' + _tr('Pendant le tri des mutants, le Labo change un poids à la fois. Voici le score des parties où ce poids a été monté (↑) ou baissé (↓), contre le champion. Au-dessus de 50 % : ce changement a plutôt gagné.',
    'While sorting mutants, the Lab changes one weight at a time. Here is the score of the games where that weight was raised (↑) or lowered (↓), against the champion. Above 50 %: that change tended to win.') + '</div>';
  h += grBarres(R.map(function (x) {
    const s = x.p / x.n, w = grWilson(x.v + x.d / 2, x.n);
    return { lab: (LAB_NOMS[x.cle] || x.cle) + ' ' + (x.sens === '+' ? '↑' : '↓'), v: s, ref: 0.5, couleur: s > 0.5 ? GR_POS : (s < 0.5 ? GR_NEG : GR_REF),
      txt: grPct(s) + ' ' + (w ? grMarge(x.v + x.d / 2, x.n) : '') + ' · ' + x.n,
      tip: (LAB_NOMS[x.cle] || x.cle) + (x.sens === '+' ? _tr(' monté', ' raised') : _tr(' baissé', ' lowered')) + _dimDp() + grPct(s) + _tr(' sur ', ' over ') + x.n + _tr(' parties (', ' games (') + x.v + _tr(' gagnées, ', ' won, ') + x.d + _tr(' nulles)', ' drawn)') };
  }), { max: 1 });
  h += '<div class="gr-sous">' + _tr('± : la marge d’erreur à 95 % (intervalle de Wilson) ; le dernier nombre est le nombre de parties. Une barre dont la marge chevauche 50 % ne prouve rien : c’est le rôle du test de confirmation, qui rejoue le mutant retenu en paires jusqu’à ce que le SPRT tranche.',
    '±: the 95 % margin of error (Wilson interval); the last number is the number of games. A bar whose margin overlaps 50 % proves nothing: that is what the confirmation test is for, replaying the chosen mutant in pairs until the SPRT decides.') + '</div>';
  return h;
}

/* ═══ 9. Le score final des parties ═══ */
// La grille des scores finaux du journal : billes prises par le camp A contre billes prises par B.
// cb et cw sont comptés par couleur ; colorA dit lequel est le camp testé.
function _labStScores(L) {
  const G = [];
  for (let i = 0; i < 7; i++) { G.push([]); for (let j = 0; j < 7; j++) G[i].push(0); }
  let n = 0;
  L.forEach(function (r) {
    if (r.cb === '' || r.cw === '' || r.cb == null || r.cw == null) return;
    const noir = Math.max(0, Math.min(6, r.cb | 0)), blanc = Math.max(0, Math.min(6, r.cw | 0));
    const a = r.colorA === 'white' ? blanc : noir, b = r.colorA === 'white' ? noir : blanc;
    G[a][b]++; n++;
  });
  return { g: G, n: n };
}
// La même grille pour les vraies parties du corpus : les éjections de STATS_PARTIES, vues du gagnant.
function _labStScoresCorpus() {
  if (typeof STATS_PARTIES === 'undefined' || !STATS_PARTIES || !STATS_PARTIES.p) return null;
  const G = [];
  for (let i = 0; i < 7; i++) { G.push([]); for (let j = 0; j < 7; j++) G[i].push(0); }
  let n = 0;
  STATS_PARTIES.p.forEach(function (p, k) {
    if (!p || !p[2] || (typeof _sbEstDoublon === 'function' && _sbEstDoublon(k))) return;
    const s = _cfScoreA(p[4], 1e9);   // billes prises par les Noirs, puis par les Blancs
    const noir = Math.min(6, s.nb), blanc = Math.min(6, s.nw);
    // vue du gagnant, pour pouvoir comparer avec le Labo (qui compte du côté testé)
    const gagne = p[0] === 2 ? blanc : noir, perd = p[0] === 2 ? noir : blanc;
    G[Math.max(gagne, perd)][Math.min(gagne, perd)]++; n++;
  });
  return { g: G, n: n };
}
function _labStHtmlScores(L, W) {
  const S = _labStScores(L);
  let h = '<div class="gr-titre">' + _tr('Le score final des parties', 'The final score of the games') + '</div>';
  if (!S.n) return h + '<div class="gr-vide">' + _tr('Le journal ne porte pas encore de score final.', 'The journal does not carry a final score yet.') + '</div>';
  h += '<div class="gr-sous">' + _tr('Billes prises par le camp testé (lignes) contre billes prises par le champion (colonnes), sur ' + grNb(S.n) + ' parties. Une case claire : ce score est rare ; une case dorée : il revient souvent.',
    'Marbles taken by the tested side (rows) against marbles taken by the champion (columns), over ' + grNb(S.n) + ' games. A pale cell: that score is rare; a golden cell: it comes up often.') + '</div>';
  const et = ['0', '1', '2', '3', '4', '5', '6'];
  h += grCarte(et, et, function (i, j) {
    const v = S.g[i][j];
    return { v: v, txt: v ? grNb(v) : '', tip: _tr('Score ', 'Score ') + i + ' – ' + j + _dimDp() + grNb(v) + _tr(' parties', ' games') + (S.n ? ' (' + grPct(v / S.n) + ')' : '') };
  }, { legende: [_tr('rare', 'rare'), _tr('fréquent', 'frequent')] });
  const C = _labStScoresCorpus();
  if (C && C.n) {
    // billes sauvees par le perdant : la colonne p de chaque grille (le camp qui en a pris le moins)
    const perdant = { lab: [], v: [] };
    for (let p = 0; p < 6; p++) {
      let labo = 0, corpus = 0;
      for (let i = 0; i < 7; i++) { labo += S.g[i][p]; corpus += C.g[i][p]; }
      perdant.lab.push(p); perdant.v.push([labo / S.n, corpus / C.n]);
    }
    h += '<div class="gr-sous" style="margin-top:10px">' + _tr('À côté des vraies parties : combien de billes le perdant a sauvées. Les parties du Labo partent de vraies positions du corpus, mais elles sont jouées par l’IA contre elle-même — leurs fins n’ont aucune raison de se ressembler exactement.',
      'Next to the real games: how many marbles the loser saved. The Lab games start from real corpus positions, but they are played by the AI against itself — there is no reason for their endings to match exactly.') + '</div>';
    h += grLignes(W, [
      { nom: _tr('Labo', 'Lab'), couleur: GR_OR, pts: perdant.lab.map(function (p, i) { return [p, Math.round(1000 * perdant.v[i][0]) / 10]; }), points: true },
      { nom: _tr('Corpus', 'Corpus'), couleur: GR_REF, pts: perdant.lab.map(function (p, i) { return [p, Math.round(1000 * perdant.v[i][1]) / 10]; }), points: true }
    ], { h: 150, gauche: 38, yMin: 0, ticksX: [0, 1, 2, 3, 4, 5], nomX: _tr('billes du perdant', 'loser’s marbles'), fmtY: function (v) { return grNb(v) + ' %'; },
      aria: _tr('Billes sauvées par le perdant, Labo et corpus', 'Marbles saved by the loser, Lab and corpus') });
    h += '<div class="gr-sous">' + _tr('Corpus : ' + grNb(C.n) + ' vraies parties au vainqueur connu.', 'Corpus: ' + grNb(C.n) + ' real games with a known winner.') + '</div>';
  } else if (typeof ensureStatsParties === 'function') {
    h += '<div class="gr-sous">' + _tr('La comparaison avec les vraies parties du corpus se chargera dans un instant.', 'The comparison with the real corpus games will load shortly.') + '</div>';
  }
  return h;
}

/* ═══ 10. La vitesse de calcul ═══ */
// Les séances : parties qui se suivent à moins de 10 min. Par séance, le temps par partie et par demi-coup.
function _labStSeances(L) {
  const T = L.slice().sort(function (a, b) { return a.t - b.t; }), S = [];
  let cur = null;
  T.forEach(function (r) {
    if (!cur || r.t - cur.fin > LAB_ST_SEANCE) { cur = { debut: r.t, fin: r.t, n: 0, ms: 0, plies: 0, msN: 0 }; S.push(cur); }
    cur.fin = r.t; cur.n++; cur.plies += r.plies || 0;
    if (r.ms > 0) { cur.ms += r.ms; cur.msN++; }
  });
  return S.filter(function (s) { return s.msN >= 2; });
}
function _labStHtmlVitesse(L, W) {
  const S = _labStSeances(L);
  let h = '<div class="gr-titre">' + _tr('La vitesse de calcul', 'Computing speed') + '</div>';
  if (S.length < 2) return h + '<div class="gr-vide">' + _tr('Il faut au moins deux séances avec un temps mesuré.', 'At least two sessions with a measured time are needed.') + '</div>';
  const V = S.slice(-24);
  const parPartie = V.map(function (s, i) { return [i + 1, Math.round(s.ms / s.msN / 100) / 10]; });
  const parCoup = V.map(function (s, i) { return [i + 1, s.plies ? Math.round(s.ms / s.plies) : null]; }).filter(function (p) { return p[1] != null; });
  h += '<div class="gr-sous">' + _tr('Une séance, c’est une suite de parties qui s’enchaînent (moins de 10 minutes entre deux). Les ' + V.length + ' dernières. Le temps vient du fil de calcul, pas de l’horloge de l’écran.',
    'A session is a run of games that follow each other (less than 10 minutes apart). The last ' + V.length + '. The time comes from the computing thread, not from the screen clock.') + '</div>';
  h += grLignes(W, [{ nom: _tr('Secondes par partie', 'Seconds per game'), couleur: GR_OR, pts: parPartie, points: V.length <= 30 }],
    { h: 140, gauche: 36, yMin: 0, nomX: _tr('Séance', 'Session'), fmtY: function (v) { return grNb(v) + ' s'; },
      fmtTip: function (v, sr, x) { const s = V[x - 1]; return grNb(v, 1) + _tr(' s par partie · ', ' s per game · ') + s.n + _tr(' parties · ', ' games · ') + new Date(s.debut).toLocaleDateString(); },
      aria: _tr('Secondes par partie, séance après séance', 'Seconds per game, session after session') });
  if (parCoup.length >= 2) h += grLignes(W, [{ nom: _tr('Millisecondes par demi-coup', 'Milliseconds per ply'), couleur: GR_SERIES[2], pts: parCoup, points: V.length <= 30 }],
    { h: 130, gauche: 40, yMin: 0, nomX: _tr('Séance', 'Session'), fmtY: function (v) { return grNb(v) + ' ms'; },
      aria: _tr('Millisecondes par demi-coup, séance après séance', 'Milliseconds per ply, session after session') });
  const tot = S.reduce(function (a, s) { return a + s.ms; }, 0), nP = S.reduce(function (a, s) { return a + s.msN; }, 0), nC = S.reduce(function (a, s) { return a + s.plies; }, 0);
  h += grTuiles([
    { lab: _tr('Séances', 'Sessions'), v: grNb(S.length), sous: _tr('dans le journal filtré', 'in the filtered journal') },
    { lab: _tr('Par partie', 'Per game'), v: nP ? grNb(tot / nP / 1000, 1) + ' s' : '—', sous: _tr('moyenne sur ', 'average over ') + grNb(nP) + _tr(' parties chronométrées', ' timed games') },
    { lab: _tr('Par demi-coup', 'Per ply'), v: nC ? grNb(tot / nC, 0) + ' ms' : '—', sous: _tr('deux camps confondus', 'both sides together') }
  ]);
  return h;
}

/* ═══ Le bloc entier, posé par renderLabTableau ═══ */
let _labStCorpusDemande = false;
function labStatsHtml(L, st, W) {
  if (!_labStCorpusDemande && typeof ensureStatsParties === 'function' && (typeof STATS_PARTIES === 'undefined' || !STATS_PARTIES)) {
    _labStCorpusDemande = true;   // une seule fois : au retour, le tableau se redessine avec la comparaison
    try { ensureStatsParties().then(function (ok) { if (ok && typeof renderLabTableau === 'function' && document.getElementById('lab-tableau-host')) renderLabTableau(); }); } catch (e) {}
  }
  return _labStHtmlPaires(L, W) + _labStHtmlParcours(L, st, W) + _labStHtmlReglages(L, W) + _labStHtmlScores(L, W) + _labStHtmlVitesse(L, W);
}
