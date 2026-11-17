/* ═══════════════════════════════════════════
   OBSERVATOIRE IA : LES STATISTIQUES DE LA PARTIE (v3.36)
   Demande d'ocj94 (« Tout », sur dix-huit propositions de statistiques ; ici les nos 15 à 18, et le nuage
   de points de ses captures « Scatter Plots: Relationships ») : un sixième onglet, « Statistiques », sur la
   partie en cours -- les coups de l'IA gardés par l'Observatoire (60 au plus).
   Même règle que le reste de l'Observatoire : il OBSERVE. Tout vient des mesures que le moteur a déjà
   envoyées pour chaque coup (OBS.hist) ; rien n'est recalculé, rien n'est estimé.
   15. profondeur, temps et vitesse, coup après coup ;
   16. le choix était-il serré ? -- l'écart entre le meilleur coup et le deuxième, à la dernière profondeur
       terminée par tous les fils, et le nombre de coups presque aussi bons ;
   17. la stabilité du choix -- depuis quelle profondeur le coup joué est en tête, et si la dernière
       profondeur a changé le meilleur coup ;
   18. l'élagage au fil de la partie -- coupures, table de transposition, croissance du travail d'une
       profondeur à la suivante, et la part des coups joués sans calcul (livre, table de finale…) ;
   et deux mesures au choix l'une contre l'autre (nuage de points, avec leur corrélation).
═══════════════════════════════════════════ */
const OBS_ST_SERRE = 50;       // points : en dessous, les deux meilleurs coups se valent presque
const OBS_ST_PROCHE = 100;     // points : un coup « presque aussi bon » est à moins de 100 points du meilleur
const OBS_ST_BILLE = 1000;     // points : une bille de plus
const OBS_ST_DECIDE = 90000;   // au-delà : gain ou perte forcés (même seuil que la courbe de l'onglet Historique)
const OBS_ST_TRANCHES = [[0, 20, '0', '0 à 19', '0 to 19'], [20, 50, '20', '20 à 49', '20 to 49'], [50, 100, '50', '50 à 99', '50 to 99'],
  [100, 300, '100', '100 à 299', '100 to 299'], [300, 1000, '300', '300 à 999', '300 to 999'], [1000, Infinity, '1 k+', '1 000 et plus', '1,000 and more']];

/* Les mesures d'UN coup calculé (null pour un coup joué sans calcul ou sans mesure). Rien que des lectures :
   - tous : les coups de départ notés à la dernière profondeur terminée par tous les fils, du meilleur au pire ;
   - parProfs : les mêmes, profondeur par profondeur ; deux coups à égalité en tête comptent tous deux « en tête » ;
   - profs : positions examinées à chaque profondeur (pas un cumul). */
function _obsStCoup(e) {
  if (!e || e.source || !(e.noeuds > 0)) return null;
  const m = { n: e.n, nom: (e.noms && e.noms[e.cle]) || '?', prof: e.prof || 0, ms: e.ms || 0, budget: e.budget || 0, noeuds: e.noeuds,
    vitesse: e.ms > 0 ? e.noeuds / e.ms * 1000 : null, coupures: e.coupures != null ? e.coupures / e.noeuds : null, tt: e.tt != null ? e.tt : null,
    note: (typeof e.score === 'number' && Math.abs(e.score) < OBS_ST_DECIDE) ? e.score : null,
    candidats: null, ecart: null, proches: null, rang: null, decide: false, profs: 0, changements: null, dernier: null, depuis: null, croissance: {} };
  const T = e.tous;
  if (T && T.length) {
    const meilleur = T[0][1];
    m.candidats = T.length;
    m.decide = Math.abs(meilleur) >= OBS_ST_DECIDE;
    if (T.length >= 2 && !m.decide) {
      m.ecart = meilleur - T[1][1];
      m.proches = T.filter(function (x) { return x[1] >= meilleur - OBS_ST_PROCHE; }).length - 1;
    }
    const r = T.findIndex(function (x) { return x[0] === e.cle; });
    m.rang = r >= 0 ? r + 1 : null;
  }
  const P = e.parProfs || {}, D = Object.keys(P).map(Number).filter(function (d) { return P[d] && P[d].length; }).sort(function (a, b) { return a - b; });
  m.profs = D.length;
  if (D.length) {
    const tete = D.map(function (d) { const mx = P[d][0][1], o = {}; P[d].forEach(function (x) { if (x[1] === mx) o[x[0]] = 1; }); return o; });
    const meme = function (i) { return Object.keys(tete[i]).some(function (k) { return tete[i - 1][k]; }); };
    let chg = 0; for (let i = 1; i < D.length; i++) if (!meme(i)) chg++;
    m.changements = chg;
    m.dernier = D.length >= 2 ? !meme(D.length - 1) : null;
    // depuis quelle profondeur le coup joué est en tête sans plus la quitter (0 : il n'y est pas à la dernière profondeur terminée)
    let depuis = 0;
    if (e.cle != null) for (let i = D.length - 1; i >= 0 && tete[i][e.cle]; i--) depuis = D[i];
    m.depuis = depuis;
  }
  const F = e.profs || {};
  Object.keys(F).map(Number).forEach(function (d) { if (F[d] && F[d - 1] && F[d - 1].nodes > 0 && F[d].nodes > 0) m.croissance[d] = F[d].nodes / F[d - 1].nodes; });
  return m;
}
function _obsStMed(t) { const v = t.filter(function (x) { return x != null && isFinite(x); }).sort(function (a, b) { return a - b; }); return v.length ? grQuantile(v, 0.5) : null; }
function _obsStMoy(t) { const v = t.filter(function (x) { return x != null && isFinite(x); }); return v.length ? v.reduce(function (a, x) { return a + x; }, 0) / v.length : null; }

/* Toute la partie : hist = OBS.hist. Rend les mesures de chaque coup calculé et leurs résumés. */
function _obsStatsPartie(hist) {
  const S = { total: 0, coups: [], sources: { calcul: 0, livre: 0, table: 0, empreinte: 0, n1: 0 } };
  (hist || []).forEach(function (e) {
    if (!e) return;
    S.total++;
    if (e.source) { const k = e.source === 'stat' ? 'livre' : e.source; S.sources[k] = (S.sources[k] || 0) + 1; return; }
    S.sources.calcul++;
    const m = _obsStCoup(e); if (m) S.coups.push(m);
  });
  const C = S.coups;
  S.profMed = _obsStMed(C.map(function (m) { return m.prof; }));
  S.msMed = _obsStMed(C.map(function (m) { return m.ms; }));
  S.vitesseMed = _obsStMed(C.map(function (m) { return m.vitesse; }));
  // temps utilisé sur le temps accordé : seulement les coups joués avec un temps limité
  let utilise = 0, accorde = 0;
  C.forEach(function (m) { if (m.budget > 0 && m.budget < 3600000) { utilise += m.ms; accorde += m.budget; } });
  S.partTemps = accorde ? utilise / accorde : null;
  // 16. le choix
  const E = C.filter(function (m) { return m.ecart != null; });
  S.choix = { n: E.length, serres: E.filter(function (m) { return m.ecart < OBS_ST_SERRE; }).length, nets: E.filter(function (m) { return m.ecart >= OBS_ST_BILLE; }).length,
    ecartMed: _obsStMed(E.map(function (m) { return m.ecart; })), prochesMed: _obsStMed(E.map(function (m) { return m.proches; })),
    candidatsMed: _obsStMed(C.map(function (m) { return m.candidats; })), decides: C.filter(function (m) { return m.decide; }).length,
    tranches: OBS_ST_TRANCHES.map(function (t) { return E.filter(function (m) { return m.ecart >= t[0] && m.ecart < t[1]; }).length; }) };
  // 17. la stabilité : les coups dont au moins deux profondeurs sont terminées
  const B = C.filter(function (m) { return m.profs >= 2; });
  const depuis = {}; B.forEach(function (m) { const k = m.depuis >= 5 ? 5 : m.depuis; depuis[k] = (depuis[k] || 0) + 1; });
  S.stabilite = { n: B.length, stables: B.filter(function (m) { return m.changements === 0 && m.depuis > 0; }).length, dernier: B.filter(function (m) { return m.dernier; }).length,
    pasEnTete: B.filter(function (m) { return m.depuis === 0; }).length, changementsMoy: _obsStMoy(B.map(function (m) { return m.changements; })), depuis: depuis };
  // 18. l'élagage
  S.coupuresMed = _obsStMed(C.map(function (m) { return m.coupures; }));
  S.ttMed = _obsStMed(C.map(function (m) { return m.tt; }));
  const G = {}; C.forEach(function (m) { Object.keys(m.croissance).forEach(function (d) { (G[d] = G[d] || []).push(m.croissance[d]); }); });
  S.croissance = Object.keys(G).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { return { d: d, n: G[d].length, med: _obsStMed(G[d]) }; });
  return S;
}

/* Les mesures qu'on peut mettre l'une contre l'autre dans le nuage de points : [clé, français, anglais, lecture] */
const OBS_ST_MESURES = [
  ['candidats', 'Coups possibles', 'Legal moves', function (m) { return m.candidats; }],
  ['prof', 'Profondeur atteinte', 'Depth reached', function (m) { return m.prof; }],
  ['ms', 'Temps (s)', 'Time (s)', function (m) { return m.ms / 1000; }],
  ['noeuds', 'Positions examinées', 'Positions searched', function (m) { return m.noeuds; }],
  ['vitesse', 'Vitesse (positions/s)', 'Speed (positions/s)', function (m) { return m.vitesse; }],
  ['coupures', 'Coupures (% des positions)', 'Cutoffs (% of positions)', function (m) { return m.coupures == null ? null : 100 * m.coupures; }],
  ['tt', 'Table de transposition (%)', 'Transposition table (%)', function (m) { return m.tt; }],
  ['ecart', 'Écart entre les deux meilleurs coups', 'Gap between the two best moves', function (m) { return m.ecart; }],
  ['note', 'Note de l’IA', 'AI score', function (m) { return m.note; }],
  ['n', 'Numéro du coup', 'Move number', function (m) { return m.n; }]
];
let _obsStAxes = { x: 'candidats', y: 'ms' };
try { const a = String(localStorage.getItem('abaObsNuage') || '').split('|'); if (a.length === 2 && OBS_ST_MESURES.some(function (q) { return q[0] === a[0]; }) && OBS_ST_MESURES.some(function (q) { return q[0] === a[1]; })) _obsStAxes = { x: a[0], y: a[1] }; } catch (e) {}
function obsStatsAxe(axe, cle) {
  if ((axe !== 'x' && axe !== 'y') || !OBS_ST_MESURES.some(function (q) { return q[0] === cle; })) return;
  _obsStAxes[axe] = cle;
  try { localStorage.setItem('abaObsNuage', _obsStAxes.x + '|' + _obsStAxes.y); } catch (e) {}
  _obsRendu();
}
function _obsStNuage(C, W) {
  const mx = OBS_ST_MESURES.find(function (q) { return q[0] === _obsStAxes.x; }) || OBS_ST_MESURES[0], my = OBS_ST_MESURES.find(function (q) { return q[0] === _obsStAxes.y; }) || OBS_ST_MESURES[1];
  const nom = function (q) { return _obsT(q[1], q[2]); };
  const sel = function (axe, cour) { return '<select class="obs-ar-vue" data-change="obsStatsAxe(\'' + axe + '\', this.value)" aria-label="' + (axe === 'x' ? _obsT('Mesure en abscisse', 'Measure on the x axis') : _obsT('Mesure en ordonnée', 'Measure on the y axis')) + '">'
    + OBS_ST_MESURES.map(function (q) { return '<option value="' + q[0] + '"' + (q[0] === cour[0] ? ' selected' : '') + '>' + _obsE(nom(q)) + '</option>'; }).join('') + '</select>'; };
  const pts = C.map(function (m) { return { x: mx[3](m), y: my[3](m), tip: [_obsT('Coup ', 'Move ') + m.n + ' : ' + m.nom, nom(mx) + _dimDp() + grNb(mx[3](m)), nom(my) + _dimDp() + grNb(my[3](m))] }; })
    .filter(function (p) { return p.x != null && p.y != null && isFinite(p.x) && isFinite(p.y); });
  let h = '<h5>' + _obsT('Deux mesures, l’une contre l’autre', 'Two measures against each other') + '</h5>'
    + '<div class="obs-nuage-axes"><label>→ ' + sel('x', mx) + '</label><label>↑ ' + sel('y', my) + '</label></div>';
  if (pts.length < 3) return h + '<div class="obs-vide">' + _obsT('Il faut au moins trois coups calculés pour dessiner le nuage.', 'At least three searched moves are needed to draw the plot.') + '</div>';
  const c = grCorrelation(pts);
  h += grNuage(W, pts, { h: 210, droite: true, titreX: nom(mx), aria: nom(my) + _obsT(' selon ', ' against ') + nom(mx) });   // le titre de l'ordonnee passerait sur la grille : les listes au-dessus nomment deja les deux axes
  h += '<div class="obs-note">' + _obsT('Un point par coup calculé (' + pts.length + '). ', 'One point per searched move (' + pts.length + '). ')
    + (c ? _obsT('Corrélation r = ', 'Correlation r = ') + grNb(c.r, 2) + ' — ' + grLienTexte(c.r) + '. ' + _obsT('Le trait pointillé est la droite qui résume le nuage.', 'The dashed line is the straight line that summarises the cloud.')
         : _obsT('Une des deux mesures ne varie pas : pas de corrélation à calculer.', 'One of the two measures does not vary: no correlation to compute.'))
    + ' ' + _obsT('Un lien entre deux mesures ne dit pas que l’une cause l’autre.', 'A link between two measures does not say that one causes the other.') + '</div>';
  return h;
}

function _obsStLargeur() {
  const c = (typeof document !== 'undefined' && document.getElementById) ? document.getElementById('obs-corps') : null;
  return grLargeur(c && c.clientWidth ? { clientWidth: c.clientWidth - 24 } : null, 300);
}
// « aucun autre coup », « 1 autre coup », « 2,5 autres coups » : l'accord en nombre, pour la phrase du choix serré
function _obsStProches(v) {
  if (v == null) return _obsT('aucun autre coup', 'no other move');
  const n = grNb(v, v % 1 ? 1 : 0);
  return n + (v < 2 ? _obsT(' autre coup', v === 1 ? ' other move' : ' other moves') : _obsT(' autres coups', ' other moves'));
}
function _obsStTuile(lab, val, sous) { return '<div class="obs-k"><span>' + lab + '</span><b>' + val + '</b>' + (sous ? '<small>' + sous + '</small>' : '') + '</div>'; }

/* ═══ Onglet 6 : Statistiques ═══ */
function _obsTabStats() {
  const S = _obsStatsPartie(OBS.hist), C = S.coups, W = _obsStLargeur(), niv = _obsNiv(), T = _obsT;
  if (!S.total) return '<div class="obs-vide">' + T('Les statistiques de la partie s’afficheront ici, dès le premier coup de l’IA.', 'The game statistics will show here, from the AI’s first move.') + '</div>';
  const coup = function (m) { return T('Coup ', 'Move ') + m.n + ' (' + m.nom + ')'; };
  let h = '<div class="obs-note">' + T('Sur les ' + S.total + ' coups de l’IA gardés pour cette partie (60 au plus), dont ' + C.length + ' calculés. Tout vient des mesures du moteur : rien n’est recalculé.',
    'Over the ' + S.total + ' AI moves kept for this game (60 at most), ' + C.length + ' of them searched. Everything comes from the engine’s own measures: nothing is recomputed.') + '</div>';
  const sources = [[T('calcul', 'search'), S.sources.calcul], [T('livre d’ouvertures', 'opening book'), S.sources.livre], [T('table de finale', 'endgame table'), S.sources.table],
    [T('empreinte', 'fingerprint'), S.sources.empreinte], [T('niveau 1', 'level 1'), S.sources.n1]].filter(function (x) { return x[1] > 0; });
  const blocSources = '<h5>' + T('D’où viennent les coups', 'Where the moves come from') + '</h5>' + grPile(sources.map(function (x) { return { nom: x[0], v: x[1] }; }), {})
    + '<div class="obs-note">' + T('Un coup du livre, de la table de finale ou d’une empreinte est joué sans recherche : il n’entre pas dans les mesures ci-dessus.', 'A move from the book, the endgame table or a fingerprint is played without a search: it is left out of the measures above.') + '</div>';
  if (!C.length) return h + '<div class="obs-vide">' + T('Aucun coup calculé pour l’instant : l’IA a joué sans recherche.', 'No searched move yet: the AI has played without a search.') + '</div>' + blocSources;

  /* 15. profondeur, temps et vitesse */
  h += '<h5>' + T('Profondeur, temps et vitesse', 'Depth, time and speed') + '</h5><div class="obs-grille obs-g3">'
    + _obsStTuile(T('Profondeur', 'Depth'), grNb(S.profMed, S.profMed % 1 ? 1 : 0), T('médiane', 'median'))
    + _obsStTuile(T('Temps', 'Time'), _msTexte(S.msMed), S.partTemps != null ? grPct(S.partTemps) + T(' du temps accordé', ' of the time allowed') : T('médian', 'median'))
    + _obsStTuile(T('Vitesse', 'Speed'), S.vitesseMed != null ? grCompact(S.vitesseMed) + '/s' : '—', T('positions, médiane', 'positions, median')) + '</div>';
  h += '<div class="obs-note">' + T('Profondeur atteinte, coup après coup', 'Depth reached, move after move') + '</div>'
    + grColonnes(W, C.map(function (m) { return { lab: String(m.n), v: m.prof, tip: coup(m) + _dimDp() + T('profondeur ', 'depth ') + m.prof + ' · ' + _msTexte(m.ms) }; }), { h: 120, gauche: 30, aria: T('Profondeur atteinte à chaque coup', 'Depth reached at each move') });
  const limites = C.filter(function (m) { return m.budget > 0 && m.budget < 3600000; });
  h += '<div class="obs-note">' + T('Temps de réflexion (secondes)', 'Thinking time (seconds)') + '</div>'
    + grLignes(W, [{ nom: T('utilisé', 'used'), couleur: GR_OR, pts: C.map(function (m) { return [m.n, Math.round(m.ms / 10) / 100]; }), points: C.length <= 30 }]
      .concat(limites.length >= 2 ? [{ nom: T('accordé', 'allowed'), couleur: GR_REF, pts: limites.map(function (m) { return [m.n, Math.round(m.budget / 10) / 100]; }) }] : []),
      { h: 140, gauche: 34, yMin: 0, nomX: T('Coup', 'Move'), fmtY: function (v) { return grNb(v) + ' s'; }, aria: T('Temps utilisé et temps accordé à chaque coup', 'Time used and time allowed at each move') });
  h += '<div class="obs-note">' + T('Vitesse de recherche (positions par seconde)', 'Search speed (positions per second)') + '</div>'
    + grLignes(W, [{ nom: T('Vitesse', 'Speed'), couleur: GR_OR, pts: C.filter(function (m) { return m.vitesse != null; }).map(function (m) { return [m.n, Math.round(m.vitesse)]; }), points: C.length <= 30 }],
      { h: 130, gauche: 40, yMin: 0, nomX: T('Coup', 'Move'), fmtY: function (v) { return grCompact(v); }, aria: T('Positions examinées par seconde à chaque coup', 'Positions searched per second at each move') });

  /* 16. le choix était-il serré ? */
  const X = S.choix;
  h += '<h5>' + T('Le choix était-il serré ?', 'Was the choice close?') + '</h5>';
  if (X.n) {
    h += '<div class="obs-grille obs-g3">'
      + _obsStTuile(T('Écart médian', 'Median gap'), grNb(X.ecartMed, 0), T('points entre le 1er et le 2e', 'points between 1st and 2nd'))
      + _obsStTuile(T('Choix serrés', 'Close calls'), X.serres + ' / ' + X.n, T('moins de ', 'under ') + OBS_ST_SERRE + T(' points d’écart', ' points apart'))
      + _obsStTuile(T('Choix nets', 'Clear choices'), X.nets + ' / ' + X.n, T('une bille d’écart ou plus', 'a marble apart or more')) + '</div>'
      + grColonnes(W, OBS_ST_TRANCHES.map(function (t, i) { return { lab: t[2], v: X.tranches[i], tip: T(t[3], t[4]) + T(' points d’écart', ' points apart') + _dimDp() + X.tranches[i] + T(' coups', ' moves') }; }),
        { h: 120, gauche: 30, titreX: T('écart en points, à partir de', 'gap in points, from'), aria: T('Répartition de l’écart entre les deux meilleurs coups', 'Distribution of the gap between the two best moves') })
      + '<div class="obs-note">' + T('L’écart entre le coup le mieux noté et le suivant, à la dernière profondeur terminée ; 1 000 points valent une bille. En médiane, ' + _obsStProches(X.prochesMed) + ' à moins de ' + OBS_ST_PROCHE + ' points du meilleur, sur ' + grNb(X.candidatsMed, 0) + ' coups possibles.',
        'The gap between the best-scored move and the next one, at the last completed depth; 1,000 points are worth one marble. Median: ' + _obsStProches(X.prochesMed) + ' within ' + OBS_ST_PROCHE + ' points of the best, out of ' + grNb(X.candidatsMed, 0) + ' legal moves.')
      + (X.decides ? ' ' + T(X.decides + ' coup(s) en position déjà décidée (gain ou perte forcés) ne sont pas comptés.', X.decides + ' move(s) in an already decided position (forced win or loss) are left out.') : '') + '</div>';
  } else h += '<div class="obs-vide">' + T('Pas encore de coup avec au moins deux candidats notés.', 'No move with at least two scored candidates yet.') + '</div>';

  /* 17. la stabilité du choix */
  const B = S.stabilite;
  h += '<h5>' + T('La stabilité du choix', 'How stable the choice was') + '</h5>';
  if (B.n) {
    const ordre = [1, 2, 3, 4, 5, 0].filter(function (k) { return B.depuis[k]; });
    h += '<div class="obs-grille obs-g3">'
      + _obsStTuile(T('Jamais remis en cause', 'Never challenged'), B.stables + ' / ' + B.n, T('même coup en tête à chaque profondeur', 'same move on top at every depth'))
      + _obsStTuile(T('Changé à la fin', 'Changed at the end'), B.dernier + ' / ' + B.n, T('la dernière profondeur a changé le meilleur coup', 'the last depth changed the best move'))
      + _obsStTuile(T('Changements', 'Changes'), grNb(B.changementsMoy, 1), T('de meilleur coup, par coup joué', 'of best move, per move played')) + '</div>'
      + grBarres(ordre.map(function (k) { return { lab: k === 0 ? T('pas en tête à la fin', 'not on top at the end') : (k === 5 ? T('depuis la profondeur 5 ou plus', 'since depth 5 or more') : T('depuis la profondeur ', 'since depth ') + k), v: B.depuis[k], couleur: k === 0 ? GR_REF : GR_OR, txt: String(B.depuis[k]) }; }), {})
      + '<div class="obs-note">' + T('Depuis quelle profondeur le coup joué est le mieux noté, sans plus quitter la tête (' + B.n + ' coups avec au moins deux profondeurs terminées). « Pas en tête à la fin » : à la dernière profondeur terminée par tous les fils, un autre coup était mieux noté que le coup joué.',
        'Since which depth the move played has been the best-scored one, without leaving the top again (' + B.n + ' moves with at least two completed depths). “Not on top at the end”: at the last depth completed by every thread, another move scored higher than the move played.') + '</div>';
  } else h += '<div class="obs-vide">' + T('Pas encore de coup avec deux profondeurs terminées.', 'No move with two completed depths yet.') + '</div>';

  /* 18. l'élagage au fil de la partie */
  h += '<h5>' + T('L’élagage au fil de la partie', 'Pruning over the game') + '</h5>';
  const avecC = C.filter(function (m) { return m.coupures != null; });
  h += grLignes(W, [{ nom: T('coupures α-β', 'α-β cutoffs'), couleur: GR_SERIES[0], pts: avecC.map(function (m) { return [m.n, Math.round(1000 * m.coupures) / 10]; }), points: C.length <= 30 },
      { nom: T('table de transposition', 'transposition table'), couleur: GR_SERIES[1], pts: C.filter(function (m) { return m.tt != null; }).map(function (m) { return [m.n, m.tt]; }), points: C.length <= 30 }],
      { h: 140, gauche: 38, yMin: 0, nomX: T('Coup', 'Move'), fmtY: function (v) { return grNb(v) + ' %'; }, aria: T('Coupures et table de transposition à chaque coup', 'Cutoffs and transposition table at each move') })
    + '<div class="obs-note">' + T('En pourcentage des positions examinées. Médianes : coupures ' + (S.coupuresMed != null ? grPct(S.coupuresMed) : '—') + ', table de transposition ' + (S.ttMed != null ? grNb(S.ttMed, 0) + ' %' : '—') + '.',
      'As a percentage of the positions searched. Medians: cutoffs ' + (S.coupuresMed != null ? grPct(S.coupuresMed) : '—') + ', transposition table ' + (S.ttMed != null ? grNb(S.ttMed, 0) + ' %' : '—') + '.') + '</div>';
  if (niv >= 1 && S.croissance.length) {
    h += '<div class="obs-note" style="margin-top:8px">' + T('Le travail d’une profondeur à la suivante', 'The work from one depth to the next') + '</div>'
      + grBarres(S.croissance.map(function (g) { return { lab: (g.d - 1) + ' → ' + g.d, v: g.med, txt: '× ' + grNb(g.med, 1) + ' (' + g.n + ')' }; }), {})
      + '<div class="obs-note">' + T('Combien de fois plus de positions le moteur examine en descendant d’une profondeur (médiane ; entre parenthèses, le nombre de coups mesurés). Plus ce nombre est petit, mieux l’élagage coupe.',
        'How many times more positions the engine searches when going one depth deeper (median; in brackets, the number of moves measured). The smaller the number, the better the pruning cuts.') + '</div>';
  }
  h += blocSources;
  h += _obsStNuage(C, W);
  if (niv >= 1) h += grChiffres([T('Coup', 'Move'), T('Joué', 'Played'), T('Prof.', 'Depth'), T('Temps', 'Time'), T('Positions', 'Positions'), T('Écart', 'Gap'), T('Proches', 'Close'), T('En tête depuis', 'On top since')],
    C.map(function (m) { return [m.n, m.nom, m.prof, _msTexte(m.ms), _obsN(m.noeuds), m.ecart != null ? grNb(m.ecart, 0) : '—', m.proches != null ? m.proches : '—', m.depuis == null ? '—' : (m.depuis === 0 ? T('non', 'no') : m.depuis)]; }));
  return h;
}
/* Le résumé chiffré, pour le rapport téléchargeable (.json) : les mêmes nombres que l'onglet */
function _obsStResume() {
  const S = _obsStatsPartie(OBS.hist);
  return { coupsGardes: S.total, coupsCalcules: S.coups.length, origine: S.sources, profondeurMediane: S.profMed, tempsMedianMs: S.msMed == null ? null : Math.round(S.msMed),
    positionsParSecondeMediane: S.vitesseMed == null ? null : Math.round(S.vitesseMed), partDuTempsAccorde: S.partTemps == null ? null : Math.round(1000 * S.partTemps) / 1000,
    choix: { coupsMesures: S.choix.n, ecartMedian: S.choix.ecartMed, serres: S.choix.serres, nets: S.choix.nets, seuilSerre: OBS_ST_SERRE, seuilNet: OBS_ST_BILLE },
    stabilite: { coupsMesures: S.stabilite.n, jamaisRemisEnCause: S.stabilite.stables, changeALaDerniereProfondeur: S.stabilite.dernier, pasEnTeteALaFin: S.stabilite.pasEnTete },
    croissanceParProfondeur: S.croissance.map(function (g) { return { profondeur: g.d, facteurMedian: Math.round(100 * g.med) / 100, coups: g.n }; }) };
}
