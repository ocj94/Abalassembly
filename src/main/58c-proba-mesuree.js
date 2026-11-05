/* ═══════════════════════════════════════════
   v3.13 — CHANCE DE GAIN MESURÉE (Observatoire IA, avec les positions du Labo)
   Demande d'ocj94 (« Ok go ») : faire servir le Labo a l'Observatoire. Les maquettes
   proposaient une « confiance 87 % » que rien ne calculait (ecartee en v3.12). Ici, une
   FREQUENCE observee, pas un modele : parmi des positions de vraies parties dont on connait
   le vainqueur, combien de fois le camp au trait a-t-il gagne quand la note (calculee avec
   les poids du coup observe) etait proche de celle-ci ?

   - Positions : celles de la methode Texel (42-labo-positions.js), positions calmes de vraies
     parties du corpus, avec leur resultat ; 8 000 au plus, prises a intervalle regulier.
   - Tranches : 16 tranches de meme effectif, rangees par note ; la frequence de gain de chaque
     tranche (nulle = un demi), avec sa marge a 95 %. Une note plus haute ne peut pas gagner
     moins souvent qu'une plus basse : les tranches qui se contrediraient sont fusionnees
     (regression isotone). Une note hors des tranches prend la tranche extreme.
   - D'abord essaye : la courbe de la methode Texel, p = 1 / (1 + e^(-s x note)). Abandonnee :
     sur les parties de controle, une bille d'avance etait prevue a 68 % et gagnait 95 % du
     temps ; pres de 0, 49 % prevu pour 31 % observe. Une seule courbe ne colle pas a ces parties.
     (Et sa pente etait mal reglee : voir _txEchelle, corrige en v3.13.)
   - Poids : ceux du coup observe (det.poids), complets ; un jeu de tranches par jeu de poids,
     garde dans ce navigateur (6 au plus). Rien ne quitte le navigateur.
   - Limites, dites dans le panneau : positions calmes de parties entre humains ; la note de
     l'Observatoire vient d'une recherche, pas de l'evaluation seule.
═══════════════════════════════════════════ */
const PR_CLE = 'abaObsProba', PR_MAX_POS = 8000, PR_TRANCHES = 16, PR_MAX_CALAGES = 6;
let _prEnCours = null, _prErreur = '';
function _prSig(w) { const W = _labComplet(w || {}); return _labCles().map(function (k) { return k + ':' + Math.round((W[k] || 0) * 100) / 100; }).join(','); }
function prLire() { try { const d = JSON.parse(localStorage.getItem(PR_CLE) || 'null'); if (d && d.v === 2 && d.cal) return d; } catch (e) {} return { v: 2, cal: {} }; }
function prCalage(w) { if (!w) return null; return prLire().cal[_prSig(w)] || null; }
function _prEchantillon(L, max) {
  if (L.length <= max) return L.slice();
  const pas = L.length / max, out = []; for (let i = 0; i < max; i++) out.push(L[Math.floor(i * pas)]);
  return out;
}
/* tranches de meme effectif sur les notes triees, puis fusion des voisines qui se contredisent
   (regression isotone, « pool adjacent violators », ponderee par l'effectif) */
function _prTranches(notes, res, nb) {
  const idx = notes.map(function (x, i) { return i; }).sort(function (a, b) { return notes[a] - notes[b]; }), n = idx.length;
  let T = [];
  for (let t = 0; t < nb; t++) {
    const a = Math.floor(t * n / nb), b = Math.floor((t + 1) * n / nb); if (b <= a) continue;
    let r = 0; for (let j = a; j < b; j++) r += res[idx[j]];
    T.push({ lo: notes[idx[a]], hi: notes[idx[b - 1]], n: b - a, r: r });
  }
  for (let i = 0; i + 1 < T.length; ) {
    if (T[i].r / T[i].n > T[i + 1].r / T[i + 1].n) {
      T.splice(i, 2, { lo: T[i].lo, hi: T[i + 1].hi, n: T[i].n + T[i + 1].n, r: T[i].r + T[i + 1].r });
      if (i > 0) i--;
    } else i++;
  }
  return T.map(function (x) { const p = x.r / x.n; return { lo: Math.round(x.lo), hi: Math.round(x.hi), n: x.n, p: p, m: 1.96 * Math.sqrt(Math.max(p * (1 - p), 0.0025) / x.n) }; });
}
// la tranche d'une note : celle qui la contient, sinon la plus proche (au bord : la tranche extreme)
function _prTranche(c, score) {
  if (!c || !c.t || !c.t.length || typeof score !== 'number' || !isFinite(score)) return null;
  for (let i = 0; i < c.t.length; i++) { const x = c.t[i]; if (score <= x.hi) return (i > 0 && score < x.lo && (x.lo - score) > (score - c.t[i - 1].hi)) ? c.t[i - 1] : x; }
  return c.t[c.t.length - 1];
}
function prProba(score, w) { const x = _prTranche(prCalage(w), score); return x ? x.p : null; }
function _prRendre() { if (typeof _obsRendu === 'function') _obsRendu(); }
function prCalibrer(w, opts) {
  if (_prEnCours || !w) return Promise.resolve(null);
  opts = opts || {}; _prEnCours = { pct: 0 }; _prErreur = ''; _prRendre();
  return ensureLaboPositions().then(function (ok) {
    if (!ok) throw new Error(_obsT('positions du corpus illisibles sur ce navigateur', 'corpus positions unreadable in this browser'));
    const I0 = _lpTexelIndices(), tous = _prEchantillon(I0.app.concat(I0.ctl).sort(function (a, b) { return a - b; }), opts.maxPos || PR_MAX_POS);
    if (tous.length < 200) throw new Error(_obsT('trop peu de positions', 'too few positions'));
    const cles = _labCles();
    return _txTermes(tous, cles, function (x) { if (_prEnCours) { _prEnCours.pct = x; _prRendre(); } }).then(function (T) {
      const W = _labComplet(w), wv = cles.map(function (k) { return W[k]; });
      const notes = tous.map(function (i, j) { return _txEval(T, j, wv); }), res = tous.map(_txResultatPour);
      const parties = {}; tous.forEach(function (i) { parties[_lpPartie(i)] = 1; });
      const out = { t: _prTranches(notes, res, opts.tranches || PR_TRANCHES), n: tous.length, parties: Object.keys(parties).length,
                    date: Date.now(), version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') };
      const d = prLire(); d.cal[_prSig(w)] = out;
      Object.keys(d.cal).sort(function (a, b) { return d.cal[b].date - d.cal[a].date; }).slice(PR_MAX_CALAGES).forEach(function (k) { delete d.cal[k]; });
      try { localStorage.setItem(PR_CLE, JSON.stringify(d)); } catch (err) {}
      return out;
    });
  }).catch(function (err) { _prErreur = (err && err.message) || String(err); return null; })
    .then(function (r) { _prEnCours = null; _prRendre(); return r; });
}

/* ─── Affichage dans l'Observatoire ─── */
function _prPct(p) { return Math.round(100 * p) + ' %'; }
function _prPlage(x) { return _evalReflexionTexte(x.lo) + _obsT(' à ', ' to ') + _evalReflexionTexte(x.hi); }
// la ligne de la Vue generale : chance de gain du coup retenu, ou le lien pour la mesurer
function _obsProbaLigne(e) {
  const w = e && e.det && e.det.poids; if (!w || typeof e.score !== 'number') return '';
  const x = _prTranche(prCalage(w), e.score);
  if (x) return '<div class="obs-carte obs-proba"><b>' + _obsT('Chance de gain mesurée : ', 'Measured winning chance: ') + _prPct(x.p) + '</b> <small>(± ' + Math.round(100 * x.m) + ')</small><br><small>'
    + _obsT('Dans de vraies parties, quand la note était de ', 'In real games, when the score was ') + _prPlage(x) + _obsT(', le camp au trait a gagné ', ', the side to move won ') + _prPct(x.p) + _obsT(' du temps (', ' of the time (') + _obsN(x.n) + _obsT(' positions). Détail dans « Évaluation ».', ' positions). Details in “Evaluation”.') + '</small></div>';
  return '<div class="obs-note">' + _obsT('Chance de gain : pas encore mesurée pour les poids de ce coup. ', 'Winning chance: not measured yet for this move’s weights. ')
    + '<button class="obs-lien" onclick="obsOnglet(\'evaluation\')">📏 ' + _obsT('la mesurer', 'measure it') + '</button></div>';
}
function obsCalibrer() {
  const V = _obsVue(), w = V && V.e && V.e.det && V.e.det.poids;
  if (!w || (OBS.live && OBS.live.etat === 'calcul')) return;
  prCalibrer(w);
}
// la section de l'onglet Evaluation : la chance de gain, les tranches, les limites
function _obsProbaSection(e) {
  const w = e && e.det && e.det.poids; if (!w) return '';
  let h = '<h5>' + _obsT('Chance de gain mesurée', 'Measured winning chance') + '</h5>';
  const c = prCalage(w), calcul = OBS.live && OBS.live.etat === 'calcul';
  if (_prEnCours) return h + '<div class="obs-note">⏳ ' + _obsT('Calcul des positions de vraies parties : ', 'Computing positions from real games: ') + Math.round(100 * _prEnCours.pct) + ' %</div>';
  if (!c) {
    h += '<div class="obs-note">' + _obsT('La note n’est pas une probabilité. On peut mesurer ce qu’elle vaut : parmi des positions de vraies parties dont on connaît le vainqueur, combien de fois le camp au trait a gagné avec une note proche. Quelques secondes de calcul, pour les poids de ce coup ; rien ne quitte ce navigateur.',
      'The score is not a probability. What it is worth can be measured: among positions from real games whose winner is known, how often the side to move won with a similar score. A few seconds of computing, for this move’s weights; nothing leaves this browser.') + '</div>'
      + '<button class="obs-btn" onclick="obsCalibrer()"' + (calcul ? ' disabled title="' + _obsT('Après le calcul de l’IA', 'After the AI’s search') + '"' : '') + '>📏 ' + _obsT('Mesurer sur les vraies parties', 'Measure on real games') + '</button>';
    if (_prErreur) h += '<div class="obs-note">⚠ ' + _obsE(_prErreur) + '</div>';
    return h;
  }
  const x = _prTranche(c, e.score);
  h += '<div class="obs-grille"><div class="obs-k"><span>' + _obsT('Chance de gain', 'Winning chance') + '</span><b>' + _prPct(x.p) + '</b><small>± ' + Math.round(100 * x.m) + ' — ' + _obsT('note ', 'score ') + _evalReflexionTexte(e.score) + '</small></div>'
    + '<div class="obs-k"><span>' + _obsT('Positions comparables', 'Comparable positions') + '</span><b>' + _obsN(x.n) + '</b><small>' + _prPlage(x) + '</small></div></div>';
  h += '<table class="obs-t"><tr><th>' + _obsT('Note', 'Score') + '</th><th>' + _obsT('Gagné', 'Won') + '</th><th>' + _obsT('Positions', 'Positions') + '</th></tr>';
  c.t.forEach(function (t) { h += '<tr' + (t === x ? ' class="obs-sel"' : '') + '><td>' + _prPlage(t) + '</td><td>' + _prPct(t.p) + ' <small>± ' + Math.round(100 * t.m) + '</small></td><td>' + _obsN(t.n) + '</td></tr>'; });
  h += '</table><div class="obs-note">' + _obsT('Mesuré sur ', 'Measured on ') + _obsN(c.n) + _obsT(' positions de ', ' positions from ') + _obsN(c.parties) + _obsT(' vraies parties du corpus, dont on connaît le vainqueur, notées avec les poids de ce coup et rangées par note en tranches de même effectif. « Gagné » : la part des positions où le camp au trait a fini par gagner (une nulle compte pour moitié), avec sa marge à 95 %. Une note plus haute ne gagne jamais moins souvent qu’une plus basse : les tranches qui se contredisaient ont été fusionnées. ',
      ' real games of the corpus whose winner is known, scored with this move’s weights and sorted by score into slices of equal size. “Won”: the share of positions where the side to move went on to win (a draw counts as half), with its 95% margin. A higher score never wins less often than a lower one: slices that contradicted each other were merged. ')
    + _obsT('Limites : ce sont des positions calmes de parties entre humains ; la note vient ici d’une recherche, pas de l’évaluation seule ; au-delà des tranches extrêmes, on reprend la dernière.', 'Limits: these are quiet positions from games between humans; the score here comes from a search, not the evaluation alone; beyond the extreme slices, the last one is used.')
    + ' <button class="obs-lien" onclick="obsCalibrer()">↻ ' + _obsT('refaire', 'redo') + '</button></div>';
  return h;
}
