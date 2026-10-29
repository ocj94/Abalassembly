/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : LA QUALITE DES COUPS (v2.78)
   Demande d'ocj94 (audit des statistiques du corpus, point 4) : pour chaque
   vrai coup du corpus, est-il proche du meilleur coup du moteur, et offre-t-il
   une bille a l'adversaire ?
   - « Proche du meilleur » : EXACTEMENT la mesure de la precision de Mes
     statistiques (computeDecisionProfile, 12-positional-analysis.js) -- chaque
     coup legal evalue a un demi-coup (evaluateBoard du camp au trait), le coup
     joue a SEUIL_PROCHE_MEILLEUR points ou moins du meilleur. Meme mesure des
     deux cotes : ta precision se compare a celle des vrais joueurs.
   - « Decision facile » : le meilleur et le pire coup legaux sont a plus de
     SEUIL_ECART_DECISION_DISPUTEE points (meme regle que Mes statistiques).
   - « Bille offerte » : apres le coup joue, l'adversaire peut ejecter une bille,
     alors qu'un autre coup legal ne le permettait pas. Un coup qui ejecte
     lui-meme (echange) n'est pas compte.
   - Par partie, par camp et par moment (debut : demi-coups 0 a 29, milieu : 30 a
     69, fin : 70 et plus -- les memes que la methode Texel du Labo).
   Le calcul (plusieurs minutes, toutes les parties completes) est fait hors
   ligne par tools/qualite-coups.js ; la page n'additionne que des compteurs.
═══════════════════════════════════════════ */
const QC_MOMENTS = [30, 70];                 // bornes des trois moments (demi-coups)
const QC_CHAMPS = ['coups', 'proches', 'faciles', 'facilesTrouves', 'offertes', 'perte', 'critiques', 'critiquesTrouvees', 'sansIssue'];   // perte : somme des ecarts au meilleur (dizaines de points, plafonnee a 1 000 par coup)
/* v2.84 : les positions critiques -- le camp au trait ne peut pas ejecter, et UN SEUL de ses coups legaux
   (il en a au moins deux) ne laisse pas l'adversaire ejecter au coup suivant : un seul coup evite de perdre
   une bille. Exact, sans evaluation : _qcEjectionPossible apres chaque coup. critiquesTrouvees : le coup
   joue etait celui-la. sansIssue : aucun coup ne l'evite (et le camp ne peut pas ejecter lui-meme). */
const QC_NB = QC_CHAMPS.length;
const QC_CRIT_MAX = 6;   // positions critiques gardees par partie (demi-coup, trouvee), pour les revoir
function _qcMoment(ply){ return ply < QC_MOMENTS[0] ? 0 : (ply < QC_MOMENTS[1] ? 1 : 2); }
/* Le camp « pousseur » peut-il ejecter une bille au prochain coup ? Exact, sans generer tous ses coups
   (un test le compare a getAllMovesForColor sur des milliers de positions du corpus) : une bille
   adverse au bord, la case au-dela hors du plateau dans une direction d ; en remontant la ligne
   (sens -d), k billes adverses contigues (1 ou 2) puis au moins k + 1 billes du pousseur (3 au plus). */
function _qcEjectionPossible(pousseur){
  const victime = pousseur === 'black' ? 'white' : 'black';
  for (const cle in board) {
    if (board[cle] !== victime) continue;
    const rc = cle.split(','), ax = rcToAxial(+rc[0], +rc[1]);
    for (let i = 0; i < AX_DIRS.length; i++) {
      const d = AX_DIRS[i];
      if (axialToRc(ax.q + d.q, ax.r + d.r)) continue;          // la case au-dela est sur le plateau
      let q = ax.q, r = ax.r, k = 0, j = 0, c;
      while ((c = axialToRc(q, r)) && board[akey(c.r, c.c)] === victime) { k++; q -= d.q; r -= d.r; }
      if (k > 2 || !c) continue;
      while ((c = axialToRc(q, r)) && board[akey(c.r, c.c)] === pousseur && j < 3) { j++; q -= d.q; r -= d.r; }
      if (j > k) return true;
    }
  }
  return false;
}

/* Analyse une partie du corpus (memes depart, jetons et arret que _sbRejouerPartie).
   Rend null pour une partie qui ne part pas d'une position de depart (probleme, position
   arrangee) ; sinon q[camp][moment] = les 6 compteurs de QC_CHAMPS (camp 0 : Noirs). */
function _qcAnalyserPartie(src, g){
  const dep = _sbDepart(src, g);
  if (!dep) return null;
  let nN = 0, nB = 0;
  for (const k in dep.board) { if (dep.board[k] === 'black') nN++; else if (dep.board[k] === 'white') nB++; }
  if (!(dep.cb === 0 && dep.cw === 0 && Math.min(nN, nB) >= 12)) return null;
  const jetons = _sbJetons(src, g);
  const q = [0, 1].map(function(){ return [0, 1, 2].map(function(){ return QC_CHAMPS.map(function(){ return 0; }); }); });
  const crit = [];   // v2.84 : [demi-coup, 1 si trouvee] des premieres positions critiques
  const sauve = { b: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get() };
  try {
    board = Object.assign({}, dep.board); CapturedByBlack.set(0); CapturedByWhite.set(0);
    let col = 'black', cb = 0, cw = 0;
    for (let k = 0; k < jetons.length; k++) {
      const legal = getAllMovesForColor(col);
      const mv = resolveAbaProToken(jetons[k], col, legal);
      if (!mv) break;
      const adv = col === 'black' ? 'white' : 'black';
      {   // tous les coups, meme forces (comme computeDecisionProfile)
        // v2.84 : dans la meme boucle, apres chaque coup, l'adversaire peut-il ejecter ? (sur = non)
        const scores = [], surs = [];
        legal.forEach(function(m){ const u = applyMove(m, col); scores.push(evaluateBoard(col)); surs.push(!_qcEjectionPossible(adv)); undoMove(u); });
        const idJ = canonId(mv), iJ = legal.findIndex(function(m){ return canonId(m) === idJ; });
        if (iJ >= 0) {
          const t = q[col === 'black' ? 0 : 1][_qcMoment(k)];
          const best = Math.max.apply(null, scores), worst = Math.min.apply(null, scores), ecart = best - scores[iJ];
          t[0]++;
          if (ecart <= SEUIL_PROCHE_MEILLEUR) t[1]++;
          if (best - worst > SEUIL_ECART_DECISION_DISPUTEE) { t[2]++; if (ecart <= SEUIL_PROCHE_MEILLEUR) t[3]++; }
          t[5] += Math.round(Math.min(1000, ecart) / 10);
          // bille offerte : le coup joue (sans ejection) permet une ejection, un autre coup legal non
          if (!(mv.info && mv.info.type === 'push' && mv.info.ejection)) {
            if (!surs[iJ] && surs.some(function(sur, i){ return i !== iJ && sur; })) t[4]++;
          }
          // v2.84 : position critique (un seul coup sauve), ou sans issue (aucun)
          if (!legal.some(function(m){ return m.info && m.info.type === 'push' && m.info.ejection; })) {
            let nSurs = 0; for (let i = 0; i < surs.length; i++) if (surs[i]) nSurs++;
            if (nSurs === 1 && legal.length > 1) { t[6]++; if (surs[iJ]) t[7]++; if (crit.length < 2 * QC_CRIT_MAX) crit.push(k + 1, surs[iJ] ? 1 : 0); }
            else if (nSurs === 0) t[8]++;
          }
        }
      }
      if (abApplyMove(mv.cells, mv.dir, col, mv.info).ejected) { if (col === 'black') { cb++; CapturedByBlack.set(cb); } else { cw++; CapturedByWhite.set(cw); } }
      col = adv;
      if (cb >= 6 || cw >= 6) break;
    }
  } finally { board = sauve.b; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); }
  q.crit = crit;   // propriete du tableau : JSON.stringify(q) ne la voit pas (tools/qualite-coups.js la lit a part)
  return q;
}

/* ─── Chargement des donnees embarquees (tools/qualite-coups.js) ───
   p[k] (rang de STATS_PARTIES) : 0 pour une partie qui ne part pas d'une position de depart, sinon
   36 nombres -- camp (Noirs, Blancs) x moment (debut, milieu, fin) x QC_CHAMPS (v2.84 : 9 champs, 54 nombres).
   crit[k] (v2.84) : les premieres positions critiques de la partie, [demi-coup, trouvee, ...]. */
let QUALITE_COUPS = null, _qcPret = null;
function ensureQualiteCoups(){
  if (_qcPret) return _qcPret;
  if (typeof DecompressionStream === 'undefined' || typeof QUALITE_COUPS_B64 === 'undefined' || !QUALITE_COUPS_B64) { _qcPret = Promise.resolve(false); return _qcPret; }
  _qcPret = _inflB64(QUALITE_COUPS_B64).then(function(txt){
    const d = JSON.parse(txt);
    if (!d || d.v !== 1 || !Array.isArray(d.p) || d.champs.join() !== QC_CHAMPS.join() || d.moments.join() !== QC_MOMENTS.join()
        || d.seuils[0] !== SEUIL_PROCHE_MEILLEUR || d.seuils[1] !== SEUIL_ECART_DECISION_DISPUTEE) return false;
    QUALITE_COUPS = d;
    return true;
  }).catch(function(){ return false; });
  return _qcPret;
}
function _qcVal(q, camp, moment, champ){ return q[(camp * 3 + moment) * QC_NB + champ]; }

/* Les additions, sur les parties retenues par les filtres de la page (L = _cfParties : completes,
   doublons comptes une fois) : en tout, par moment, vainqueur contre perdant, par source. */
function _qcAgreger(L){
  const Q = QUALITE_COUPS; if (!Q) return null;
  const vide = function(){ return QC_CHAMPS.map(function(){ return 0; }); }, ajouter = function(t, q, camp, m){ for (let c = 0; c < QC_NB; c++) t[c] += _qcVal(q, camp, m, c); };
  const r = { tout: vide(), moments: [vide(), vide(), vide()], vainqueur: vide(), perdant: vide(), sources: [vide(), vide(), vide(), vide()], parties: 0 };
  L.forEach(function(x){
    const q = Q.p[x.k]; if (!q) return;
    r.parties++;
    const src = _cfSourceDe(x.k, STATS_PARTIES), g = x.p[0];
    for (let camp = 0; camp < 2; camp++) for (let m = 0; m < 3; m++) {
      ajouter(r.tout, q, camp, m); ajouter(r.moments[m], q, camp, m); ajouter(r.sources[src], q, camp, m);
      if (g === 1 || g === 2) ajouter((g === 1) === (camp === 0) ? r.vainqueur : r.perdant, q, camp, m);
    }
  });
  return r;
}
// precision (proches / coups), billes offertes pour 100 coups, ecart moyen au meilleur (points)
function _qcPrecision(t){ return t[0] ? t[1] / t[0] : null; }
function _qcOffertes(t){ return t[0] ? 100 * t[4] / t[0] : null; }
function _qcPerte(t){ return t[0] ? 10 * t[5] / t[0] : null; }

function _qcHtml(L){
  const r = _qcAgreger(L);
  if (!r || !r.tout[0]) return '<div class="gr-vide">' + _tr('Pas encore de données.', 'No data yet.') + '</div>';
  const T = r.tout;
  let h = grTuiles([
    { lab: _tr('Coups proches du meilleur', 'Moves close to the best'), v: grPct(_qcPrecision(T), 1), sous: grMarge(T[1], T[0]) + ' · ' + grNb(T[0]) + _tr(' coups de ', ' moves from ') + grNb(r.parties) + _tr(' parties', ' games') },
    { lab: _tr('Billes offertes', 'Marbles offered'), v: grNb(_qcOffertes(T), 1), sous: _tr('pour 100 coups : l’adversaire peut éjecter, alors qu’un autre coup l’évitait', 'per 100 moves: the opponent can push one off, when another move avoided it') }
  ]);   // l'ecart moyen au meilleur (champ « perte ») est garde dans les donnees, pas affiche : a un demi-coup, il est plus grand chez les futurs vainqueurs -- il trompe
  const barre = function(nom, t, tip){ const w = grWilson(t[1], t[0]); return { lab: nom, v: w ? w.p : 0, bas: w ? w.bas : null, haut: w ? w.haut : null, txt: w ? grPct(w.p, 1) : '—',
    tip: nom + _dimDp() + (w ? grPct(w.p, 1) + _tr(' des coups proches du meilleur', ' of moves close to the best') + ' (' + grFourchette(t[1], t[0]) + ') · ' + grNb(_qcOffertes(t), 1) + _tr(' billes offertes pour 100 coups', ' marbles offered per 100 moves') + ' · ' + grNb(t[0]) + _tr(' coups', ' moves') : '—') + (tip || '') }; };
  const mx = Math.min(1, Math.max.apply(null, [r.tout].concat(r.moments, [r.vainqueur, r.perdant]).map(function(t){ const w = grWilson(t[1], t[0]); return w ? w.haut : 0; })) + 0.05);
  h += '<div class="gr-titre">' + _tr('Selon le moment de la partie', 'By moment of the game') + '</div>'
    + grBarres([barre(_tr('Début (0–29)', 'Opening (0–29)'), r.moments[0]), barre(_tr('Milieu (30–69)', 'Middle (30–69)'), r.moments[1]), barre(_tr('Fin (70 et +)', 'End (70+)'), r.moments[2])], { min: 0, max: mx, fmt: function(v){ return grPct(v, 1); } });
  if (r.vainqueur[0] && r.perdant[0]) {
    h += '<div class="gr-titre">' + _tr('Le vainqueur contre le perdant', 'The winner against the loser') + '</div>'
      + grBarres([barre(_tr('Le futur vainqueur', 'The future winner'), r.vainqueur), barre(_tr('Le futur perdant', 'The future loser'), r.perdant)], { min: 0, max: mx, fmt: function(v){ return grPct(v, 1); } })
      + '<div class="gr-sous">' + _tr('Billes offertes pour 100 coups : ', 'Marbles offered per 100 moves: ') + grNb(_qcOffertes(r.vainqueur), 1) + _tr(' pour le futur vainqueur, ', ' for the future winner, ') + grNb(_qcOffertes(r.perdant), 1) + _tr(' pour le futur perdant.', ' for the future loser.') + '</div>';
  }
  const S = [0, 1, 2, 3].filter(function(s){ return r.sources[s][0] >= 500; });
  if (S.length > 1) h += '<div class="gr-titre">' + _tr('Selon la source', 'By source') + '</div>'
    + grBarres(S.map(function(s){ return barre(_cfNomSourceCourt(s), r.sources[s]); }), { min: 0, max: mx, fmt: function(v){ return grPct(v, 1); } })
    + '<div class="gr-sous">' + _tr('Billes offertes pour 100 coups : ', 'Marbles offered per 100 moves: ') + S.map(function(s){ return _cfNomSourceCourt(s) + ' ' + grNb(_qcOffertes(r.sources[s]), 1); }).join(' · ') + '.</div>';
  return h;
}
function _qcNote(){
  return _tr('Mesuré hors ligne sur chaque coup des parties jouées depuis une position de départ, avec le moteur du site regardant <b>un demi-coup</b> : chaque coup légal est évalué, et le coup joué compte comme « proche du meilleur » à ' + SEUIL_PROCHE_MEILLEUR + ' points ou moins du meilleur. C’est exactement la précision de <a href="#" onclick="showPage(\'stats\');return false;" style="color:var(--gold)">Mes statistiques</a> : les deux se comparent. Limite : à un demi-coup, le moteur ne voit pas les plans ; un coup « loin du meilleur » peut être un bon coup à long terme. Les billes offertes distinguent mieux les joueurs forts que la précision. Une bille « offerte » est vérifiée exactement : après le coup, l’adversaire peut l’éjecter, alors qu’un autre coup légal l’évitait (un échange, où le coup joué éjecte lui-même, ne compte pas).',
    'Measured offline on every move of the games played from a starting position, with the site’s engine looking <b>one ply</b> ahead: every legal move is evaluated, and the move played counts as “close to the best” within ' + SEUIL_PROCHE_MEILLEUR + ' points of the best. It is exactly the accuracy of <a href="#" onclick="showPage(\'stats\');return false;" style="color:var(--gold)">My statistics</a>: the two compare. Limit: one ply ahead, the engine does not see plans; a move “far from the best” may be good in the long run. Offered marbles tell strong players apart better than accuracy does. An “offered” marble is checked exactly: after the move, the opponent can push it off, when another legal move avoided it (a trade, where the move played pushes one off itself, does not count).');
}
/* ─── v2.84 : les positions critiques (demande d'ocj94 : « les positions tranchantes ») ───
   Un seul coup legal evite de perdre une bille au coup suivant de l'adversaire. Exact : aucune
   evaluation n'entre dans la mesure. L'ecart entre le meilleur et le 2e coup de l'evaluation a un
   demi-coup a ete essaye, puis ecarte : il n'est grand que quand un coup ejecte une bille (alors
   l'evaluation fait un bond de pres de 2 000 points) -- il comptait les occasions d'ejection, deja
   comptees dans « Comment jouent les vrais joueurs ». */
function _qcCritiques(t){ return t[0] ? t[6] / t[0] : null; }
function _qcTrouvees(t){ return t[6] ? t[7] / t[6] : null; }
// les positions critiques manquees par les joueurs, dans les parties retenues (les plus anciennes d'abord)
function _qcExemples(L, nb){
  const Q = QUALITE_COUPS, out = [];
  if (!Q || !Q.crit) return out;
  for (let i = 0; i < L.length && out.length < nb; i++) {
    const c = Q.crit[L[i].k]; if (!c) continue;
    for (let j = 0; j < c.length && out.length < nb; j += 2) if (!c[j + 1]) { out.push({ k: L[i].k, ply: c[j] }); break; }
  }
  return out;
}
// les positions critiques notees (les premieres de chaque partie) : la bille offerte a-t-elle vraiment ete prise au coup suivant ?
// [positions, prises] pour le seul bon coup manque, puis trouve (jamais prise : le coup sur ne laisse pas d'ejection)
function _qcPunies(L){
  const Q = QUALITE_COUPS, r = { manque: [0, 0], trouve: [0, 0] };
  if (!Q || !Q.crit) return r;
  L.forEach(function(x){
    const c = Q.crit[x.k]; if (!c) return;
    const ej = x.p[4];
    for (let j = 0; j < c.length; j += 2) {
      let prise = false; for (let i = 0; i < ej.length; i += 2) if (ej[i] === c[j] + 1) { prise = true; break; }
      const t = c[j + 1] ? r.trouve : r.manque; t[0]++; if (prise) t[1]++;
    }
  });
  return r;
}
// rejouer une partie du corpus et se placer juste avant le coup du demi-coup « ply » (le joueur au trait)
function corpusRevoirA(k, ply){
  corpusRevoir(k);
  setTimeout(function(){ if (typeof loadSnapshot === 'function') loadSnapshot(ply - 2); }, 50);
}
function _qcHtmlCritiques(L){
  const r = _qcAgreger(L);
  if (!r || !r.tout[6]) return '';
  const T = r.tout, w = grWilson(T[7], T[6]);
  let h = '<div class="gr-sous">' + _tr('Une position critique : le joueur au trait ne peut pas éjecter, et <b>un seul</b> de ses coups légaux ne laisse à l’adversaire aucune éjection possible au coup suivant. Tous les autres lui offrent une bille. Vérifié coup par coup, sans évaluation.',
    'A critical position: the player to move cannot push a marble off, and <b>only one</b> of their legal moves leaves the opponent no possible ejection on the next move. All the others offer a marble. Checked move by move, with no evaluation.') + '</div>';
  h += grTuiles([
    { lab: _tr('Positions critiques', 'Critical positions'), v: grPct(_qcCritiques(T), 1), sous: _tr('des coups joués · ', 'of moves played · ') + grNb(T[6]) + _tr(' positions', ' positions') },
    { lab: _tr('Le seul bon coup trouvé', 'The only good move found'), v: w ? grPct(w.p) : '—', sous: (w ? grMarge(T[7], T[6]) + ' · ' : '') + _tr('les autres fois, une bille offerte', 'the other times, a marble offered') },
    { lab: _tr('Le vainqueur, le perdant', 'The winner, the loser'), v: r.vainqueur[6] && r.perdant[6] ? grPct(_qcTrouvees(r.vainqueur)) + ' · ' + grPct(_qcTrouvees(r.perdant)) : '—', sous: _tr('trouvent le seul bon coup', 'find the only good move') },
    { lab: _tr('Sans issue', 'No way out'), v: grPct(T[8] / T[0], 1), sous: _tr('des positions : quoi qu’on joue, l’adversaire pourra éjecter', 'of positions: whatever the move, the opponent will be able to push one off') }
  ]);
  // la bille offerte est-elle vraiment prise ? souvent non : d'ou la nuance sur le vainqueur et le perdant
  const pu = _qcPunies(L);
  if (pu.manque[0] >= GR_PEU) h += '<div class="gr-sous">' + _tr('Quand le seul bon coup est manqué, l’adversaire prend vraiment la bille au coup suivant dans <b>' + grPct(pu.manque[1] / pu.manque[0]) + '</b> des cas (' + grFourchette(pu.manque[1], pu.manque[0]) + ', sur ' + grNb(pu.manque[0]) + ' positions notées). Offrir une bille n’est donc pas toujours une faute : souvent, la prendre exposerait l’autre à son tour. C’est peut-être pourquoi le futur vainqueur manque ce coup plus souvent que le futur perdant.',
      'When the only good move is missed, the opponent really takes the marble on the next move in <b>' + grPct(pu.manque[1] / pu.manque[0]) + '</b> of cases (' + grFourchette(pu.manque[1], pu.manque[0]) + ', over ' + grNb(pu.manque[0]) + ' recorded positions). So offering a marble is not always a mistake: often, taking it would expose the other side in turn. That may be why the future winner misses this move more often than the future loser.') + '</div>';
  const barre = function(nom, t){ const x = grWilson(t[7], t[6]); return { lab: nom + ' · ' + grNb(t[6]), v: x ? x.p : 0, bas: x ? x.bas : null, haut: x ? x.haut : null, txt: x ? grPct(x.p) + ' <span class="sb-marge">' + grMarge(t[7], t[6]) + '</span>' : '—',
    tip: nom + _dimDp() + (x ? t[7] + ' / ' + t[6] + _tr(' trouvés', ' found') + ' (' + grFourchette(t[7], t[6]) + ')' + grPeu(t[6]) : '—') }; };
  h += '<div class="gr-titre">' + _tr('Trouvé, selon le moment de la partie', 'Found, by moment of the game') + '</div>'
    + grBarres([barre(_tr('Début (0–29)', 'Opening (0–29)'), r.moments[0]), barre(_tr('Milieu (30–69)', 'Middle (30–69)'), r.moments[1]), barre(_tr('Fin (70 et +)', 'End (70+)'), r.moments[2])].filter(function(b){ return b.bas != null; }), { min: 0, max: 1, axe: ['0 %', '50 %', '100 %'] });
  const S = [0, 1, 2, 3].filter(function(s){ return r.sources[s][6] >= GR_PEU; });
  if (S.length > 1) h += '<div class="gr-titre">' + _tr('Trouvé, selon la source', 'Found, by source') + '</div>' + grBarres(S.map(function(s){ return barre(_cfNomSourceCourt(s), r.sources[s]); }), { min: 0, max: 1, axe: ['0 %', '50 %', '100 %'] });
  // des positions a revoir : de quoi fabriquer des puzzles
  const E = _qcExemples(L, 10);
  if (E.length) {
    h += '<div class="gr-titre">' + _tr('Des positions critiques manquées, à revoir', 'Missed critical positions, to replay') + '</div><div class="gr-sous">' + _tr('Le bouton ouvre la partie juste avant le coup : à toi de trouver le seul coup qui ne laisse pas de bille à l’adversaire. De quoi fabriquer des puzzles.', 'The button opens the game just before the move: your turn to find the only move that leaves no marble to the opponent. Material for puzzles.') + '</div><div class="cf-ex-parties">';
    E.forEach(function(e){
      const x = _cfPartieDe(e.k); if (!x) return;
      const trait = e.ply % 2 ? _tr('Noirs', 'Black') : _tr('Blancs', 'White');
      h += '<div class="cf-ex-partie"><span>' + _cfNomSourceCourt(x.s) + ' · ' + grEchapper(x.date) + '</span><span>' + grEchapper(String(x.noirs || '?')) + ' – ' + grEchapper(String(x.blancs || '?')) + '</span><span>' + _tr('demi-coup ', 'ply ') + e.ply + ' · ' + _tr('les ', '') + trait + _tr(' jouent', ' to move') + '</span>'
        + '<button type="button" class="ctrl-btn" onclick="corpusRevoirA(' + e.k + ',' + e.ply + ')">▶ ' + _tr('Voir la position', 'See the position') + '</button></div>';
    });
    h += '</div>';
  }
  return h;
}
function _qcRendre(){
  const h = document.getElementById('corpus-qualite'); if (!h) return;
  if (!QUALITE_COUPS || !STATS_PARTIES) {
    ensureQualiteCoups().then(function(ok){ if (ok && QUALITE_COUPS && STATS_PARTIES) _qcRendre(); });
    return;
  }
  const L = _cfParties();
  h.innerHTML = _carteStats(_tr('La qualité des coups', 'The quality of moves') + (typeof _cfMarque === 'function' ? _cfMarque() : ''), _qcHtml(L), _qcNote());
  const hc = document.getElementById('corpus-critiques');
  if (hc) hc.innerHTML = _carteStats(_tr('Les positions critiques', 'Critical positions') + (typeof _cfMarque === 'function' ? _cfMarque() : ''), _qcHtmlCritiques(L),
    _tr('Mesuré avec la qualité des coups (mêmes parties, même rejeu). Pourquoi pas « l’écart entre le meilleur et le deuxième coup » ? Essayé : avec l’évaluation du moteur à un demi-coup, cet écart n’est grand que quand un coup éjecte une bille. Il comptait les occasions d’éjection, déjà dans « Comment jouent les vrais joueurs ». Les positions critiques, elles, sont exactes.',
        'Measured with the quality of moves (same games, same replay). Why not “the gap between the best and the second move”? Tried: with the engine’s one-ply evaluation, that gap is only large when a move pushes a marble off. It counted ejection chances, already in “How real players play”. Critical positions, on the other hand, are exact.'));
}
// la precision de tous les vrais joueurs (sans filtre), pour la comparer a la tienne (Mes statistiques) ;
// v2.79 : aussi leurs billes offertes, par moment, et la conversion de l'avance (_cfConversion)
function qcPrecisionCorpus(){
  if (!QUALITE_COUPS || !STATS_PARTIES) return null;
  const L = []; STATS_PARTIES.p.forEach(function(p, k){ if (p[2] && !_sbEstDoublon(k)) L.push({ k: k, p: p }); });
  const r = _qcAgreger(L); if (!r || !r.tout[0]) return null;
  return { p: _qcPrecision(r.tout), coups: r.tout[0], proches: r.tout[1], offertes: r.tout[4], offertes100: _qcOffertes(r.tout),
    moments: r.moments.map(function(t){ return { coups: t[0], proches: t[1], offertes: t[4] }; }),
    conversion: (typeof _cfConversion === 'function') ? _cfConversion(L) : null };
}
