/* ═══════════════════════════════════════════
   LECTEUR DE FITTINGS — retiré.
   Les séquences de "fittings" de fightclub99 (et les parties externes type
   PlayStrategy) ne sont pas rejouables directement : le repère de coordonnées
   et l'orientation du plateau de ce jeu diffèrent du standard Aba-Pro/PlayStrategy,
   et les fittings eux-mêmes sont des repositionnements coopératifs (pas des coups
   légaux). L'import de parties externes nécessiterait de recaler tout le système
   de coordonnées sur le standard officiel, ce qui n'est pas envisagé pour l'instant.
   La notation Aba-Pro/Nacre interne du jeu, elle, fonctionne parfaitement.
═══════════════════════════════════════════ */


// Notation NACRE : pour les coups latéraux, on note la 1re bille de la rangée
// + l'arrivée de la DERNIÈRE bille (4 caractères au lieu de 6). Pour les coups en
// ligne, identique à Aba-Pro. C'est le système utilisé par PlayStrategy.
/* Distance hexagonale en coordonnees axiales. */
function _hexDist(a, b) {
  if (!a || !b) return -1;
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/* Extremites NOMMEES d'un coup : origine d'un bout du groupe, arrivee de
   l'autre bout. C'est la paire que le Nacre ecrit, et ce sont aussi les deux
   points de la fleche du dernier coup — Saab l'a confirme en constatant que
   la fleche c2d4 etait juste alors que la notation ecrivait c3d3.
   Une seule source pour les deux : tant qu'elles etaient calculees
   separement, l'une pouvait deriver sans que l'autre bouge. */
function moveEndpointCells(cells, dir) {
  if (!cells || !cells.length || !dir) return null;
  if (cells.length === 1) {
    const ax = rcToAxial(cells[0].r, cells[0].c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    return dest ? { from: cells[0], to: dest } : null;
  }
  const ends = _nacreGroupEnds(cells);
  if (!ends) return null;
  const cand = [ends.a, ends.b].map(function(from){
    const other = (from === ends.a) ? ends.b : ends.a;
    const ax = rcToAxial(other.r, other.c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    if (!dest) return null;
    return { from: from, to: dest, d: _hexDist(rcToAxial(from.r, from.c), rcToAxial(dest.r, dest.c)) };
  }).filter(Boolean);
  if (!cand.length) return null;
  cand.sort(function(x, y){ return y.d - x.d; });
  return cand[0];
}

/* Les deux extremites d'un groupe aligne (la bille du milieu, s'il y en a
   une, ne sert jamais a la notation). */
function _nacreGroupEnds(sel) {
  if (!sel || sel.length < 2) return null;
  let best = null;
  for (let i = 0; i < sel.length; i++) {
    for (let j = i + 1; j < sel.length; j++) {
      const d = _hexDist(rcToAxial(sel[i].r, sel[i].c), rcToAxial(sel[j].r, sel[j].c));
      if (!best || d > best.d) best = { a: sel[i], b: sel[j], d: d };
    }
  }
  return best;
}

function moveToNACRE(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    /* Correction du 24/07/2026, signalee par Saab sur la v1.11.
       La regle appliquee ici etait l'inverse de la bonne : elle ecrivait
       fin_groupe + destination_debut, ce qui donne DEUX CASES ADJACENTES.
       Sur son exemple, le groupe [c2,c3] produisait « c3d3 » au lieu de
       « c2d4 ». Le Nacre note l'origine d'une extremite et l'arrivee de
       l'AUTRE extremite : les deux coordonnees ecrites sont donc les plus
       eloignees possibles, jamais voisines. Sa note sur la v1.7.2 le
       confirme independamment — il y ecrit que le coup « a1b3 » provient
       de billes en a1,a2.

       Le commentaire precedent affirmait la regle prouvee contre huit
       coups lateraux du §11 de son manuel. Elle ne l'etait pas : l'invariant
       de distance maximale ci-dessous est verifie par test sur tous les
       coups lateraux legaux de centaines de positions, ecriture ET relecture.

       On ne trie plus alphabetiquement — un ordre alphabetique n'a aucun
       rapport avec la geometrie du plateau et ne garantit pas la paire la
       plus eloignee. On construit les deux paires candidates et on garde
       celle dont les extremites sont le plus distantes. */
    const ep = moveEndpointCells(sel, dir);
    if (!ep) return '?';
    return coordToABAPRO(ep.from.r, ep.from.c) + coordToABAPRO(ep.to.r, ep.to.c);
  } else {
    // Coup en ligne : queue AVANT le coup + destination de la TÊTE après le
    // coup — distance = taille du groupe, jamais figée à 1 case contrairement
    // à Aba-Pro. Formule prouvée le 19/07/2026 contre les 5 coups d'une
    // vraie solution de puzzle KAA (Pzl_M_0021) rejoués par le vrai moteur —
    // voir _advResolveNacreToken, qui fait exactement l'opération inverse.
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const head = sorted[sorted.length-1];
    const tailRc = axialToRc(tail.q, tail.r);
    const headDest = axialToRc(head.q + dir.q, head.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = headDest ? coordToABAPRO(headDest.r, headDest.c) : '';
    return from + to;  // ex: d5d7 (groupe de 2 : [d5,d6] avant → [d6,d7] après)
  }
}

// Construit le libellé d'un coup selon les systèmes de notation activés (réglages).
// Affiche Aba-Pro et/ou Nacre selon les préférences ; si les deux et qu'ils diffèrent,
// montre les deux séparés par " · ".
function moveLabel(sel, dir, type, ejection) {
  const showAba = (typeof notationAbaPro === 'undefined') ? true : notationAbaPro;
  const showNacre = (typeof notationNacre === 'undefined') ? false : notationNacre;
  const aba = moveToABAPRO(sel, dir, type);
  const nacre = moveToNACRE(sel, dir, type);
  const suffix = ejection ? ' ✕' : '';
  let core;
  if (showAba && showNacre) {
    core = (aba === nacre) ? aba : (aba + ' · ' + nacre);
  } else if (showNacre) {
    core = nacre;
  } else {
    core = aba;  // Aba-Pro par défaut si rien n'est coché
  }
  return core + suffix;
}

function moveToABAPRO(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    // Coup en flèche : 2 extrémités de la rangée + position finale de la première bille
    // (notation en ordre alphanumérique, ex: e6e8f6)
    const coords = sel.map(function(s){ return { rc:s, notation: coordToABAPRO(s.r,s.c) }; });
    coords.sort(function(a,b){ return a.notation < b.notation ? -1 : 1; });
    const first = coords[0].rc;
    const last = coords[coords.length-1].rc;
    const firstAx = rcToAxial(first.r, first.c);
    const firstDest = axialToRc(firstAx.q + dir.q, firstAx.r + dir.r);
    const fromA = coordToABAPRO(first.r, first.c);
    const fromB = coordToABAPRO(last.r, last.c);
    const toA = firstDest ? coordToABAPRO(firstDest.r, firstDest.c) : '';
    return fromA + fromB + toA;  // ex: e6e8f6
  } else {
    /* Coup en ligne : depart et arrivee de la bille de QUEUE (ex: e5e6).
       L'Aba-Pro decrit le deplacement de la bille arriere du groupe, qui se
       deplace toujours d'une seule case — c'est ce qui distingue cette
       notation du Nacre, lequel note la queue puis la DESTINATION DE LA TETE
       (donc une distance egale a la taille du groupe).
       Le code utilisait ici la bille de tete pour les deux extremites : tous
       les coups en ligne de plus d'une bille etaient donc faux. Verifie
       contre les sequences de reference de Saab (21/07/2026) : pour un groupe
       [a1,a2] avance vers a3, l'Aba-Pro correct est « a1a2 » et non « a2a3 ».
       Sur une bille seule, queue et tete se confondent : rien ne change. */
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const tailRc = axialToRc(tail.q, tail.r);
    const tailDest = axialToRc(tail.q + dir.q, tail.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = tailDest ? coordToABAPRO(tailDest.r, tailDest.c) : '';
    return from + to;  // ex: e5e6
  }
}

// Ancienne signature conservée pour compatibilité (non utilisée)
function formatMoveABAPRO(fromR, fromC, toR, toC, type) {
  const from = coordToABAPRO(fromR, fromC);
  const to   = coordToABAPRO(toR, toC);
  if (type === 'broadside') return from + '->' + to;
  return from + to;
}

function addMoveToHistory(move, color, moveInfo) {
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();  // un coup a été joué → plus d'annulation auto
  if (typeof _tClockTick==='function') _tClockTick();
  // Save snapshot for replay (avec les infos du coup pour recalculer la notation)
  boardSnapshots.push({
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack: CapturedByBlack.get(),
    capturedByWhite: CapturedByWhite.get(),
    moveCount: MoveCount.get(),
    label: move, color: color,
    moveInfo: moveInfo || null   // {cells, dir, type, ejection} pour re-notation
  });
  // evaluation de l'IA : rattachee a SON coup ; tout autre coup l'abandonne (jamais sur le mauvais coup)
  if (_mesuresCoupIA && _mesuresCoupIA.c === color) {
    const m = _mesuresCoupIA; boardSnapshots[boardSnapshots.length - 1].ia = { e: m.e, p: m.p, t: m.t, ph: m.ph };
    if (m.detail) { boardSnapshots[boardSnapshots.length - 1].ia.detail = m.detail;   // en memoire seulement
      if (typeof _majPanneauReflexion === 'function') setTimeout(_majPanneauReflexion, 0); }
  }
  _mesuresCoupIA = null;
  if (_bookNode) bookDescend(moveInfo);   // suit l'ouverture jouée
  const replayBtn = document.getElementById('replay-btn');
  if (replayBtn && boardSnapshots.length > 1) replayBtn.style.display = 'block';

  const list = document.getElementById('move-list');
  if (!list) return;
  appendMoveRow(list, moveInfo, move, color, boardSnapshots.length);
  scrollMoveListToEnd();
}

/* Defile l'historique jusqu'au dernier coup.
   #move-list n'a pas de barre de defilement : c'est son parent .move-history
   qui porte overflow-y:auto. list.scrollTop = list.scrollHeight n'avait donc
   aucun effet, et il fallait scroller a la main pour voir le score
   d'ejection affiche sur le dernier coup. Signale par Saab. */
function scrollMoveListToEnd() {
  const list = document.getElementById('move-list');
  if (!list) return;
  /* Strictement borne au panneau d'historique. La premiere version
     remontait le DOM jusqu'a trouver un ancetre defilable : quand
     .move-history n'en etait pas un (cas frequent en affichage etroit,
     ou le panneau s'etire au lieu de defiler), la boucle continuait
     jusqu'a un conteneur de page et faisait sauter tout l'ecran apres
     chaque coup. Le repli scrollIntoView avait le meme defaut : il
     deplace aussi la fenetre. On ne touche donc qu'au panneau, et
     seulement s'il defile vraiment. */
  const box = list.closest('.move-history');
  if (!box) return;
  const st = window.getComputedStyle(box).overflowY;
  if (st !== 'auto' && st !== 'scroll') return;
  if (box.scrollHeight <= box.clientHeight) return;
  box.scrollTop = box.scrollHeight;
}

// En-tête de la liste (colonnes Aba-Pro / Nacre)
const MOVE_LIST_HEADER = '<div class="move-head"><span></span><span></span><span>Aba-Pro</span><span>Nacre</span></div>';

// Ajoute une ligne de coup : numéro · pastille couleur · Aba-Pro (gauche) · Nacre (droite)
/* ═══ POSITION ET EVALUATION, COUP PAR COUP ═══
   Demande d'Olivier, sur le modele de KAAH :
   - le CODE DE LA POSITION affichee, au format de KAAH/KAAWA ("0a12b123..._0a45...":
     billes noires puis blanches, chaque moitie precedee du nombre de billes
     EJECTEES de ce camp, cases triees et groupees par rangee) -- copiable, et
     qui suit le coup affiche, en partie comme en rejeu ;
   - l'EVALUATION de l'IA pour chacun de ses coups (phase, score du point de
     vue de l'IA, profondeur atteinte, temps), sous le coup dans la liste, gardee
     avec la partie dans l'historique et retrouvee en la revoyant.
   La sequence prevue de KAAH n'existe pas ici : le moteur ne la renvoie pas. */
let _mesuresCoupIA = null;   // mesures du dernier calcul de l'IA, en attente du coup qu'elle joue
function _noterMesuresCoupIA(m, couleur, config) {
  if (!m || typeof m.bestScore !== 'number' || !isFinite(m.bestScore)) return;
  _mesuresCoupIA = { c: couleur, e: Math.round(m.bestScore), p: m.depth || 0, t: m.time || 0,
                     ph: (typeof _phaseJeu === 'function') ? _phaseJeu(board, MoveCount.get()) : '',
                     detail: _detailReflexion(m, couleur, config) };
}
/* Tableau « Reflexion IA », comme celui de KAAH : pour chaque profondeur TERMINEE par
   tous les fils de calcul, les 10 meilleurs premiers coups (scores exacts : ce
   moteur cherche chaque premier coup avec une fenetre complete, rien n'est elague
   a la racine), leurs positions et temps, la suite prevue et l'ecart de chaque
   critere d'evaluation entre la position et le bout de cette suite. Garde en
   memoire pendant la partie (pas dans l'historique : trop volumineux). */
function _detailReflexion(m, couleur, config) {
  const fils = (m.parFil && m.parFil.length) ? m.parFil : [m];
  if (!fils.every(function(f){ return f && f.rootsByDepth && f.depthInfo; })) return null;
  const prof = [];
  for (let d = 1; d <= 64; d++) {
    if (!fils.every(function(f){ return Array.isArray(f.rootsByDepth[d]) && f.rootsByDepth[d].length && f.depthInfo[d]; })) continue;
    let tous = []; fils.forEach(function(f){ tous = tous.concat(f.rootsByDepth[d]); });
    tous.sort(function(a, b){ return b.score - a.score; });
    prof.push({ d: d, total: tous.length,
      noeuds: fils.reduce(function(a, f){ return a + f.depthInfo[d].nodes; }, 0),
      ms: Math.max.apply(null, fils.map(function(f){ return f.depthInfo[d].ms; })),
      fin: Math.max.apply(null, fils.map(function(f){ return f.depthInfo[d].fin; })),
      lignes: tous.slice(0, 10).map(function(r){ return { cells: r.cells, dir: r.dir, s: r.score, k: r.k || 0, ms: r.ms || 0, t: r.t || 0, pv: r.pv || [], terms: r.terms || null }; }) });
  }
  if (!prof.length) return null;
  return { racine: { board: JSON.parse(JSON.stringify(board)), cB: CapturedByBlack.get(), cW: CapturedByWhite.get() },
           couleur: couleur, niveau: _niveauIA() || null, budget: config ? config.time : 0, date: Date.now(),
           style: (typeof _aiMode !== 'undefined' && typeof AI_WEIGHT_PRESETS !== 'undefined' && AI_WEIGHT_PRESETS[_aiMode]) ? AI_WEIGHT_PRESETS[_aiMode].label : '',
           pos: fils[0].posTerms || null, poids: fils[0].poids || null, prof: prof.reverse() };
}
/* Notations du tableau, calculees a l'ouverture seulement (une fois par coup) : chaque
   suite est rejouee sur une COPIE de la position, globales sauvegardees puis restaurees. */
function _notationsReflexion(det) {
  if (det._notes) return;
  const sauve = { b: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get(), go: GameOver.get() };
  const trouver = function(x, col){ const k = moveKey(x); return getAllMovesForColor(col).find(function(m){ return moveKey(m) === k; }) || null; };
  const jouer = function(m, col){ const info = validateMove(m.cells, m.dir, col); if (!info || !info.valid) return false; applyMove({ cells: m.cells, dir: m.dir, info: info }, col); return true; };
  try {
    det.prof.forEach(function(p){ p.lignes.forEach(function(l){
      board = JSON.parse(JSON.stringify(det.racine.board)); CapturedByBlack.set(det.racine.cB); CapturedByWhite.set(det.racine.cW); GameOver.set(false);
      const etapes = [{ board: JSON.parse(JSON.stringify(board)) }];
      const m0 = trouver(l, det.couleur); l.n = m0 ? ((abaproOfficialLabels(m0) || [])[0] || '?') : '?'; l.suite = [];
      if (m0 && jouer(m0, det.couleur)) {
        etapes.push({ board: JSON.parse(JSON.stringify(board)), cells: m0.cells, dir: m0.dir });
        for (const s of l.pv) {
          const mv = trouver(s, s.c); if (!mv) break;
          l.suite.push((abaproOfficialLabels(mv) || [])[0] || '?');
          if (!jouer(mv, s.c)) break;
          etapes.push({ board: JSON.parse(JSON.stringify(board)), cells: mv.cells, dir: mv.dir });
        }
      }
      l.etapes = etapes;
    }); });
  } finally { board = sauve.b; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); GameOver.set(sauve.go); }
  det._notes = true;
}
/* Colonnes du tableau : celles de KAAH dans son ordre, puis celles propres a Abalassembly.
   Seuls les criteres que le style de la partie UTILISE (poids non nul) sont montres :
   jamais une colonne de zeros qui laisserait croire qu'un critere compte. */
const _CRITERES_IA = [['gain', 'Gain', null, 2000], ['scGain', 'sc. Gain', 'scGain'], ['perte', 'Perte', null, 2000], ['scPerte', 'sc. Perte', 'scPerte'],
  ['centre', 'Centre', 'center'], ['cases', 'Cases', 'cases'], ['coh', 'Cohés.', 'cohesion'], ['compac', 'Compac.', 'compac'],
  ['bordM', 'Bord m.', 'edge'], ['bordA', 'Bord a.', 'edge'], ['sumito', 'Sumito', 'sumito'], ['menace', 'Menace', 'menace'],
  ['fourch', 'Fourch.', 'fourch'], ['piege', 'Piège', 'piege'],
  ['mob', 'Mobilité', 'mob'], ['iso', 'Isolées', 'iso'], ['dng', 'En danger', 'dng'], ['chaine', 'Chaînes', 'chain'], ['fort', 'Forteresses', 'fortress']];
function _criteresUtilises(poids) { return _CRITERES_IA.filter(function(k){ return k[3] || (poids && poids[k[2]]); }); }
function _evalReflexionTexte(s) { return Math.abs(s) >= 90000 ? (s > 0 ? 'Gagne' : 'Perd') : ((s > 0 ? '+' : '') + Math.round(s)); }
function _msTexte(ms) { return ms >= 1000 ? (ms / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(ms) + ' ms'; }
function _tableReflexionHTML(idx, hote) {
  const snap = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[idx] : null;
  const det = snap && snap.ia && snap.ia.detail; if (!det) return null;
  _notationsReflexion(det);
  const CR = _criteresUtilises(det.poids);
  const v = function(x){ if (!x || Math.abs(x) < 0.05) return '·'; const r = Math.round(x * 10) / 10; return (r > 0 ? '+' : '') + String(r).replace('.', ','); };
  const th = 'style="padding:3px 6px;text-align:right;white-space:nowrap;font-weight:400;color:var(--muted)"', td = 'style="padding:3px 6px;text-align:right;white-space:nowrap"';
  let h = '<table style="border-collapse:collapse;font-size:12px;font-family:\'DM Mono\',monospace"><tr><th ' + th + '>#</th><th ' + th + '>1er coup</th><th ' + th + '>Éval.</th><th ' + th + '>Temps'
    + (det.budget ? '<br>(' + (det.budget >= 3600000 ? '∞' : _msTexte(det.budget)) + ')' : '') + '</th><th ' + th + '>Sous lui</th><th ' + th + '>Positions</th>'
    + CR.map(function(k){ const w = k[3] || det.poids[k[2]]; return '<th ' + th + '>' + k[1] + '<br>(' + String(w).replace('.', ',') + ')</th>'; }).join('') + '<th ' + th + ' style="text-align:left">Suite prévue</th></tr>';
  if (det.pos) h += '<tr><td ' + td + '></td><td ' + td + ' colspan="5" style="text-align:left;color:var(--muted);font-style:italic">Position</td>' + CR.map(function(k){ return '<td ' + td + '>' + v(det.pos[k[0]]) + '</td>'; }).join('') + '<td></td></tr>';
  det.prof.forEach(function(p, ip){
    h += '<tr><td colspan="' + (7 + CR.length) + '" style="padding:10px 6px 4px;color:var(--gold);font-family:\'DM Sans\',sans-serif">Prof. ' + p.d + ' : ' + p.lignes.length + ' premiers coups sur ' + p.total + ', '
      + p.noeuds.toLocaleString('fr-FR') + ' positions, ' + _msTexte(p.ms) + ' (finie à ' + _msTexte(p.fin) + ')</td></tr>';
    p.lignes.forEach(function(l, i){
      h += '<tr onclick="_plateauReflexion(' + idx + ',' + ip + ',' + i + ',\'' + hote + '\')" style="cursor:pointer;border-top:1px solid var(--border)"><td ' + td + '>' + (i + 1) + '</td><td ' + td + ' style="text-align:left;color:' + (i === 0 ? 'var(--gold)' : 'var(--white)') + '">' + l.n + '</td><td ' + td + '>'
        + _evalReflexionTexte(l.s) + (l.terms && Math.abs(l.s) < 90000 && Math.abs(Object.keys(l.terms).reduce(function(a, k){ return a + l.terms[k]; }, 0) - l.s) >= 500 ? '*' : '') + '</td><td ' + td + '>' + (l.t ? _msTexte(l.t) : '') + '</td><td ' + td + '>' + _msTexte(l.ms) + '</td><td ' + td + '>'
        + l.k.toLocaleString('fr-FR') + ' (' + (p.noeuds ? Math.round(100 * l.k / p.noeuds) : 0) + ' %)</td>'
        + CR.map(function(k){ return '<td ' + td + '>' + (l.terms && det.pos ? v(l.terms[k[0]] - det.pos[k[0]]) : '') + '</td>'; }).join('')
        + '<td ' + td + ' style="text-align:left">' + l.suite.join(' ') + '</td></tr>';
    });
  });
  h += '</table>';
  const entete = '<div style="font-size:12px;color:var(--muted);margin:4px 0 2px">' + (det.niveau ? 'Niveau ' + det.niveau + ' · ' : '') + (det.style ? 'style ' + det.style + ' · ' : '')
    + new Date(det.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">Temps : moment où le coup a été fini ; Sous lui : temps passé sur ce coup. Scores exacts : aucun élagage à la racine. Critères : écart entre la position et le bout de la suite prévue, du point de vue de l\u2019IA ; seuls ceux qu\u2019utilise ce style sont montrés. * : le score tient compte de prises au-delà de la suite. Touche un coup : sa suite sur un plateau.</div>';
  return { det: det, html: entete + '<div id="' + hote + '"></div><div style="overflow-x:auto">' + h + '</div>' };
}
function ouvrirReflexionIA(idx) {
  const T = _tableReflexionHTML(idx, 'reflexion-ia-plateau'); if (!T) return null;
  let m = document.getElementById('reflexion-ia-modal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'reflexion-ia-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3600;background:rgba(13,15,14,0.94);display:flex;align-items:center;justify-content:center;padding:12px';
  m.innerHTML = '<div style="max-width:1100px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:18px;max-height:92vh;overflow:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin:0">Réflexion de l\u2019IA</h3>'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'reflexion-ia-modal\').remove()" style="width:auto;padding:4px 12px">Fermer</button></div>'
    + T.html + '</div>';
  document.body.appendChild(m);
  return m;
}
/* Petit plateau : la position au bout de la suite, chaque bille deplacee marquee du
   numero du demi-coup (1 = le coup de l'IA, 2 = la reponse, ...). */
function _plateauReflexion(idx, ip, i, idHote) {
  const det = boardSnapshots[idx].ia.detail, l = det.prof[ip].lignes[i], hote = document.getElementById(idHote || 'reflexion-ia-plateau');
  if (!hote || !l.etapes) return;
  const fin = l.etapes[l.etapes.length - 1].board, num = {};
  l.etapes.slice(1).forEach(function(e, k){ e.cells.forEach(function(cel){ const a = rcToAxial(cel.r, cel.c), rc = axialToRc(a.q + e.dir.q, a.r + e.dir.r); if (rc) num[rc.r + ',' + rc.c] = k + 1; }); });
  let svg = '<svg viewBox="0 0 640 640" style="width:min(300px,80vw);height:auto;display:block;margin:0 auto 6px">';
  for (let r = 0; r < 9; r++) for (let cc = 0; cc < ROWS[r]; cc++) {
    const p = hexCoord(r, cc), v = fin[r + ',' + cc], k = r + ',' + cc;
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="26" fill="' + (v === 'black' ? '#1b1b1b' : v === 'white' ? '#ece6d6' : 'rgba(255,255,255,0.06)') + '" stroke="' + (num[k] ? '#c8a84b' : 'rgba(255,255,255,0.12)') + '" stroke-width="' + (num[k] ? 4 : 1) + '"/>';
    if (num[k]) svg += '<text x="' + p.x + '" y="' + (p.y + 9) + '" text-anchor="middle" font-size="26" font-weight="700" fill="' + (v === 'white' ? '#1b1b1b' : '#c8a84b') + '">' + num[k] + '</text>';
  }
  svg += '</svg>';
  hote.innerHTML = svg + '<div style="text-align:center;font-size:12px;margin-bottom:10px"><b>' + l.n + '</b>' + (l.suite.length ? ' · suite : ' + l.suite.map(function(x, k){ return '<span style="color:var(--muted)">' + (k + 2) + '.</span> ' + x; }).join(' ') : '') + ' · ' + _evalReflexionTexte(l.s) + '</div>';
  return hote;
}

/* Panneau « Reflexion de l'IA » dans la partie (comme celui de KAAH) : le tableau du
   DERNIER coup de l'IA, mis a jour apres chacun ; ouvert ou ferme, au choix, et garde. */
function _dernierCoupIAAvecDetail() {
  if (typeof boardSnapshots === 'undefined') return -1;
  for (let i = boardSnapshots.length - 1; i >= 0; i--) if (boardSnapshots[i] && boardSnapshots[i].ia && boardSnapshots[i].ia.detail) return i;
  return -1;
}
function _majPanneauReflexion() {
  const corps = document.getElementById('reflexion-panneau-corps'), btn = document.getElementById('reflexion-panneau-btn');
  let ouvert = false; try { ouvert = localStorage.getItem('abaReflexionPanneau') === '1'; } catch (e) {}
  if (btn) btn.textContent = (ouvert ? '▾' : '▸') + ' Réflexion de l\u2019IA';
  if (!corps) return;
  corps.style.display = ouvert ? 'block' : 'none';
  if (!ouvert) return;
  const idx = _dernierCoupIAAvecDetail();
  if (idx < 0) { corps.innerHTML = '<div style="font-size:12px;color:var(--muted)">Le tableau apparaîtra après le prochain coup calculé par l\u2019IA.</div>'; return; }
  const T = _tableReflexionHTML(idx, 'reflexion-panneau-plateau');
  corps.innerHTML = '<div style="font-size:12px;color:var(--white);margin-bottom:2px">Coup ' + (idx + 1) + ' de l\u2019IA</div>' + T.html;
}
function basculerPanneauReflexion() {
  try { localStorage.setItem('abaReflexionPanneau', localStorage.getItem('abaReflexionPanneau') === '1' ? '0' : '1'); } catch (e) {}
  _majPanneauReflexion();
}

function _formatEvalIA(ia) {
  if (!ia) return '';
  const ph = { ouverture: 'Ouv.', milieu: 'Mil.', finale: 'Fin' }[ia.ph] || '';
  const v = Math.abs(ia.e) >= 90000 ? (ia.e > 0 ? 'gain forcé' : 'perte forcée') : ((ia.e > 0 ? '+' : '') + ia.e);
  const t = ia.t >= 1000 ? (ia.t / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(ia.t) + ' ms';
  return (ph ? ph + ' ' : '') + v + ' · prof. ' + ia.p + ' · ' + t;
}
function codePosition(plateau, ejNoires, ejBlanches) {
  const moitie = function(couleur, n){
    const noms = Object.keys(plateau).filter(function(k){ return plateau[k] === couleur; })
      .map(function(k){ const p = k.split(',').map(Number); return String(coordToABAPRO(p[0], p[1])); }).sort();
    let t = String(n || 0), prec = '';
    noms.forEach(function(nm){ if (nm[0] !== prec) { t += nm[0]; prec = nm[0]; } t += nm.slice(1); });
    return t;
  };
  return moitie('black', ejNoires) + '_' + moitie('white', ejBlanches);
}
/* ── Permutations d'une position, comme dans KAAH (demande d'Olivier) ──
   Les 12 symetries du plateau hexagonal, avec la NUMEROTATION DE KAAH, retrouvee
   en comparant nos calculs aux permutations affichees par KAAH lui-meme :
     0 a 5    : rotation de n sixiemes de tour ;
     10 a 15  : miroir, puis rotation ;
     100 et + : les memes, camps echanges (les deux moitiees du code inversees).
   La forme canonique -- le plus petit des 12 codes -- est mise en evidence, comme
   dans KAAH (c'est celle qu'il surligne). */
function _symAxiale(n) {
  const rot = function(a){ return { q: a.r + a.q, r: -a.q }; };   // un sixieme de tour, dans le sens de KAAH
  const mir = function(a){ return { q: a.r, r: a.q }; };
  return function(a){
    let x = a, k = n % 10;
    if (n >= 10) { x = mir(x); k = (3 - k + 6) % 6; for (let i = 0; i < k; i++) x = { q: -x.r, r: x.q + x.r }; return x; }
    for (let i = 0; i < k; i++) x = rot(x);
    return x;
  };
}
function permutationsPosition(plateau, ejNoires, ejBlanches) {
  const c0 = rcToAxial(4, 4), out = [];
  [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15].forEach(function(n){
    const f = _symAxiale(n), t = {};
    for (const k in plateau) {
      if (!plateau[k]) continue;
      const p = k.split(',').map(Number), a = rcToAxial(p[0], p[1]);
      const b = f({ q: a.q - c0.q, r: a.r - c0.r }), rc = axialToRc(b.q + c0.q, b.r + c0.r);
      if (rc) t[rc.r + ',' + rc.c] = plateau[k];
    }
    out.push({ num: n, code: codePosition(t, ejNoires, ejBlanches) });
  });
  const canonique = out.map(function(x){ return x.code; }).sort()[0];
  const echange = out.map(function(x){ const m = x.code.split('_'); return { num: x.num + 100, code: m[1] + '_' + m[0] }; });
  return { permut: out, camp: echange, canonique: canonique };
}
function ouvrirPermutations() {
  const code = codePosition(board, CapturedByWhite.get(), CapturedByBlack.get());
  const P = permutationsPosition(board, CapturedByWhite.get(), CapturedByBlack.get());
  let m = document.getElementById('permut-modal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'permut-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3600;background:rgba(13,15,14,0.92);display:flex;align-items:center;justify-content:center;padding:16px';
  const ligne = function(x){ const can = x.code === P.canonique;
    return '<div onclick="_copierTexte(\'' + x.code + '\')" title="Toucher pour copier" style="cursor:pointer;margin-bottom:10px;font-family:\'DM Mono\',monospace;font-size:12px;word-break:break-all;color:' + (can ? 'var(--gold)' : 'var(--text)') + '">'
      + x.num + ' : ' + x.code + (can ? ' ★' : '') + '</div>'; };
  m.innerHTML = '<div style="max-width:620px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:20px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:8px">Permutations</h3>'
    + '<div style="font-size:12px;color:var(--muted)">Position</div><div style="font-family:\'DM Mono\',monospace;font-size:13px;word-break:break-all;margin-bottom:12px">' + code + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">Permut</div>' + P.permut.map(ligne).join('') + '</div>'
    + '<div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">Camp_Permut</div>' + P.camp.map(ligne).join('') + '</div></div>'
    + '<div style="font-size:11px;color:var(--muted);margin:4px 0 12px">0 à 5 : rotations ; 10 à 15 : miroir puis rotation ; 100 et plus : camps échangés (numérotation de KAAH). ★ forme canonique : le plus petit des 12 codes. Touche un code pour le copier.</div>'
    + '<button class="ctrl-btn" onclick="_copierTexte(document.getElementById(\'permut-modal\').dataset.tout)" style="width:auto;padding:6px 12px;margin-right:8px">Copier tout</button>'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'permut-modal\').remove()" style="width:auto;padding:6px 12px">Fermer</button></div>';
  m.dataset.tout = 'Position : ' + code + '\n' + P.permut.concat(P.camp).map(function(x){ return x.num + ' : ' + x.code; }).join('\n');
  document.body.appendChild(m);
  return P;
}
function _copierTexte(t) {
  const ok = function(){ if (typeof showToast === 'function') showToast('📋 Copié'); };
  try { navigator.clipboard.writeText(t).then(ok, function(){ prompt('À copier :', t); }); } catch (e) { prompt('À copier :', t); }
}

function _majCodePosition() {
  const el = document.getElementById('position-code-texte');
  if (el && typeof board !== 'undefined') el.textContent = codePosition(board, CapturedByWhite.get(), CapturedByBlack.get());
}
function copierCodePosition() {
  const el = document.getElementById('position-code-texte'), t = el ? el.textContent : '';
  if (!t) return;
  const ok = function(){ if (typeof showToast === 'function') showToast('📋 Position copiée'); };
  try { navigator.clipboard.writeText(t).then(ok, function(){ prompt('Code de la position :', t); }); } catch (e) { prompt('Code de la position :', t); }
}

function appendMoveRow(list, moveInfo, fallbackLabel, color, plyNum) {
  const cur = list.querySelector('.move-item.current');
  if (cur) cur.classList.remove('current');
  let aba, nac, ejx = '';
  if (moveInfo && moveInfo.cells && moveInfo.dir) {
    aba = moveToABAPRO(moveInfo.cells, moveInfo.dir, moveInfo.type);
    nac = moveToNACRE(moveInfo.cells, moveInfo.dir, moveInfo.type);
    // Score traditionnel (captures par Noir-captures par Blanc), affiché
    // uniquement sur le coup qui vient d'éjecter — idée de Saab, en
    // s'appuyant sur les compteurs déjà stockés dans le snapshot correspondant
    // (fiable aussi bien en direct qu'au réaffichage de l'historique).
    if (moveInfo.ejection) {
      const snap = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[plyNum - 1] : null;
      const cb = snap ? snap.capturedByBlack : (typeof CapturedByBlack !== 'undefined' ? CapturedByBlack.get() : 0);
      const cw = snap ? snap.capturedByWhite : (typeof CapturedByWhite !== 'undefined' ? CapturedByWhite.get() : 0);
      ejx = ' (' + cb + '-' + cw + ')';
    }
  } else { aba = nac = fallbackLabel || ''; }
  const dot = (color === 'black') ? '#1a1a20' : '#e8e8ee';
  const turnNum = Math.ceil(plyNum / 2);   // noir et blanc d'un même tour partagent le numéro (1,1,2,2,…)
  const row = document.createElement('div');
  row.className = 'move-item current';
  /* Ligne cliquable : affiche la position APRES ce coup sur le plateau
     (demande d'Olivier). Reutilise loadSnapshot(), deja utilise par la
     navigation replay -- aucun nouveau chemin d'affichage, donc aucun
     risque de divergence entre les deux facons de naviguer.
     plyNum est le rang du coup (1-based) alors que boardSnapshots est
     indexe a partir de 0 : d'ou le -1. */
  row.dataset.ply = plyNum;
  row.style.cursor = 'pointer';
  row.title = 'Afficher la position après ce coup';
  row.onclick = function(){ _gotoMoveFromHistory(plyNum - 1); };
  row.innerHTML = '<span class="move-num">' + turnNum + '</span>'
    + '<span class="move-dot" style="background:' + dot + '"></span>'
    + '<span class="move-aba">' + aba + ejx + '</span>'
    + '<span class="move-nacre">' + nac + ejx + '</span>';
  const _snapEval = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[plyNum - 1] : null;
  if (_snapEval && _snapEval.ia) row.innerHTML += '<span class="move-eval" title="' + (_snapEval.ia.detail ? 'Voir la réflexion de l\u2019IA pour ce coup' : 'Évaluation de l\u2019IA : phase, score de son point de vue, profondeur atteinte, temps de réflexion') + '"'
    + (_snapEval.ia.detail ? ' onclick="event.stopPropagation();ouvrirReflexionIA(' + (plyNum - 1) + ')"' : '')
    + ' style="grid-column:3 / 5;font-size:11px;color:var(--muted);margin-top:-4px' + (_snapEval.ia.detail ? ';text-decoration:underline dotted;cursor:pointer' : '') + '">' + _formatEvalIA(_snapEval.ia) + (_snapEval.ia.detail ? ' ›' : '') + '</span>';
  list.appendChild(row);
}

/* Saut a un coup depuis l'historique des coups (clic sur une ligne).
   Bascule en mode replay si necessaire -- sinon loadSnapshot() modifierait
   le plateau d'une partie EN COURS, ce qui serait une perte de donnees.
   Reutilise entierement loadSnapshot() et le mecanisme replay existants. */
function _gotoMoveFromHistory(idx){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  idx = Math.max(-1, Math.min(boardSnapshots.length - 1, idx));
  if (typeof replayMode !== 'undefined' && !replayMode) {
    /* Relecture possible MEME en pleine partie (demande d'Olivier).
       L'etat reel est mis de cote AVANT de charger l'instantane, et
       restaure a la sortie du replay -- sans quoi la partie en cours
       serait perdue (bug preexistant sur toggleReplay, corrige en meme
       temps). Le bouton "Quitter replay" ramene a la position reelle. */
    if (typeof GameOver !== 'undefined' && !GameOver.get()) {
      _stashLive();
      if (typeof showToast === 'function') showToast('📽 Relecture — « Quitter replay » pour revenir à ta partie');
      const btn = document.getElementById('replay-btn');
      if (btn) { btn.style.display = 'block'; btn.textContent = '■ Quitter replay'; }
    }
    replayMode = true;
  }
  replayCurrentIdx = idx;
  if (typeof loadSnapshot === 'function') loadSnapshot(idx);
  if (typeof _highlightMoveRow === 'function') _highlightMoveRow(idx);
}

/* Met en evidence la ligne correspondant au coup affiche. */
function _highlightMoveRow(idx){
  const list = document.getElementById('move-list');
  if (!list) return;
  list.querySelectorAll('.move-item').forEach(function(el){
    el.classList.toggle('current', Number(el.dataset.ply) === idx + 1);
  });
}

// Recalcule tous les libellés de l'historique selon les systèmes de notation actifs.
// Utilise les infos de coup stockées dans chaque snapshot.
function rebuildMoveListLabels() {
  const list = document.getElementById('move-list');
  if (!list || typeof boardSnapshots === 'undefined') return;
  list.innerHTML = MOVE_LIST_HEADER;
  boardSnapshots.forEach(function(snap, idx){
    const isLast = (idx === boardSnapshots.length - 1);
    appendMoveRow(list, snap.moveInfo, snap.label, snap.color, idx + 1);
    if (!isLast) {
      const cur = list.querySelector('.move-item.current');
      if (cur) cur.classList.remove('current');
    }
  });
  scrollMoveListToEnd();
}

// Auto-init board on canvas ready
/* DOMContentLoaded — géré dans la section principale ci-dessous */

